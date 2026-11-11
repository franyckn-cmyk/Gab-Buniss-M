-- =====================================================================
-- GABON BUSINESS MAP — SCHÉMA COMPLET SUPABASE POSTGRESQL & RLS (DURCI)
-- Plateforme Nationale Officielle de Cartographie des Entreprises
-- Fichier idempotent, sécurisé et exécutable dans le SQL Editor
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. TABLES PRINCIPALES
-- =====================================================================

-- A. Table des Profils Utilisateurs (Liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'business_owner', 'admin')),
  admin_role TEXT CHECK (admin_role IN ('super_admin', 'admin', 'moderator')),
  avatar_url TEXT,
  favorites TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- B. Table des Entreprises
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'verified', 'unverified', 'rejected', 'suspended')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  creation_year INTEGER,
  nif TEXT,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  
  -- Localisation du siège
  province TEXT NOT NULL,
  province_code TEXT NOT NULL,
  city TEXT NOT NULL,
  arrondissement TEXT,
  district TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  gps_precision TEXT NOT NULL DEFAULT 'exact' CHECK (gps_precision IN ('exact', 'approximate')),

  -- Contacts & réseaux officiels
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT NOT NULL,
  website TEXT,
  whatsapp TEXT,
  facebook TEXT,
  instagram TEXT,
  linkedin TEXT,

  -- Détails opérationnels
  opening_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
  payment_methods TEXT[] DEFAULT ARRAY['Airtel Money', 'Moov Money', 'Espèces']::TEXT[],
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  facilities TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Statistiques réelles
  views INTEGER NOT NULL DEFAULT 0,
  phone_clicks INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  route_clicks INTEGER NOT NULL DEFAULT 0,
  favorites_count INTEGER NOT NULL DEFAULT 0,

  claimed BOOLEAN NOT NULL DEFAULT TRUE,
  claimed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_province_code ON public.businesses(province_code);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON public.businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- C. Table de liaison Propriétaires <-> Entreprises (Sécurisée, multi-propriétaires)
CREATE TABLE IF NOT EXISTS public.business_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('primary_owner', 'owner', 'manager')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_owner UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_owners_biz ON public.business_owners(business_id);
CREATE INDEX IF NOT EXISTS idx_business_owners_user ON public.business_owners(user_id);

-- D. Table des Agences Secondaires / Succursales (Liée par business_id)
CREATE TABLE IF NOT EXISTS public.agencies (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  is_main_branch BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'temporarily_closed', 'permanently_closed')),
  gps_precision TEXT NOT NULL DEFAULT 'exact' CHECK (gps_precision IN ('exact', 'approximate')),

  -- Localisation spécifique de l'agence
  province TEXT NOT NULL,
  province_code TEXT NOT NULL,
  city TEXT NOT NULL,
  arrondissement TEXT,
  district TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,

  -- Contacts propres à l'agence
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  whatsapp TEXT,

  opening_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  manager_name TEXT,
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agencies_biz ON public.agencies(business_id);
CREATE INDEX IF NOT EXISTS idx_agencies_province_code ON public.agencies(province_code);
CREATE INDEX IF NOT EXISTS idx_agencies_city ON public.agencies(city);

-- E. Table des Avis Clients
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_city TEXT NOT NULL DEFAULT 'Gabon',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  helpful_count INTEGER NOT NULL DEFAULT 0,
  business_response JSONB,
  reported BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('published', 'pending', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_biz ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- F. Table des Promotions & Offres Spéciales
CREATE TABLE IF NOT EXISTS public.promotions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_badge TEXT,
  valid_until DATE NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  image TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_biz ON public.promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_promotions_valid ON public.promotions(valid_until);

-- G. Table des Signalements d'Anomalies (Modération)
CREATE TABLE IF NOT EXISTS public.business_reports (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('wrong_address', 'wrong_phone', 'closed', 'fraud', 'other')),
  details TEXT NOT NULL DEFAULT '',
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.business_reports(status);

-- H. Table des Logs d'Audit Administrateur (Strictement Immuable)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  admin_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('business', 'agency', 'review', 'report', 'user', 'platform')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_logs(action);

-- I. Table des Paramètres Généraux de la Plateforme
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- J. Table d'État de Sécurité Persistant du Bootstrap Super-Administrateur
-- Stocke les échecs anti-bruteforce et le verrouillage définitif en base (persiste après redémarrage et multi-instances)
CREATE TABLE IF NOT EXISTS public.bootstrap_security_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  permanently_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_attempt_at TIMESTAMPTZ,
  last_attempt_ip TEXT,
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.bootstrap_security_state (id, failed_attempts, permanently_disabled)
VALUES (1, 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 3. FONCTIONS UTILITAIRES & SÉCURITÉ (Avec search_path strict)
-- =====================================================================

-- Helper 1: Vérifie si l'utilisateur appelant est administrateur actif (sans récursion RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- Helper 2: Vérifie si l'utilisateur appelant est super administrateur
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND admin_role = 'super_admin' AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon, service_role;

-- Helper 3: Vérifie si l'utilisateur est propriétaire autorisé de cette entreprise
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_business_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- L'administrateur a accès complet
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.business_owners
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_business_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_owner(TEXT) TO authenticated, anon, service_role;

-- Helper 4: Vérifie si l'utilisateur appelant est le propriétaire principal de cette entreprise
CREATE OR REPLACE FUNCTION public.is_business_primary_owner(p_business_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_owners
    WHERE business_id = p_business_id 
      AND user_id = auth.uid() 
      AND is_primary = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_primary_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_primary_owner(TEXT) TO authenticated, anon, service_role;

-- Helper 5: Vérifie si l'utilisateur peut gérer les propriétaires (admin ou propriétaire principal)
-- SÉCURITÉ : Évite toute récursion RLS directe sur la table business_owners
CREATE OR REPLACE FUNCTION public.can_manage_business_owners(p_business_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin() OR public.is_business_primary_owner(p_business_id);
$$;

REVOKE ALL ON FUNCTION public.can_manage_business_owners(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_business_owners(TEXT) TO authenticated, anon, service_role;

-- Helper 6: Trigger pour la création de compte utilisateur (Anti-usurpation admin)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'visitor' THEN
    v_role := 'visitor';
  ELSE
    v_role := 'business_owner';
  END IF;

  INSERT INTO public.profiles (
    id, email, name, phone, role, admin_role, status, created_at, updated_at
  ) VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    v_role,
    NULL,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Helper 7: Recalcul automatique de la note moyenne lors d'un avis
CREATE OR REPLACE FUNCTION public.recalculate_business_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_biz_id TEXT;
  v_avg NUMERIC(2, 1);
  v_count INTEGER;
BEGIN
  v_biz_id := COALESCE(NEW.business_id, OLD.business_id);

  SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 5.0), COUNT(*)
  INTO v_avg, v_count
  FROM public.reviews
  WHERE business_id = v_biz_id AND status = 'published';

  UPDATE public.businesses
  SET rating = v_avg, reviews_count = v_count, updated_at = NOW()
  WHERE id = v_biz_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_review_changed ON public.reviews;
CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_rating();

-- Helper 8A: Vérification atomique de l'état de sécurité du bootstrap (persiste après redémarrage & multi-instances)
CREATE OR REPLACE FUNCTION public.check_bootstrap_security_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT := 84466488339912045;
  v_state public.bootstrap_security_state%ROWTYPE;
  v_remaining_seconds INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.bootstrap_security_state (id, failed_attempts, permanently_disabled)
  VALUES (1, 0, FALSE)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_state FROM public.bootstrap_security_state WHERE id = 1;

  IF v_state.permanently_disabled OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin' AND admin_role = 'super_admin' AND status = 'active'
  ) THEN
    UPDATE public.bootstrap_security_state
    SET permanently_disabled = TRUE,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = 1;

    RETURN jsonb_build_object(
      'active', false,
      'permanently_disabled', true,
      'locked', false,
      'reason', 'Le mécanisme de bootstrap a été définitivement désactivé.'
    );
  END IF;

  IF v_state.locked_until IS NOT NULL AND v_state.locked_until > NOW() THEN
    v_remaining_seconds := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_state.locked_until - NOW())))::INTEGER);
    RETURN jsonb_build_object(
      'active', false,
      'permanently_disabled', false,
      'locked', true,
      'remaining_seconds', v_remaining_seconds,
      'reason', 'Trop de tentatives infructueuses. Le système d''initialisation est temporairement verrouillé pour encore ' || v_remaining_seconds || ' secondes.'
    );
  END IF;

  RETURN jsonb_build_object(
    'active', true,
    'permanently_disabled', false,
    'locked', false,
    'failed_attempts', COALESCE(v_state.failed_attempts, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_bootstrap_security_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_bootstrap_security_state() TO service_role;

-- Helper 8B: Enregistrement persistant d'un échec de secret bootstrap (Verrouillage 15 minutes après 3 échecs)
CREATE OR REPLACE FUNCTION public.record_bootstrap_failure(p_client_ip TEXT DEFAULT 'unknown')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT := 84466488339912045;
  v_current_failures INTEGER;
  v_new_failures INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.bootstrap_security_state (id, failed_attempts, permanently_disabled)
  VALUES (1, 0, FALSE)
  ON CONFLICT (id) DO NOTHING;

  SELECT failed_attempts INTO v_current_failures
  FROM public.bootstrap_security_state
  WHERE id = 1
  FOR UPDATE;

  v_new_failures := COALESCE(v_current_failures, 0) + 1;

  IF v_new_failures >= 3 THEN
    UPDATE public.bootstrap_security_state
    SET failed_attempts = 0,
        locked_until = NOW() + INTERVAL '15 minutes',
        last_attempt_at = NOW(),
        last_attempt_ip = LEFT(COALESCE(p_client_ip, 'unknown'), 100),
        updated_at = NOW()
    WHERE id = 1;

    RETURN jsonb_build_object(
      'locked', true,
      'failed_attempts', 0,
      'max_attempts', 3,
      'remaining_seconds', 900
    );
  ELSE
    UPDATE public.bootstrap_security_state
    SET failed_attempts = v_new_failures,
        last_attempt_at = NOW(),
        last_attempt_ip = LEFT(COALESCE(p_client_ip, 'unknown'), 100),
        updated_at = NOW()
    WHERE id = 1;

    RETURN jsonb_build_object(
      'locked', false,
      'failed_attempts', v_new_failures,
      'max_attempts', 3,
      'remaining_seconds', 0
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_bootstrap_failure(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_bootstrap_failure(TEXT) TO service_role;

-- Helper 8C: Réinitialisation des échecs après validation du secret
CREATE OR REPLACE FUNCTION public.reset_bootstrap_failures()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT := 84466488339912045;
BEGIN
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.bootstrap_security_state (id, failed_attempts, permanently_disabled)
  VALUES (1, 0, FALSE)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.bootstrap_security_state
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_bootstrap_failures() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_bootstrap_failures() TO service_role;

-- Helper 8: Procédure d'initialisation du premier Super Administrateur
-- SÉCURITÉ ABSOLUE :
-- 1. Verrou advisory exclusif (pg_advisory_xact_lock) contre les appels simultanés
-- 2. Réservée exclusivement au service_role (REVOKE PUBLIC, anon, authenticated)
-- 3. Désactivée définitivement dès qu'un Super Administrateur actif existe ou après première exécution
-- 4. Vérifie dans la transaction SQL que le compte existe dans auth.users avec email_confirmed_at IS NOT NULL
-- 5. Vérifie la correspondance exacte profiles.id = auth.users.id, l'adresse e-mail identique et profiles.status = 'active'
-- 6. Compatible avec protect_profile_roles() via set_config local
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email TEXT;
  v_auth_id UUID;
  v_auth_email TEXT;
  v_email_confirmed_at TIMESTAMPTZ;
  v_profile_id UUID;
  v_profile_email TEXT;
  v_user_status TEXT;
  v_mismatched_profile_id UUID;
  v_lock_key BIGINT := 84466488339912044; -- Clé de verrouillage advisory stable
  v_state public.bootstrap_security_state%ROWTYPE;
BEGIN
  -- 1. Verrou transactionnel exclusif pour empêcher tout appel concurrent
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.bootstrap_security_state (id, failed_attempts, permanently_disabled)
  VALUES (1, 0, FALSE)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_state FROM public.bootstrap_security_state WHERE id = 1;

  IF v_state.permanently_disabled THEN
    RAISE EXCEPTION 'Opération interdite : Le mécanisme de bootstrap a été définitivement désactivé.';
  END IF;

  IF v_state.locked_until IS NOT NULL AND v_state.locked_until > NOW() THEN
    RAISE EXCEPTION 'Opération temporairement verrouillée suite à des tentatives infructueuses.';
  END IF;

  -- 2. VERROU DE SÉCURITÉ ABSOLU : Si un super admin actif existe déjà, interdire l'opération
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE role = 'admin' AND admin_role = 'super_admin' AND status = 'active'
  ) THEN
    UPDATE public.bootstrap_security_state
    SET permanently_disabled = TRUE, updated_at = NOW()
    WHERE id = 1;
    RAISE EXCEPTION 'Opération interdite : Un Super Administrateur a déjà été initialisé sur cette instance.';
  END IF;

  v_clean_email := LOWER(TRIM(COALESCE(target_email, '')));
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'L''adresse e-mail cible est obligatoire.';
  END IF;

  -- 3. Vérification dans auth.users au sein de la transaction SQL (existence + confirmation d'e-mail obligatoire)
  SELECT u.id, u.email, u.email_confirmed_at
  INTO v_auth_id, v_auth_email, v_email_confirmed_at
  FROM auth.users u
  WHERE LOWER(TRIM(u.email)) = v_clean_email;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Compte inexistant : aucun compte Auth trouvé dans auth.users avec l''adresse %.', v_clean_email;
  END IF;

  IF v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Promotion refusée : l''adresse e-mail (%) n''est pas confirmée dans auth.users (email_confirmed_at IS NULL).', v_clean_email;
  END IF;

  -- 4. Vérification stricte de correspondance dans public.profiles (id = auth.users.id, e-mail identique et statut actif)
  SELECT p.id, p.email, p.status
  INTO v_profile_id, v_profile_email, v_user_status
  FROM public.profiles p
  WHERE p.id = v_auth_id;

  IF v_profile_id IS NULL THEN
    SELECT p2.id INTO v_mismatched_profile_id
    FROM public.profiles p2
    WHERE LOWER(TRIM(p2.email)) = v_clean_email
    LIMIT 1;

    IF v_mismatched_profile_id IS NOT NULL THEN
      RAISE EXCEPTION 'Incohérence de sécurité : l''identifiant du profil (%) ne correspond pas à auth.users.id (%).', v_mismatched_profile_id, v_auth_id;
    END IF;

    RAISE EXCEPTION 'Compte inexistant : aucun profil trouvé dans public.profiles pour l''adresse %.', v_clean_email;
  END IF;

  IF v_profile_id <> v_auth_id THEN
    RAISE EXCEPTION 'Incohérence de sécurité : l''identifiant du profil (%) ne correspond pas à auth.users.id (%).', v_profile_id, v_auth_id;
  END IF;

  IF LOWER(TRIM(COALESCE(v_profile_email, ''))) <> LOWER(TRIM(COALESCE(v_auth_email, '')))
     OR LOWER(TRIM(COALESCE(v_profile_email, ''))) <> v_clean_email THEN
    RAISE EXCEPTION 'Incohérence de sécurité : l''adresse e-mail du profil (%) ne correspond pas à celle du compte Auth (%).', v_profile_email, v_auth_email;
  END IF;

  IF v_user_status <> 'active' THEN
    RAISE EXCEPTION 'Promotion refusée : le compte utilisateur cible (%) n''est pas actif (statut: %).', v_clean_email, v_user_status;
  END IF;

  -- 5. Marquer la transaction locale pour autoriser le trigger protect_profile_roles
  PERFORM set_config('app.bootstrap_in_progress', 'true', true);

  -- 6. Promotion atomique du Super Administrateur liée à auth.users.id et l'e-mail vérifié
  UPDATE public.profiles
  SET role = 'admin',
      admin_role = 'super_admin',
      status = 'active',
      updated_at = NOW()
  WHERE id = v_auth_id
    AND LOWER(TRIM(email)) = LOWER(TRIM(v_auth_email))
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Échec de la promotion atomique pour le compte %.', v_clean_email;
  END IF;

  -- 7. Désactivation définitive et persistante du mécanisme de bootstrap
  UPDATE public.bootstrap_security_state
  SET permanently_disabled = TRUE,
      failed_attempts = 0,
      locked_until = NULL,
      completed_at = NOW(),
      completed_by_user_id = v_auth_id,
      updated_at = NOW()
  WHERE id = 1;

  -- 8. Journal d'audit officiel
  INSERT INTO public.admin_audit_logs (
    id, admin_id, admin_email, admin_name, admin_role, action, target_type, target_id, target_name, details
  ) VALUES (
    'log-bootstrap-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    v_auth_id,
    v_clean_email,
    'Super Admin Initialisé',
    'super_admin',
    'update_user',
    'user',
    v_auth_id::TEXT,
    v_clean_email,
    'Initialisation contrôlée du premier Super Administrateur Gabon Business Map (e-mail Auth confirmé vérifié).'
  );

  RETURN 'Succès : Le compte ' || v_clean_email || ' a été promu premier Super Administrateur avec succès.';
END;
$$;

-- SÉCURITÉ CRITIQUE : Retirer tout accès PUBLIC, anon et authenticated. Réservé à service_role.
REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_super_admin(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(TEXT) TO service_role;

-- Helper 9: Procédure transactionnelle sécurisée de création d'entreprise avec son propriétaire initial
CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_business JSONB,
  p_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id TEXT;
  v_slug TEXT;
  v_status TEXT;
  v_is_admin BOOLEAN;
  v_owner_status TEXT;
  v_result JSONB;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'ID du propriétaire obligatoire.';
  END IF;

  -- Vérifier l'authentification
  IF auth.uid() IS NULL AND auth.role() <> 'service_role' AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Authentification requise pour créer une entreprise.';
  END IF;

  -- Vérifier que l'appelant ne crée pas pour un autre sauf s'il est admin ou service_role
  v_is_admin := public.is_admin() OR auth.role() = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role';
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_owner_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Action non autorisée : vous ne pouvez créer une entreprise que pour votre propre compte.';
  END IF;

  -- Vérifier que le propriétaire existe et possède un compte actif
  SELECT status INTO v_owner_status FROM public.profiles WHERE id = p_owner_id;
  IF v_owner_status IS NULL THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable pour ce propriétaire.';
  ELSIF v_owner_status <> 'active' THEN
    RAISE EXCEPTION 'Le profil utilisateur est suspendu ou inactif.';
  END IF;

  IF v_is_admin THEN
    v_status := COALESCE(p_business->>'status', 'verified');
  ELSE
    v_status := 'pending';
  END IF;

  v_business_id := COALESCE(p_business->>'id', 'biz-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
  v_slug := COALESCE(p_business->>'slug', LOWER(REGEXP_REPLACE(p_business->>'name', '[^a-zA-Z0-9]+', '-', 'g')));

  -- 1. Insertion de l'entreprise
  INSERT INTO public.businesses (
    id, name, legal_name, slug, category, sub_category, description,
    logo, cover_image, images, status, featured, creation_year, nif,
    rating, reviews_count, province, province_code, city, arrondissement,
    district, address, lat, lng, gps_precision, phone, phone_secondary,
    email, website, whatsapp, facebook, instagram, linkedin,
    opening_hours, payment_methods, services, facilities,
    claimed, claimed_by_email, created_at, updated_at
  ) VALUES (
    v_business_id,
    p_business->>'name',
    COALESCE(p_business->>'legal_name', p_business->>'name'),
    v_slug,
    p_business->>'category',
    p_business->>'sub_category',
    COALESCE(p_business->>'description', ''),
    COALESCE(p_business->>'logo', ''),
    COALESCE(p_business->>'cover_image', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_business->'images')), ARRAY[]::TEXT[]),
    v_status,
    CASE WHEN v_is_admin THEN COALESCE((p_business->>'featured')::BOOLEAN, FALSE) ELSE FALSE END,
    NULLIF(p_business->>'creation_year', '')::INTEGER,
    p_business->>'nif',
    5.0,
    0,
    p_business->>'province',
    p_business->>'province_code',
    p_business->>'city',
    p_business->>'arrondissement',
    COALESCE(p_business->>'district', ''),
    p_business->>'address',
    COALESCE((p_business->>'lat')::DOUBLE PRECISION, 0.3901),
    COALESCE((p_business->>'lng')::DOUBLE PRECISION, 9.4544),
    COALESCE(p_business->>'gps_precision', 'exact'),
    p_business->>'phone',
    p_business->>'phone_secondary',
    p_business->>'email',
    p_business->>'website',
    p_business->>'whatsapp',
    p_business->>'facebook',
    p_business->>'instagram',
    p_business->>'linkedin',
    COALESCE(p_business->'opening_hours', '{}'::JSONB),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_business->'payment_methods')), ARRAY['Airtel Money', 'Moov Money', 'Espèces']::TEXT[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_business->'services')), ARRAY[]::TEXT[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_business->'facilities')), ARRAY[]::TEXT[]),
    TRUE,
    p_business->>'claimed_by_email',
    NOW(),
    NOW()
  );

  -- 2. Association atomique du premier propriétaire comme primary_owner
  INSERT INTO public.business_owners (
    business_id, user_id, role, is_primary, granted_by, created_at
  ) VALUES (
    v_business_id,
    p_owner_id,
    'primary_owner',
    TRUE,
    p_owner_id,
    NOW()
  );

  SELECT to_jsonb(b) INTO v_result FROM public.businesses b WHERE b.id = v_business_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_with_owner(JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(JSONB, UUID) TO authenticated, service_role;

-- Helper 10: Procédure d'ajout d'un co-propriétaire (Réservée à l'admin ou au primary_owner)
CREATE OR REPLACE FUNCTION public.add_business_co_owner(
  p_business_id TEXT,
  p_target_email TEXT,
  p_role TEXT DEFAULT 'owner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_target_id UUID;
  v_target_name TEXT;
  v_target_status TEXT;
  v_clean_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  
  -- L'appelant doit être admin OU propriétaire principal vérifié (via helper sans récursion RLS)
  IF NOT public.can_manage_business_owners(p_business_id) THEN
    RAISE EXCEPTION 'Action interdite : Seul le propriétaire principal ou un administrateur peut associer un co-gérant.';
  END IF;

  -- Validation stricte des rôles acceptés (JAMAIS 'primary_owner')
  IF p_role = 'manager' THEN
    v_clean_role := 'manager';
  ELSIF p_role = 'owner' THEN
    v_clean_role := 'owner';
  ELSE
    RAISE EXCEPTION 'Rôle invalide (%s). Les rôles autorisés pour un co-gestionnaire sont « owner » ou « manager ».', p_role;
  END IF;

  SELECT id, name, status INTO v_target_id, v_target_name, v_target_status
  FROM public.profiles
  WHERE LOWER(email) = LOWER(TRIM(p_target_email));

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé avec l''adresse e-mail « % ». L''utilisateur doit d''abord créer un compte.', p_target_email;
  END IF;

  IF v_target_status <> 'active' THEN
    RAISE EXCEPTION 'Le compte utilisateur cible (%) n''est pas actif.', p_target_email;
  END IF;

  -- Vérifier qu'il n'est pas déjà associé
  IF EXISTS (
    SELECT 1 FROM public.business_owners 
    WHERE business_id = p_business_id AND user_id = v_target_id
  ) THEN
    RAISE EXCEPTION 'Cet utilisateur est déjà associé comme gestionnaire de cette entreprise.';
  END IF;

  INSERT INTO public.business_owners (
    business_id, user_id, role, is_primary, granted_by, created_at
  ) VALUES (
    p_business_id,
    v_target_id,
    v_clean_role,
    FALSE,
    v_caller_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_target_id,
    'userName', v_target_name,
    'businessId', p_business_id,
    'role', v_clean_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_business_co_owner(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_business_co_owner(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Helper 11: Procédure de modération d'un avis (Seule voie autorisée pour publier ou modérer un avis)
CREATE OR REPLACE FUNCTION public.moderate_review(
  p_review_id TEXT,
  p_action TEXT -- 'publish', 'hide', 'flag'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  IF NOT (
    public.is_admin() OR
    auth.role() = 'service_role' OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Action réservée aux modérateurs et administrateurs.';
  END IF;

  IF p_action = 'publish' THEN
    v_new_status := 'published';
  ELSIF p_action = 'hide' THEN
    v_new_status := 'hidden';
  ELSIF p_action = 'flag' THEN
    v_new_status := 'flagged';
  ELSE
    RAISE EXCEPTION 'Action de modération invalide (%s).', p_action;
  END IF;

  -- Active l'autorisation transactionnelle locale pour sanitize_update_review()
  PERFORM set_config('app.review_moderation_in_progress', 'true', true);

  UPDATE public.reviews
  SET status = v_new_status
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avis introuvable : %', p_review_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'reviewId', p_review_id, 'status', v_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_review(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_review(TEXT, TEXT) TO authenticated, service_role;

-- =====================================================================
-- 4. TRIGGERS DE SÉCURITÉ DES COLONNES & INTÉGRITÉ
-- =====================================================================

-- Trigger A: Protection des rôles de profils
-- Permet la promotion UNIQUEMENT si admin, service_role ou bootstrap_in_progress
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (
    public.is_admin() OR 
    auth.role() = 'service_role' OR 
    current_setting('request.jwt.claim.role', true) = 'service_role' OR
    current_setting('app.bootstrap_in_progress', true) = 'true'
  ) THEN
    NEW.role := OLD.role;
    NEW.admin_role := OLD.admin_role;
    NEW.status := OLD.status;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();

-- Trigger B: Protection des colonnes d'entreprises (INSERT : force status pending pour non-admin)
CREATE OR REPLACE FUNCTION public.protect_business_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    NEW.status := 'pending';
    NEW.featured := FALSE;
    NEW.rating := 5.0;
    NEW.reviews_count := 0;
    NEW.views := 0;
    NEW.phone_clicks := 0;
    NEW.whatsapp_clicks := 0;
    NEW.route_clicks := 0;
    NEW.favorites_count := 0;
  END IF;
  NEW.created_at := NOW();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_insert ON public.businesses;
CREATE TRIGGER trg_protect_business_insert
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_insert();

-- Trigger C: Protection des colonnes d'entreprises (UPDATE : empêche propriétaire d'auto-valider)
CREATE OR REPLACE FUNCTION public.protect_business_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    NEW.status := OLD.status;
    NEW.featured := OLD.featured;
    NEW.claimed := OLD.claimed;
    NEW.claimed_by_email := OLD.claimed_by_email;
    NEW.rating := OLD.rating;
    NEW.reviews_count := OLD.reviews_count;
    NEW.views := OLD.views;
    NEW.phone_clicks := OLD.phone_clicks;
    NEW.whatsapp_clicks := OLD.whatsapp_clicks;
    NEW.route_clicks := OLD.route_clicks;
    NEW.favorites_count := OLD.favorites_count;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_columns ON public.businesses;
CREATE TRIGGER trg_protect_business_columns
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_columns();

-- Trigger D: Protection des agences (Immuabilité de business_id)
CREATE OR REPLACE FUNCTION public.protect_agency_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.business_id <> OLD.business_id AND NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Interdit de transférer une agence vers une autre entreprise.';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_agency_business_id ON public.agencies;
CREATE TRIGGER trg_protect_agency_business_id
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.protect_agency_business_id();

-- Trigger E: Protection des promotions (Immuabilité de business_id)
CREATE OR REPLACE FUNCTION public.protect_promotion_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.business_id <> OLD.business_id AND NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Interdit de transférer une promotion vers une autre entreprise.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_promotion_business_id ON public.promotions;
CREATE TRIGGER trg_protect_promotion_business_id
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.protect_promotion_business_id();

-- Trigger F: Protection et assainissement des avis (INSERT : force toujours status = 'pending')
CREATE OR REPLACE FUNCTION public.sanitize_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Lier obligatoirement author_id au compte authentifié s'il existe
  IF auth.uid() IS NOT NULL THEN
    NEW.author_id := auth.uid();
  ELSE
    NEW.author_id := NULL;
  END IF;

  -- Validation stricte de la note (1 à 5)
  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'La note de l''avis doit être comprise entre 1 et 5 étoiles.';
  END IF;

  -- Forcer les compteurs et données de modération à leurs valeurs initiales saines
  NEW.helpful_count := 0;
  NEW.reported := FALSE;
  NEW.business_response := NULL;

  -- SÉCURITÉ MODÉRATION : Aucun avis ne peut être auto-publié à la création.
  -- Tout nouvel avis démarre obligatoirement en statut 'pending' en attente de validation via moderate_review().
  NEW.status := 'pending';

  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_new_review ON public.reviews;
CREATE TRIGGER trg_sanitize_new_review
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_new_review();

-- Trigger G: Protection des avis (UPDATE : seule moderate_review() peut changer status ; les gérants ne peuvent que répondre)
CREATE OR REPLACE FUNCTION public.sanitize_update_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_moderating BOOLEAN;
BEGIN
  v_is_moderating := current_setting('app.review_moderation_in_progress', true) = 'true';

  -- Seule la fonction de modération autorisée moderate_review() peut modifier le statut d'un avis
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_is_moderating THEN
    RAISE EXCEPTION 'Transition de statut interdite : seule la fonction de modération autorisée (moderate_review) peut modifier le statut d''un avis.';
  END IF;

  IF NOT (public.is_admin() OR auth.role() = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    -- Si c'est le gérant de l'entreprise, il ne peut MODIFIER QUE business_response !
    IF public.is_business_owner(OLD.business_id) THEN
      NEW.author_id := OLD.author_id;
      NEW.author_name := OLD.author_name;
      NEW.author_city := OLD.author_city;
      NEW.rating := OLD.rating;
      NEW.comment := OLD.comment;
      NEW.photos := OLD.photos;
      NEW.helpful_count := OLD.helpful_count;
      NEW.reported := OLD.reported;
      NEW.status := OLD.status;
      NEW.business_id := OLD.business_id;
    ELSE
      RAISE EXCEPTION 'Action non autorisée : seuls les gestionnaires de l''entreprise peuvent répondre à cet avis.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_update_review ON public.reviews;
CREATE TRIGGER trg_sanitize_update_review
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_update_review();

-- Trigger H: Immuabilité absolue des journaux d'audit (Interdit tout UPDATE ou DELETE)
CREATE OR REPLACE FUNCTION public.protect_audit_logs_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Violation de sécurité : Les journaux d''audit (admin_audit_logs) sont strictement immuables et ne peuvent être ni modifiés ni supprimés.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_audit_logs_immutability ON public.admin_audit_logs;
CREATE TRIGGER trg_protect_audit_logs_immutability
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.protect_audit_logs_immutability();

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
