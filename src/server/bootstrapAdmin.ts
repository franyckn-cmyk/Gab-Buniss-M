import crypto from 'crypto';
import { supabaseServer, isServerSupabaseConfigured } from './supabaseServer.ts';
import { dbLogAdminAction } from './db.ts';

// Verrou de concurrence intra-processus (complété côté PostgreSQL par pg_advisory_xact_lock et bootstrap_security_state)
let isBootstrapInProgress = false;

export interface BootstrapSupabaseClient {
  rpc: (fn: string, params?: Record<string, any>) => Promise<{ data: any; error: any }>;
  from: (table: string) => any;
  auth?: {
    admin?: {
      getUserById: (id: string) => Promise<{ data: { user: any } | null; error: any }>;
    };
  };
}

/**
 * Récupère le secret d'initialisation configuré EXCLUSIVEMENT dans GBM_BOOTSTRAP_SECRET côté serveur.
 */
export function getExpectedBootstrapSecret(): string {
  return (process.env.GBM_BOOTSTRAP_SECRET || '').trim();
}

/**
 * Vérifie de façon strictement FAIL-CLOSED si le mécanisme de bootstrap est actif.
 * Toute erreur Supabase, configuration manquante, table absente ou exception retourne active = false.
 */
export async function isBootstrapActive(
  clientOverride?: BootstrapSupabaseClient | null
): Promise<{ active: boolean; reason?: string }> {
  const client: BootstrapSupabaseClient | null =
    clientOverride !== undefined
      ? clientOverride
      : isServerSupabaseConfigured() && supabaseServer
        ? (supabaseServer as unknown as BootstrapSupabaseClient)
        : null;

  // Fail-closed : sans client serveur Supabase opérationnel, jamais active = true
  if (!client) {
    return {
      active: false,
      reason: 'Service d’initialisation indisponible : client serveur Supabase non configuré (fail-closed).'
    };
  }

  try {
    // 1. Vérifier l'état de sécurité persistant en base (verrouillage temporaire anti-bruteforce ou désactivation définitive)
    const { data: stateData, error: stateErr } = await client.rpc('check_bootstrap_security_state');

    if (stateErr || !stateData || typeof stateData !== 'object') {
      return {
        active: false,
        reason: `Vérification de l’état de sécurité Supabase impossible (fail-closed) : ${
          stateErr?.message || 'réponse invalide ou absente'
        }`
      };
    }

    if (stateData.permanently_disabled === true) {
      return {
        active: false,
        reason: String(stateData.reason || 'Le mécanisme de bootstrap a été définitivement désactivé.')
      };
    }

    if (stateData.locked === true) {
      return {
        active: false,
        reason: String(
          stateData.reason ||
            'Trop de tentatives infructueuses. Le système d’initialisation est temporairement verrouillé.'
        )
      };
    }

    if (stateData.active !== true) {
      return {
        active: false,
        reason: String(stateData.reason || 'Le mécanisme d’initialisation est indisponible.')
      };
    }

    // 2. Vérifier explicitement la table profiles (aucun super_admin actif ne doit exister)
    const { data: admins, error: profilesErr } = await client
      .from('profiles')
      .select('id, email, status')
      .eq('role', 'admin')
      .eq('admin_role', 'super_admin')
      .eq('status', 'active')
      .limit(1);

    if (profilesErr || !Array.isArray(admins)) {
      return {
        active: false,
        reason: `Vérification des administrateurs impossible dans Supabase (fail-closed) : ${
          profilesErr?.message || 'réponse invalide'
        }`
      };
    }

    if (admins.length > 0) {
      return {
        active: false,
        reason: 'Un Super Administrateur actif existe déjà dans la base de données. Le bootstrap est verrouillé.'
      };
    }

    return { active: true };
  } catch (err: any) {
    // Fail-closed strict sur toute exception inattendue
    return {
      active: false,
      reason: `Erreur critique lors de la vérification Supabase (fail-closed) : ${err?.message || 'Erreur inconnue'}`
    };
  }
}

/**
 * Procédure serveur d'initialisation du premier Super Administrateur.
 * Utilise une persistance PostgreSQL atomique (bootstrap_security_state + pg_advisory_xact_lock)
 * pour résister aux redémarrages et fonctionner sur plusieurs instances en parallèle.
 */
export async function executeSuperAdminBootstrap(params: {
  targetEmail: string;
  bootstrapSecret: string;
  clientIp?: string;
  clientOverride?: BootstrapSupabaseClient | null;
}): Promise<{ success: boolean; message: string; user?: any }> {
  const { targetEmail, bootstrapSecret, clientIp, clientOverride } = params;

  // 1. Mutex anti-concurrence intra-processus acquis avant toute opération asynchrone
  if (isBootstrapInProgress) {
    throw new Error('Une opération d’initialisation est déjà en cours d’exécution. Veuillez patienter.');
  }

  isBootstrapInProgress = true;

  try {
    const client: BootstrapSupabaseClient | null =
      clientOverride !== undefined
        ? clientOverride
        : isServerSupabaseConfigured() && supabaseServer
          ? (supabaseServer as unknown as BootstrapSupabaseClient)
          : null;

    if (!client) {
      throw new Error(
        'Service d’initialisation indisponible : le client serveur Supabase n’est pas configuré avec SUPABASE_SECRET_KEY.'
      );
    }

    // 2. Vérification fail-closed et contrôle anti-bruteforce / désactivation définitive en base PostgreSQL
    const statusCheck = await isBootstrapActive(client);
    if (!statusCheck.active) {
      throw new Error(statusCheck.reason || 'Le mécanisme d’initialisation est indisponible.');
    }

    // 3. Validation de la configuration serveur du secret GBM_BOOTSTRAP_SECRET
    const expectedSecret = getExpectedBootstrapSecret();
    if (!expectedSecret) {
      throw new Error(
        'Le secret d’initialisation GBM_BOOTSTRAP_SECRET n’est pas configuré dans les variables d’environnement du serveur.'
      );
    }

    if (expectedSecret.length < 12) {
      throw new Error('La variable GBM_BOOTSTRAP_SECRET doit contenir au moins 12 caractères pour des raisons de sécurité.');
    }

    // 4. Comparaison cryptographique en temps constant sur empreintes SHA-256 (ne fuit ni le secret ni sa longueur)
    const providedDigest = crypto.createHash('sha256').update(String(bootstrapSecret || ''), 'utf8').digest();
    const expectedDigest = crypto.createHash('sha256').update(expectedSecret, 'utf8').digest();
    const isSecretValid = crypto.timingSafeEqual(providedDigest, expectedDigest);

    if (!isSecretValid) {
      // Enregistrement persistant de l'échec en base PostgreSQL (survit aux redémarrages et multi-instances)
      const { data: failData, error: failErr } = await client.rpc('record_bootstrap_failure', {
        p_client_ip: clientIp || 'unknown'
      });

      if (failErr) {
        throw new Error(`Secret d'initialisation incorrect et erreur de journalisation de sécurité : ${failErr.message}`);
      }

      if (failData?.locked) {
        throw new Error(
          `Secret d'initialisation incorrect. Nombre maximal de tentatives atteint (${failData.max_attempts || 3}). Verrouillage persistant pendant 15 minutes.`
        );
      }

      throw new Error(
        `Secret d'initialisation incorrect. Tentative ${failData?.failed_attempts || 1}/${failData?.max_attempts || 3}.`
      );
    }

    // 5. Réinitialiser le compteur d'échecs en base après validation du secret
    const { error: resetErr } = await client.rpc('reset_bootstrap_failures');
    if (resetErr) {
      throw new Error(`Erreur lors de la réinitialisation de l'état de sécurité : ${resetErr.message}`);
    }

    // 6. Validation de l'adresse e-mail cible
    const cleanEmail = String(targetEmail || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Adresse e-mail valide requise pour le compte à promouvoir.');
    }

    // 7. Double vérification en base qu'aucun Super Administrateur actif n'existe déjà
    const { data: existingAdmins, error: checkErr } = await client
      .from('profiles')
      .select('id, email, status')
      .eq('role', 'admin')
      .eq('admin_role', 'super_admin')
      .eq('status', 'active');

    if (checkErr) {
      throw new Error(`Erreur lors de la vérification des administrateurs : ${checkErr.message}`);
    }

    if (existingAdmins && existingAdmins.length > 0) {
      throw new Error('Opération impossible : un Super Administrateur actif existe déjà.');
    }

    // 8. Vérifier que le compte utilisateur cible existe déjà (ne crée aucun compte automatiquement)
    const { data: targetProfile, error: profileErr } = await client
      .from('profiles')
      .select('id, email, name, role, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileErr) {
      throw new Error(`Erreur lors de la recherche du profil utilisateur : ${profileErr.message}`);
    }

    if (!targetProfile) {
      throw new Error(
        `Aucun compte utilisateur trouvé pour l'adresse « ${cleanEmail} ». Vous devez d'abord créer votre compte utilisateur normalement sur Gabon Business Map avant de l'initialiser comme Super Administrateur.`
      );
    }

    if (targetProfile.status === 'suspended') {
      throw new Error('Le compte cible est suspendu et ne peut pas être promu administrateur.');
    }

    // Vérification complémentaire côté serveur Node.js via Auth Admin API si disponible (la vérification principale reste atomique dans la transaction SQL bootstrap_super_admin)
    if (client.auth?.admin?.getUserById) {
      const { data: authData, error: authErr } = await client.auth.admin.getUserById(targetProfile.id);
      const authUser = authData?.user;
      if (authErr || !authUser) {
        throw new Error(`Compte inexistant dans auth.users pour l'adresse « ${cleanEmail} ».`);
      }
      if (authUser.id !== targetProfile.id) {
        throw new Error('Incohérence de sécurité : l’identifiant du profil ne correspond pas à auth.users.id.');
      }
      if (String(authUser.email || '').toLowerCase().trim() !== cleanEmail) {
        throw new Error('Incohérence de sécurité : l’adresse e-mail du profil ne correspond pas à celle du compte Auth.');
      }
      if (!authUser.email_confirmed_at) {
        throw new Error(
          `Promotion refusée : l'adresse e-mail « ${cleanEmail} » n'est pas confirmée (email_confirmed_at IS NULL).`
        );
      }
    }

    // 9. Exécuter la procédure SQL transactionnelle bootstrap_super_admin(target_email)
    // Réservée exclusivement au service_role ; vérifie auth.users.email_confirmed_at, profiles.id = auth.users.id, pg_advisory_xact_lock et désactive bootstrap_security_state
    const { data: rpcOutput, error: rpcErr } = await client.rpc('bootstrap_super_admin', {
      target_email: cleanEmail
    });

    if (rpcErr) {
      throw new Error(`Échec de la procédure PostgreSQL bootstrap_super_admin : ${rpcErr.message}`);
    }

    // 10. Enregistrer l'action dans le journal d'audit (uniquement si client serveur réel, sans jamais inclure le secret)
    if (clientOverride === undefined) {
      try {
        await dbLogAdminAction(
          {
            id: targetProfile.id,
            email: cleanEmail,
            name: targetProfile.name,
            role: 'admin',
            adminRole: 'super_admin'
          },
          'update_user',
          'user',
          targetProfile.id,
          cleanEmail,
          `Initialisation réussie du premier Super Administrateur via le serveur (IP: ${clientIp || 'interne'}). Bootstrap définitivement désactivé.`
        );
      } catch (logErr) {
        console.warn('Avertissement écriture audit log bootstrap:', logErr);
      }
    }

    return {
      success: true,
      message: String(rpcOutput || `Le compte ${cleanEmail} a été promu premier Super Administrateur avec succès.`),
      user: {
        id: targetProfile.id,
        email: cleanEmail,
        name: targetProfile.name,
        role: 'admin',
        adminRole: 'super_admin'
      }
    };
  } finally {
    isBootstrapInProgress = false;
  }
}

/**
 * Associe de façon déterministe les erreurs du flux de bootstrap aux codes HTTP appropriés :
 * - 503 : Supabase indisponible / fail-closed
 * - 409 : Super Admin déjà initialisé, bootstrap définitivement désactivé ou exécution concurrente
 * - 429 : Verrouillage temporaire anti-bruteforce (3 tentatives atteintes ou verrou actif)
 * - 403 : Secret incorrect (tentatives 1/3, 2/3) ou GBM_BOOTSTRAP_SECRET non configuré / trop court
 * - 404 : Compte cible inexistant
 * - 400 : E-mail invalide, non confirmé ou compte suspendu
 */
export function mapBootstrapErrorToHttpStatus(message: string): number {
  const msg = String(message || '');
  if (msg.includes('indisponible') || msg.includes('fail-closed')) {
    return 503;
  }
  if (
    msg.includes('existe déjà') ||
    msg.includes('définitivement désactivé') ||
    msg.includes('déjà été initialisé') ||
    msg.includes('en cours d’exécution')
  ) {
    return 409;
  }
  if (msg.includes('verrouillé') || msg.includes('tentatives')) {
    return 429;
  }
  if (
    msg.includes('incorrect') ||
    msg.includes('non configuré') ||
    msg.includes('au moins 12 caractères')
  ) {
    return 403;
  }
  if (msg.includes('Aucun compte utilisateur trouvé') || msg.includes('Compte inexistant')) {
    return 404;
  }
  return 400;
}

