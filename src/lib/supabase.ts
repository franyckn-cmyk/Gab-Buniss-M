import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Business, Agency, UserAccount, Review } from '../types';

// Environment variables for Supabase (Vite client-side)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Support new official Supabase format (VITE_SUPABASE_PUBLISHABLE_KEY: sb_publishable_...)
// with backward compatibility for legacy anon key (VITE_SUPABASE_ANON_KEY: eyJ...)
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  ''
).trim();
export const supabaseAnonKey = supabasePublishableKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabasePublishableKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id')
);

// Instantiate Supabase client if configured
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Upload an image to Supabase Storage in bucket 'business-media'
 * Returns the public URL of the uploaded image.
 */
export async function uploadToSupabaseStorage(
  file: File,
  businessId: string,
  category: 'logo' | 'cover' | 'gallery' | 'agency' = 'gallery'
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase Storage n’est pas encore configuré avec les variables d’environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  }

  // Security & type validations (strictly raster formats — never SVG)
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Format d’image non supporté. Veuillez utiliser exclusivement un format JPEG, PNG ou WEBP.');
  }

  // Size validation (Max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('L’image dépasse la taille maximale autorisée de 5 Mo.');
  }

  const extByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  const cleanBizId = businessId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileExt = extByMime[file.type] || 'jpg';
  const fileName = `${cleanBizId}/${category}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('business-media')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    throw new Error(`Échec du téléversement sur Supabase Storage : ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('business-media')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Fetch current user profile with role from Supabase DB
 */
export async function fetchSupabaseProfile(
  userId: string,
  authUser?: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null
): Promise<UserAccount | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Fetch owned business IDs from business_owners and claimed businesses
    const { data: ownedData } = await supabase
      .from('business_owners')
      .select('business_id')
      .eq('user_id', userId);

    const ownedIdsSet = new Set<string>((ownedData || []).map(o => o.business_id).filter(Boolean));

    if (data.email) {
      const { data: claimedBiz } = await supabase
        .from('businesses')
        .select('id')
        .ilike('claimed_by_email', data.email.trim());

      if (claimedBiz) {
        claimedBiz.forEach(b => {
          if (b.id) ownedIdsSet.add(b.id);
        });
      }
    }

    const ownedIds = Array.from(ownedIdsSet);

    return {
      id: data.id,
      name: data.name || data.email?.split('@')[0] || 'Utilisateur',
      email: data.email,
      role: data.role || 'visitor',
      adminRole: data.admin_role || undefined,
      avatar: data.avatar_url || undefined,
      favorites: data.favorites || [],
      ownedBusinessIds: ownedIds,
      emailConfirmed: Boolean(
        authUser?.email_confirmed_at || authUser?.confirmed_at || data.email_confirmed_at
      ),
      supabaseUserId: data.id
    };
  } catch (e) {
    console.error('fetchSupabaseProfile exception:', e);
    return null;
  }
}

