-- =====================================================================
-- GABON BUSINESS MAP — BLOC 5 / 5 : STORAGE BUCKET (business-media) & RLS
-- Source exacte : supabase/schema.sql (Section 6, lignes 1412-1469)
-- =====================================================================

-- 6. CONFIGURATION DU STORAGE BUCKET (business-media) & POLITIQUES
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-media',
  'business-media',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 1. Lecture publique des images du bucket
DROP POLICY IF EXISTS "Lecture publique des images des entreprises" ON storage.objects;
CREATE POLICY "Lecture publique des images des entreprises"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

-- 2. Téléversement réservé aux gérants autorisés de l'entreprise ciblée par le préfixe de dossier
-- Convention : <business_id>/<nom_fichier>
DROP POLICY IF EXISTS "Upload images autorise aux gerants de l entreprise" ON storage.objects;
CREATE POLICY "Upload images autorise aux gerants de l entreprise"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media' AND
    auth.role() = 'authenticated' AND
    (
      public.is_admin() OR
      public.is_business_owner((storage.foldername(name))[1])
    )
  );

-- 3. Modification et suppression réservée aux gérants de l'entreprise ou aux admins
DROP POLICY IF EXISTS "Modification images par gerants ou admin" ON storage.objects;
CREATE POLICY "Modification images par gerants ou admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-media' AND
    (
      public.is_admin() OR
      public.is_business_owner((storage.foldername(name))[1])
    )
  );

DROP POLICY IF EXISTS "Suppression images par gerants ou admin" ON storage.objects;
CREATE POLICY "Suppression images par gerants ou admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-media' AND
    (
      public.is_admin() OR
      public.is_business_owner((storage.foldername(name))[1])
    )
  );
