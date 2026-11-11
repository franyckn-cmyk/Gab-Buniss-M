-- =====================================================================
-- GABON BUSINESS MAP — BLOC 4 / 5 : POLITIQUES RLS, PRIVILÈGES & CONFIG
-- Source exacte : supabase/schema.sql (Sections 5, 7 & 8)
-- =====================================================================

-- 5. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_security_state ENABLE ROW LEVEL SECURITY;

-- --- POLITIQUES PROFILES ---
DROP POLICY IF EXISTS "Lecture profils : soi-même ou admin" ON public.profiles;
CREATE POLICY "Lecture profils : soi-même ou admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Mise a jour de son propre profil" ON public.profiles;
CREATE POLICY "Mise a jour de son propre profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins : gestion complète profils" ON public.profiles;
CREATE POLICY "Admins : gestion complète profils"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- --- POLITIQUES BUSINESSES ---
DROP POLICY IF EXISTS "Lecture publique entreprises vérifiées ou gestionnaires" ON public.businesses;
CREATE POLICY "Lecture publique entreprises vérifiées ou gestionnaires"
  ON public.businesses FOR SELECT
  USING (status = 'verified' OR public.is_business_owner(id) OR public.is_admin());

DROP POLICY IF EXISTS "Création entreprise en statut pending" ON public.businesses;
CREATE POLICY "Création entreprise en statut pending"
  ON public.businesses FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (status = 'pending' OR public.is_admin())
  );

DROP POLICY IF EXISTS "Modification entreprise par propriétaire ou admin" ON public.businesses;
CREATE POLICY "Modification entreprise par propriétaire ou admin"
  ON public.businesses FOR UPDATE
  USING (public.is_business_owner(id))
  WITH CHECK (public.is_business_owner(id));

DROP POLICY IF EXISTS "Suppression entreprise réservée aux admins" ON public.businesses;
CREATE POLICY "Suppression entreprise réservée aux admins"
  ON public.businesses FOR DELETE
  USING (public.is_admin());

-- --- POLITIQUES BUSINESS_OWNERS (SANS RÉCURSION DIRECTE) ---
DROP POLICY IF EXISTS "Lecture liaisons propriétaires" ON public.business_owners;
CREATE POLICY "Lecture liaisons propriétaires"
  ON public.business_owners FOR SELECT
  USING (user_id = auth.uid() OR public.is_business_owner(business_id) OR public.is_admin());

DROP POLICY IF EXISTS "Association propriétaires sécurisée" ON public.business_owners;
CREATE POLICY "Association propriétaires sécurisée"
  ON public.business_owners FOR INSERT
  WITH CHECK (public.can_manage_business_owners(business_id));

DROP POLICY IF EXISTS "Modification propriétaires par admin ou propriétaire principal" ON public.business_owners;
CREATE POLICY "Modification propriétaires par admin ou propriétaire principal"
  ON public.business_owners FOR UPDATE
  USING (public.can_manage_business_owners(business_id))
  WITH CHECK (public.can_manage_business_owners(business_id));

DROP POLICY IF EXISTS "Dissociation propriétaires par admin ou propriétaire principal" ON public.business_owners;
CREATE POLICY "Dissociation propriétaires par admin ou propriétaire principal"
  ON public.business_owners FOR DELETE
  USING (public.can_manage_business_owners(business_id));

-- --- POLITIQUES AGENCIES ---
DROP POLICY IF EXISTS "Lecture agences des entreprises vérifiées" ON public.agencies;
CREATE POLICY "Lecture agences des entreprises vérifiées"
  ON public.agencies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = agencies.business_id AND b.status = 'verified')
    OR public.is_business_owner(business_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Ajout agence par propriétaire" ON public.agencies;
CREATE POLICY "Ajout agence par propriétaire"
  ON public.agencies FOR INSERT
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Modification agence par propriétaire" ON public.agencies;
CREATE POLICY "Modification agence par propriétaire"
  ON public.agencies FOR UPDATE
  USING (public.is_business_owner(business_id))
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Suppression agence par propriétaire" ON public.agencies;
CREATE POLICY "Suppression agence par propriétaire"
  ON public.agencies FOR DELETE
  USING (public.is_business_owner(business_id));

-- --- POLITIQUES REVIEWS ---
DROP POLICY IF EXISTS "Lecture publique avis publiés" ON public.reviews;
CREATE POLICY "Lecture publique avis publiés"
  ON public.reviews FOR SELECT
  USING (status = 'published' OR public.is_admin() OR public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Création avis par public" ON public.reviews;
CREATE POLICY "Création avis par public"
  ON public.reviews FOR INSERT
  WITH CHECK (
    status = 'pending' AND
    helpful_count = 0 AND
    reported = FALSE AND
    business_response IS NULL
  );

DROP POLICY IF EXISTS "Réponse aux avis par gérants" ON public.reviews;
CREATE POLICY "Réponse aux avis par gérants"
  ON public.reviews FOR UPDATE
  USING (public.is_business_owner(business_id) OR public.is_admin())
  WITH CHECK (public.is_business_owner(business_id) OR public.is_admin());

DROP POLICY IF EXISTS "Suppression avis réservée aux admins" ON public.reviews;
CREATE POLICY "Suppression avis réservée aux admins"
  ON public.reviews FOR DELETE
  USING (public.is_admin());

-- --- POLITIQUES PROMOTIONS ---
DROP POLICY IF EXISTS "Lecture publique promotions" ON public.promotions;
CREATE POLICY "Lecture publique promotions"
  ON public.promotions FOR SELECT
  USING (valid_until >= CURRENT_DATE OR public.is_admin() OR public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Création promotion par propriétaire" ON public.promotions;
CREATE POLICY "Création promotion par propriétaire"
  ON public.promotions FOR INSERT
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Modification promotion par propriétaire" ON public.promotions;
CREATE POLICY "Modification promotion par propriétaire"
  ON public.promotions FOR UPDATE
  USING (public.is_business_owner(business_id))
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS "Suppression promotion par propriétaire" ON public.promotions;
CREATE POLICY "Suppression promotion par propriétaire"
  ON public.promotions FOR DELETE
  USING (public.is_business_owner(business_id));

-- --- POLITIQUES BUSINESS_REPORTS ---
DROP POLICY IF EXISTS "Création signalement public" ON public.business_reports;
CREATE POLICY "Création signalement public"
  ON public.business_reports FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Lecture signalements réservée aux admins" ON public.business_reports;
CREATE POLICY "Lecture signalements réservée aux admins"
  ON public.business_reports FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Résolution signalements réservée aux admins" ON public.business_reports;
CREATE POLICY "Résolution signalements réservée aux admins"
  ON public.business_reports FOR UPDATE
  USING (public.is_admin());

-- --- POLITIQUES ADMIN_AUDIT_LOGS (STRICTEMENT IMMUABLES) ---
DROP POLICY IF EXISTS "Consultation journal audit réservée aux admins" ON public.admin_audit_logs;
CREATE POLICY "Consultation journal audit réservée aux admins"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Insertion logs réservée aux admins" ON public.admin_audit_logs;
CREATE POLICY "Insertion logs réservée aux admins"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- --- POLITIQUES PLATFORM_SETTINGS ---
DROP POLICY IF EXISTS "Lecture publique paramètres" ON public.platform_settings;
CREATE POLICY "Lecture publique paramètres"
  ON public.platform_settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Modification paramètres super admin" ON public.platform_settings;
CREATE POLICY "Modification paramètres super admin"
  ON public.platform_settings FOR ALL
  USING (public.is_super_admin());

-- =====================================================================
-- 7. PERMISSIONS & PRIVILÈGES STRICTS (GRANT & REVOKE)
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Tables générales
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated, service_role;
GRANT SELECT ON public.businesses TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_owners TO authenticated, service_role;
GRANT SELECT ON public.business_owners TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated, service_role;
GRANT SELECT ON public.agencies TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated, service_role;
GRANT SELECT, INSERT ON public.reviews TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated, service_role;
GRANT SELECT ON public.promotions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_reports TO authenticated, service_role;
GRANT INSERT ON public.business_reports TO anon;

GRANT SELECT, UPDATE ON public.platform_settings TO authenticated, service_role;
GRANT SELECT ON public.platform_settings TO anon;

-- IMMUABILITÉ ABSOLUE DU JOURNAL D'AUDIT :
-- Interdiction formelle de modifier ou purger les traces d'audit
REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated, service_role;

-- VERROUILLAGE ABSOLU DE L'ÉTAT DU BOOTSTRAP :
-- Réservé exclusivement au service_role côté serveur
REVOKE ALL ON TABLE public.bootstrap_security_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.bootstrap_security_state TO service_role;

-- =====================================================================
-- 8. DONNÉES DE CONFIGURATION INITIALES (PLATFORM_SETTINGS)
-- =====================================================================
INSERT INTO public.platform_settings (key, value)
VALUES
  ('siteName', '"GABON BUSINESS MAP"'::jsonb),
  ('maintenanceMode', 'false'::jsonb),
  ('allowPublicRegistrations', 'true'::jsonb),
  ('requireAdminApproval', 'true'::jsonb),
  ('maxPhotosPerGallery', '12'::jsonb),
  ('contactEmail', '"contact@gabonbusinessmap.ga"'::jsonb),
  ('contactPhone', '"+241 11 76 00 00"'::jsonb),
  ('systemNotice', '"Plateforme nationale officielle de référencement et cartographie des entreprises gabonaises."'::jsonb)
ON CONFLICT (key) DO NOTHING;
