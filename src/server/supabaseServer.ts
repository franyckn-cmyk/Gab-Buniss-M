import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export function getSupabaseUrl(): string {
  const raw = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

// Server secret key: prefer SUPABASE_SECRET_KEY (new format sb_secret_...), fallback to SUPABASE_SERVICE_ROLE_KEY (legacy)
export function getSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    ''
  ).trim();
}

// Client publishable key: prefer VITE_SUPABASE_PUBLISHABLE_KEY (new format sb_publishable_...), fallback to VITE_SUPABASE_ANON_KEY (legacy)
export function getSupabasePublishableKey(): string {
  return (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 
    ''
  ).trim();
}

// Active key on server: prefer secret key for admin/service operations, fallback to publishable/anon
export function getSupabaseKey(): string {
  return getSupabaseSecretKey() || getSupabasePublishableKey();
}

export const isServerSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(
    url && 
    key && 
    url.startsWith('https://') &&
    !url.includes('your-project-id')
  );
};

let _supabaseServerInstance: SupabaseClient | null = null;
export function getSupabaseServer(): SupabaseClient | null {
  if (_supabaseServerInstance) return _supabaseServerInstance;
  if (!isServerSupabaseConfigured()) return null;
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  _supabaseServerInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  return _supabaseServerInstance;
}

export const supabaseServer: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseServer();
    if (!client) return undefined;
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

/**
 * Cache for verified user sessions: token -> { user, cachedAt }
 */
interface CachedUser {
  id: string;
  name: string;
  email: string;
  role: 'visitor' | 'owner' | 'business_owner' | 'admin';
  adminRole?: 'super_admin' | 'admin' | 'moderator';
  ownedBusinessIds: string[];
}

const tokenCache = new Map<string, { user: CachedUser; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache

/**
 * Verifies a Bearer JWT token with Supabase Auth and fetches the user's authoritative profile
 */
export async function verifySupabaseToken(token: string): Promise<CachedUser | null> {
  if (!token || !supabaseServer) return null;

  // Check memory cache first
  const cached = tokenCache.get(token);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.user;
  }

  try {
    const { data: { user: sbUser }, error } = await supabaseServer.auth.getUser(token);
    if (error || !sbUser) {
      tokenCache.delete(token);
      return null;
    }

    // Fetch authoritative profile from PostgreSQL public.profiles
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('id, name, email, role, admin_role, status')
      .eq('id', sbUser.id)
      .single();

    // Check if account is suspended
    if (profile && profile.status === 'suspended') {
      return null;
    }

    // Fetch owned businesses from public.business_owners
    const { data: ownedRows } = await supabaseServer
      .from('business_owners')
      .select('business_id')
      .eq('user_id', sbUser.id);

    const ownedBusinessIds = ownedRows ? ownedRows.map(r => r.business_id) : [];

    // Map roles: 'super_admin' -> role 'admin' + adminRole 'super_admin'
    let resolvedRole: 'visitor' | 'business_owner' | 'admin' = 'business_owner';
    let resolvedAdminRole: 'super_admin' | 'admin' | 'moderator' | undefined = undefined;

    if (profile) {
      if (profile.role === 'admin') {
        resolvedRole = 'admin';
        resolvedAdminRole = profile.admin_role || 'admin';
      } else if (profile.role === 'owner' || profile.role === 'business_owner') {
        resolvedRole = 'business_owner';
      } else {
        resolvedRole = 'visitor';
      }
    } else {
      // SÉCURITÉ STRICTE : Si le profil PostgreSQL n'existe pas dans public.profiles,
      // user_metadata.role ne peut JAMAIS accorder de droits administrateur.
      // Seul un enregistrement dans public.profiles avec role = 'admin' et status = 'active' confère des droits admin.
      if (sbUser.user_metadata?.role === 'business_owner') {
        resolvedRole = 'business_owner';
      } else {
        resolvedRole = 'visitor';
      }
      resolvedAdminRole = undefined;
    }

    const verifiedUser: CachedUser = {
      id: sbUser.id,
      name: profile?.name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Utilisateur',
      email: sbUser.email || '',
      role: resolvedRole,
      adminRole: resolvedAdminRole,
      ownedBusinessIds
    };

    tokenCache.set(token, { user: verifiedUser, cachedAt: Date.now() });
    return verifiedUser;
  } catch (err) {
    console.error('Error verifying Supabase token on server:', err);
    return null;
  }
}

/**
 * Invalidate cached session
 */
export function invalidateCachedToken(token: string) {
  tokenCache.delete(token);
}

/**
 * Health check on Supabase connection
 */
export async function checkSupabaseHealth() {
  const client = getSupabaseServer();
  if (!client) {
    return {
      connected: false,
      configured: false,
      message: 'Variables d’environnement Supabase non renseignées.'
    };
  }

  let secretKeyOk = false;
  let secretKeyError: string | null = null;
  let publishableKeyOk = false;
  let publishableKeyError: string | null = null;

  // Key resolution: prefer new official names, fallback to legacy
  const activeSecretKey = getSupabaseSecretKey();
  const activePublishableKey = getSupabasePublishableKey();
  const cleanUrl = getSupabaseUrl();

  function detectKeyType(k: string): { format: 'new_sb_format' | 'legacy_jwt' | 'short_or_placeholder' | 'none'; length: number; prefix: string } {
    if (!k) return { format: 'none', length: 0, prefix: '' };
    const prefix = k.length > 15 ? k.substring(0, 15) : k;
    if (k.startsWith('sb_secret_') || k.startsWith('sb_publishable_')) {
      return { format: 'new_sb_format', length: k.length, prefix: k.split('_').slice(0, 2).join('_') + '_' };
    }
    if (k.startsWith('ey') && k.split('.').length === 3) {
      return { format: 'legacy_jwt', length: k.length, prefix: 'ey...' };
    }
    if (k.length <= 10) {
      return { format: 'short_or_placeholder', length: k.length, prefix: '...' };
    }
    return { format: 'short_or_placeholder', length: k.length, prefix: prefix.substring(0, 6) + '...' };
  }

  // Test 1: Secret Key (Server side: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)
  if (activeSecretKey) {
    try {
      const sbAdmin = createClient(cleanUrl, activeSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data, error } = await sbAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (!error) {
        secretKeyOk = true;
      } else {
        secretKeyError = error.message;
      }
    } catch (e: any) {
      secretKeyError = e.message || String(e);
    }
  } else {
    secretKeyError = 'Aucune clé secrète configurée (SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY manquante)';
  }

  // Test 2: Publishable Key (Client side: VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY)
  if (activePublishableKey) {
    try {
      const sbPub = createClient(cleanUrl, activePublishableKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error } = await sbPub.auth.getSession();
      if (!error) {
        const { error: restErr } = await sbPub.from('profiles').select('id').limit(1);
        if (!restErr || restErr.code === 'PGRST205' || restErr.code === '42P01' || restErr.message?.includes('schema cache')) {
          publishableKeyOk = true;
        } else if (restErr.message?.toLowerCase().includes('api key') || restErr.message?.toLowerCase().includes('jwt')) {
          publishableKeyError = restErr.message;
        } else {
          publishableKeyOk = true;
        }
      } else {
        publishableKeyError = error.message;
      }
    } catch (e: any) {
      publishableKeyError = e.message || String(e);
    }
  } else {
    publishableKeyError = 'Aucune clé publique configurée (VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY manquante)';
  }

  const isConnected = secretKeyOk || publishableKeyOk;

  return {
    connected: isConnected,
    configured: isServerSupabaseConfigured(),
    url: cleanUrl,
    projectRefFromUrl: cleanUrl.replace('https://', '').split('.')[0],
    rawUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    keysConfigured: {
      hasPublishableKey: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    serverSecretKeyStatus: {
      source: process.env.SUPABASE_SECRET_KEY ? 'SUPABASE_SECRET_KEY' : (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'none'),
      valid: secretKeyOk,
      error: secretKeyError,
      type: detectKeyType(activeSecretKey)
    },
    clientPublishableKeyStatus: {
      source: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : (process.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : 'none'),
      valid: publishableKeyOk,
      error: publishableKeyError,
      type: detectKeyType(activePublishableKey)
    }
  };
}
