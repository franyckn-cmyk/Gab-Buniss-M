import { getSupabaseServer, isServerSupabaseConfigured } from './supabaseServer.ts';
import type { 
  Business, 
  Agency, 
  Review, 
  Promotion, 
  BusinessReport, 
  AdminAuditLog, 
  PlatformSettings,
  UserAccount,
  AdminRole
} from '../types/index.ts';
import { 
  PROVINCES,
  INITIAL_BUSINESSES, 
  INITIAL_REVIEWS, 
  INITIAL_PROMOTIONS 
} from '../data/gabonData.ts';

export class DatabaseError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const code = err?.code || '';
  const msg = err?.message || String(err);
  return code === 'PGRST205' || code === '42P01' || msg.includes('schema cache') || msg.includes('does not exist');
}

function getAuthoritativeClient() {
  if (!isServerSupabaseConfigured()) {
    throw new DatabaseError(
      'Supabase n’est pas configuré sur le serveur (SUPABASE_SECRET_KEY / VITE_SUPABASE_URL manquantes).'
    );
  }
  const client = getSupabaseServer();
  if (!client) {
    throw new DatabaseError(
      'Impossible d’initialiser le client serveur Supabase.'
    );
  }
  return client;
}

function handleDbError(err: any, contextMsg: string): never {
  const code = err?.code || '';
  const msg = err?.message || String(err);
  if (isTableMissingError(err)) {
    throw new DatabaseError(
      `Table PostgreSQL manquante lors de « ${contextMsg} ». Veuillez exécuter supabase/schema.sql dans l’éditeur SQL de votre projet Supabase. Détails: ${msg}`,
      code
    );
  }
  throw new DatabaseError(`${contextMsg} : ${msg}`, code);
}

export function filterBusinesses(list: Business[], filters?: {
  q?: string;
  province?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
  minRating?: number;
  limit?: number;
}): Business[] {
  let results = [...list];
  if (filters?.category && filters.category !== 'all') {
    results = results.filter(b => b.category === filters.category);
  }
  if (filters?.province && filters.province !== 'all') {
    const pCode = filters.province;
    const pLower = filters.province.toLowerCase();
    results = results.filter(b => 
      b.location.provinceCode === pCode || 
      b.location.province.toLowerCase() === pLower ||
      b.branches?.some(br => br.location.provinceCode === pCode || br.location.province.toLowerCase() === pLower)
    );
  }
  if (filters?.city && filters.city !== 'all') {
    const cLower = filters.city.toLowerCase();
    results = results.filter(b => 
      b.location.city.toLowerCase() === cLower ||
      b.branches?.some(br => br.location.city.toLowerCase() === cLower)
    );
  }
  if (filters?.verifiedOnly) {
    results = results.filter(b => b.status === 'verified');
  }
  if (filters?.minRating) {
    results = results.filter(b => b.rating >= filters.minRating!);
  }
  if (filters?.q) {
    const term = filters.q.toLowerCase().trim();
    results = results.filter(b =>
      b.name.toLowerCase().includes(term) ||
      b.description.toLowerCase().includes(term) ||
      b.location.city.toLowerCase().includes(term) ||
      b.location.district.toLowerCase().includes(term) ||
      b.details.services.some(s => s.toLowerCase().includes(term)) ||
      b.branches?.some(br => br.name.toLowerCase().includes(term) || br.location.city.toLowerCase().includes(term))
    );
  }
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  return results;
}

export function getInitialAgenciesWithBusinessInfo(): (Agency & { businessName: string; businessCategory: string; businessLogo: string })[] {
  const result: (Agency & { businessName: string; businessCategory: string; businessLogo: string })[] = [];
  INITIAL_BUSINESSES.forEach(b => {
    (b.branches || []).forEach(br => {
      result.push({
        ...br,
        businessName: b.name,
        businessCategory: b.category,
        businessLogo: b.logo
      });
    });
  });
  return result;
}



// --- CONVERTISSEURS / MAPPERS POSTGRESQL <-> TYPESCRIPT (46 COLONNES) ---

function resolveCoord(val: any, fallback: number): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function resolveProvinceInfo(provinceInput?: string, provinceCodeInput?: string) {
  const cleanCode = (provinceCodeInput || '').trim().toLowerCase();
  const cleanName = (provinceInput || '').trim().toLowerCase();

  const codeAliases: Record<string, string> = {
    est: 'estuaire',
    ho: 'haut_ogooue',
    mo: 'moyen_ogooue',
    ng: 'ngounie',
    ngo: 'ngounie',
    ny: 'nyanga',
    nya: 'nyanga',
    oi: 'ogooue_ivindo',
    ol: 'ogooue_lolo',
    om: 'ogooue_maritime',
    wn: 'woleu_ntem'
  };

  const resolvedCode = codeAliases[cleanCode] || cleanCode;

  const matched =
    PROVINCES.find((p) => p.id.toLowerCase() === resolvedCode) ||
    PROVINCES.find((p) => p.name.toLowerCase() === cleanName) ||
    (cleanCode.length >= 2 && PROVINCES.find((p) => p.id.toLowerCase().startsWith(cleanCode) || p.name.toLowerCase().startsWith(cleanCode))) ||
    PROVINCES[0];

  return {
    province: matched.name,
    provinceCode: matched.id,
    defaultCity: matched.capital || 'Libreville',
    defaultLat: matched.coordinates.lat,
    defaultLng: matched.coordinates.lng
  };
}

function normalizeSlug(name: string): string {
  const ascii = (name || 'entreprise')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return ascii || 'entreprise';
}

export function rowToBusiness(row: any, agencies: Agency[] = []): Business {
  const numericRating = Number(row.rating);
  const numericReviewsCount = Number(row.reviews_count);

  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name || row.name,
    slug: row.slug,
    category: row.category,
    subCategory: row.sub_category || undefined,
    description: row.description ?? '',
    logo: row.logo ?? '',
    coverImage: row.cover_image ?? '',
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status,
    featured: Boolean(row.featured),
    creationYear: row.creation_year != null ? Number(row.creation_year) : undefined,
    nif: row.nif || undefined,
    rating: Number.isFinite(numericRating) ? numericRating : 5.0,
    reviewsCount: Number.isFinite(numericReviewsCount) ? numericReviewsCount : 0,
    location: {
      province: row.province,
      provinceCode: row.province_code,
      city: row.city,
      arrondissement: row.arrondissement || undefined,
      district: row.district ?? '',
      address: row.address ?? '',
      coordinates: {
        lat: resolveCoord(row.lat, 0.3901),
        lng: resolveCoord(row.lng, 9.4544)
      }
    },
    contact: {
      phone: row.phone,
      phoneSecondary: row.phone_secondary || undefined,
      email: row.email,
      website: row.website || undefined,
      whatsapp: row.whatsapp || undefined,
      facebook: row.facebook || undefined,
      instagram: row.instagram || undefined,
      linkedin: row.linkedin || undefined
    },
    details: {
      openingHours: (typeof row.opening_hours === 'object' && row.opening_hours) ? row.opening_hours : {},
      paymentMethods: Array.isArray(row.payment_methods) ? row.payment_methods : ['Airtel Money', 'Moov Money', 'Espèces'],
      services: Array.isArray(row.services) ? row.services : [],
      facilities: Array.isArray(row.facilities) ? row.facilities : []
    },
    stats: {
      views: Number(row.views) || 0,
      phoneClicks: Number(row.phone_clicks) || 0,
      whatsappClicks: Number(row.whatsapp_clicks) || 0,
      routeClicks: Number(row.route_clicks) || 0,
      favorites: Number(row.favorites_count) || 0
    },
    createdAt: row.created_at || new Date().toISOString(),
    claimed: Boolean(row.claimed),
    claimedByEmail: row.claimed_by_email || undefined,
    gpsPrecision: row.gps_precision === 'approximate' ? 'approximate' : 'exact',
    agencies: agencies,
    branches: agencies
  };
}

export function businessToRow(b: Partial<Business> & { id?: string }): Record<string, any> {
  const row: Record<string, any> = {};

  if (b.id !== undefined) {
    row.id = b.id;
  }
  if (b.name !== undefined && String(b.name).trim() !== '') {
    row.name = String(b.name).trim();
  }
  if (b.legalName !== undefined) {
    row.legal_name = b.legalName ? String(b.legalName).trim() : null;
  }
  if (b.slug !== undefined && String(b.slug).trim() !== '') {
    row.slug = String(b.slug).trim();
  }
  if (b.category !== undefined) row.category = b.category;
  if (b.subCategory !== undefined) {
    row.sub_category = b.subCategory ? String(b.subCategory).trim() : null;
  }
  if (b.description !== undefined) row.description = String(b.description ?? '');
  if (b.logo !== undefined) row.logo = String(b.logo ?? '');
  if (b.coverImage !== undefined) row.cover_image = String(b.coverImage ?? '');
  if (b.images !== undefined) {
    row.images = Array.isArray(b.images) ? b.images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : [];
  }
  if (b.status !== undefined) row.status = b.status;
  if (b.featured !== undefined) row.featured = Boolean(b.featured);
  if (b.creationYear !== undefined) {
    const parsedYear = Number(b.creationYear);
    row.creation_year = Number.isInteger(parsedYear) && parsedYear > 1900 ? parsedYear : null;
  }
  if (b.nif !== undefined) {
    row.nif = b.nif ? String(b.nif).trim() : null;
  }
  if (b.rating !== undefined && Number.isFinite(Number(b.rating))) {
    row.rating = Number(b.rating);
  }
  if (b.reviewsCount !== undefined && Number.isFinite(Number(b.reviewsCount))) {
    row.reviews_count = Number(b.reviewsCount);
  }
  if (b.claimed !== undefined) row.claimed = Boolean(b.claimed);
  if (b.claimedByEmail !== undefined) {
    row.claimed_by_email = b.claimedByEmail ? String(b.claimedByEmail).trim().toLowerCase() : null;
  }
  if (b.gpsPrecision !== undefined || (b as any).gps_precision !== undefined) {
    const prec = b.gpsPrecision || (b as any).gps_precision;
    row.gps_precision = prec === 'approximate' ? 'approximate' : 'exact';
  }

  if (b.location) {
    if (b.location.province !== undefined && b.location.provinceCode !== undefined) {
      const provInfo = resolveProvinceInfo(b.location.province, b.location.provinceCode);
      row.province = provInfo.province;
      row.province_code = provInfo.provinceCode;
    } else if (b.location.provinceCode !== undefined) {
      const provInfo = resolveProvinceInfo(undefined, b.location.provinceCode);
      row.province = provInfo.province;
      row.province_code = provInfo.provinceCode;
    } else if (b.location.province !== undefined) {
      const provInfo = resolveProvinceInfo(b.location.province, undefined);
      row.province = provInfo.province;
      row.province_code = provInfo.provinceCode;
    }
    if (b.location.city !== undefined) row.city = String(b.location.city).trim();
    if (b.location.arrondissement !== undefined) {
      row.arrondissement = b.location.arrondissement ? String(b.location.arrondissement).trim() : null;
    }
    if (b.location.district !== undefined) row.district = String(b.location.district ?? '').trim();
    if (b.location.address !== undefined) row.address = String(b.location.address ?? '').trim();
  }

  // Prise en charge résiliente des champs de localisation plats au premier niveau
  if ((b as any).provinceCode !== undefined || (b as any).province_code !== undefined || (b as any).province !== undefined) {
    const provInfo = resolveProvinceInfo((b as any).province, (b as any).provinceCode || (b as any).province_code);
    row.province = provInfo.province;
    row.province_code = provInfo.provinceCode;
  }
  if ((b as any).city !== undefined) row.city = String((b as any).city).trim();
  if ((b as any).arrondissement !== undefined) {
    row.arrondissement = (b as any).arrondissement ? String((b as any).arrondissement).trim() : null;
  }
  if ((b as any).district !== undefined) row.district = String((b as any).district ?? '').trim();
  if ((b as any).address !== undefined) row.address = String((b as any).address ?? '').trim();

  // Extraction garantie et sécurisée des coordonnées GPS (DOUBLE PRECISION à 6 décimales)
  const rawLat =
    b.location?.coordinates?.lat ??
    (b as any).coordinates?.lat ??
    (b as any).lat;

  const rawLng =
    b.location?.coordinates?.lng ??
    (b as any).coordinates?.lng ??
    (b as any).lng;

  if (rawLat !== undefined && rawLat !== null && rawLat !== '') {
    const latNum = Number(rawLat);
    if (Number.isFinite(latNum)) {
      row.lat = Math.round(latNum * 1000000) / 1000000;
    }
  }

  if (rawLng !== undefined && rawLng !== null && rawLng !== '') {
    const lngNum = Number(rawLng);
    if (Number.isFinite(lngNum)) {
      row.lng = Math.round(lngNum * 1000000) / 1000000;
    }
  }

  if (b.contact) {
    if (b.contact.phone !== undefined) row.phone = String(b.contact.phone ?? '').trim();
    if (b.contact.phoneSecondary !== undefined) {
      row.phone_secondary = b.contact.phoneSecondary ? String(b.contact.phoneSecondary).trim() : null;
    }
    if (b.contact.email !== undefined) row.email = String(b.contact.email ?? '').trim();
    if (b.contact.website !== undefined) {
      row.website = b.contact.website ? String(b.contact.website).trim() : null;
    }
    if (b.contact.whatsapp !== undefined) {
      row.whatsapp = b.contact.whatsapp ? String(b.contact.whatsapp).trim() : null;
    }
    if (b.contact.facebook !== undefined) {
      row.facebook = b.contact.facebook ? String(b.contact.facebook).trim() : null;
    }
    if (b.contact.instagram !== undefined) {
      row.instagram = b.contact.instagram ? String(b.contact.instagram).trim() : null;
    }
    if (b.contact.linkedin !== undefined) {
      row.linkedin = b.contact.linkedin ? String(b.contact.linkedin).trim() : null;
    }
  }

  if (b.details) {
    if (b.details.openingHours !== undefined && typeof b.details.openingHours === 'object' && b.details.openingHours !== null) {
      row.opening_hours = b.details.openingHours;
    }
    if (b.details.paymentMethods !== undefined) {
      row.payment_methods = Array.isArray(b.details.paymentMethods) ? b.details.paymentMethods : [];
    }
    if (b.details.services !== undefined) {
      row.services = Array.isArray(b.details.services) ? b.details.services : [];
    }
    if (b.details.facilities !== undefined) {
      row.facilities = Array.isArray(b.details.facilities) ? b.details.facilities : [];
    }
  }

  if (b.stats) {
    if (Number.isFinite(Number(b.stats.views))) row.views = Number(b.stats.views);
    if (Number.isFinite(Number(b.stats.phoneClicks))) row.phone_clicks = Number(b.stats.phoneClicks);
    if (Number.isFinite(Number(b.stats.whatsappClicks))) row.whatsapp_clicks = Number(b.stats.whatsappClicks);
    if (Number.isFinite(Number(b.stats.routeClicks))) row.route_clicks = Number(b.stats.routeClicks);
    if (Number.isFinite(Number(b.stats.favorites))) row.favorites_count = Number(b.stats.favorites);
  }

  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToAgency(row: any): Agency {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    code: row.code || undefined,
    isMainBranch: Boolean(row.is_main_branch),
    status: row.status,
    gpsPrecision: row.gps_precision || 'exact',
    location: {
      province: row.province,
      provinceCode: row.province_code,
      city: row.city,
      arrondissement: row.arrondissement || undefined,
      district: row.district || '',
      address: row.address,
      coordinates: {
        lat: resolveCoord(row.lat, 0.3901),
        lng: resolveCoord(row.lng, 9.4544)
      }
    },
    contact: {
      phone: row.phone,
      phoneSecondary: row.phone_secondary || undefined,
      email: row.email || undefined,
      whatsapp: row.whatsapp || undefined
    },
    openingHours: (typeof row.opening_hours === 'object' && row.opening_hours) ? row.opening_hours : {},
    photos: Array.isArray(row.photos) ? row.photos : [],
    images: Array.isArray(row.images) ? row.images : (Array.isArray(row.photos) ? row.photos : []),
    managerName: row.manager_name || undefined,
    services: Array.isArray(row.services) ? row.services : [],
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function agencyToRow(a: Partial<Agency> & { id: string; businessId: string; name: string }): Record<string, any> {
  const row: Record<string, any> = {
    id: a.id,
    business_id: a.businessId,
    name: a.name,
    code: a.code || null,
    is_main_branch: Boolean(a.isMainBranch),
    status: a.status || 'open',
    gps_precision: a.gpsPrecision || 'exact'
  };

  if (a.location) {
    row.province = a.location.province;
    row.province_code = a.location.provinceCode;
    row.city = a.location.city;
    row.arrondissement = a.location.arrondissement || null;
    row.district = a.location.district || '';
    row.address = a.location.address;
  }

  // Coordonnées GPS agence à 6 décimales
  const rawAgencyLat = a.location?.coordinates?.lat ?? (a as any).coordinates?.lat ?? (a as any).lat;
  const rawAgencyLng = a.location?.coordinates?.lng ?? (a as any).coordinates?.lng ?? (a as any).lng;
  if (rawAgencyLat !== undefined && rawAgencyLat !== null && rawAgencyLat !== '') {
    const latNum = Number(rawAgencyLat);
    if (Number.isFinite(latNum)) {
      row.lat = Math.round(latNum * 1000000) / 1000000;
    }
  }
  if (rawAgencyLng !== undefined && rawAgencyLng !== null && rawAgencyLng !== '') {
    const lngNum = Number(rawAgencyLng);
    if (Number.isFinite(lngNum)) {
      row.lng = Math.round(lngNum * 1000000) / 1000000;
    }
  }

  if (a.contact) {
    row.phone = a.contact.phone;
    row.phone_secondary = a.contact.phoneSecondary || null;
    row.email = a.contact.email || null;
    row.whatsapp = a.contact.whatsapp || null;
  }

  row.opening_hours = a.openingHours || {};
  row.photos = a.photos || [];
  row.images = a.images || a.photos || [];
  row.manager_name = a.managerName || null;
  row.services = a.services || [];
  row.notes = a.notes || null;
  row.updated_at = new Date().toISOString();

  return row;
}

export function rowToReview(row: any): Review {
  return {
    id: row.id,
    businessId: row.business_id,
    authorName: row.author_name,
    authorCity: row.author_city || 'Gabon',
    rating: Number(row.rating) || 5,
    comment: row.comment,
    photos: Array.isArray(row.photos) ? row.photos : [],
    helpfulCount: Number(row.helpful_count) || 0,
    businessResponse: row.business_response || undefined,
    reported: Boolean(row.reported),
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function rowToPromotion(row: any): Promotion {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    title: row.title,
    description: row.description,
    discountBadge: row.discount_badge || undefined,
    validUntil: row.valid_until,
    category: row.category,
    city: row.city,
    image: row.image || undefined,
    contactPhone: row.contact_phone || undefined
  };
}

// =====================================================================
// AUTORISATION & RBAC SÉCURISÉ (Vérification Supabase PostgreSQL)
// =====================================================================

export async function canUserManageBusiness(
  user: { id: string; role: string; email: string } | null, 
  businessId: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const client = getAuthoritativeClient();
  let canonicalId = businessId;

  // Resolve business by ID or slug to support both identifier formats and verify claimed_by_email
  const { data: bRow, error: bErr } = await client
    .from('businesses')
    .select('id, claimed_by_email')
    .or(`id.eq.${businessId},slug.eq.${businessId}`)
    .maybeSingle();

  if (bErr && !isTableMissingError(bErr)) {
    handleDbError(bErr, 'Recherche fiche entreprise pour vérification des droits');
  }

  if (bRow) {
    canonicalId = bRow.id;
    if (user.email && bRow.claimed_by_email && bRow.claimed_by_email.toLowerCase().trim() === user.email.toLowerCase().trim()) {
      return true;
    }
  }

  const { data, error } = await client
    .from('business_owners')
    .select('id, role')
    .eq('business_id', canonicalId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && !isTableMissingError(error)) {
    handleDbError(error, 'Vérification des droits de propriété');
  }

  return Boolean(data);
}

export async function getUserOwnedBusinessIds(userId: string, userEmail?: string): Promise<string[]> {
  const client = getAuthoritativeClient();
  const ownedSet = new Set<string>();

  const { data, error } = await client
    .from('business_owners')
    .select('business_id')
    .eq('user_id', userId);

  if (error && !isTableMissingError(error)) {
    handleDbError(error, 'Récupération des entreprises du propriétaire');
  }

  for (const r of data || []) {
    if (r.business_id) ownedSet.add(r.business_id);
  }

  if (userEmail && userEmail.trim()) {
    const { data: bClaimed, error: claimErr } = await client
      .from('businesses')
      .select('id')
      .ilike('claimed_by_email', userEmail.trim());

    if (!claimErr && bClaimed) {
      for (const b of bClaimed) {
        if (b.id) ownedSet.add(b.id);
      }
    }
  }

  return Array.from(ownedSet);
}

// =====================================================================
// GESTION DES ENTREPRISES (CRUD STRICT SUPABASE POSTGRESQL)
// =====================================================================

export async function dbGetAllBusinesses(filters?: {
  q?: string;
  province?: string;
  city?: string;
  category?: string;
  verifiedOnly?: boolean;
  minRating?: number;
  limit?: number;
  viewer?: { id: string; role: string; ownedBusinessIds?: string[]; email?: string } | null;
  excludeFallback?: boolean;
  ignoreVisibility?: boolean;
}): Promise<Business[]> {
  try {
    const client = getAuthoritativeClient();

    const { data: bRows, error: bError } = await client
      .from('businesses')
      .select('*')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (bError) {
      if (isTableMissingError(bError)) {
        return filterBusinesses(INITIAL_BUSINESSES, filters);
      }
      handleDbError(bError, 'Chargement des entreprises');
    }

    if (!bRows || bRows.length === 0) {
      return filters?.excludeFallback ? [] : filterBusinesses(INITIAL_BUSINESSES, filters);
    }

    // Charger les agences
    const { data: aRows, error: aError } = await client.from('agencies').select('*');
    if (aError && !isTableMissingError(aError)) {
      handleDbError(aError, 'Chargement des agences des entreprises');
    }

    const agenciesByBiz = new Map<string, Agency[]>();
    (aRows || []).forEach(ar => {
      const ag = rowToAgency(ar);
      const list = agenciesByBiz.get(ag.businessId) || [];
      list.push(ag);
      agenciesByBiz.set(ag.businessId, list);
    });

    const allDbBusinesses = bRows.map(r => rowToBusiness(r, agenciesByBiz.get(r.id) || []));
    const verifiedDbCount = allDbBusinesses.filter(b => b.status === 'verified').length;

    const viewer = filters?.viewer;
    const isAdmin = viewer?.role === 'admin';
    const viewerId = viewer?.id;
    const ownedIds = viewer?.ownedBusinessIds || [];
    const viewerEmail = viewer?.email?.toLowerCase().trim();

    let visibleResults = filters?.ignoreVisibility
      ? allDbBusinesses
      : allDbBusinesses.filter(b => {
          if (isAdmin) return true;
          if (b.status === 'verified') return true;
          if (viewerId && ownedIds.includes(b.id)) return true;
          if (viewerEmail && b.claimedByEmail?.toLowerCase().trim() === viewerEmail) return true;
          return false;
        });

    // Repli propre pendant la phase de transition tant qu'aucune fiche vérifiée n'est encore publiée en base
    if (!filters?.excludeFallback && verifiedDbCount === 0) {
      const existingIds = new Set(allDbBusinesses.map(b => b.id));
      const transitionSeeds = INITIAL_BUSINESSES.filter(ib => !existingIds.has(ib.id));
      visibleResults = [...visibleResults, ...transitionSeeds];
    }

    return filterBusinesses(visibleResults, filters);
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return filterBusinesses(INITIAL_BUSINESSES, filters);
    }
    throw err;
  }
}

export async function dbGetBusinessByIdOrSlug(
  idOrSlug: string,
  options?: { includeUnpublishedReviews?: boolean; skipViewIncrement?: boolean }
): Promise<{ business: Business | null; reviews: Review[]; promotions: Promotion[] }> {
  const includeUnpublished = Boolean(options?.includeUnpublishedReviews);
  const skipViewIncrement = Boolean(options?.skipViewIncrement);
  const filterInitialReviews = (bizId: string) =>
    INITIAL_REVIEWS.filter(
      (r) => r.businessId === bizId && (includeUnpublished || !r.status || r.status === 'published')
    );

  try {
    const client = getAuthoritativeClient();

    const { data: row, error } = await client
      .from('businesses')
      .select('*')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();

    if (error) {
      if (isTableMissingError(error)) {
        const match = INITIAL_BUSINESSES.find(b => b.id === idOrSlug || b.slug === idOrSlug) || null;
        return {
          business: match,
          reviews: match ? filterInitialReviews(match.id) : [],
          promotions: match ? INITIAL_PROMOTIONS.filter(p => p.businessId === match.id) : []
        };
      }
      handleDbError(error, 'Recherche fiche entreprise');
    }

    if (!row) {
      const match = INITIAL_BUSINESSES.find(b => b.id === idOrSlug || b.slug === idOrSlug) || null;
      if (match) {
        return {
          business: match,
          reviews: filterInitialReviews(match.id),
          promotions: INITIAL_PROMOTIONS.filter(p => p.businessId === match.id)
        };
      }
      return { business: null, reviews: [], promotions: [] };
    }

    // Agences
    const { data: aRows, error: aError } = await client.from('agencies').select('*').eq('business_id', row.id);
    if (aError && !isTableMissingError(aError)) handleDbError(aError, 'Chargement agences');
    const agencies = (aRows || []).map(rowToAgency);

    // Avis (seuls les avis 'published' sont exposés au public sauf modération admin explicite)
    let reviewsQuery = client.from('reviews').select('*').eq('business_id', row.id);
    if (!includeUnpublished) {
      reviewsQuery = reviewsQuery.eq('status', 'published');
    }
    const { data: rRows, error: rError } = await reviewsQuery.order('created_at', { ascending: false });
    if (rError && !isTableMissingError(rError)) handleDbError(rError, 'Chargement avis');
    const reviews = (rRows || []).map(rowToReview);

    // Promos
    const { data: pRows, error: pError } = await client.from('promotions').select('*').eq('business_id', row.id).order('created_at', { ascending: false });
    if (pError && !isTableMissingError(pError)) handleDbError(pError, 'Chargement promotions');
    const promotions = (pRows || []).map(rowToPromotion);

    let nextViews = Number(row.views) || 0;
    if (!skipViewIncrement) {
      nextViews += 1;
      await client.from('businesses').update({ views: nextViews }).eq('id', row.id);
    }

    const biz = rowToBusiness({ ...row, views: nextViews }, agencies);
    return { business: biz, reviews, promotions };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const match = INITIAL_BUSINESSES.find(b => b.id === idOrSlug || b.slug === idOrSlug) || null;
      return {
        business: match,
        reviews: match ? filterInitialReviews(match.id) : [],
        promotions: match ? INITIAL_PROMOTIONS.filter(p => p.businessId === match.id) : []
      };
    }
    throw err;
  }
}

// CRÉATION TRANSACTIONNELLE VIA PROCÉDURE SQL OU INSERT PROTÉGÉ
export async function dbCreateBusiness(
  businessData: any,
  user: { id: string; role: string; email: string } | null
): Promise<Business> {
  const client = getAuthoritativeClient();

  const cleanName = String(businessData.name || '').trim();
  const cleanCategory = String(businessData.category || '').trim();
  const provInfo = resolveProvinceInfo(
    businessData.location?.province || businessData.province,
    businessData.location?.provinceCode || businessData.province_code || businessData.provinceCode
  );
  const cleanCity = String(businessData.location?.city || businessData.city || provInfo.defaultCity || 'Libreville').trim();

  if (!cleanName || !cleanCategory) {
    throw new DatabaseError('Champs obligatoires manquants (nom commercial, secteur d’activité).');
  }

  // RÈGLE MÉTIER STRICTE : Assainissement des champs sensibles envoyés par le navigateur ou par l'API
  const isAdmin = Boolean(user && user.role === 'admin');
  const validCreateStatuses = ['draft', 'pending', 'verified', 'unverified', 'rejected', 'suspended'];
  const requestedStatus = typeof businessData.status === 'string' && validCreateStatuses.includes(businessData.status)
    ? businessData.status
    : 'pending';
  // Si non-authentifié ou non-admin, le statut est strictement forcé à 'pending'
  const initialStatus = isAdmin ? requestedStatus : 'pending';
  const isFeatured = isAdmin ? Boolean(businessData.featured) : false;

  const newId = `biz-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const slugBase = normalizeSlug(cleanName);
  const slug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

  const rawCreateLat = businessData.location?.coordinates?.lat ?? businessData.coordinates?.lat ?? businessData.lat;
  const rawCreateLng = businessData.location?.coordinates?.lng ?? businessData.coordinates?.lng ?? businessData.lng;
  const lat = Math.round(resolveCoord(rawCreateLat, provInfo.defaultLat) * 1000000) / 1000000;
  const lng = Math.round(resolveCoord(rawCreateLng, provInfo.defaultLng) * 1000000) / 1000000;
  const cleanDistrict = String(businessData.location?.district ?? businessData.district ?? '').trim();
  const cleanAddress = String(businessData.location?.address ?? businessData.address ?? '').trim() || (cleanDistrict ? `${cleanDistrict}, ${cleanCity}` : cleanCity);
  const cleanPhone = String(businessData.contact?.phone ?? businessData.phone ?? '').trim() || '+241 11 00 00 00';
  const cleanEmail = String(businessData.contact?.email ?? businessData.email ?? '').trim() || (user ? user.email : 'contact@gabonbusinessmap.ga');

  const parsedYear = Number(businessData.creationYear || businessData.creation_year);
  const creationYearVal = Number.isInteger(parsedYear) && parsedYear > 1900 ? parsedYear : new Date().getFullYear();

  const imagesArray = Array.isArray(businessData.images)
    ? businessData.images.filter((img: any): img is string => typeof img === 'string' && img.trim().length > 0)
    : [];
  const paymentMethodsArray =
    Array.isArray(businessData.details?.paymentMethods) && businessData.details.paymentMethods.length > 0
      ? businessData.details.paymentMethods.filter((m: any): m is string => typeof m === 'string' && m.trim().length > 0)
      : Array.isArray(businessData.payment_methods) && businessData.payment_methods.length > 0
      ? businessData.payment_methods
      : ['Airtel Money', 'Moov Money', 'Espèces'];
  const servicesArray = Array.isArray(businessData.details?.services)
    ? businessData.details.services.filter((s: any): s is string => typeof s === 'string' && s.trim().length > 0)
    : Array.isArray(businessData.services)
    ? businessData.services
    : [];
  const facilitiesArray = Array.isArray(businessData.details?.facilities)
    ? businessData.details.facilities.filter((f: any): f is string => typeof f === 'string' && f.trim().length > 0)
    : Array.isArray(businessData.facilities)
    ? businessData.facilities
    : [];
  const openingHoursObj =
    businessData.details?.openingHours && typeof businessData.details.openingHours === 'object' && !Array.isArray(businessData.details.openingHours)
      ? businessData.details.openingHours
      : (businessData.opening_hours && typeof businessData.opening_hours === 'object' && !Array.isArray(businessData.opening_hours))
      ? businessData.opening_hours
      : {};

  const sanitizedPayload: Record<string, any> = {
    id: newId,
    name: cleanName,
    legal_name: businessData.legalName ? String(businessData.legalName).trim() : (businessData.legal_name ? String(businessData.legal_name).trim() : cleanName),
    slug: slug,
    category: cleanCategory,
    sub_category: businessData.subCategory ? String(businessData.subCategory).trim() : (businessData.sub_category ? String(businessData.sub_category).trim() : null),
    description: String(businessData.description ?? ''),
    logo: String(businessData.logo ?? ''),
    cover_image: String(businessData.coverImage ?? businessData.cover_image ?? ''),
    images: imagesArray,
    status: initialStatus,
    featured: isFeatured,
    creation_year: creationYearVal,
    nif: businessData.nif ? String(businessData.nif).trim() : null,
    rating: 5.0,
    reviews_count: 0,
    province: provInfo.province,
    province_code: provInfo.provinceCode,
    city: cleanCity,
    arrondissement: businessData.location?.arrondissement ? String(businessData.location.arrondissement).trim() : (businessData.arrondissement ? String(businessData.arrondissement).trim() : null),
    district: cleanDistrict,
    address: cleanAddress,
    lat: lat,
    lng: lng,
    gps_precision: businessData.gpsPrecision === 'approximate' || businessData.gps_precision === 'approximate' ? 'approximate' : 'exact',
    phone: cleanPhone,
    phone_secondary: businessData.contact?.phoneSecondary ? String(businessData.contact.phoneSecondary).trim() : (businessData.phone_secondary ? String(businessData.phone_secondary).trim() : null),
    email: cleanEmail,
    website: businessData.contact?.website ? String(businessData.contact.website).trim() : (businessData.website ? String(businessData.website).trim() : null),
    whatsapp: businessData.contact?.whatsapp ? String(businessData.contact.whatsapp).trim() : (businessData.whatsapp ? String(businessData.whatsapp).trim() : null),
    facebook: businessData.contact?.facebook ? String(businessData.contact.facebook).trim() : (businessData.facebook ? String(businessData.facebook).trim() : null),
    instagram: businessData.contact?.instagram ? String(businessData.contact.instagram).trim() : (businessData.instagram ? String(businessData.instagram).trim() : null),
    linkedin: businessData.contact?.linkedin ? String(businessData.contact.linkedin).trim() : (businessData.linkedin ? String(businessData.linkedin).trim() : null),
    opening_hours: openingHoursObj,
    payment_methods: paymentMethodsArray,
    services: servicesArray,
    facilities: facilitiesArray,
    claimed: Boolean(user),
    claimed_by_email: user ? user.email : null
  };

  // CAS 1 : Soumission publique / non-authentifiée (ex: appel cURL, webhook ou candidature sans compte)
  if (!user) {
    const { data: bRow, error: insertError } = await client
      .from('businesses')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (insertError) {
      handleDbError(insertError, 'Création de la fiche entreprise');
    }

    return rowToBusiness(bRow, []);
  }

  // CAS 2 : Utilisateur authentifié -> Procédure transactionnelle avec association de propriétaire
  let { data: rpcResult, error: rpcError } = await client.rpc('create_business_with_owner', {
    p_business: sanitizedPayload,
    p_owner_id: user.id
  });

  // Si le profil n'existait pas encore dans public.profiles pour ce compte Auth valide, le créer en business_owner et réessayer
  if (rpcError && rpcError.message?.includes('Profil utilisateur introuvable')) {
    await client.from('profiles').upsert(
      {
        id: user.id,
        email: user.email.toLowerCase().trim(),
        name: user.email.split('@')[0] || 'Propriétaire',
        role: user.role === 'admin' ? 'admin' : 'business_owner',
        status: 'active'
      },
      { onConflict: 'id' }
    );
    const retryRpc = await client.rpc('create_business_with_owner', {
      p_business: sanitizedPayload,
      p_owner_id: user.id
    });
    rpcResult = retryRpc.data;
    rpcError = retryRpc.error;
  }

  let createdBusiness: Business | null = null;

  if (!rpcError && rpcResult) {
    if (isAdmin && (rpcResult.status !== initialStatus || Boolean(rpcResult.featured) !== isFeatured)) {
      const { data: syncedRow } = await client
        .from('businesses')
        .update({ status: initialStatus, featured: isFeatured })
        .eq('id', rpcResult.id)
        .select()
        .single();
      createdBusiness = rowToBusiness(syncedRow || rpcResult, []);
    } else {
      createdBusiness = rowToBusiness(rpcResult, []);
    }
  } else {
    // Repli sur insertion directe en deux étapes strictement reliées (businesses + business_owners)
    const { data: bRow, error: insertError } = await client
      .from('businesses')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (insertError) {
      handleDbError(insertError, 'Création de la fiche entreprise');
    }

    const { error: ownerError } = await client.from('business_owners').insert({
      business_id: bRow.id,
      user_id: user.id,
      role: 'primary_owner',
      is_primary: true,
      granted_by: user.id
    });

    if (ownerError) {
      await client.from('businesses').delete().eq('id', bRow.id);
      handleDbError(ownerError, 'Association du propriétaire à l’entreprise');
    }

    createdBusiness = rowToBusiness(bRow, []);
  }

  // Mettre à jour le rôle du profil de 'visitor' vers 'business_owner' si nécessaire
  if (user.role === 'visitor') {
    await client
      .from('profiles')
      .update({ role: 'business_owner', updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .eq('role', 'visitor');
  }

  return createdBusiness;
}

export async function dbUpdateBusiness(
  businessId: string,
  updates: Partial<Business>,
  user: { id: string; role: string; email: string }
): Promise<Business | null> {
  const allowed = await canUserManageBusiness(user, businessId);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.');
  }

  const client = getAuthoritativeClient();

  const { data: existingRow, error: existingErr } = await client
    .from('businesses')
    .select('id, slug')
    .or(`id.eq.${businessId},slug.eq.${businessId}`)
    .maybeSingle();

  if (existingErr) {
    handleDbError(existingErr, 'Vérification de la fiche entreprise');
  }

  // Pendant la phase de transition, si un administrateur modifie une fiche issue de INITIAL_BUSINESSES pas encore en base, l'insérer proprement
  if (!existingRow) {
    const seedMatch = INITIAL_BUSINESSES.find(b => b.id === businessId || b.slug === businessId);
    if (!seedMatch || user.role !== 'admin') {
      return null;
    }

    const merged: Business = {
      ...seedMatch,
      ...updates,
      id: seedMatch.id,
      location: {
        ...seedMatch.location,
        ...(updates.location || {}),
        coordinates: {
          ...seedMatch.location.coordinates,
          ...(updates.location?.coordinates || {}),
          ...((updates as any).coordinates || {})
        }
      },
      contact: {
        ...seedMatch.contact,
        ...(updates.contact || {})
      },
      details: {
        ...seedMatch.details,
        ...(updates.details || {})
      },
      stats: {
        ...seedMatch.stats,
        ...(updates.stats || {})
      }
    };

    const fullRow = businessToRow({
      ...merged,
      claimed: true,
      claimedByEmail: merged.claimedByEmail || user.email
    });

    const { error: seedInsertErr } = await client.from('businesses').insert(fullRow);
    if (seedInsertErr) {
      handleDbError(seedInsertErr, 'Matérialisation de la fiche entreprise en base');
    }

    await client.from('business_owners').upsert(
      {
        business_id: seedMatch.id,
        user_id: user.id,
        role: 'primary_owner',
        is_primary: true,
        granted_by: user.id
      },
      { onConflict: 'business_id,user_id' }
    );

    const { business } = await dbGetBusinessByIdOrSlug(seedMatch.id, {
      skipViewIncrement: true,
      includeUnpublishedReviews: true
    });
    return business;
  }

  const targetId = existingRow.id;

  // SÉCURITÉ CRITIQUE : Mise à jour partielle sans écraser les colonnes non fournies (dont name)
  const row = businessToRow(updates);
  delete row.id; // Clé primaire immuable
  delete row.created_at;

  if (user.role !== 'admin') {
    delete row.status;
    delete row.featured;
    delete row.claimed;
    delete row.claimed_by_email;
    delete row.rating;
    delete row.reviews_count;
    delete row.views;
    delete row.phone_clicks;
    delete row.whatsapp_clicks;
    delete row.route_clicks;
    delete row.favorites_count;
  }

  const { error } = await client.from('businesses').update(row).eq('id', targetId);
  if (error) {
    handleDbError(error, 'Mise à jour de l’entreprise');
  }

  const { business } = await dbGetBusinessByIdOrSlug(targetId, {
    skipViewIncrement: true,
    includeUnpublishedReviews: user.role === 'admin'
  });
  return business;
}

export async function dbDeleteBusiness(
  businessId: string,
  user: { id: string; role: string }
): Promise<boolean> {
  if (user.role !== 'admin') {
    throw new DatabaseError('Accès interdit. Seul un administrateur peut supprimer une entreprise.');
  }

  const client = getAuthoritativeClient();
  const { error } = await client.from('businesses').delete().eq('id', businessId);
  if (error) {
    handleDbError(error, 'Suppression de l’entreprise');
  }
  return true;
}

// =====================================================================
// GESTION DES AGENCES SECONDAIRES
// =====================================================================

export async function dbGetAllAgencies(): Promise<(Agency & { businessName: string; businessCategory: string; businessLogo: string })[]> {
  try {
    const client = getAuthoritativeClient();
    const { data, error } = await client
      .from('agencies')
      .select('*, businesses(name, category, logo)');

    if (error) {
      if (isTableMissingError(error)) {
        return getInitialAgenciesWithBusinessInfo();
      }
      handleDbError(error, 'Chargement de l’annuaire des agences');
    }

    if (!data || data.length === 0) {
      return getInitialAgenciesWithBusinessInfo();
    }

    return (data || []).map(r => ({
      ...rowToAgency(r),
      businessName: r.businesses?.name || '',
      businessCategory: r.businesses?.category || '',
      businessLogo: r.businesses?.logo || ''
    }));
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return getInitialAgenciesWithBusinessInfo();
    }
    throw err;
  }
}

export async function dbGetAgenciesForBusiness(businessId: string): Promise<Agency[]> {
  try {
    const client = getAuthoritativeClient();
    const { data, error } = await client.from('agencies').select('*').eq('business_id', businessId);
    if (error) {
      if (isTableMissingError(error)) {
        const b = INITIAL_BUSINESSES.find(biz => biz.id === businessId || biz.slug === businessId);
        return b?.branches || [];
      }
      handleDbError(error, 'Chargement des agences de l’entreprise');
    }
    return (data || []).map(rowToAgency);
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const b = INITIAL_BUSINESSES.find(biz => biz.id === businessId || biz.slug === businessId);
      return b?.branches || [];
    }
    throw err;
  }
}

export async function dbCreateAgency(
  businessId: string,
  data: any,
  user: { id: string; role: string; email: string }
): Promise<Agency> {
  const allowed = await canUserManageBusiness(user, businessId);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.');
  }

  const client = getAuthoritativeClient();

  const newAgency: Agency = {
    id: `branch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    businessId,
    name: String(data.name).trim(),
    code: data.code || `AG-${data.location?.provinceCode ? data.location.provinceCode.toUpperCase().slice(0, 3) : 'GAB'}-${Math.floor(Math.random() * 1000)}`,
    isMainBranch: Boolean(data.isMainBranch),
    status: data.status || 'open',
    gpsPrecision: data.gpsPrecision || 'exact',
    location: {
      province: data.location?.province || 'Estuaire',
      provinceCode: data.location?.provinceCode || 'estuaire',
      city: data.location?.city || 'Libreville',
      arrondissement: data.location?.arrondissement || '',
      district: data.location?.district || 'Centre',
      address: data.location?.address || 'Libreville',
      coordinates: {
        lat: parseFloat(data.location?.coordinates?.lat || 0.3901),
        lng: parseFloat(data.location?.coordinates?.lng || 9.4544)
      }
    },
    contact: {
      phone: data.contact?.phone || '+241 11 00 00 00',
      phoneSecondary: data.contact?.phoneSecondary || '',
      email: data.contact?.email || '',
      whatsapp: data.contact?.whatsapp || ''
    },
    openingHours: data.openingHours || { 'Lundi - Vendredi': '08:00 - 17:30' },
    photos: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
    images: Array.isArray(data.images) ? data.images : (Array.isArray(data.photos) ? data.photos : []),
    managerName: data.managerName || '',
    services: Array.isArray(data.services) ? data.services : [],
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  };

  const row = agencyToRow(newAgency);
  const { error } = await client.from('agencies').insert(row);
  if (error) {
    handleDbError(error, 'Création de l’agence secondaire');
  }

  return newAgency;
}

export async function dbUpdateAgency(
  businessId: string,
  agencyId: string,
  data: Partial<Agency>,
  user: { id: string; role: string; email: string }
): Promise<Agency | null> {
  const allowed = await canUserManageBusiness(user, businessId);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.');
  }

  const client = getAuthoritativeClient();

  // SÉCURITÉ STRICTE : Interdiction absolue de modifier business_id (empêche le vol/transfert d'agence)
  const row = agencyToRow({ ...data, id: agencyId, businessId, name: data.name || '' });
  delete row.id;
  delete row.business_id;

  const { error } = await client.from('agencies').update(row).eq('id', agencyId).eq('business_id', businessId);
  if (error) {
    handleDbError(error, 'Mise à jour de l’agence');
  }

  const { data: updatedRow, error: fetchErr } = await client.from('agencies').select('*').eq('id', agencyId).single();
  if (fetchErr) handleDbError(fetchErr, 'Relecture de l’agence mise à jour');

  return updatedRow ? rowToAgency(updatedRow) : null;
}

export async function dbDeleteAgency(
  businessId: string,
  agencyId: string,
  user: { id: string; role: string; email: string }
): Promise<boolean> {
  const allowed = await canUserManageBusiness(user, businessId);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être propriétaire de cette entreprise ou administrateur.');
  }

  const client = getAuthoritativeClient();
  const { error } = await client.from('agencies').delete().eq('id', agencyId).eq('business_id', businessId);
  if (error) {
    handleDbError(error, 'Suppression de l’agence');
  }

  return true;
}

// =====================================================================
// GESTION DES CO-PROPRIÉTAIRES (ANTI-AUTO-ATTRIBUTION)
// =====================================================================

export async function dbAddBusinessOwner(
  businessId: string,
  targetEmail: string,
  role: 'owner' | 'manager' = 'owner',
  grantedBy: { id: string; role: string; email: string }
): Promise<{ success: boolean; message: string }> {
  const isPrimary = await dbIsUserPrimaryOwner(grantedBy.id, businessId);
  if (!isPrimary && grantedBy.role !== 'admin') {
    throw new DatabaseError('Action interdite. Seul le propriétaire principal ou un administrateur peut associer un co-gérant.');
  }

  const client = getAuthoritativeClient();
  const cleanEmail = targetEmail.toLowerCase().trim();

  // Rechercher l'utilisateur cible dans public.profiles par son email
  const { data: targetProfile, error: profileErr } = await client
    .from('profiles')
    .select('id, email, name, role')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (profileErr) {
    handleDbError(profileErr, 'Recherche du profil co-propriétaire');
  }

  if (!targetProfile) {
    throw new DatabaseError(`Aucun utilisateur trouvé avec l'adresse « ${cleanEmail} ». L'utilisateur doit d'abord créer son compte sur la plateforme.`);
  }

  // Tenter l'appel SQL add_business_co_owner si disponible
  const { data: rpcRes, error: rpcErr } = await client.rpc('add_business_co_owner', {
    p_business_id: businessId,
    p_target_email: cleanEmail,
    p_role: role
  });

  if (!rpcErr && rpcRes) {
    return {
      success: true,
      message: `L'utilisateur ${targetProfile.name} (${cleanEmail}) a été associé avec succès.`
    };
  }

  // Insertion directe sécurisée
  const { error: insertErr } = await client
    .from('business_owners')
    .insert({
      business_id: businessId,
      user_id: targetProfile.id,
      role: role,
      is_primary: false, // JAMAIS primary_owner
      granted_by: grantedBy.id
    });

  if (insertErr) {
    if (insertErr.code === '23505') {
      throw new DatabaseError(`L'utilisateur « ${cleanEmail} » est déjà associé à cet établissement.`);
    }
    handleDbError(insertErr, 'Association du co-propriétaire');
  }

  return {
    success: true,
    message: `L'utilisateur ${targetProfile.name} (${cleanEmail}) a été associé avec succès comme ${role}.`
  };
}

export async function dbIsUserPrimaryOwner(userId: string, businessId: string): Promise<boolean> {
  const client = getAuthoritativeClient();
  const { data, error } = await client
    .from('business_owners')
    .select('is_primary, role')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    handleDbError(error, 'Vérification du statut de propriétaire principal');
  }

  return Boolean(data?.is_primary || data?.role === 'primary_owner');
}

// =====================================================================
// GESTION DES AVIS, PROMOTIONS, SIGNALEMENTS, AUDIT LOGS ET PARAMÈTRES
// =====================================================================

export async function dbGetAllReviews(includeUnpublished = false): Promise<Review[]> {
  try {
    const client = getAuthoritativeClient();
    let query = client.from('reviews').select('*');
    if (!includeUnpublished) {
      query = query.eq('status', 'published');
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      if (isTableMissingError(error)) {
        return INITIAL_REVIEWS.filter(
          (r) => includeUnpublished || !r.status || r.status === 'published'
        );
      }
      handleDbError(error, 'Chargement des avis');
    }
    return (data || []).map(rowToReview);
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return INITIAL_REVIEWS.filter(
        (r) => includeUnpublished || !r.status || r.status === 'published'
      );
    }
    throw err;
  }
}

export async function dbCreateReview(businessId: string, data: any): Promise<Review> {
  const client = getAuthoritativeClient();

  const newId = `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanReview = {
    id: newId,
    business_id: businessId,
    author_name: String(data.authorName).trim(),
    author_city: data.authorCity || 'Gabon',
    rating: Math.min(5, Math.max(1, Number(data.rating))),
    comment: String(data.comment).trim(),
    photos: Array.isArray(data.photos) ? data.photos : [],
    helpful_count: 0, // Ne peut pas être falsifié
    reported: false, // Ne peut pas être falsifié
    business_response: null, // Ne peut pas être falsifié
    status: 'pending' // Tout nouvel avis requiert une modération via moderate_review()
  };

  const { data: inserted, error } = await client
    .from('reviews')
    .insert(cleanReview)
    .select()
    .single();

  if (error) {
    handleDbError(error, 'Soumission de l’avis pour modération');
  }

  return rowToReview(inserted);
}

export async function dbModerateReview(
  reviewId: string,
  action: 'publish' | 'hide' | 'flag',
  user: { id: string; role: string; email: string; name?: string; adminRole?: AdminRole }
): Promise<Review | null> {
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new DatabaseError('Action réservée aux modérateurs et administrateurs.');
  }

  if (!['publish', 'hide', 'flag'].includes(action)) {
    throw new DatabaseError(`Action de modération invalide (${action}).`);
  }

  const client = getAuthoritativeClient();
  const { error: modErr } = await client.rpc('moderate_review', {
    p_review_id: reviewId,
    p_action: action
  });

  if (modErr) {
    handleDbError(modErr, 'Modération de l’avis');
  }

  const { data: updated, error: fetchErr } = await client
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .maybeSingle();

  if (fetchErr) {
    handleDbError(fetchErr, 'Récupération de l’avis modéré');
  }

  await dbLogAdminAction(
    { ...user, name: user.name || user.email },
    'moderate_review',
    'review',
    reviewId,
    updated?.author_name || reviewId,
    `Modération de l'avis (${action}) par ${user.email}.`
  );

  return updated ? rowToReview(updated) : null;
}

export async function dbDeleteReview(
  reviewId: string,
  user: { id: string; role: string; email: string; name?: string; adminRole?: AdminRole }
): Promise<boolean> {
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new DatabaseError('Action réservée aux administrateurs.');
  }

  const client = getAuthoritativeClient();
  const { error } = await client.from('reviews').delete().eq('id', reviewId);
  if (error) {
    handleDbError(error, 'Suppression de l’avis');
  }

  await dbLogAdminAction(
    { ...user, name: user.name || user.email },
    'delete_review',
    'review',
    reviewId,
    reviewId,
    `Suppression définitive de l'avis par ${user.email}.`
  );

  return true;
}

export async function dbReplyReview(
  reviewId: string,
  replyText: string,
  responderName: string,
  user: { id: string; role: string; email: string }
): Promise<Review | null> {
  const client = getAuthoritativeClient();

  const { data: rev, error: rErr } = await client.from('reviews').select('*').eq('id', reviewId).maybeSingle();
  if (rErr) handleDbError(rErr, 'Recherche de l’avis pour réponse');
  if (!rev) return null;

  const allowed = await canUserManageBusiness(user, rev.business_id);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être gérant de l’entreprise pour répondre aux avis.');
  }

  const responsePayload = {
    comment: String(replyText).trim(),
    date: new Date().toISOString(),
    responderName: responderName || user.email
  };

  const { data: updated, error: uErr } = await client
    .from('reviews')
    .update({ business_response: responsePayload })
    .eq('id', reviewId)
    .select()
    .single();

  if (uErr) handleDbError(uErr, 'Enregistrement de la réponse à l’avis');
  return updated ? rowToReview(updated) : null;
}

export async function dbGetPromotions(): Promise<Promotion[]> {
  try {
    const client = getAuthoritativeClient();
    const { data, error } = await client.from('promotions').select('*').order('created_at', { ascending: false });
    if (error) {
      if (isTableMissingError(error)) {
        return INITIAL_PROMOTIONS;
      }
      handleDbError(error, 'Chargement des promotions');
    }
    if (!data || data.length === 0) {
      return INITIAL_PROMOTIONS;
    }
    return (data || []).map(rowToPromotion);
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return INITIAL_PROMOTIONS;
    }
    throw err;
  }
}

export async function dbCreatePromotion(data: any, user: { id: string; role: string; email: string }): Promise<Promotion> {
  const allowed = await canUserManageBusiness(user, data.businessId);
  if (!allowed) {
    throw new DatabaseError('Action non autorisée. Vous devez être propriétaire de cette entreprise.');
  }

  const client = getAuthoritativeClient();
  const newId = `promo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const cleanPromo = {
    id: newId,
    business_id: data.businessId,
    business_name: data.businessName,
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    discount_badge: data.discountBadge || null,
    valid_until: data.validUntil || '2026-12-31',
    category: data.category,
    city: data.city,
    image: data.image || null,
    contact_phone: data.contactPhone || null
  };

  const { data: inserted, error } = await client.from('promotions').insert(cleanPromo).select().single();
  if (error) {
    handleDbError(error, 'Création de la promotion');
  }

  return rowToPromotion(inserted);
}

export async function dbGetReports(user: { role: string }): Promise<BusinessReport[]> {
  if (user.role !== 'admin') throw new DatabaseError('Accès interdit aux signalements.');
  const client = getAuthoritativeClient();
  const { data, error } = await client.from('business_reports').select('*').order('created_at', { ascending: false });
  if (error) {
    handleDbError(error, 'Chargement des signalements');
  }
  return (data || []).map(r => ({
    id: r.id,
    businessId: r.business_id,
    businessName: r.business_name,
    reason: r.reason,
    details: r.details,
    reporterEmail: r.reporter_email || undefined,
    createdAt: r.created_at,
    status: r.status
  }));
}

export async function dbCreateReport(data: any): Promise<BusinessReport> {
  const client = getAuthoritativeClient();
  const newId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newReport = {
    id: newId,
    business_id: data.businessId,
    business_name: data.businessName || 'Entreprise',
    reason: data.reason || 'other',
    details: data.details || '',
    reporter_email: data.reporterEmail || null,
    status: 'pending'
  };

  const { data: inserted, error } = await client.from('business_reports').insert(newReport).select().single();
  if (error) {
    handleDbError(error, 'Enregistrement du signalement');
  }

  return {
    id: inserted.id,
    businessId: inserted.business_id,
    businessName: inserted.business_name,
    reason: inserted.reason,
    details: inserted.details,
    reporterEmail: inserted.reporter_email || undefined,
    createdAt: inserted.created_at,
    status: inserted.status
  };
}

export async function dbResolveReport(reportId: string, user: { id: string; role: string }): Promise<boolean> {
  if (user.role !== 'admin') throw new DatabaseError('Action réservée aux administrateurs.');
  const client = getAuthoritativeClient();
  const { error } = await client.from('business_reports').update({
    status: 'resolved',
    resolved_by: user.id,
    resolved_at: new Date().toISOString()
  }).eq('id', reportId);

  if (error) {
    handleDbError(error, 'Résolution du signalement');
  }
  return true;
}

export async function dbGetAuditLogs(filters?: { action?: string; targetType?: string; search?: string; limit?: number }): Promise<AdminAuditLog[]> {
  const client = getAuthoritativeClient();
  let query = client.from('admin_audit_logs').select('*').order('created_at', { ascending: false });

  if (filters?.action && filters.action !== 'all') query = query.eq('action', filters.action);
  if (filters?.targetType && filters.targetType !== 'all') query = query.eq('target_type', filters.targetType);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    handleDbError(error, 'Consultation du journal d’audit');
  }

  return (data || []).map(r => ({
    id: r.id,
    adminEmail: r.admin_email,
    adminName: r.admin_name,
    adminRole: r.admin_role || undefined,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    targetName: r.target_name,
    timestamp: r.created_at,
    details: r.details
  }));
}

export async function dbLogAdminAction(
  user: { id?: string; email: string; name: string; role: string; adminRole?: AdminRole },
  action: AdminAuditLog['action'],
  targetType: AdminAuditLog['targetType'],
  targetId: string,
  targetName: string,
  details: string
): Promise<AdminAuditLog> {
  const client = getAuthoritativeClient();
  const newLogId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const logRow = {
    id: newLogId,
    admin_id: user.id || null,
    admin_email: user.email,
    admin_name: user.name,
    admin_role: user.adminRole || null,
    action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName,
    details
  };

  const { error } = await client.from('admin_audit_logs').insert(logRow);
  if (error) {
    handleDbError(error, 'Écriture du journal d’audit');
  }

  return {
    id: newLogId,
    adminEmail: user.email,
    adminName: user.name,
    adminRole: user.adminRole,
    action,
    targetType,
    targetId,
    targetName,
    timestamp: new Date().toISOString(),
    details
  };
}

export async function dbGetPlatformSettings(): Promise<PlatformSettings> {
  const client = getAuthoritativeClient();
  const { data, error } = await client.from('platform_settings').select('*');
  if (error) {
    handleDbError(error, 'Chargement des paramètres');
  }

  const obj: any = {};
  (data || []).forEach(r => { obj[r.key] = r.value; });

  return {
    siteName: obj.siteName || 'GABON BUSINESS MAP',
    maintenanceMode: Boolean(obj.maintenanceMode),
    allowPublicRegistrations: obj.allowPublicRegistrations !== undefined ? Boolean(obj.allowPublicRegistrations) : true,
    requireAdminApproval: obj.requireAdminApproval !== undefined ? Boolean(obj.requireAdminApproval) : true,
    maxPhotosPerGallery: Number(obj.maxPhotosPerGallery) || 12,
    contactEmail: obj.contactEmail || 'contact@gabonbusinessmap.ga',
    contactPhone: obj.contactPhone || '+241 11 76 00 00',
    systemNotice: obj.systemNotice || 'Plateforme nationale officielle de référencement et cartographie des entreprises gabonaises.'
  };
}

export async function dbUpdatePlatformSettings(
  newSettings: Partial<PlatformSettings>, 
  user: { id: string; role: string; adminRole?: AdminRole }
): Promise<PlatformSettings> {
  if (user.role !== 'admin') throw new DatabaseError('Seul un administrateur peut modifier les paramètres système.');
  const client = getAuthoritativeClient();

  for (const [key, val] of Object.entries(newSettings)) {
    const { error } = await client.from('platform_settings').upsert({
      key,
      value: val,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });
    if (error) handleDbError(error, `Mise à jour paramètre ${key}`);
  }

  return dbGetPlatformSettings();
}

export async function dbGetUsers(user: { role: string }): Promise<UserAccount[]> {
  if (user.role !== 'admin') throw new DatabaseError('Accès réservé aux administrateurs.');
  const client = getAuthoritativeClient();
  const { data: profiles, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) {
    handleDbError(error, 'Chargement des utilisateurs');
  }

  return (profiles || []).map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    adminRole: p.admin_role || undefined,
    favorites: Array.isArray(p.favorites) ? p.favorites : [],
    ownedBusinessIds: [],
    status: p.status || 'active',
    lastLogin: p.updated_at
  }));
}

export async function dbUpdateUserRole(
  targetId: string, 
  role: string, 
  adminRole: AdminRole | undefined, 
  adminUser: { id: string; role: string }
): Promise<boolean> {
  if (adminUser.role !== 'admin') throw new DatabaseError('Action réservée aux administrateurs.');
  const client = getAuthoritativeClient();
  const { error } = await client.from('profiles').update({
    role,
    admin_role: adminRole || null,
    updated_at: new Date().toISOString()
  }).eq('id', targetId);

  if (error) {
    handleDbError(error, 'Mise à jour du rôle utilisateur');
  }
  return true;
}
