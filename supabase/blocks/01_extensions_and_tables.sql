-- =====================================================================
-- GABON BUSINESS MAP — BLOC 1 / 5 : EXTENSIONS, TABLES & INDEX
-- Source exacte : supabase/schema.sql (Sections 1 & 2, lignes 1-252)
-- Note : Les énumérations utilisent des contraintes CHECK inline (aucun TYPE ENUM).
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
