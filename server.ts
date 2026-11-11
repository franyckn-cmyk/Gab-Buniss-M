import http from 'http';
import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import type { 
  Business, 
  Review, 
  Promotion, 
  BusinessReport, 
  Agency, 
  AdminAuditLog, 
  PlatformSettings, 
  AdminRole,
  UserAccount
} from './src/types/index.ts';
import { 
  supabaseServer, 
  isServerSupabaseConfigured, 
  verifySupabaseToken, 
  invalidateCachedToken, 
  checkSupabaseHealth 
} from './src/server/supabaseServer.ts';
import {
  dbGetAllBusinesses,
  dbGetBusinessByIdOrSlug,
  dbCreateBusiness,
  dbUpdateBusiness,
  dbDeleteBusiness,
  dbGetAllAgencies,
  dbGetAgenciesForBusiness,
  dbCreateAgency,
  dbUpdateAgency,
  dbDeleteAgency,
  dbAddBusinessOwner,
  dbIsUserPrimaryOwner,
  canUserManageBusiness,
  getUserOwnedBusinessIds,
  dbCreateReview,
  dbGetAllReviews,
  dbModerateReview,
  dbDeleteReview,
  dbReplyReview,
  dbGetPromotions,
  dbCreatePromotion,
  dbGetReports,
  dbCreateReport,
  dbResolveReport,
  dbGetAuditLogs,
  dbLogAdminAction,
  dbGetPlatformSettings,
  dbUpdatePlatformSettings,
  dbGetUsers,
  dbUpdateUserRole,
  filterBusinesses
} from './src/server/db.ts';
import { 
  executeSuperAdminBootstrap, 
  isBootstrapActive,
  mapBootstrapErrorToHttpStatus
} from './src/server/bootstrapAdmin.ts';
import { INITIAL_BUSINESSES } from './src/data/gabonData.ts';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveServerListenConfig(): { port: number; host: string } {
  const args = process.argv.slice(2);
  let cliPort: number | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        cliPort = parsed;
      }
      i++;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.substring('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        cliPort = parsed;
      }
    } else if (arg === '--host' && args[i + 1]) {
      cliHost = args[i + 1].trim() || undefined;
      i++;
    } else if (arg.startsWith('--host=')) {
      cliHost = arg.substring('--host='.length).trim() || undefined;
    }
  }

  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT) || 3000;

  const safeEnvPort =
    Number.isInteger(envPort) && envPort > 0 && envPort !== nginxPort
      ? envPort
      : undefined;

  return {
    port: cliPort ?? safeEnvPort ?? defaultAppPort,
    host: cliHost || process.env.HOST || '0.0.0.0'
  };
}

const app = express();
const { port: PORT, host: HOST } = resolveServerListenConfig();

// --- CORS & SÉCURITÉ MULTI-DOMAINES (PRODUCTION & DÉVELOPPEMENT) ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// --- SÉCURITÉ & AUTHENTIFICATION (RBAC & SUPABASE POSTGRESQL STRICT) ---
export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: 'visitor' | 'business_owner' | 'admin';
  adminRole?: AdminRole;
  ownedBusinessIds: string[];
}

export async function logAdminAction(
  user: ServerUser,
  action: AdminAuditLog['action'],
  targetType: AdminAuditLog['targetType'],
  targetId: string,
  targetName: string,
  details: string
): Promise<AdminAuditLog> {
  return dbLogAdminAction(user, action, targetType, targetId, targetName, details);
}

// SÉCURITÉ STRICTE : Aucun utilisateur de démonstration ni jeton mock.
// L'authentification repose exclusivement sur les tokens et profils Supabase Auth.
export async function getAuthenticatedUser(req: Request): Promise<ServerUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  if (isServerSupabaseConfigured()) {
    try {
      const sbUser = await verifySupabaseToken(token);
      if (sbUser) {
        // Obtenir la liste exacte et vérifiée des entreprises possédées
        const ownedIds = await getUserOwnedBusinessIds(sbUser.id, sbUser.email);
        const mappedUser: ServerUser = {
          id: sbUser.id,
          name: sbUser.name,
          email: sbUser.email,
          role: (sbUser.role === 'admin' ? 'admin' : sbUser.role === 'business_owner' ? 'business_owner' : 'visitor'),
          adminRole: sbUser.adminRole,
          ownedBusinessIds: ownedIds
        };
        return mappedUser;
      }
    } catch (e) {
      console.error('Erreur vérification token Supabase:', e);
    }
  }

  return null;
}

export async function requireAuth(req: Request, res: Response, next: () => void) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Accès non autorisé. Veuillez vous connecter avec un compte valide.' });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: () => void) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Accès interdit. Droits administrateur requis.' });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(403).json({ error: 'Vérification administrateur échouée.' });
  }
}

export async function canManageBusiness(user: ServerUser | null, businessId: string): Promise<boolean> {
  if (!user) return false;
  return canUserManageBusiness(user, businessId);
}

// Gemini AI client lazy initialization (évite toute erreur au démarrage si GEMINI_API_KEY est absente)
let _aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return _aiClient;
}

// --- API ROUTES ---

// SUPABASE STATUS CHECK
app.get('/api/supabase/status', async (_req: Request, res: Response) => {
  const health = await checkSupabaseHealth();
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  res.json({
    ...health,
    hasUrl: Boolean(url),
    urlStartsWithHttps: url.startsWith('https://'),
    urlIncludesPlaceholder: url.includes('your-project-id'),
    configuredKeys: {
      hasPublishableKey: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  });
});

// AUTH: POST /api/auth/login
// SÉCURITÉ STRICTE : Authentification exclusive avec vérification de mot de passe Supabase.
// Aucun mot de passe fictif, aucun compte de démonstration en dur.
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis.' });
    return;
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const cleanPass = String(password).trim();

  if (isServerSupabaseConfigured() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (error || !data?.session || !data?.user) {
        return res.status(401).json({ error: 'Identifiants invalides (adresse e-mail ou mot de passe erroné).' });
      }

      // Récupérer le profil et rôle officiel depuis PostgreSQL
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const ownedBusinessIds = await getUserOwnedBusinessIds(data.user.id, cleanEmail);

      const role = profile?.role === 'admin' ? 'admin' : (profile?.role === 'business_owner' ? 'business_owner' : 'visitor');
      const adminRole = profile?.admin_role || undefined;

      return res.json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          name: profile?.name || data.user.user_metadata?.name || cleanEmail.split('@')[0],
          email: data.user.email || cleanEmail,
          role,
          adminRole,
          ownedBusinessIds,
          emailConfirmed: Boolean(data.user.confirmed_at || data.user.email_confirmed_at)
        }
      });
    } catch (sbErr: any) {
      console.error('Erreur authentification Supabase:', sbErr);
      return res.status(500).json({ error: 'Service d’authentification indisponible.' });
    }
  }

  res.status(503).json({ error: 'Le serveur d’authentification Supabase n’est pas configuré.' });
});

// AUTH: POST /api/auth/register (Création de compte Propriétaire d'Entreprise)
// RÈGLE DE SÉCURITÉ : Rôle forcé à 'business_owner', AUCUN rôle 'admin' ne peut être passé par le client.
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nom complet, email et mot de passe requis.' });
    return;
  }

  const cleanEmail = String(email).toLowerCase().trim();

  if (isServerSupabaseConfigured() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer.auth.signUp({
        email: cleanEmail,
        password: String(password).trim(),
        options: {
          data: {
            name: String(name).trim(),
            role: 'business_owner', // Forcé côté serveur
            phone: phone ? String(phone).trim() : ''
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const userId = data.user?.id || `usr-${Date.now()}`;

      return res.status(201).json({
        success: true,
        message: 'Compte professionnel créé avec succès.',
        requiresEmailConfirmation: !data.session,
        user: {
          id: userId,
          name: String(name).trim(),
          email: cleanEmail,
          role: 'business_owner',
          ownedBusinessIds: []
        },
        token: data.session?.access_token || undefined
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erreur lors de la création du compte.' });
    }
  }

  res.status(503).json({ error: 'Le serveur d’authentification Supabase n’est pas configuré.' });
});

// AUTH: POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    invalidateCachedToken(token);
  }
  res.json({ success: true, message: 'Déconnexion effectuée avec succès.' });
});

// AUTH: GET /api/auth/me
app.get('/api/auth/me', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Session non authentifiée ou expirée.' });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    adminRole: user.adminRole,
    ownedBusinessIds: user.ownedBusinessIds
  });
});

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  let count = 0;
  let dbStatus = 'connected';
  try {
    const businesses = await dbGetAllBusinesses();
    count = businesses.length;
  } catch (err: any) {
    dbStatus = 'schema_pending_or_unmigrated';
  }
  res.json({
    status: 'ok',
    app: 'Gabon Business Map API',
    database: dbStatus,
    businessesCount: count,
    timestamp: new Date().toISOString()
  });
});

// Vérifie si l'accès HTTP local exceptionnel au bootstrap est explicitement activé sur boucle locale sans proxy
function isAuthorizedLocalBootstrapHttpRequest(req: Request): boolean {
  if (process.env.GBM_ENABLE_LOCAL_HTTP_BOOTSTRAP !== 'true') {
    return false;
  }
  if (
    req.headers['x-forwarded-for'] ||
    req.headers['forwarded'] ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip']
  ) {
    return false;
  }
  const remoteAddr = req.socket?.remoteAddress || '';
  return (
    remoteAddr === '127.0.0.1' ||
    remoteAddr === '::1' ||
    remoteAddr === '::ffff:127.0.0.1'
  );
}

// BOOTSTRAP SUPER ADMIN (Désactivé sur réseau public ; privilégier le script local côté serveur npm run bootstrap:admin)
app.get('/api/admin/bootstrap-status', async (req: Request, res: Response) => {
  if (!isAuthorizedLocalBootstrapHttpRequest(req)) {
    res.status(403).json({
      available: false,
      error:
        'Endpoint désactivé sur le réseau public pour des raisons de sécurité. Utilisez exclusivement la procédure locale côté serveur : npm run bootstrap:admin -- --email="..."'
    });
    return;
  }

  try {
    const status = await isBootstrapActive();
    if (
      !status.active &&
      (status.reason?.includes('indisponible') ||
        status.reason?.includes('fail-closed') ||
        status.reason?.includes('impossible'))
    ) {
      res.status(503).json({
        available: false,
        reason: status.reason
      });
      return;
    }
    res.json({
      available: status.active,
      reason: status.reason || null
    });
  } catch (err: any) {
    res.status(503).json({
      available: false,
      error: err.message
    });
  }
});

app.post('/api/admin/bootstrap-super-admin', async (req: Request, res: Response) => {
  if (!isAuthorizedLocalBootstrapHttpRequest(req)) {
    res.status(403).json({
      error:
        'Endpoint HTTP public désactivé pour des raisons de sécurité. Exécutez la procédure locale côté serveur avec GBM_BOOTSTRAP_SECRET défini : npm run bootstrap:admin -- --email="..."'
    });
    return;
  }

  const { email, bootstrapSecret } = req.body;
  const headerSecret = req.headers['x-bootstrap-secret'] as string;
  const secretToUse = bootstrapSecret || headerSecret;

  if (!email || !secretToUse) {
    res.status(400).json({
      error: 'Adresse e-mail et secret d’initialisation (x-bootstrap-secret ou bootstrapSecret) requis.'
    });
    return;
  }

  const clientIp = req.socket?.remoteAddress || req.ip || '127.0.0.1';

  try {
    const result = await executeSuperAdminBootstrap({
      targetEmail: String(email).trim(),
      bootstrapSecret: String(secretToUse).trim(),
      clientIp
    });

    res.json(result);
  } catch (err: any) {
    const msg = err?.message || 'Erreur lors de l’initialisation du Super Administrateur.';
    res.status(mapBootstrapErrorToHttpStatus(msg)).json({ error: msg });
  }
});


// GET all businesses with flexible search and filtering (Authoritative Supabase PostgreSQL with read fallback)
app.get('/api/businesses', async (req: Request, res: Response) => {
  const { q, province, city, category, verifiedOnly, minRating, limit } = req.query;

  try {
    const viewer = await getAuthenticatedUser(req);
    const results = await dbGetAllBusinesses({
      q: typeof q === 'string' ? q : undefined,
      province: typeof province === 'string' ? province : undefined,
      city: typeof city === 'string' ? city : undefined,
      category: typeof category === 'string' ? category : undefined,
      verifiedOnly: verifiedOnly === 'true',
      minRating: typeof minRating === 'string' ? parseFloat(minRating) : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      viewer
    });

    res.json(results);
  } catch (_error: any) {
    const fallback = filterBusinesses(INITIAL_BUSINESSES, {
      q: typeof q === 'string' ? q : undefined,
      province: typeof province === 'string' ? province : undefined,
      city: typeof city === 'string' ? city : undefined,
      category: typeof category === 'string' ? category : undefined,
      verifiedOnly: verifiedOnly === 'true',
      minRating: typeof minRating === 'string' ? parseFloat(minRating) : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined
    });
    res.json(fallback);
  }
});

// GET single business by id or slug
app.get('/api/businesses/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const viewer = await getAuthenticatedUser(req);
    const { business, reviews, promotions } = await dbGetBusinessByIdOrSlug(req.params.idOrSlug, {
      includeUnpublishedReviews: Boolean(viewer && viewer.role === 'admin')
    });

    if (!business) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    const canViewUnverified = Boolean(
      viewer &&
        (viewer.role === 'admin' ||
          viewer.ownedBusinessIds.includes(business.id) ||
          (viewer.email && business.claimedByEmail?.toLowerCase() === viewer.email.toLowerCase()))
    );

    if (business.status !== 'verified' && !canViewUnverified) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    res.json({
      ...business,
      reviews,
      promotions
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la fiche' });
  }
});

// POST new business (Secured ownership association & public submission endpoint)
app.post('/api/businesses', async (req: Request, res: Response) => {
  const data = req.body;
  const user = await getAuthenticatedUser(req);

  const cleanName = String(data?.name || '').trim();
  const cleanCategory = String(data?.category || '').trim();
  if (!cleanName || !cleanCategory) {
    res.status(400).json({ error: 'Champs obligatoires manquants (nom, catégorie).' });
    return;
  }

  try {
    const newBusiness = await dbCreateBusiness(data, user);

    if (user) {
      // Rafraîchir le cache du jeton pour refléter immédiatement la promotion éventuelle de 'visitor' -> 'business_owner'
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        invalidateCachedToken(authHeader.substring(7).trim());
      }

      if (user.role === 'admin') {
        await logAdminAction(
          user,
          'create_business',
          'business',
          newBusiness.id,
          newBusiness.name,
          `Création directe de la fiche entreprise par l’administrateur (${newBusiness.location.city}, ${newBusiness.location.province}).`
        );
      }
    }

    // Notification interne
    console.log(`[Notification] Nouvelle entreprise créée : ${newBusiness.name} (ID: ${newBusiness.id})`);

    res.status(201).json(newBusiness);
  } catch (error: any) {
    console.error('Erreur création entreprise:', error);
    const statusCode = error?.message?.includes('Authentification') ? 401 : 400;
    res.status(statusCode).json({ error: error.message || 'Erreur lors de la création de l’entreprise' });
  }
});

// PUT update business (admin / verified owner)
app.put('/api/businesses/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const allowed = await canManageBusiness(user, id);
  if (!allowed) {
    res.status(403).json({ error: 'Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.' });
    return;
  }

  try {
    const updated = await dbUpdateBusiness(id, req.body, user);
    if (!updated) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    if (user.role === 'admin') {
      await logAdminAction(
        user,
        'update_business',
        'business',
        id,
        updated.name,
        'Modification complète de la fiche entreprise par l’administrateur.'
      );
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour' });
  }
});

// DELETE business (admin only)
app.delete('/api/businesses/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = (req as any).user as ServerUser;

  try {
    const { business } = await dbGetBusinessByIdOrSlug(id, { skipViewIncrement: true });
    const targetName = business ? business.name : id;
    const success = await dbDeleteBusiness(id, user);

    if (!success) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    await logAdminAction(
      user,
      'delete_business',
      'business',
      id,
      targetName,
      `Suppression définitive de l’entreprise de l’annuaire.`
    );

    res.json({ success: true, message: 'Entreprise supprimée avec succès' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression' });
  }
});

// --- GESTION SÉCURISÉE DES CO-PROPRIÉTAIRES (ANTI-AUTO-ATTRIBUTION) ---
// POST /api/businesses/:id/owners
// Seul le propriétaire principal vérifié ou un administrateur peut associer un nouvel utilisateur.
app.post('/api/businesses/:id/owners', requireAuth, async (req: Request, res: Response) => {
  const bizId = req.params.id;
  const user = (req as any).user as ServerUser;
  const { email: targetEmail, role = 'owner' } = req.body;

  if (!targetEmail) {
    res.status(400).json({ error: 'Adresse e-mail du co-propriétaire requise.' });
    return;
  }

  try {
    const result = await dbAddBusinessOwner(bizId, String(targetEmail).trim(), role, user);
    await logAdminAction(
      user,
      'update_user',
      'business',
      bizId,
      `Entreprise ${bizId}`,
      `Association de l'utilisateur ${targetEmail} en tant que ${role}.`
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erreur lors de l’association du propriétaire.' });
  }
});

// --- BRANCHES / AGENCES ROUTES (Authoritative Supabase PostgreSQL) ---

// GET all branches across all businesses
app.get('/api/branches', async (_req: Request, res: Response) => {
  try {
    const agencies = await dbGetAllAgencies();
    res.json(agencies);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur chargement des agences' });
  }
});

// GET branches for a specific business
app.get('/api/businesses/:id/branches', async (req: Request, res: Response) => {
  try {
    const agencies = await dbGetAgenciesForBusiness(req.params.id);
    res.json(agencies);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur chargement des agences de l’entreprise' });
  }
});

// POST add a new branch to a business
app.post('/api/businesses/:id/branches', async (req: Request, res: Response) => {
  const bizId = req.params.id;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const allowed = await canManageBusiness(user, bizId);
  if (!allowed) {
    res.status(403).json({ error: 'Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.' });
    return;
  }

  const data = req.body;
  if (!data.name || !data.location?.city || !data.location?.province) {
    res.status(400).json({ error: 'Nom, ville et province de l’agence obligatoires' });
    return;
  }

  try {
    const newAgency = await dbCreateAgency(bizId, data, user);
    res.status(201).json(newAgency);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la création de l’agence' });
  }
});

// PUT update an existing branch
app.put('/api/businesses/:id/branches/:branchId', async (req: Request, res: Response) => {
  const { id: bizId, branchId } = req.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const allowed = await canManageBusiness(user, bizId);
  if (!allowed) {
    res.status(403).json({ error: 'Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.' });
    return;
  }

  try {
    const updated = await dbUpdateAgency(bizId, branchId, req.body, user);
    if (!updated) {
      res.status(404).json({ error: 'Agence introuvable' });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour de l’agence' });
  }
});

// DELETE remove a branch
app.delete('/api/businesses/:id/branches/:branchId', async (req: Request, res: Response) => {
  const { id: bizId, branchId } = req.params;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const allowed = await canManageBusiness(user, bizId);
  if (!allowed) {
    res.status(403).json({ error: 'Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.' });
    return;
  }

  try {
    const success = await dbDeleteAgency(bizId, branchId, user);
    if (!success) {
      res.status(404).json({ error: 'Agence introuvable' });
      return;
    }
    res.json({ success: true, message: 'Agence supprimée avec succès' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la suppression de l’agence' });
  }
});

// Action stats increment (call, whatsapp, itinerary, favorite)
app.post('/api/businesses/:id/action-stat', async (req: Request, res: Response) => {
  const id = req.params.id;
  const { action } = req.body;
  try {
    const { business } = await dbGetBusinessByIdOrSlug(id, { skipViewIncrement: true });
    if (!business) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    if (action === 'phone') business.stats.phoneClicks += 1;
    else if (action === 'whatsapp') business.stats.whatsappClicks += 1;
    else if (action === 'route') business.stats.routeClicks += 1;
    else if (action === 'favorite') business.stats.favorites += 1;

    if (isServerSupabaseConfigured() && supabaseServer) {
      const colMap: Record<string, string> = {
        phone: 'phone_clicks',
        whatsapp: 'whatsapp_clicks',
        route: 'route_clicks',
        favorite: 'favorites_count'
      };
      const colName = colMap[action];
      if (colName) {
        const val = action === 'phone' ? business.stats.phoneClicks 
          : action === 'whatsapp' ? business.stats.whatsappClicks 
          : action === 'route' ? business.stats.routeClicks 
          : business.stats.favorites;
        await supabaseServer.from('businesses').update({ [colName]: val }).eq('id', id);
      }
    }

    res.json({ success: true, stats: business.stats });
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur stat' });
  }
});

// POST review (créé en statut 'pending' pour modération préalable)
app.post('/api/businesses/:id/reviews', async (req: Request, res: Response) => {
  const businessId = req.params.id;
  const { authorName, authorCity, rating, comment, photos } = req.body;

  if (!authorName || !comment || !rating) {
    res.status(400).json({ error: 'Nom, note et commentaire obligatoires' });
    return;
  }

  try {
    const review = await dbCreateReview(businessId, { authorName, authorCity, rating, comment, photos });
    const { business } = await dbGetBusinessByIdOrSlug(businessId, { skipViewIncrement: true });
    res.status(201).json({
      review,
      pendingModeration: review.status !== 'published',
      businessRating: business?.rating ?? 5.0,
      reviewsCount: business?.reviewsCount ?? 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la soumission de l’avis' });
  }
});

// GET reviews (seuls les avis 'published' sont visibles publiquement ; les administrateurs voient tous les statuts)
app.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const isAdmin = Boolean(user && user.role === 'admin');
    const allReviews = await dbGetAllReviews(isAdmin);
    res.json(allReviews);
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur récupération avis' });
  }
});

// PUT moderate review (admin only — appelle la procédure SQL moderate_review)
app.put('/api/reviews/:id/moderate', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = (req as any).user as ServerUser;
  const { action } = req.body;

  if (!['publish', 'hide', 'flag'].includes(action)) {
    res.status(400).json({ error: 'Action de modération invalide (attendu : publish, hide ou flag).' });
    return;
  }

  try {
    const updatedReview = await dbModerateReview(id, action, user);
    if (!updatedReview) {
      res.status(404).json({ error: 'Avis introuvable' });
      return;
    }
    res.json({ success: true, review: updatedReview });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Action de modération refusée.' });
  }
});

// DELETE review (admin only)
app.delete('/api/reviews/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = (req as any).user as ServerUser;
  try {
    await dbDeleteReview(id, user);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur suppression avis' });
  }
});

// PUT reply to review (pro owner / admin)
app.put('/api/reviews/:id/reply', async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const { replyText, responderName } = req.body;
  try {
    const updatedReview = await dbReplyReview(
      id,
      replyText || '',
      responderName || user.name || 'Direction de l’établissement',
      user
    );
    if (!updatedReview) {
      res.status(404).json({ error: 'Avis introuvable' });
      return;
    }
    res.json({ success: true, review: updatedReview });
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Action non autorisée.' });
  }
});

// GET all reports (admin only)
app.get('/api/reports', requireAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user as ServerUser;
  try {
    const reports = await dbGetReports(user);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT resolve report (admin only)
app.put('/api/reports/:id/resolve', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = (req as any).user as ServerUser;
  try {
    await dbResolveReport(id, user);
    res.json({ success: true, message: 'Signalement résolu' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload media to Supabase Storage bucket 'business-media' (authenticated owner/admin or pre-creation staging)
app.post('/api/upload/business-media', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as ServerUser;

  if (!isServerSupabaseConfigured() || !supabaseServer) {
    res.status(503).json({ error: 'Le stockage Supabase Storage n’est pas configuré sur le serveur.' });
    return;
  }

  const { businessId, category = 'gallery', mimeType, base64Data } = req.body || {};

  const allowedMimeTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  if (typeof mimeType !== 'string' || !allowedMimeTypes[mimeType]) {
    res.status(400).json({
      error: 'Format d’image non autorisé. Seuls JPEG, PNG et WEBP sont acceptés dans business-media.'
    });
    return;
  }

  if (typeof base64Data !== 'string' || !base64Data.trim()) {
    res.status(400).json({ error: 'Données binaires de l’image manquantes.' });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data.trim(), 'base64');
  } catch {
    res.status(400).json({ error: 'Encodage base64 invalide.' });
    return;
  }

  const MAX_BYTES = 5 * 1024 * 1024;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    res.status(400).json({ error: 'La taille de l’image doit être comprise entre 1 octet et 5 Mo.' });
    return;
  }

  // Vérification des octets magiques (magic bytes) pour prévenir toute falsification de Content-Type
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (
    (mimeType === 'image/jpeg' && !isJpeg) ||
    (mimeType === 'image/png' && !isPng) ||
    (mimeType === 'image/webp' && !isWebp)
  ) {
    res.status(400).json({ error: 'Contenu binaire non conforme au format d’image déclaré.' });
    return;
  }

  const cleanCategory = ['logo', 'cover', 'gallery', 'agency'].includes(String(category))
    ? String(category)
    : 'gallery';

  let folderPrefix = `staging_${user.id}`;
  if (typeof businessId === 'string' && businessId.trim() && businessId.trim() !== 'new') {
    const cleanBizId = businessId.trim();
    const allowed = await canManageBusiness(user, cleanBizId);
    if (!allowed) {
      res.status(403).json({
        error: 'Action non autorisée. Vous devez être propriétaire ou administrateur de cette entreprise.'
      });
      return;
    }
    folderPrefix = cleanBizId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  const ext = allowedMimeTypes[mimeType];
  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const storagePath = `${folderPrefix}/${cleanCategory}/${uniqueSuffix}.${ext}`;

  try {
    const { data, error } = await supabaseServer.storage
      .from('business-media')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error || !data) {
      res.status(500).json({
        error: `Échec du téléversement dans Supabase Storage (business-media) : ${error?.message || 'Erreur inconnue'}`
      });
      return;
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from('business-media')
      .getPublicUrl(data.path);

    res.status(201).json({
      url: publicUrlData.publicUrl,
      path: data.path,
      bucket: 'business-media'
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur serveur lors du téléversement.' });
  }
});

// PUT update company images (logo, cover, gallery) (owner / admin)
app.put('/api/businesses/:id/images', async (req: Request, res: Response) => {
  const id = req.params.id;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  const allowed = await canManageBusiness(user, id);
  if (!allowed) {
    res.status(403).json({ error: 'Action non autorisée. Vous devez être propriétaire de cette entreprise pour modifier ses photos.' });
    return;
  }

  const { logo, coverImage, images } = req.body;
  try {
    const updated = await dbUpdateBusiness(id, { logo, coverImage, images }, user);
    if (!updated) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    if (user.role === 'admin') {
      await logAdminAction(
        user,
        'update_media',
        'business',
        id,
        updated.name,
        `Mise à jour des médias de l’entreprise (${updated.images.length} photo(s) en galerie).`
      );
    }

    res.json({
      success: true,
      message: 'Images mises à jour avec succès',
      business: updated,
      logo: updated.logo,
      coverImage: updated.coverImage,
      images: updated.images
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST report review or business (public with validation)
app.post('/api/businesses/:id/report', async (req: Request, res: Response) => {
  const businessId = req.params.id;
  const { reason, details, reporterEmail } = req.body;

  try {
    const { business } = await dbGetBusinessByIdOrSlug(businessId, { skipViewIncrement: true });
    if (!business) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    const report = await dbCreateReport({
      businessId,
      businessName: business.name,
      reason,
      details,
      reporterEmail
    });

    res.status(201).json({ success: true, message: 'Signalement transmis à l’équipe de modération.', report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET promotions
app.get('/api/promotions', async (_req: Request, res: Response) => {
  try {
    const promos = await dbGetPromotions();
    res.json(promos);
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur chargement promotions' });
  }
});

// POST promotion (pro owner / admin)
app.post('/api/promotions', async (req: Request, res: Response) => {
  const data = req.body;
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  try {
    const newPromo = await dbCreatePromotion(data, user);
    res.status(201).json(newPromo);
  } catch (error: any) {
    res.status(403).json({ error: error.message || 'Action non autorisée.' });
  }
});

// AUTH: POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Adresse e-mail requise.' });
    return;
  }

  const cleanEmail = String(email).toLowerCase().trim();

  if (isServerSupabaseConfigured() && supabaseServer) {
    try {
      const { error } = await supabaseServer.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({
        success: true,
        message: 'Un lien de réinitialisation sécurisé a été envoyé par email via Supabase Auth.'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erreur lors de la réinitialisation.' });
    }
  }

  res.status(503).json({ error: 'Service de réinitialisation Supabase indisponible.' });
});

// GET admin dashboard stats (admin only)
app.get('/api/admin/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user as ServerUser;
    const businesses = await dbGetAllBusinesses({ viewer: admin, ignoreVisibility: true });
    const reports = await dbGetReports({ role: 'admin' });

    const totalBusinesses = businesses.length;
    const verifiedBusinesses = businesses.filter(b => b.status === 'verified').length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;

    const byProvince: Record<string, number> = {};
    for (const b of businesses) {
      byProvince[b.location.province] = (byProvince[b.location.province] || 0) + 1;
    }

    const byCategory: Record<string, number> = {};
    for (const b of businesses) {
      byCategory[b.category] = (byCategory[b.category] || 0) + 1;
    }

    res.json({
      totalBusinesses,
      verifiedBusinesses,
      totalReviews: businesses.reduce((acc, b) => acc + (b.reviewsCount || 0), 0),
      pendingReports,
      byProvince,
      byCategory,
      recentReports: reports.slice(0, 5),
      topBusinesses: [...businesses].sort((a, b) => b.stats.views - a.stats.views).slice(0, 5)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/businesses/:id/status (requireAdmin)
app.put('/api/businesses/:id/status', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const { status, reason } = req.body;
  const validStatuses = ['verified', 'unverified', 'pending', 'suspended'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Statut invalide' });
    return;
  }

  const admin = (req as any).user as ServerUser;

  try {
    const { business: oldBiz } = await dbGetBusinessByIdOrSlug(id, { skipViewIncrement: true });
    if (!oldBiz) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    const updated = await dbUpdateBusiness(id, { status } as any, admin);

    let action: AdminAuditLog['action'] = 'update_business';
    if (status === 'verified') action = 'publish_business';
    else if (status === 'unverified') action = 'unpublish_business';
    else if (status === 'suspended') action = 'suspend_business';

    await logAdminAction(
      admin,
      action,
      'business',
      id,
      oldBiz.name,
      `Changement de statut : ${oldBiz.status} → ${status}${reason ? ` (Motif : ${reason})` : ''}`
    );

    res.json({ success: true, business: updated, newStatus: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/businesses/:id/feature (requireAdmin)
app.put('/api/businesses/:id/feature', requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const { featured } = req.body;
  const admin = (req as any).user as ServerUser;

  try {
    const { business } = await dbGetBusinessByIdOrSlug(id, { skipViewIncrement: true });
    if (!business) {
      res.status(404).json({ error: 'Entreprise introuvable' });
      return;
    }

    const updated = await dbUpdateBusiness(id, { featured: Boolean(featured) } as any, admin);

    await logAdminAction(
      admin,
      'feature_business',
      'business',
      id,
      business.name,
      Boolean(featured) ? 'Entreprise mise en avant (Badge Sponsorisé/À la Une)' : 'Retrait de la mise en avant'
    );

    res.json({ success: true, featured: updated?.featured, business: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/audit-logs (requireAdmin)
app.get('/api/admin/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  const { action, targetType, search, limit } = req.query;
  try {
    const logs = await dbGetAuditLogs({
      action: typeof action === 'string' ? action : undefined,
      targetType: typeof targetType === 'string' ? targetType : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/audit-logs (requireAdmin)
app.post('/api/admin/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).user as ServerUser;
  const { action, targetType, targetId, targetName, details } = req.body;
  if (!action || !targetType || !targetName) {
    res.status(400).json({ error: 'Données de log incomplètes' });
    return;
  }

  try {
    const log = await logAdminAction(admin, action, targetType, targetId || '', targetName, details || '');
    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users (requireAdmin)
app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).user as ServerUser;
  try {
    const users = await dbGetUsers(admin);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/role (requireAdmin)
app.put('/api/admin/users/:id/role', requireAdmin, async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { role, adminRole } = req.body;
  const admin = (req as any).user as ServerUser;

  try {
    const success = await dbUpdateUserRole(targetId, role, adminRole, admin);
    if (!success) {
      res.status(404).json({ error: 'Impossible de mettre à jour le rôle (utilisateur introuvable ou table non migrée).' });
      return;
    }

    await logAdminAction(
      admin,
      'update_user',
      'user',
      targetId,
      `Utilisateur ${targetId}`,
      `Modification du rôle par l'administrateur : ${role} (${adminRole || 'aucun rôle admin'})`
    );

    res.json({ success: true, message: 'Rôle mis à jour' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/settings (requireAdmin)
app.get('/api/admin/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await dbGetPlatformSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/settings (requireAdmin)
app.put('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).user as ServerUser;
  try {
    const settings = await dbUpdatePlatformSettings(req.body, admin);
    await logAdminAction(
      admin,
      'update_settings',
      'platform',
      'settings',
      'Paramètres Plateforme',
      `Mise à jour des paramètres système de Gabon Business Map.`
    );
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST AI Assistant query grounded in real database
app.post('/api/ai-assistant', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Le message est requis.' });
      return;
    }

    console.log('[AI] Received message:', message.slice(0, 50));
    // Grounding dynamique issu de la base de données PostgreSQL
    const businesses = await dbGetAllBusinesses();
    console.log('[AI] Businesses count:', businesses.length);
    const businessesContext = businesses.map(b => ({
      id: b.id,
      nom: b.name,
      secteur: b.category,
      province: b.location.province,
      ville: b.location.city,
      quartier: b.location.district,
      note: b.rating,
      avis: b.reviewsCount,
      telephone: b.contact.phone,
      whatsapp: b.contact.whatsapp,
      services: b.details.services.join(', '),
      description: b.description,
      coordonnees: b.location.coordinates
    }));

    const systemPrompt = `Tu es l'Assistant IA officiel de « GABON BUSINESS MAP », la plateforme nationale de localisation et d'annuaire des entreprises au Gabon.
Mission : Aider les citoyens, touristes, professionnels et investisseurs à trouver avec exactitude des entreprises au Gabon.

RÈGLES STRICTES :
1. Tu dois UNIQUEMENT t'appuyer sur la base de données réelle fournie ci-dessous pour recommander des entreprises et donner des coordonnées ou des localisations.
2. NE JAMAIS inventer une entreprise imaginaire, ni un faux numéro de téléphone. Si aucune entreprise de la base ne correspond exactement, explique cordialement que la plateforme s'enrichit continuellement et propose les alternatives les plus proches.
3. Sois chaleureux, professionnel, précis, fier des atouts du Gabon (9 provinces : Estuaire, Haut-Ogooué, Moyen-Ogooué, Ngounié, Nyanga, Ogooué-Ivindo, Ogooué-Lolo, Ogooué-Maritime, Woleu-Ntem).
4. Quand tu recommandes une entreprise de la base, mentionne son nom exact, sa ville, son quartier, ses coordonnées de contact, et mentionne que l'utilisateur peut la visualiser directement sur la carte interactive.
5. Inclus à la fin de ta réponse un bloc JSON sous la balise [MATCHED_BUSINESS_IDS: ["id1", "id2"]] listant les IDs exacts des entreprises mentionnées pour que l'interface puisse afficher les boutons d'accès rapide.

BASE DE DONNÉES DES ENTREPRISES ENREGISTRÉES AU GABON :
${JSON.stringify(businessesContext, null, 2)}
`;

    const aiClient = getGeminiClient();
    console.log('[AI] aiClient exists:', Boolean(aiClient));

    let replyText = '';
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

    if (aiClient) {
      for (const model of candidateModels) {
        try {
          console.log(`[AI] Attempting generateContent with model: ${model}`);
          const response = await aiClient.models.generateContent({
            model,
            contents: message,
            config: {
              systemInstruction: systemPrompt
            }
          });
          if (response && response.text) {
            replyText = response.text;
            console.log(`[AI] Response received successfully from ${model}`);
            break;
          }
        } catch (genErr: any) {
          console.warn(`[AI] Model ${model} failed:`, genErr?.message || genErr);
        }
      }
    }

    if (!replyText) {
      // Intelligent database grounding fallback if upstream LLM is unreachable or rate-limited
      const queryLower = message.toLowerCase();
      const matched = businesses.filter(b => {
        const nameMatch = b.name.toLowerCase().includes(queryLower) || queryLower.includes(b.name.toLowerCase());
        const catMatch = b.category.toLowerCase().includes(queryLower) || queryLower.includes(b.category.toLowerCase());
        const cityMatch = b.location.city.toLowerCase().includes(queryLower) || queryLower.includes(b.location.city.toLowerCase());
        const provMatch = b.location.province.toLowerCase().includes(queryLower) || queryLower.includes(b.location.province.toLowerCase());
        const servicesMatch = b.details.services.some(s => queryLower.includes(s.toLowerCase()));
        return nameMatch || catMatch || cityMatch || provMatch || servicesMatch;
      }).slice(0, 5);

      if (matched.length > 0) {
        const listText = matched.map(b => 
          `• **${b.name}** (${b.category})\n  📍 ${b.location.city}, quartier ${b.location.district} | 📞 ${b.contact.phone || 'Non renseigné'}`
        ).join('\n\n');
        replyText = `Bonjour ! Voici les établissements répertoriés dans l'annuaire officiel du Gabon correspondant à votre recherche :\n\n${listText}\n\nVous pouvez cliquer sur une fiche pour la localiser directement sur la carte interactive du Gabon.\n\n[MATCHED_BUSINESS_IDS: ${JSON.stringify(matched.map(m => m.id))}]`;
      } else {
        replyText = `Bonjour ! Je suis l'assistant officiel de « GABON BUSINESS MAP ». Notre plateforme répertorie ${businesses.length} entreprises vérifiées à travers les 9 provinces du Gabon. Vous pouvez explorer les entreprises par province (Estuaire, Haut-Ogooué, Ogooué-Maritime...) ou par secteur d'activité directement depuis la carte interactive et le répertoire.`;
      }
    }

    let matchedIds: string[] = [];
    const match = replyText.match(/\[MATCHED_BUSINESS_IDS:\s*(\[.*?\])\s*\]/s);
    if (match && match[1]) {
      try {
        matchedIds = JSON.parse(match[1]);
      } catch (e) {
        // ignore
      }
    }

    const cleanReply = replyText.replace(/\[MATCHED_BUSINESS_IDS:\s*\[.*?\]\s*\]/gs, '').trim();
    const matchedBusinesses = businesses.filter(b => matchedIds.includes(b.id));

    res.json({
      reply: cleanReply,
      matchedBusinesses
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de réponse de l’assistant IA.',
      details: error.message || String(error)
    });
  }
});

// Configure Vite middleware in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    let viteMiddleware: any = null;
    let viteInitError: Error | null = null;

    const viteInitPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          ...(process.env.DISABLE_HMR === 'true'
            ? { hmr: false }
            : { ws: { server: httpServer } })
        },
        appType: 'spa'
      });
      viteMiddleware = vite.middlewares;
    })().catch((err) => {
      viteInitError = err instanceof Error ? err : new Error(String(err));
      console.error('Erreur initialisation Vite middleware:', viteInitError);
    });

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      if (!viteMiddleware && !viteInitError) {
        await viteInitPromise;
      }
      if (viteInitError) {
        res.status(500).send(`Erreur initialisation Vite : ${viteInitError.message}`);
        return;
      }
      if (viteMiddleware) {
        viteMiddleware(req, res, next);
        return;
      }
      next();
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Route API introuvable' });
        return;
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`❌ Impossible de démarrer le serveur HTTP sur ${HOST}:${PORT} :`, err.message);
    process.exit(1);
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`🇬🇦 Gabon Business Map server running on http://${HOST}:${PORT}`);
  });
}

startServer();
