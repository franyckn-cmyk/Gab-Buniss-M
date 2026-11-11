-- =====================================================================
-- GABON BUSINESS MAP — BLOC 3 / 5 : TRIGGERS & ASSOCIATIONS AUTOMATIQUES
-- Source exacte : supabase/schema.sql (10 triggers sur auth.users et public.*)
-- =====================================================================

-- Trigger sur auth.users (création automatique de profil)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger de recalcul automatique de la note moyenne lors d'un avis
DROP TRIGGER IF EXISTS on_review_changed ON public.reviews;
CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_rating();

-- Triggers de protection des colonnes, modération des avis et immuabilité audit
DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();

DROP TRIGGER IF EXISTS trg_protect_business_insert ON public.businesses;
CREATE TRIGGER trg_protect_business_insert
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_insert();

DROP TRIGGER IF EXISTS trg_protect_business_columns ON public.businesses;
CREATE TRIGGER trg_protect_business_columns
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_columns();

DROP TRIGGER IF EXISTS trg_protect_agency_business_id ON public.agencies;
CREATE TRIGGER trg_protect_agency_business_id
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.protect_agency_business_id();

DROP TRIGGER IF EXISTS trg_protect_promotion_business_id ON public.promotions;
CREATE TRIGGER trg_protect_promotion_business_id
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.protect_promotion_business_id();

DROP TRIGGER IF EXISTS trg_sanitize_new_review ON public.reviews;
CREATE TRIGGER trg_sanitize_new_review
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_new_review();

DROP TRIGGER IF EXISTS trg_sanitize_update_review ON public.reviews;
CREATE TRIGGER trg_sanitize_update_review
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_update_review();

DROP TRIGGER IF EXISTS trg_protect_audit_logs_immutability ON public.admin_audit_logs;
CREATE TRIGGER trg_protect_audit_logs_immutability
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.protect_audit_logs_immutability();
