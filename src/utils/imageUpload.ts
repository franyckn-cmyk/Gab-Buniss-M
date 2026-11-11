import { supabase, uploadToSupabaseStorage, isSupabaseConfigured } from '../lib/supabase';

const ALLOWED_RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo (limite du bucket business-media)

/**
 * Redimensionne et compresse une image raster (JPEG, PNG, WEBP) côté client
 * et retourne à la fois le fichier optimisé (pour Supabase Storage) et le Data URL.
 */
export async function optimizeRasterImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.85
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const allowedRasterTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedRasterTypes.includes(file.type)) {
      reject(new Error('Format d’image non supporté. Seuls les formats JPEG, PNG et WEBP sont autorisés.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrlOriginal = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, dataUrl: dataUrlOriginal });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const targetMime =
          file.type === 'image/png'
            ? 'image/png'
            : file.type === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';
        const dataUrl = canvas.toDataURL(targetMime, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, dataUrl });
              return;
            }
            const ext = targetMime === 'image/png' ? 'png' : targetMime === 'image/webp' ? 'webp' : 'jpg';
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
            const optimizedFile = new File([blob], `${baseName}.${ext}`, {
              type: targetMime,
              lastModified: Date.now()
            });
            resolve({ file: optimizedFile, dataUrl });
          },
          targetMime,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Impossible de charger l'image sélectionnée."));
      };

      img.src = dataUrlOriginal;
    };

    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Utility to process, resize and compress client-side images
 * to Data URLs (Base64) for instant preview and lightweight storage.
 */
export async function processImageFile(file: File, maxWidth = 1200, maxHeight = 800, quality = 0.85): Promise<string> {
  const { dataUrl } = await optimizeRasterImage(file, maxWidth, maxHeight, quality);
  return dataUrl;
}

async function resolveClientBearerToken(explicitToken?: string | null): Promise<string | null> {
  if (explicitToken && explicitToken.trim()) {
    return explicitToken.trim();
  }
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // ignore
    }
  }
  try {
    return localStorage.getItem('gbm_auth_token');
  } catch {
    return null;
  }
}

async function uploadBusinessMediaViaApi(
  dataUrl: string,
  mimeType: string,
  fileName: string,
  businessId: string,
  category: 'logo' | 'cover' | 'gallery' | 'agency',
  token: string
): Promise<string> {
  const commaIdx = dataUrl.indexOf(',');
  const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

  const res = await fetch('/api/upload/business-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      businessId,
      category,
      fileName,
      mimeType,
      base64Data
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || 'Échec du téléversement vers le bucket business-media.');
  }
  if (!payload.url) {
    throw new Error('URL publique manquante après téléversement dans business-media.');
  }
  return payload.url as string;
}

/**
 * Téléverse l'image optimisée dans le bucket Supabase Storage 'business-media'
 * (voie directe client si l'entreprise existe déjà, sinon via l'endpoint serveur authentifié).
 */
export async function uploadOrProcessImage(
  file: File,
  businessId: string,
  category: 'logo' | 'cover' | 'gallery' | 'agency' = 'gallery',
  maxWidth = 1200,
  maxHeight = 800,
  authToken?: string | null
): Promise<string> {
  if (!ALLOWED_RASTER_TYPES.includes(file.type)) {
    throw new Error('Format d’image non supporté. Seuls les formats JPEG, PNG et WEBP sont autorisés.');
  }

  const { file: optimizedFile, dataUrl } = await optimizeRasterImage(file, maxWidth, maxHeight, 0.85);

  if (optimizedFile.size > MAX_UPLOAD_BYTES) {
    throw new Error('L’image dépasse encore la limite de 5 Mo après compression. Veuillez choisir une image plus légère.');
  }

  // 1. Si l'entreprise existe déjà et que le client Supabase a une session active, tenter l'upload direct Storage
  if (isSupabaseConfigured && businessId && businessId !== 'new') {
    try {
      return await uploadToSupabaseStorage(optimizedFile, businessId, category);
    } catch (directErr) {
      console.warn('Direct Supabase storage upload fallback to authenticated API:', directErr);
    }
  }

  // 2. Utiliser l'endpoint serveur authentifié qui écrit directement dans le bucket 'business-media'
  const token = await resolveClientBearerToken(authToken);
  if (token) {
    return await uploadBusinessMediaViaApi(
      dataUrl,
      optimizedFile.type,
      optimizedFile.name,
      businessId || 'new',
      category,
      token
    );
  }

  // 3. Repli local uniquement si l'utilisateur n'est pas connecté (aperçu hors-ligne)
  return dataUrl;
}

