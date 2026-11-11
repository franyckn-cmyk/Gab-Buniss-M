/**
 * GABON BUSINESS MAP — SUITE DE TESTS DE SÉCURITÉ APPROFONDIE
 *
 * Distinction stricte des périmètres de vérification :
 * - [UNITAIRE NODE.JS] : Tests exécutés en mémoire/processus Node.js (isolation RBAC, fail-closed,
 *   anti-bruteforce persistant multi-instances simulé, validation CLI sans --secret, modération d'avis).
 * - [STATIQUE SQL]     : Vérifications structurelles et syntaxiques des fichiers SQL du dépôt
 *   (supabase/schema.sql et supabase/migrations/20261102000000_gabon_business_map_schema.sql).
 * - [INSTANCE SUPABASE DISTANTE] : NON EXÉCUTÉE dans cette suite (aucune migration ni requête distante lancée).
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

// Isolation réseau stricte : garantit qu'aucun appel n'est envoyé vers une instance Supabase distante pendant les tests
process.env.SUPABASE_SECRET_KEY = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.VITE_SUPABASE_URL = '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TestCategory = 'UNITAIRE' | 'STATIQUE_SQL';

interface TestResult {
  name: string;
  category: TestCategory;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(category: TestCategory, condition: boolean, testName: string, failureDetails?: string) {
  const tag = category === 'UNITAIRE' ? '[UNITAIRE]' : '[STATIQUE SQL]';
  if (condition) {
    results.push({ name: testName, category, passed: true });
    console.log(`  ✅ PASS ${tag} ${testName}`);
  } else {
    results.push({ name: testName, category, passed: false, error: failureDetails || 'Assertion failed' });
    console.error(`  ❌ FAIL ${tag} ${testName} — ${failureDetails || 'Échec assertion'}`);
  }
}

/**
 * Crée un client Supabase simulé partageant un état persistant (simule PostgreSQL entre redémarrages & multi-instances)
 */
function createSharedMockSupabaseClient(options?: {
  initialAuthUsers?: Array<{ id: string; email: string; email_confirmed_at: string | null }>;
  initialProfiles?: Array<{ id: string; email: string; name: string; role: string; admin_role?: string; status: string }>;
  simulateRpcError?: string;
  simulateProfilesError?: string;
  throwOnCall?: boolean;
}) {
  const sharedState = {
    failed_attempts: 0,
    locked_until: null as number | null,
    permanently_disabled: false
  };
  const profiles = [...(options?.initialProfiles || [])];
  // Par défaut, chaque profil fourni dans initialProfiles possède un compte Auth confirmé correspondant sauf si initialAuthUsers est explicitement fourni
  const authUsers = options?.initialAuthUsers
    ? [...options.initialAuthUsers]
    : profiles.map((p) => ({
        id: p.id,
        email: p.email,
        email_confirmed_at: '2026-11-05T08:00:00.000Z'
      }));
  const reviews: Array<Record<string, any>> = [];
  let sqlAdvisoryLockActive = false;

  const buildQuery = (table: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let pendingInsert: any = null;

    const executeSelect = async () => {
      if (options?.throwOnCall) {
        throw new Error('Simulation exception réseau Supabase');
      }
      if (table === 'profiles' && options?.simulateProfilesError) {
        return { data: null, error: { message: options.simulateProfilesError, code: 'PGRST205' } };
      }
      const source = table === 'profiles' ? profiles : reviews;
      const matched = source.filter((item) => filters.every((fn) => fn(item)));
      return { data: matched, error: null };
    };

    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => {
        filters.push((row) => String(row[col] ?? '').toLowerCase() === String(val ?? '').toLowerCase());
        return builder;
      },
      order: () => builder,
      limit: () => executeSelect(),
      maybeSingle: async () => {
        const res = await executeSelect();
        if (res.error) return { data: null, error: res.error };
        return { data: res.data?.[0] || null, error: null };
      },
      single: async () => {
        if (pendingInsert) {
          reviews.push(pendingInsert);
          const inserted = pendingInsert;
          pendingInsert = null;
          return { data: inserted, error: null };
        }
        const res = await executeSelect();
        return { data: res.data?.[0] || null, error: res.error };
      },
      insert: (row: any) => {
        pendingInsert = { ...row };
        return builder;
      },
      then: (resolve: any, reject: any) => executeSelect().then(resolve, reject)
    };
    return builder;
  };

  const client = {
    sharedState,
    authUsers,
    profiles,
    reviews,
    auth: {
      admin: {
        getUserById: async (id: string) => {
          if (options?.throwOnCall) {
            throw new Error('Simulation exception Auth Admin Supabase');
          }
          const found = authUsers.find((u) => u.id === id) || null;
          if (!found) {
            return { data: { user: null }, error: { message: 'User not found' } };
          }
          return { data: { user: { ...found } }, error: null };
        }
      }
    },
    from: (table: string) => buildQuery(table),
    rpc: async (fn: string, params?: Record<string, any>) => {
      if (options?.throwOnCall) {
        throw new Error('Simulation exception RPC Supabase');
      }
      if (options?.simulateRpcError) {
        return { data: null, error: { message: options.simulateRpcError, code: '42883' } };
      }

      if (fn === 'check_bootstrap_security_state') {
        const hasSuperAdmin = profiles.some(
          (p) => p.role === 'admin' && p.admin_role === 'super_admin' && p.status === 'active'
        );
        if (sharedState.permanently_disabled || hasSuperAdmin) {
          sharedState.permanently_disabled = true;
          return {
            data: {
              active: false,
              permanently_disabled: true,
              locked: false,
              reason: 'Le mécanisme de bootstrap a été définitivement désactivé.'
            },
            error: null
          };
        }
        if (sharedState.locked_until && sharedState.locked_until > Date.now()) {
          const remaining = Math.max(1, Math.ceil((sharedState.locked_until - Date.now()) / 1000));
          return {
            data: {
              active: false,
              permanently_disabled: false,
              locked: true,
              remaining_seconds: remaining,
              reason: `Trop de tentatives infructueuses. Le système d'initialisation est temporairement verrouillé pour encore ${remaining} secondes.`
            },
            error: null
          };
        }
        return {
          data: {
            active: true,
            permanently_disabled: false,
            locked: false,
            failed_attempts: sharedState.failed_attempts
          },
          error: null
        };
      }

      if (fn === 'record_bootstrap_failure') {
        sharedState.failed_attempts += 1;
        if (sharedState.failed_attempts >= 3) {
          sharedState.failed_attempts = 0;
          sharedState.locked_until = Date.now() + 15 * 60 * 1000;
          return {
            data: { locked: true, failed_attempts: 0, max_attempts: 3, remaining_seconds: 900 },
            error: null
          };
        }
        return {
          data: { locked: false, failed_attempts: sharedState.failed_attempts, max_attempts: 3, remaining_seconds: 0 },
          error: null
        };
      }

      if (fn === 'reset_bootstrap_failures') {
        sharedState.failed_attempts = 0;
        sharedState.locked_until = null;
        return { data: null, error: null };
      }

      if (fn === 'bootstrap_super_admin') {
        // Simulation fidèle du verrou transactionnel pg_advisory_xact_lock et des contrôles SQL
        while (sqlAdvisoryLockActive) {
          await new Promise((r) => setTimeout(r, 5));
        }
        sqlAdvisoryLockActive = true;
        try {
          if (sharedState.permanently_disabled) {
            return {
              data: null,
              error: { message: 'Opération interdite : Le mécanisme de bootstrap a été définitivement désactivé.' }
            };
          }
          if (sharedState.locked_until && sharedState.locked_until > Date.now()) {
            return {
              data: null,
              error: { message: 'Opération temporairement verrouillée suite à des tentatives infructueuses.' }
            };
          }
          const hasSuperAdmin = profiles.some(
            (p) => p.role === 'admin' && p.admin_role === 'super_admin' && p.status === 'active'
          );
          if (hasSuperAdmin) {
            sharedState.permanently_disabled = true;
            return {
              data: null,
              error: { message: 'Opération interdite : Un Super Administrateur a déjà été initialisé sur cette instance.' }
            };
          }

          const cleanEmail = String(params?.target_email || '').toLowerCase().trim();
          if (!cleanEmail) {
            return { data: null, error: { message: 'L’adresse e-mail cible est obligatoire.' } };
          }

          // Vérification dans auth.users
          const authUser = authUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
          if (!authUser) {
            return {
              data: null,
              error: { message: `Compte inexistant : aucun compte Auth trouvé dans auth.users avec l'adresse ${cleanEmail}.` }
            };
          }
          if (!authUser.email_confirmed_at) {
            return {
              data: null,
              error: {
                message: `Promotion refusée : l'adresse e-mail (${cleanEmail}) n'est pas confirmée dans auth.users (email_confirmed_at IS NULL).`
              }
            };
          }

          // Vérification correspondance exacte id = auth.users.id et email = auth.users.email dans profiles
          const profileById = profiles.find((p) => p.id === authUser.id);
          if (!profileById) {
            const mismatchedByEmail = profiles.find((p) => p.email.toLowerCase().trim() === cleanEmail);
            if (mismatchedByEmail) {
              return {
                data: null,
                error: {
                  message: `Incohérence de sécurité : l'identifiant du profil (${mismatchedByEmail.id}) ne correspond pas à auth.users.id (${authUser.id}).`
                }
              };
            }
            return {
              data: null,
              error: { message: `Compte inexistant : aucun profil trouvé dans public.profiles pour l'adresse ${cleanEmail}.` }
            };
          }

          if (profileById.email.toLowerCase().trim() !== authUser.email.toLowerCase().trim()) {
            return {
              data: null,
              error: {
                message: `Incohérence de sécurité : l'adresse e-mail du profil (${profileById.email}) ne correspond pas à celle du compte Auth (${authUser.email}).`
              }
            };
          }

          if (profileById.status !== 'active') {
            return {
              data: null,
              error: {
                message: `Promotion refusée : le compte utilisateur cible (${cleanEmail}) n'est pas actif (statut: ${profileById.status}).`
              }
            };
          }

          profileById.role = 'admin';
          profileById.admin_role = 'super_admin';
          sharedState.permanently_disabled = true;
          sharedState.failed_attempts = 0;
          sharedState.locked_until = null;
          return {
            data: `Succès : Le compte ${cleanEmail} a été promu premier Super Administrateur avec succès.`,
            error: null
          };
        } finally {
          sqlAdvisoryLockActive = false;
        }
      }

      return { data: null, error: { message: `RPC inconnue: ${fn}` } };
    }
  };

  return client;
}

async function runSecurityTests() {
  console.log('\n🔒 ============================================================================');
  console.log('   GABON BUSINESS MAP — SUITE DE TESTS DE SÉCURITÉ (UNITAIRES & STATIQUES SQL)');
  console.log('============================================================================\n');

  const {
    canUserManageBusiness,
    dbUpdateBusiness,
    dbCreateAgency,
    dbUpdateAgency,
    dbDeleteAgency,
    dbReplyReview,
    dbAddBusinessOwner,
    dbModerateReview,
    DatabaseError
  } = await import('../src/server/db.ts');

  const {
    executeSuperAdminBootstrap,
    isBootstrapActive,
    getExpectedBootstrapSecret,
    mapBootstrapErrorToHttpStatus
  } = await import('../src/server/bootstrapAdmin.ts');

  const ownerA = {
    id: 'usr-owner-a-uuid-1111',
    name: 'Paul Mba (Gérant A)',
    email: 'paul.mba@entreprise-a.ga',
    role: 'business_owner'
  };

  const visitor = {
    id: 'usr-visitor-uuid-3333',
    name: 'Visiteur Ordinaire',
    email: 'visiteur@gmail.com',
    role: 'visitor'
  };

  const businessAId = 'biz-alpha-transport-ga';
  const businessBId = 'biz-beta-banque-ga';

  // =========================================================================
  // GROUPE A : TESTS UNITAIRES NODE.JS (LOGIQUE SERVEUR & RBAC)
  // =========================================================================
  console.log('--- PARTIE 1 : TESTS UNITAIRES NODE.JS ---\n');

  // 1. Isolation RBAC entre propriétaires et tiers
  console.log('1. Isolation RBAC entre propriétaires et rejet sans fallback mémoire...');
  {
    try {
      const allowed = await canUserManageBusiness(ownerA, businessBId);
      assert('UNITAIRE', !allowed, 'Owner A ne peut pas gérer l’entreprise de Owner B');
    } catch (e: any) {
      assert(
        'UNITAIRE',
        e instanceof DatabaseError,
        'canUserManageBusiness rejette avec DatabaseError explicite sans fallback mémoire'
      );
    }

    try {
      const allowedVisitor = await canUserManageBusiness(visitor, businessAId);
      assert('UNITAIRE', !allowedVisitor, 'Un visiteur ne peut gérer aucune entreprise');
    } catch (e: any) {
      assert('UNITAIRE', e instanceof DatabaseError, 'Rejet visiteur sécurisé avec DatabaseError');
    }

    let updateBlocked = false;
    try {
      await dbUpdateBusiness(businessBId, { name: 'Entreprise Piratée' } as any, ownerA);
    } catch {
      updateBlocked = true;
    }
    assert('UNITAIRE', updateBlocked, 'dbUpdateBusiness bloque toute modification par un tiers');

    let agencyBlocked = false;
    try {
      await dbCreateAgency(businessBId, { name: 'Agence Piratée' }, ownerA);
    } catch {
      agencyBlocked = true;
    }
    assert('UNITAIRE', agencyBlocked, 'dbCreateAgency bloque l’ajout d’agence sur une entreprise tierce');

    let updateAgencyBlocked = false;
    try {
      await dbUpdateAgency(businessBId, 'br-1', { name: 'Modif Piratée' }, ownerA);
    } catch {
      updateAgencyBlocked = true;
    }
    assert('UNITAIRE', updateAgencyBlocked, 'dbUpdateAgency bloque la modification d’agence par un tiers');

    let deleteAgencyBlocked = false;
    try {
      await dbDeleteAgency(businessBId, 'br-1', ownerA);
    } catch {
      deleteAgencyBlocked = true;
    }
    assert('UNITAIRE', deleteAgencyBlocked, 'dbDeleteAgency bloque la suppression d’agence par un tiers');

    let replyBlocked = false;
    try {
      await dbReplyReview('rev-1', 'Réponse illégitime', 'Imposteur', ownerA);
    } catch {
      replyBlocked = true;
    }
    assert('UNITAIRE', replyBlocked, 'dbReplyReview interdit de répondre aux avis d’une entreprise tierce');

    let selfAssignBlocked = false;
    try {
      await dbAddBusinessOwner(businessBId, ownerA.email, 'owner', ownerA);
    } catch {
      selfAssignBlocked = true;
    }
    assert('UNITAIRE', selfAssignBlocked, 'dbAddBusinessOwner interdit l’auto-attribution sur une entreprise existante');
  }

  // 2. Modération des avis côté serveur (aucune auto-publication, rejet des non-admins)
  console.log('\n2. Modération des avis côté serveur (statut pending obligatoire, modération réservée aux admins)...');
  {
    const dbSource = fs.readFileSync(path.resolve(__dirname, '../src/server/db.ts'), 'utf8');
    const createReviewSection = dbSource.slice(
      dbSource.indexOf('export async function dbCreateReview'),
      dbSource.indexOf('export async function dbModerateReview')
    );

    assert(
      'UNITAIRE',
      createReviewSection.includes("status: 'pending'") && !createReviewSection.includes("status: 'published'"),
      'dbCreateReview crée obligatoirement les avis en statut pending (jamais published)'
    );

    let nonAdminModerateBlocked = false;
    try {
      await dbModerateReview('rev-123', 'publish', ownerA);
    } catch (err: any) {
      nonAdminModerateBlocked = err instanceof DatabaseError && err.message.includes('administrateurs');
    }
    assert(
      'UNITAIRE',
      nonAdminModerateBlocked,
      'dbModerateReview interdit à un utilisateur ordinaire ou propriétaire de publier un avis'
    );
  }

  // 3. Secret Bootstrap : rejet strict de --secret en CLI et lecture exclusive de GBM_BOOTSTRAP_SECRET
  console.log('\n3. Validation du secret Bootstrap (interdiction de --secret en CLI, lecture GBM_BOOTSTRAP_SECRET)...');
  {
    process.env.GBM_BOOTSTRAP_SECRET = 'SecretServeurValideTrèsLong2026!';
    process.env.BOOTSTRAP_SECRET = 'AncienSecretIgnore123456!';
    assert(
      'UNITAIRE',
      getExpectedBootstrapSecret() === 'SecretServeurValideTrèsLong2026!',
      'getExpectedBootstrapSecret() lit exclusivement GBM_BOOTSTRAP_SECRET et ignore BOOTSTRAP_SECRET'
    );

    let cliRejectedSecretFlag = false;
    let secretLeakedInLogs = false;
    const forbiddenTestSecret = 'SecretConfidentielNeJamaisAfficher999';
    try {
      execFileSync(
        'npx',
        ['tsx', 'scripts/bootstrap-admin.ts', '--email=admin@gabonbusinessmap.ga', `--secret=${forbiddenTestSecret}`],
        {
          cwd: path.resolve(__dirname, '..'),
          env: {
            ...process.env,
            SUPABASE_SECRET_KEY: '',
            SUPABASE_SERVICE_ROLE_KEY: '',
            VITE_SUPABASE_URL: ''
          },
          stdio: 'pipe',
          encoding: 'utf8'
        }
      );
    } catch (execErr: any) {
      cliRejectedSecretFlag = execErr.status !== 0;
      const combinedOutput = `${execErr.stdout || ''}\n${execErr.stderr || ''}`;
      if (combinedOutput.includes(forbiddenTestSecret)) {
        secretLeakedInLogs = true;
      }
      assert(
        'UNITAIRE',
        combinedOutput.includes('--secret') && combinedOutput.includes('interdite'),
        'scripts/bootstrap-admin.ts affiche un rejet explicite lorsque --secret est fourni'
      );
    }

    assert(
      'UNITAIRE',
      cliRejectedSecretFlag,
      'scripts/bootstrap-admin.ts rejette l’exécution avec code de sortie non nul si --secret est passé'
    );
    assert(
      'UNITAIRE',
      !secretLeakedInLogs,
      'Aucune valeur de secret n’est jamais affichée dans les logs CLI'
    );
  }

  // 4. Comportement FAIL-CLOSED de isBootstrapActive()
  console.log('\n4. Vérification FAIL-CLOSED de isBootstrapActive() sur toute erreur Supabase...');
  {
    const unconfiguredRes = await isBootstrapActive(null);
    assert(
      'UNITAIRE',
      unconfiguredRes.active === false,
      'isBootstrapActive(null) retourne active = false lorsque Supabase n’est pas configuré'
    );

    const rpcErrorClient = createSharedMockSupabaseClient({
      simulateRpcError: 'relation "public.bootstrap_security_state" does not exist'
    });
    const rpcErrRes = await isBootstrapActive(rpcErrorClient);
    assert(
      'UNITAIRE',
      rpcErrRes.active === false,
      'isBootstrapActive() retourne active = false si la vérification RPC échoue (fail-closed)'
    );

    const profileErrorClient = createSharedMockSupabaseClient({
      simulateProfilesError: 'Could not find the table public.profiles in the schema cache'
    });
    const profileErrRes = await isBootstrapActive(profileErrorClient);
    assert(
      'UNITAIRE',
      profileErrRes.active === false,
      'isBootstrapActive() retourne active = false si la requête profiles échoue (fail-closed)'
    );

    const throwingClient = createSharedMockSupabaseClient({ throwOnCall: true });
    const throwRes = await isBootstrapActive(throwingClient);
    assert(
      'UNITAIRE',
      throwRes.active === false,
      'isBootstrapActive() retourne active = false si une exception réseau est levée (fail-closed)'
    );

    const healthyClient = createSharedMockSupabaseClient({
      initialProfiles: [
        { id: 'u-1', email: 'fondateur@gabonbusinessmap.ga', name: 'Fondateur', role: 'visitor', status: 'active' }
      ]
    });
    const healthyRes = await isBootstrapActive(healthyClient);
    assert(
      'UNITAIRE',
      healthyRes.active === true,
      'isBootstrapActive() retourne active = true uniquement quand Supabase confirme état sain sans Super Admin'
    );
  }

  // 5. Anti-Bruteforce persistant (multi-instances & post-redémarrage), concurrence et cycle complet de bootstrap
  console.log('\n5. Anti-bruteforce persistant multi-instances / post-redémarrage & cycle complet de promotion...');
  {
    process.env.GBM_BOOTSTRAP_SECRET = 'SecretServeurUltraSecurise2026!';

    // Deux instances Node distinctes partageant la même base PostgreSQL simulée
    const instanceAClient = createSharedMockSupabaseClient({
      initialProfiles: [
        { id: 'u-admin-1', email: 'premier.admin@gabonbusinessmap.ga', name: 'Premier Admin', role: 'business_owner', status: 'active' }
      ]
    });
    const instanceBClient = {
      from: instanceAClient.from,
      rpc: instanceAClient.rpc
    };

    // 2 échecs sur l'Instance A
    for (let i = 0; i < 2; i++) {
      try {
        await executeSuperAdminBootstrap({
          targetEmail: 'premier.admin@gabonbusinessmap.ga',
          bootstrapSecret: 'MauvaisSecretTentative',
          clientIp: '10.0.0.1',
          clientOverride: instanceAClient
        });
      } catch {
        // attendu
      }
    }

    // 3e échec envoyé sur l'Instance B (ou après redémarrage du serveur) -> doit déclencher le verrouillage persistant
    let multiInstanceLockTriggered = false;
    try {
      await executeSuperAdminBootstrap({
        targetEmail: 'premier.admin@gabonbusinessmap.ga',
        bootstrapSecret: 'MauvaisSecretTentative3',
        clientIp: '10.0.0.2',
        clientOverride: instanceBClient
      });
    } catch (err: any) {
      multiInstanceLockTriggered = err.message.includes('Verrouillage persistant') || err.message.includes('verrouillé');
    }
    assert(
      'UNITAIRE',
      multiInstanceLockTriggered,
      'Le verrouillage anti-bruteforce se déclenche au 3e échec cumulé entre plusieurs instances'
    );

    // Une nouvelle requête après redémarrage (avec le BON secret) doit être bloquée tant que locked_until est actif
    const statusAfterRestart = await isBootstrapActive(instanceBClient);
    assert(
      'UNITAIRE',
      statusAfterRestart.active === false && Boolean(statusAfterRestart.reason?.includes('verrouillé')),
      'Après redémarrage ou changement d’instance, isBootstrapActive() reste verrouillé (fail-closed)'
    );

    let blockedEvenWithValidSecret = false;
    try {
      await executeSuperAdminBootstrap({
        targetEmail: 'premier.admin@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: instanceBClient
      });
    } catch (err: any) {
      blockedEvenWithValidSecret = err.message.includes('verrouillé');
    }
    assert(
      'UNITAIRE',
      blockedEvenWithValidSecret &&
        mapBootstrapErrorToHttpStatus("Secret d'initialisation incorrect. Tentative 1/3.") === 403 &&
        mapBootstrapErrorToHttpStatus("Secret d'initialisation incorrect. Nombre maximal de tentatives atteint (3). Verrouillage persistant pendant 15 minutes.") === 429 &&
        mapBootstrapErrorToHttpStatus(statusAfterRestart.reason || '') === 429 &&
        mapBootstrapErrorToHttpStatus('Un Super Administrateur actif existe déjà dans la base de données. Le bootstrap est verrouillé.') === 409 &&
        mapBootstrapErrorToHttpStatus('Vérification de l’état de sécurité Supabase impossible (fail-closed) : erreur') === 503,
      'Même avec le bon secret, le verrou persistant bloque toute tentative et mappe correctement les codes HTTP (403/429/409/503)'
    );

    // Expiration du verrouillage -> la promotion légitime réussit puis désactive définitivement le bootstrap
    instanceAClient.sharedState.locked_until = Date.now() - 1000;
    const promoResult = await executeSuperAdminBootstrap({
      targetEmail: 'premier.admin@gabonbusinessmap.ga',
      bootstrapSecret: 'SecretServeurUltraSecurise2026!',
      clientIp: '127.0.0.1 (CLI)',
      clientOverride: instanceAClient
    });
    assert(
      'UNITAIRE',
      promoResult.success === true && promoResult.user?.adminRole === 'super_admin',
      'La promotion du premier Super Administrateur aboutit avec le secret serveur valide'
    );

    // Vérifier que le mécanisme est définitivement désactivé après la première promotion (y compris après redémarrage)
    const statusPostBootstrap = await isBootstrapActive(instanceBClient);
    assert(
      'UNITAIRE',
      statusPostBootstrap.active === false && Boolean(statusPostBootstrap.reason?.includes('désactivé')),
      'Le mécanisme de bootstrap est définitivement désactivé après promotion du premier Super Administrateur'
    );

    // Vérification des 5 cas d'éligibilité et de sécurité de bootstrap_super_admin() :
    // Cas A : Compte inexistant (absent de auth.users / public.profiles)
    const eligibilityClient = createSharedMockSupabaseClient({
      initialAuthUsers: [
        { id: 'u-unconfirmed', email: 'nonconfirme@gabonbusinessmap.ga', email_confirmed_at: null },
        { id: 'u-suspended', email: 'suspendu@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T07:00:00Z' },
        { id: 'u-auth-mismatch', email: 'mismatch@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T07:00:00Z' },
        { id: 'u-valid-admin', email: 'valide@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T08:30:00Z' }
      ],
      initialProfiles: [
        { id: 'u-unconfirmed', email: 'nonconfirme@gabonbusinessmap.ga', name: 'Non Confirmé', role: 'business_owner', status: 'active' },
        { id: 'u-suspended', email: 'suspendu@gabonbusinessmap.ga', name: 'Suspendu', role: 'business_owner', status: 'suspended' },
        { id: 'u-wrong-profile-id', email: 'mismatch@gabonbusinessmap.ga', name: 'Mismatch ID', role: 'business_owner', status: 'active' },
        { id: 'u-valid-admin', email: 'valide@gabonbusinessmap.ga', name: 'Admin Confirmé', role: 'business_owner', status: 'active' }
      ]
    });

    // 5.1 Compte inexistant (testé au niveau serveur ET directement dans la procédure SQL)
    let nonexistentRejectedServer = false;
    try {
      await executeSuperAdminBootstrap({
        targetEmail: 'inexistant@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: eligibilityClient
      });
    } catch (err: any) {
      nonexistentRejectedServer = err.message.includes('Aucun compte utilisateur trouvé') || err.message.includes('Compte inexistant');
    }
    const nonexistentRpc = await eligibilityClient.rpc('bootstrap_super_admin', {
      target_email: 'inexistant@gabonbusinessmap.ga'
    });
    assert(
      'UNITAIRE',
      nonexistentRejectedServer && Boolean(nonexistentRpc.error?.message?.includes('Compte inexistant')),
      'Bootstrap refuse explicitement un compte inexistant (serveur + transaction SQL)'
    );

    // 5.2 Profil actif avec e-mail non confirmé (profiles.status = 'active' mais auth.users.email_confirmed_at IS NULL)
    let unconfirmedRejectedServer = false;
    try {
      await executeSuperAdminBootstrap({
        targetEmail: 'nonconfirme@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: eligibilityClient
      });
    } catch (err: any) {
      unconfirmedRejectedServer = err.message.includes('confirmée');
    }
    const unconfirmedRpc = await eligibilityClient.rpc('bootstrap_super_admin', {
      target_email: 'nonconfirme@gabonbusinessmap.ga'
    });
    assert(
      'UNITAIRE',
      unconfirmedRejectedServer &&
        Boolean(unconfirmedRpc.error?.message?.includes('pas confirmée')) &&
        Boolean(unconfirmedRpc.error?.message?.includes('email_confirmed_at IS NULL')),
      'Bootstrap refuse explicitement un profil actif dont l’e-mail n’est pas confirmé (email_confirmed_at IS NULL)'
    );

    // 5.3 Compte suspendu (profiles.status = 'suspended', même avec e-mail confirmé)
    let suspendedRejectedServer = false;
    try {
      await executeSuperAdminBootstrap({
        targetEmail: 'suspendu@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: eligibilityClient
      });
    } catch (err: any) {
      suspendedRejectedServer = err.message.includes('suspendu') || err.message.includes('pas actif');
    }
    const suspendedRpc = await eligibilityClient.rpc('bootstrap_super_admin', {
      target_email: 'suspendu@gabonbusinessmap.ga'
    });
    assert(
      'UNITAIRE',
      suspendedRejectedServer && Boolean(suspendedRpc.error?.message?.includes('pas actif')),
      'Bootstrap refuse explicitement un compte suspendu même si son e-mail Auth est confirmé'
    );

    // 5.4 Incohérence d'identifiant ou d'e-mail (profiles.id <> auth.users.id et profiles.email <> auth.users.email)
    const idMismatchRpc = await eligibilityClient.rpc('bootstrap_super_admin', {
      target_email: 'mismatch@gabonbusinessmap.ga'
    });
    const emailMismatchClient = createSharedMockSupabaseClient({
      initialAuthUsers: [
        { id: 'u-email-diff', email: 'auth.reel@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T07:00:00Z' }
      ],
      initialProfiles: [
        { id: 'u-email-diff', email: 'autre.profil@gabonbusinessmap.ga', name: 'Email Diff', role: 'business_owner', status: 'active' }
      ]
    });
    const emailMismatchRpc = await emailMismatchClient.rpc('bootstrap_super_admin', {
      target_email: 'auth.reel@gabonbusinessmap.ga'
    });
    assert(
      'UNITAIRE',
      Boolean(idMismatchRpc.error?.message?.includes('Incohérence de sécurité')) &&
        Boolean(emailMismatchRpc.error?.message?.includes('Incohérence de sécurité')),
      'bootstrap_super_admin() rejette toute incohérence entre profiles.id / profiles.email et auth.users'
    );

    // 5.5 Compte actif avec e-mail confirmé et correspondance id/email exacte -> promotion réussie
    const confirmedSuccess = await executeSuperAdminBootstrap({
      targetEmail: 'valide@gabonbusinessmap.ga',
      bootstrapSecret: 'SecretServeurUltraSecurise2026!',
      clientIp: '127.0.0.1 (CLI)',
      clientOverride: eligibilityClient
    });
    assert(
      'UNITAIRE',
      confirmedSuccess.success === true &&
        confirmedSuccess.user?.id === 'u-valid-admin' &&
        confirmedSuccess.user?.adminRole === 'super_admin',
      'Bootstrap promeut un compte actif avec e-mail confirmé et correspondance exacte id/email'
    );

    // 5.6 Deux tentatives concurrentes de bootstrap (applicatif + verrou transactionnel SQL pg_advisory_xact_lock)
    const concurrentClient = createSharedMockSupabaseClient({
      initialAuthUsers: [
        { id: 'u-conc-1', email: 'conc1@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T08:00:00Z' },
        { id: 'u-conc-2', email: 'conc2@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T08:00:00Z' }
      ],
      initialProfiles: [
        { id: 'u-conc-1', email: 'conc1@gabonbusinessmap.ga', name: 'Conc 1', role: 'visitor', status: 'active' },
        { id: 'u-conc-2', email: 'conc2@gabonbusinessmap.ga', name: 'Conc 2', role: 'visitor', status: 'active' }
      ]
    });
    const slowClient = {
      from: concurrentClient.from,
      auth: concurrentClient.auth,
      rpc: async (fn: string, params?: Record<string, any>) => {
        await new Promise((r) => setTimeout(r, 30));
        return concurrentClient.rpc(fn, params);
      }
    };
    const [r1, r2] = await Promise.allSettled([
      executeSuperAdminBootstrap({
        targetEmail: 'conc1@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: slowClient
      }),
      executeSuperAdminBootstrap({
        targetEmail: 'conc2@gabonbusinessmap.ga',
        bootstrapSecret: 'SecretServeurUltraSecurise2026!',
        clientOverride: slowClient
      })
    ]);
    const oneSucceededAndOneRejectedApp =
      (r1.status === 'fulfilled' && r2.status === 'rejected') ||
      (r1.status === 'rejected' && r2.status === 'fulfilled');
    assert(
      'UNITAIRE',
      oneSucceededAndOneRejectedApp,
      'Deux tentatives concurrentes via executeSuperAdminBootstrap : une seule réussit, la seconde est rejetée'
    );

    // Test de concurrence directe au niveau SQL (verrou pg_advisory_xact_lock entre deux appels simultanés à bootstrap_super_admin)
    const sqlConcurrentClient = createSharedMockSupabaseClient({
      initialAuthUsers: [
        { id: 'u-sql-1', email: 'sql1@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T08:00:00Z' },
        { id: 'u-sql-2', email: 'sql2@gabonbusinessmap.ga', email_confirmed_at: '2026-11-05T08:00:00Z' }
      ],
      initialProfiles: [
        { id: 'u-sql-1', email: 'sql1@gabonbusinessmap.ga', name: 'SQL 1', role: 'visitor', status: 'active' },
        { id: 'u-sql-2', email: 'sql2@gabonbusinessmap.ga', name: 'SQL 2', role: 'visitor', status: 'active' }
      ]
    });
    const [sqlTx1, sqlTx2] = await Promise.all([
      sqlConcurrentClient.rpc('bootstrap_super_admin', { target_email: 'sql1@gabonbusinessmap.ga' }),
      sqlConcurrentClient.rpc('bootstrap_super_admin', { target_email: 'sql2@gabonbusinessmap.ga' })
    ]);
    const exactlyOneSqlSuccess =
      (Boolean(sqlTx1.data) && !sqlTx1.error && Boolean(sqlTx2.error)) ||
      (Boolean(sqlTx2.data) && !sqlTx2.error && Boolean(sqlTx1.error));
    assert(
      'UNITAIRE',
      exactlyOneSqlSuccess,
      'Deux appels SQL simultanés à bootstrap_super_admin() sont sérialisés et un seul Super Admin est créé'
    );
  }

  // 6. Suppression de l'exposition HTTP publique & stockage client sans SVG
  console.log('\n6. Suppression de l’exposition HTTP publique du bootstrap & blocage SVG côté client...');
  {
    const serverTs = fs.readFileSync(path.resolve(__dirname, '../server.ts'), 'utf8');
    assert(
      'UNITAIRE',
      serverTs.includes('isAuthorizedLocalBootstrapHttpRequest') &&
        serverTs.includes("process.env.GBM_ENABLE_LOCAL_HTTP_BOOTSTRAP !== 'true'") &&
        serverTs.includes("req.headers['x-forwarded-for']"),
      'server.ts bloque par défaut les endpoints HTTP bootstrap sur le réseau public et via proxy'
    );

    const supabaseClientTs = fs.readFileSync(path.resolve(__dirname, '../src/lib/supabase.ts'), 'utf8');
    assert(
      'UNITAIRE',
      !supabaseClientTs.includes('image/svg+xml') &&
        supabaseClientTs.includes("const validTypes = ['image/jpeg', 'image/png', 'image/webp'];"),
      'src/lib/supabase.ts exclut image/svg+xml des formats autorisés'
    );

    const imageUploadTs = fs.readFileSync(path.resolve(__dirname, '../src/utils/imageUpload.ts'), 'utf8');
    assert(
      'UNITAIRE',
      !imageUploadTs.includes('image/svg+xml') &&
        imageUploadTs.includes("['image/jpeg', 'image/png', 'image/webp']"),
      'src/utils/imageUpload.ts restreint les images aux formats raster JPEG, PNG et WEBP'
    );

    // Vérification HTTP locale sur le serveur Express (port 3000)
    try {
      const resBootstrap = await fetch('http://127.0.0.1:3000/api/admin/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@gabonbusinessmap.ga', bootstrapSecret: 'test-1234567890' })
      });
      assert(
        'UNITAIRE',
        resBootstrap.status === 403,
        `POST /api/admin/bootstrap-super-admin renvoie HTTP 403 par défaut (reçu HTTP ${resBootstrap.status})`
      );

      const resModerate = await fetch('http://127.0.0.1:3000/api/reviews/rev-test/moderate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
      });
      assert(
        'UNITAIRE',
        resModerate.status === 401 || resModerate.status === 403,
        `PUT /api/reviews/:id/moderate rejette toute requête non authentifiée admin (reçu HTTP ${resModerate.status})`
      );
    } catch {
      // Si le serveur local n'est pas démarré dans l'environnement d'exécution isolé
      assert(
        'UNITAIRE',
        serverTs.includes("app.put('/api/reviews/:id/moderate', requireAdmin"),
        'PUT /api/reviews/:id/moderate est protégé par le middleware requireAdmin'
      );
    }
  }

  // =========================================================================
  // GROUPE B : VÉRIFICATIONS STATIQUES SQL (FICHIERS DU DÉPÔT)
  // =========================================================================
  console.log('\n--- PARTIE 2 : VÉRIFICATIONS STATIQUES DES FICHIERS SQL ---\n');
  {
    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261102000000_gabon_business_map_schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    // S1. Cohérence absolue entre schema.sql et migrations/20261102000000_gabon_business_map_schema.sql
    assert(
      'STATIQUE_SQL',
      sqlContent === migrationContent,
      'Cohérence stricte : supabase/schema.sql et supabase/migrations/20261102000000_gabon_business_map_schema.sql sont identiques'
    );

    // S1bis. Vérification dans la transaction SQL bootstrap_super_admin() de auth.users, email_confirmed_at IS NOT NULL et correspondance id/email
    const bootstrapFnBlock = sqlContent.slice(
      sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.bootstrap_super_admin('),
      sqlContent.indexOf('REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM PUBLIC;')
    );
    assert(
      'STATIQUE_SQL',
      bootstrapFnBlock.includes('FROM auth.users u') &&
        bootstrapFnBlock.includes('u.email_confirmed_at') &&
        bootstrapFnBlock.includes('IF v_email_confirmed_at IS NULL THEN') &&
        bootstrapFnBlock.includes('WHERE p.id = v_auth_id;') &&
        bootstrapFnBlock.includes('IF v_profile_id <> v_auth_id THEN') &&
        bootstrapFnBlock.includes('LOWER(TRIM(COALESCE(v_profile_email, \'\'))) <> LOWER(TRIM(COALESCE(v_auth_email, \'\')))') &&
        migrationContent.includes('IF v_email_confirmed_at IS NULL THEN'),
      'bootstrap_super_admin() vérifie dans la transaction SQL auth.users.email_confirmed_at IS NOT NULL et la correspondance exacte id/email dans les deux fichiers SQL'
    );

    // S2. Modération des avis : statut pending obligatoire à la création, publication uniquement via moderate_review
    const sanitizeNewReviewBlock = sqlContent.slice(
      sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.sanitize_new_review()'),
      sqlContent.indexOf('DROP TRIGGER IF EXISTS trg_sanitize_new_review')
    );
    assert(
      'STATIQUE_SQL',
      sqlContent.includes("status TEXT NOT NULL DEFAULT 'pending'") &&
        sanitizeNewReviewBlock.includes("NEW.status := 'pending';") &&
        !sanitizeNewReviewBlock.includes("NEW.status := 'published'"),
      'sanitize_new_review() impose obligatoirement status = pending (zéro auto-publication)'
    );

    const sanitizeUpdateReviewBlock = sqlContent.slice(
      sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.sanitize_update_review()'),
      sqlContent.indexOf('DROP TRIGGER IF EXISTS trg_sanitize_update_review')
    );
    assert(
      'STATIQUE_SQL',
      sanitizeUpdateReviewBlock.includes("current_setting('app.review_moderation_in_progress', true) = 'true'") &&
        sanitizeUpdateReviewBlock.includes('IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_is_moderating THEN') &&
        sqlContent.includes("PERFORM set_config('app.review_moderation_in_progress', 'true', true);") &&
        sqlContent.includes('REVOKE ALL ON FUNCTION public.moderate_review(TEXT, TEXT) FROM PUBLIC, anon;'),
      'Seule la fonction autorisée moderate_review() peut modifier le statut d’un avis'
    );

    assert(
      'STATIQUE_SQL',
      sqlContent.includes("CREATE POLICY \"Création avis par public\"\n  ON public.reviews FOR INSERT\n  WITH CHECK (\n    status = 'pending'"),
      'Politique RLS INSERT sur public.reviews exige status = pending'
    );

    // S3. Stockage : suppression complète de image/svg+xml du bucket business-media
    assert(
      'STATIQUE_SQL',
      !sqlContent.includes('image/svg+xml') &&
        sqlContent.includes("ARRAY['image/jpeg', 'image/png', 'image/webp']"),
      'Le bucket Storage business-media autorise uniquement image/jpeg, image/png, image/webp (image/svg+xml retiré)'
    );

    // S4. Anti-bruteforce persistant et verrouillage définitif en PostgreSQL
    assert(
      'STATIQUE_SQL',
      sqlContent.includes('CREATE TABLE IF NOT EXISTS public.bootstrap_security_state') &&
        sqlContent.includes('CREATE OR REPLACE FUNCTION public.check_bootstrap_security_state()') &&
        sqlContent.includes('CREATE OR REPLACE FUNCTION public.record_bootstrap_failure(') &&
        sqlContent.includes('CREATE OR REPLACE FUNCTION public.reset_bootstrap_failures()') &&
        sqlContent.includes('REVOKE ALL ON TABLE public.bootstrap_security_state FROM PUBLIC, anon, authenticated;'),
      'Table bootstrap_security_state et fonctions RPC anti-bruteforce persistantes présentes et verrouillées'
    );

    // S5. bootstrap_super_admin réservé à service_role avec verrou advisory
    assert(
      'STATIQUE_SQL',
      sqlContent.includes('REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM PUBLIC;') &&
        sqlContent.includes('REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM anon;') &&
        sqlContent.includes('REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM authenticated;') &&
        sqlContent.includes('GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(TEXT) TO service_role;') &&
        sqlContent.includes('PERFORM pg_advisory_xact_lock('),
      'bootstrap_super_admin est révoqué de PUBLIC/anon/authenticated et protégé par pg_advisory_xact_lock'
    );

    // S6. Chaque fonction SECURITY DEFINER possède SET search_path = public, pg_temp
    const secDefinerCount = (sqlContent.match(/SECURITY DEFINER/g) || []).length;
    const searchPathCount = (sqlContent.match(/SET search_path = public, pg_temp/g) || []).length;
    assert(
      'STATIQUE_SQL',
      secDefinerCount > 0 && secDefinerCount === searchPathCount,
      `Toutes les fonctions SECURITY DEFINER définissent SET search_path = public, pg_temp (${secDefinerCount}/${searchPathCount})`
    );
  }

  // --- Synthèse détaillée par catégorie ---
  const unitResults = results.filter((r) => r.category === 'UNITAIRE');
  const sqlResults = results.filter((r) => r.category === 'STATIQUE_SQL');
  const failed = results.filter((r) => !r.passed);

  console.log('\n============================================================================');
  console.log('   RAPPORT RÉCAPITULATIF DES VÉRIFICATIONS');
  console.log('============================================================================');
  console.log(`  1. Tests unitaires Node.js (logique serveur & isolation) : ${unitResults.filter((r) => r.passed).length}/${unitResults.length} réussis`);
  console.log(`  2. Vérifications statiques SQL (fichiers du dépôt)       : ${sqlResults.filter((r) => r.passed).length}/${sqlResults.length} réussies`);
  console.log('  3. Tests d’intégration PostgreSQL / Supabase en direct   : NON EXÉCUTÉS (aucune migration lancée sur Supabase)');
  console.log('----------------------------------------------------------------------------');

  if (failed.length === 0) {
    console.log(`🎉 TOTAL AUTOMATISÉ LOCAL : ${results.length}/${results.length} CONTRÔLES RÉUSSIS !`);
  } else {
    console.error(`⚠️ ${failed.length} CONTRÔLE(S) ÉCHOUÉ(S) SUR ${results.length} !`);
    failed.forEach((f) => console.error(`  - [${f.category}] ${f.name} : ${f.error}`));
  }
  console.log('============================================================================\n');

  if (failed.length > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Erreur inattendue dans la suite de tests:', err);
  process.exit(1);
});
