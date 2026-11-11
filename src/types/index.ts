export type ProvinceCode =
  | 'estuaire'
  | 'haut_ogooue'
  | 'moyen_ogooue'
  | 'ngounie'
  | 'nyanga'
  | 'ogooue_ivindo'
  | 'ogooue_lolo'
  | 'ogooue_maritime'
  | 'woleu_ntem';

export interface Province {
  id: ProvinceCode;
  name: string;
  capital: string;
  mainCities: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  zoomLevel: number;
  description: string;
  economicKey: string;
  flagAccent: string;
}

export type BusinessCategory =
  | 'banque_finance'
  | 'energie_mines'
  | 'hotellerie_tourisme'
  | 'restauration_bars'
  | 'commerce_distribution'
  | 'sante_pharmacie'
  | 'btp_immobilier'
  | 'telecoms_tech'
  | 'transport_logistique'
  | 'agroalimentaire_foret'
  | 'services_conseil'
  | 'automobile_mecanique';

export interface CategoryInfo {
  id: BusinessCategory;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface BusinessLocation {
  province: string;
  provinceCode: ProvinceCode;
  city: string;
  arrondissement?: string;
  district: string; // Quartier (ex: Louis, Glass, Oloumi, Poto-poto...)
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface BusinessContact {
  phone: string;
  phoneSecondary?: string;
  email: string;
  website?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

export interface BusinessDetails {
  openingHours: Record<string, string>; // e.g. "Lundi - Vendredi": "08:00 - 18:00"
  paymentMethods: string[]; // Airtel Money, Moov Money, Carte bancaire, Espèces, Virement
  services: string[];
  facilities?: string[]; // Parking, Climatisation, Wifi, Accessible PMR...
}

export interface BusinessStats {
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  routeClicks: number;
  favorites: number;
}

export interface Review {
  id: string;
  businessId: string;
  authorName: string;
  authorCity?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  photos?: string[];
  helpfulCount: number;
  businessResponse?: {
    comment: string;
    date: string;
    responderName: string;
  };
  reported?: boolean;
  status?: 'published' | 'pending' | 'hidden' | 'flagged';
}

export type BranchStatus = 'open' | 'temporarily_closed' | 'permanently_closed';
export type GpsPrecision = 'exact' | 'approximate';

/**
 * Entité 'Agency' (Agence / Succursale / Point de service)
 * Liée à son entreprise mère par 'businessId'
 */
export interface Agency {
  id: string;
  businessId: string; // Identifiant de l'entreprise parente
  name: string; // Nom propre de l'agence (ex: "Agence Libreville Siège", "Agence Franceville Potos")
  code?: string; // Référence interne
  isMainBranch: boolean; // Siège social ou agence principale
  status: BranchStatus; // 'open' | 'temporarily_closed' | 'permanently_closed'
  location: BusinessLocation; // Adresse complète, quartier, ville, province, coordonnées GPS (lat, lng)
  contact: {
    phone: string;
    phoneSecondary?: string;
    email?: string;
    whatsapp?: string;
  };
  openingHours: Record<string, string>; // Horaires propres à cette agence
  photos?: string[]; // Galerie photo de l'agence (façade, guichets, locaux, équipe)
  images?: string[]; // Alias rétro-compatible
  gpsPrecision: GpsPrecision; // 'exact' | 'approximate'
  managerName?: string;
  services?: string[];
  notes?: string;
  createdAt: string;
}

// Rétro-compatibilité pour l'ensemble du code existant
export type BusinessBranch = Agency;

export interface Business {
  id: string;
  name: string;
  legalName?: string;
  slug: string;
  category: BusinessCategory;
  subCategory?: string;
  description: string;
  logo: string;
  coverImage: string;
  images: string[];
  status: 'draft' | 'pending' | 'verified' | 'unverified' | 'rejected' | 'suspended';
  featured: boolean;
  creationYear?: number;
  nif?: string; // Numéro d'Identification Fiscale (Gabon)
  rating: number;
  reviewsCount: number;
  location: BusinessLocation;
  contact: BusinessContact;
  details: BusinessDetails;
  stats: BusinessStats;
  createdAt: string;
  claimed: boolean;
  claimedByEmail?: string;
  gpsPrecision?: GpsPrecision;
  agencies?: Agency[]; // Entités agences rattachées à l'entreprise
  branches?: Agency[]; // Alias rétro-compatible
}

export interface Promotion {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  discountBadge?: string;
  validUntil: string;
  category: BusinessCategory;
  city: string;
  image?: string;
  contactPhone?: string;
}

export interface BusinessReport {
  id: string;
  businessId: string;
  businessName: string;
  reason: 'wrong_address' | 'wrong_phone' | 'closed' | 'fraud' | 'other';
  details: string;
  reporterEmail?: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'visitor' | 'owner' | 'business_owner' | 'admin' | 'super_admin';
  adminRole?: AdminRole;
  avatar?: string;
  favorites: string[];
  ownedBusinessIds: string[];
  status?: 'active' | 'suspended';
  lastLogin?: string;
  emailConfirmed?: boolean;
  supabaseUserId?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  adminName: string;
  adminRole?: AdminRole;
  action: 
    | 'create_business'
    | 'update_business'
    | 'delete_business'
    | 'publish_business'
    | 'unpublish_business'
    | 'suspend_business'
    | 'feature_business'
    | 'manage_as_owner'
    | 'create_agency'
    | 'update_agency'
    | 'delete_agency'
    | 'update_media'
    | 'moderate_review'
    | 'delete_review'
    | 'resolve_report'
    | 'update_user'
    | 'update_settings';
  targetType: 'business' | 'agency' | 'review' | 'report' | 'user' | 'platform';
  targetId: string;
  targetName: string;
  timestamp: string;
  details: string;
}

export interface PlatformSettings {
  siteName: string;
  maintenanceMode: boolean;
  allowPublicRegistrations: boolean;
  requireAdminApproval: boolean;
  maxPhotosPerGallery: number;
  contactEmail: string;
  contactPhone: string;
  systemNotice?: string;
}

export interface AgentContribution {
  id: number;
  name: string;
  role: string;
  mission: string;
  keyDeliverables: string[];
  status: 'completed' | 'active' | 'in_progress';
  technologies: string[];
  summary: string;
}
