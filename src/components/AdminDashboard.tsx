import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  ShieldCheck, 
  Building, 
  AlertTriangle, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  Star, 
  Search, 
  Plus, 
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Users,
  Image as ImageIcon,
  MessageSquare,
  Check,
  ExternalLink,
  Layers,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  Settings,
  History,
  AlertCircle,
  Sparkles,
  Edit,
  X,
  Compass,
  ArrowRight,
  Shield,
  UserCheck,
  CheckCircle,
  XCircle,
  PauseCircle,
  Sliders,
  ChevronRight,
  Navigation
} from 'lucide-react';
import { 
  Business, 
  BusinessReport, 
  Review, 
  Agency, 
  AdminAuditLog, 
  UserAccount, 
  PlatformSettings,
  BusinessCategory,
  ProvinceCode,
  BranchStatus,
  GpsPrecision
} from '../types';
import { PROVINCES, CATEGORIES } from '../data/gabonData';
import { formatGabonPhone, formatGpsCoordinates } from '../utils/geo';
import { uploadOrProcessImage } from '../utils/imageUpload';
import { GpsLocationPicker } from './GpsLocationPicker';

interface AdminDashboardProps {
  businesses: Business[];
  onToggleVerifyBusiness: (id: string) => void;
  onDeleteBusiness: (id: string) => void;
  onOpenRegisterModal: () => void;
  onSelectBusiness: (business: Business) => void;
  reviews?: Review[];
  onDeleteReview?: (id: string) => void;
  reports?: BusinessReport[];
  onResolveReport?: (id: string) => void;
  onUpdateBusiness?: (id: string, updated: Partial<Business>) => Promise<Business | null | void>;
  onUpdateStatus?: (id: string, status: Business['status'], reason?: string) => Promise<void>;
  onManageAsOwner?: (business: Business) => void;
  currentUser?: UserAccount;
  authToken?: string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  businesses,
  onToggleVerifyBusiness,
  onDeleteBusiness,
  onOpenRegisterModal,
  onSelectBusiness,
  reviews = [],
  onDeleteReview,
  reports = [],
  onResolveReport,
  onUpdateBusiness,
  onUpdateStatus,
  onManageAsOwner,
  currentUser,
  authToken
}) => {
  // Navigation tabs (13 Rubriques complètes)
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'businesses'
    | 'agencies'
    | 'categories'
    | 'provinces'
    | 'media'
    | 'reviews'
    | 'users'
    | 'pending'
    | 'reports'
    | 'stats'
    | 'audit'
    | 'settings'
  >('overview');

  // Business filters
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Users State
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    siteName: 'GABON BUSINESS MAP',
    maintenanceMode: false,
    allowPublicRegistrations: true,
    requireAdminApproval: false,
    maxPhotosPerGallery: 12,
    contactEmail: 'contact@gabonbusinessmap.ga',
    contactPhone: '+241 11 76 00 00',
    systemNotice: 'Plateforme officielle de référencement et de géolocalisation des entreprises gabonaises.'
  });

  // Modals state
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingAgency, setEditingAgency] = useState<{ bizId: string; agency: Agency } | null>(null);
  const [mediaModalBiz, setMediaModalBiz] = useState<Business | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  // Fetch Audit Logs from backend
  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/admin/audit-logs', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.warn('Could not load audit logs from API');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.warn('Could not load users from API');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Platform Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings(data);
      }
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchUsers();
    fetchSettings();
  }, [authToken]);

  // Handle Status Change (Publish, Unpublish, Suspend, Pending)
  const handleChangeStatus = async (bizId: string, newStatus: Business['status'], reason?: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(bizId, newStatus, reason);
      } else {
        const res = await fetch(`/api/businesses/${bizId}/status`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus, reason })
        });
        if (res.ok) {
          if (onUpdateBusiness) await onUpdateBusiness(bizId, { status: newStatus });
        }
      }
      showNotice(`Statut de l'entreprise mis à jour : ${newStatus.toUpperCase()}`);
      fetchAuditLogs();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (biz: Business) => {
    const nextVal = !biz.featured;
    try {
      const res = await fetch(`/api/businesses/${biz.id}/feature`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ featured: nextVal })
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        showNotice(errPayload.error || 'Impossible de modifier le statut À la Une.');
        return;
      }
      if (onUpdateBusiness) await onUpdateBusiness(biz.id, { featured: nextVal });
      showNotice(nextVal ? 'Entreprise mise en avant (Badge VIP)' : 'Retrait de la mise en avant');
      fetchAuditLogs();
    } catch (e) {
      console.error(e);
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (userId: string, role: UserAccount['role'], adminRole?: UserAccount['adminRole']) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role, adminRole })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
        showNotice(`Rôle utilisateur mis à jour avec succès.`);
        fetchAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(platformSettings)
      });
      if (res.ok) {
        showNotice('Paramètres système enregistrés et appliqués.');
        fetchAuditLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Businesses
  const filtered = businesses.filter(b => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = 
        b.name.toLowerCase().includes(q) || 
        (b.legalName && b.legalName.toLowerCase().includes(q)) ||
        b.location.city.toLowerCase().includes(q) ||
        b.location.district.toLowerCase().includes(q) ||
        b.contact.phone.includes(q);
      if (!match) return false;
    }
    if (selectedProvince !== 'all' && b.location.provinceCode !== selectedProvince) return false;
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    return true;
  });

  // Calculate statistics
  const totalViews = businesses.reduce((acc, b) => acc + (b.stats?.views || 0), 0);
  const totalCalls = businesses.reduce((acc, b) => acc + (b.stats?.phoneClicks || 0), 0);
  const totalWhatsapp = businesses.reduce((acc, b) => acc + (b.stats?.whatsappClicks || 0), 0);
  const totalRoutes = businesses.reduce((acc, b) => acc + (b.stats?.routeClicks || 0), 0);
  
  const verifiedCount = businesses.filter(b => b.status === 'verified').length;
  const pendingCount = businesses.filter(b => b.status === 'pending').length;
  const suspendedCount = businesses.filter(b => b.status === 'suspended').length;
  const unverifiedCount = businesses.filter(b => b.status === 'unverified').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  // Extract all agencies across all businesses
  const allAgenciesList: { biz: Business; agency: Agency }[] = [];
  businesses.forEach(b => {
    if (b.branches && Array.isArray(b.branches)) {
      b.branches.forEach(ag => {
        allAgenciesList.push({ biz: b, agency: ag });
      });
    }
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nom Entreprise',
      'Raison Sociale',
      'NIF Gabon',
      'Secteur',
      'Province',
      'Ville',
      'Quartier',
      'Adresse',
      'Latitude',
      'Longitude',
      'Téléphone',
      'WhatsApp',
      'Email',
      'Statut',
      'Note',
      'Avis',
      'Vues',
      'Nombre Agences'
    ];

    const rows = businesses.map(b => [
      b.id,
      `"${b.name.replace(/"/g, '""')}"`,
      `"${(b.legalName || b.name).replace(/"/g, '""')}"`,
      `"${b.nif || ''}"`,
      b.category,
      b.location.province,
      b.location.city,
      `"${b.location.district.replace(/"/g, '""')}"`,
      `"${b.location.address.replace(/"/g, '""')}"`,
      b.location.coordinates.lat,
      b.location.coordinates.lng,
      b.contact.phone,
      b.contact.whatsapp || '',
      b.contact.email,
      b.status,
      b.rating,
      b.reviewsCount,
      b.stats.views,
      (b.branches?.length || 0)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `entreprises_gabon_business_map_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(businesses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sauvegarde_gabon_business_map_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Action Success Toast */}
      {actionSuccessNotice && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-500/50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/40">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
              Super Administrateur Principal
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Portail Officiel GBM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Système Central d'Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Contrôle complet des fiches d'entreprises, modération des agences à travers les 9 provinces, gestion des médias, traçabilité des modifications et audit sécurisé.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Exporter l'annuaire au format CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Sauvegarde JSON de la base"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>Sauvegarde JSON</span>
          </button>

          <button
            onClick={onOpenRegisterModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une entreprise</span>
          </button>
        </div>
      </div>

      {/* Quick Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Total Entreprises
          </span>
          <div className="text-2xl font-black text-slate-900">{businesses.length}</div>
          <span className="text-[10px] text-slate-500 font-semibold">{allAgenciesList.length} agences rattachées</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-1">
            Publiées (Vérifiées)
          </span>
          <div className="text-2xl font-black text-emerald-600">{verifiedCount}</div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {Math.round((verifiedCount / (businesses.length || 1)) * 100)}% de conformité
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block mb-1">
            En Attente Validation
          </span>
          <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          <span className="text-[10px] text-amber-700 font-semibold">À vérifier</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block mb-1">
            Suspendues
          </span>
          <div className="text-2xl font-black text-rose-600">{suspendedCount}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Accès restreint</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block mb-1">
            Signalements
          </span>
          <div className="text-2xl font-black text-blue-600">{pendingReportsCount}</div>
          <span className="text-[10px] text-slate-500 font-semibold">Anomalies ouvertes</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block mb-1">
            Actions d'Audit
          </span>
          <div className="text-2xl font-black text-purple-600">{auditLogs.length}</div>
          <span className="text-[10px] text-slate-500 font-semibold">Traçabilité 100%</span>
        </div>
      </div>

      {/* Main 13 Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Vue d'ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'businesses' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>2. Gestion des Entreprises ({businesses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('agencies')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'agencies' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>3. Agences & Emplacements ({allAgenciesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'categories' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Catégories & Secteurs (12)</span>
          </button>

          <button
            onClick={() => setActiveTab('provinces')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'provinces' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>5. Provinces & Villes (9)</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'media' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>6. Images & Médias</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>7. Avis & Modération ({reviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>8. Comptes & Rôles ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pending' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>9. En Attente / Suspendues ({pendingCount + suspendedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>10. Signalements ({pendingReportsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stats' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>11. Statistiques</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>12. Journal d'Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>13. Paramètres</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: VUE D'ENSEMBLE (OVERVIEW)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Actions Administratives Prioritaires
              </h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setActiveTab('pending')}
                  className="w-full text-left p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">Valider les fiches en attente</span>
                    <span className="text-[11px] text-amber-700">{pendingCount} entreprise(s) en attente de vérification</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="w-full text-left p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">Traiter les signalements d'anomalies</span>
                    <span className="text-[11px] text-rose-700">{pendingReportsCount} signalement(s) utilisateur</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-600" />
                </button>

                <button
                  onClick={() => setActiveTab('agencies')}
                  className="w-full text-left p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">Contrôler la précision GPS des agences</span>
                    <span className="text-[11px] text-blue-700">{allAgenciesList.length} agences sur le territoire</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className="w-full text-left p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">Consulter le journal de traçabilité</span>
                    <span className="text-[11px] text-purple-700">{auditLogs.length} actions administratives consignées</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>

            {/* Geographical Distribution */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                Répartition Géographique (9 Provinces)
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {PROVINCES.map(p => {
                  const count = businesses.filter(b => b.location.provinceCode === p.id).length;
                  const pct = Math.round((count / (businesses.length || 1)) * 100);
                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                        <span>{p.name} ({p.capital})</span>
                        <span className="font-mono text-emerald-600">{count} entr. ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Traffic & Conversion Snapshot */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                Conversions & Trafic Visiteurs
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Vues Globales</span>
                  <span className="text-xl font-black text-slate-900">{totalViews.toLocaleString()}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Appels Téléphone</span>
                  <span className="text-xl font-black text-emerald-600">{totalCalls.toLocaleString()}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Contacts WhatsApp</span>
                  <span className="text-xl font-black text-emerald-600">{totalWhatsapp.toLocaleString()}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Itinéraires GPS</span>
                  <span className="text-xl font-black text-blue-600">{totalRoutes.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 font-medium">
                ⭐ Note moyenne des entreprises sur la plateforme : <strong>4.8 / 5.0</strong> ({reviews.length} avis vérifiés).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GESTION COMPLÈTE DES ENTREPRISES
         ========================================================================= */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, raison sociale, ville, quartier, téléphone..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
              >
                <option value="all">Toutes les provinces (9)</option>
                {PROVINCES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
              >
                <option value="all">Tous les secteurs (12)</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="verified">Publiée (Vérifiée)</option>
                <option value="pending">En attente de validation</option>
                <option value="unverified">Dépubliée (Non vérifiée)</option>
                <option value="suspended">Suspendue</option>
              </select>
            </div>
          </div>

          {/* Business Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3.5 px-4">Entreprise & Siège</th>
                    <th className="py-3.5 px-4">Secteur / NIF</th>
                    <th className="py-3.5 px-4">Localisation & Agences</th>
                    <th className="py-3.5 px-4">Contacts</th>
                    <th className="py-3.5 px-4">Statut de Publication</th>
                    <th className="py-3.5 px-4">Mise en avant</th>
                    <th className="py-3.5 px-4 text-right">Actions Administrateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Aucune entreprise ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Company Logo & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {b.logo && b.logo.trim() ? (
                              <img
                                src={b.logo}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                                onError={(e: any) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {(b.name || 'G').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span 
                                onClick={() => onSelectBusiness(b)}
                                className="font-black text-slate-900 hover:text-emerald-700 cursor-pointer block truncate max-w-xs"
                                title="Voir la fiche publique"
                              >
                                {b.name}
                              </span>
                              {b.legalName && b.legalName !== b.name && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                                  {b.legalName}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                GPS: {b.location.coordinates.lat.toFixed(4)}, {b.location.coordinates.lng.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Sector and NIF */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block truncate max-w-[140px]">
                            {b.subCategory || b.category}
                          </span>
                          {b.nif ? (
                            <span className="text-[10px] text-emerald-700 font-mono font-bold block">
                              NIF: {b.nif}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Sans NIF déclaré
                            </span>
                          )}
                        </td>

                        {/* Location & Branches count */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">
                            {b.location.city} ({b.location.province})
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                            {b.location.district || b.location.address}
                          </span>
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            {b.branches?.length || 0} agence(s)
                          </span>
                        </td>

                        {/* Contacts */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-800 block">
                            {b.contact.phone}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[130px]">
                            {b.contact.email}
                          </span>
                          {b.contact.whatsapp && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              WA vérifié
                            </span>
                          )}
                        </td>

                        {/* Status Select */}
                        <td className="py-3.5 px-4">
                          <select
                            value={b.status}
                            onChange={(e) => handleChangeStatus(b.id, e.target.value as Business['status'])}
                            className={`text-[11px] font-black px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                              b.status === 'verified'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : b.status === 'pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : b.status === 'suspended'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="verified">✅ Publiée (Vérifiée)</option>
                            <option value="pending">⏳ En attente</option>
                            <option value="unverified">⚪ Dépubliée</option>
                            <option value="suspended">⛔ Suspendue</option>
                          </select>
                        </td>

                        {/* Featured (À la une) */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleFeatured(b)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              b.featured 
                                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-600'
                            }`}
                            title="Activer / désactiver la mise en avant sur l'accueil"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{b.featured ? 'En vedette' : 'Standard'}</span>
                          </button>
                        </td>

                        {/* Admin Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Manage As Owner (Elevated pro mode) */}
                            {onManageAsOwner && (
                              <button
                                onClick={() => onManageAsOwner(b)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-extrabold text-[11px] transition-colors border border-blue-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Ouvrir l'espace Pro complet pour administrer cette entreprise sans mot de passe"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Gérer comme le propriétaire</span>
                              </button>
                            )}

                            {/* Quick Edit Modal Trigger */}
                            <button
                              onClick={() => setEditingBusiness(b)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Modifier toutes les informations de la fiche"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Preview Sheet */}
                            <button
                              onClick={() => onSelectBusiness(b)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Visualiser l'aperçu de la fiche publique"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Media Quick Modal */}
                            <button
                              onClick={() => setMediaModalBiz(b)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Gérer le logo et la couverture"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>

                            {/* Delete Business */}
                            <button
                              onClick={() => onDeleteBusiness(b.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Supprimer définitivement l'entreprise"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: GESTION DES AGENCES & EMPLACEMENTS
         ========================================================================= */}
      {activeTab === 'agencies' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Réseau National des Agences et Points de Service
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vue centralisée de toutes les agences secondaires et sièges enregistrés au Gabon. Vous pouvez inspecter et corriger les coordonnées GPS.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
              {allAgenciesList.length} agences répertoriées
            </span>
          </div>

          {/* Agencies Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Agence</th>
                    <th className="py-3 px-4">Entreprise Parente</th>
                    <th className="py-3 px-4">Province & Ville</th>
                    <th className="py-3 px-4">Adresse & Quartier</th>
                    <th className="py-3 px-4">Coordonnées GPS</th>
                    <th className="py-3 px-4">Précision</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAgenciesList.map(({ biz, agency }) => (
                    <tr key={agency.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {agency.name}
                        </div>
                        {agency.isMainBranch && (
                          <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ★ Siège / Principal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{biz.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{agency.location.city}</span>
                        <span className="text-[10px] text-slate-400 block">{agency.location.province}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700">{agency.location.district || agency.location.address}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-600 block">
                          {agency.location.coordinates.lat.toFixed(4)}, {agency.location.coordinates.lng.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          agency.gpsPrecision === 'exact'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {agency.gpsPrecision === 'exact' ? 'GPS Exact' : 'Approximatif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          agency.status === 'open' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {agency.status === 'open' ? 'Ouverte' : 'Fermée'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingAgency({ bizId: biz.id, agency })}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Modifier cette agence et son positionnement GPS"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GESTION DES CATÉGORIES (12 SECTEURS ÉCONOMIQUES DU GABON)
         ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-black text-slate-900">
              Les 12 Secteurs Stratégiques de l'Économie Gabonaise
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nomenclature officielle de classification des entreprises sur Gabon Business Map.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => {
              const count = businesses.filter(b => b.category === cat.id).length;
              return (
                <div key={cat.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {count} entreprise(s)
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{cat.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Code: {cat.id}</span>
                    <span className="text-emerald-600 font-bold">Actif</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: GESTION DES PROVINCES ET VILLES DU GABON
         ========================================================================= */}
      {activeTab === 'provinces' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-black text-slate-900">
              Découpage Administratif des 9 Provinces du Gabon
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervision de la couverture géographique, chefs-lieux et communes desservies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROVINCES.map(p => {
              const bizCount = businesses.filter(b => b.location.provinceCode === p.id).length;
              const agCount = allAgenciesList.filter(a => a.agency.location.provinceCode === p.id).length;
              return (
                <div key={p.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      {p.name}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Chef-lieu : <strong className="text-slate-900">{p.capital}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 block">Villes & Communes principales :</span>
                    <div className="flex flex-wrap gap-1">
                      {p.mainCities.map(c => (
                        <span key={c} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{bizCount} entreprises</span>
                    <span className="text-blue-600 font-mono">{agCount} agences</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: GESTION DES IMAGES ET MÉDIAS
         ========================================================================= */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Audit des Médias & Photos Publiées
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspectez, remplacez ou supprimez les logos et photos non conformes ou de mauvaise résolution.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
              {businesses.length} entreprises auditées
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map(b => (
              <div key={b.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="relative h-36 bg-slate-100 overflow-hidden">
                    {b.coverImage && b.coverImage.trim() ? (
                      <img 
                        src={b.coverImage} 
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Building className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-white">
                      {b.logo && b.logo.trim() ? (
                        <img 
                          src={b.logo} 
                          alt="" 
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                          {(b.name || 'G').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                      {b.images?.length || 1} photo(s)
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-black text-slate-900 text-sm truncate">{b.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{b.location.city} • {b.category}</p>

                    {/* Small Gallery Previews */}
                    {b.images && b.images.filter(img => Boolean(img && img.trim())).length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {b.images.filter(img => Boolean(img && img.trim())).slice(0, 4).map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt="" 
                            className="w-12 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setMediaModalBiz(b)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modifier les images</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: GESTION DES AVIS ET MODÉRATION
         ========================================================================= */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Modération des Avis Clients
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supprimez les avis abusifs ou inappropriés pour garantir la conformité de l'annuaire.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              {reviews.length} avis enregistrés
            </span>
          </div>

          <div className="space-y-3">
            {reviews.map(r => {
              const biz = businesses.find(b => b.id === r.businessId);
              return (
                <div key={r.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <span className="font-black text-slate-900 text-xs">{r.authorName}</span>
                      <span className="text-slate-400 text-[10px]">• {r.authorCity || 'Gabon'}</span>
                      <span className="text-slate-400 text-[10px]">• {new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      "{r.comment}"
                    </p>

                    <div className="text-[11px] text-slate-500">
                      Entreprise concernée : <strong className="text-slate-800">{biz?.name || r.businessId}</strong>
                    </div>

                    {r.businessResponse && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                        <strong className="text-slate-800 block mb-0.5">Réponse officielle de l'entreprise :</strong>
                        {r.businessResponse.comment}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onDeleteReview && (
                      <button
                        onClick={() => onDeleteReview(r.id)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-200 flex items-center gap-1"
                        title="Supprimer cet avis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: GESTION DES PROPRIÉTAIRES & UTILISATEURS (RBAC)
         ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Gestion des Rôles & Comptes Utilisateurs (RBAC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiérarchie des accès : Super Administrateur, Administrateur, Modérateur et Propriétaires d'entreprises.
              </p>
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Adresse Email</th>
                  <th className="py-3 px-4">Rôle Principal</th>
                  <th className="py-3 px-4">Sous-rôle Administrateur</th>
                  <th className="py-3 px-4">Entreprises Assignées</th>
                  <th className="py-3 px-4 text-right">Modifier Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {u.id}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-rose-100 text-rose-800' 
                          : u.role === 'business_owner'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role === 'admin' ? 'Administrateur' : u.role === 'business_owner' ? 'Propriétaire Pro' : 'Visiteur'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.adminRole ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {u.adminRole === 'super_admin' ? 'Super Admin' : u.adminRole === 'moderator' ? 'Modérateur' : 'Admin'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {u.ownedBusinessIds?.length || 0} entreprise(s)
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.adminRole || u.role}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'super_admin') handleUpdateUserRole(u.id, 'admin', 'super_admin');
                          else if (val === 'admin') handleUpdateUserRole(u.id, 'admin', 'admin');
                          else if (val === 'moderator') handleUpdateUserRole(u.id, 'admin', 'moderator');
                          else if (val === 'business_owner') handleUpdateUserRole(u.id, 'business_owner', undefined);
                          else handleUpdateUserRole(u.id, 'visitor', undefined);
                        }}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                      >
                        <option value="super_admin">Super Administrateur</option>
                        <option value="admin">Administrateur</option>
                        <option value="moderator">Modérateur</option>
                        <option value="business_owner">Propriétaire Pro</option>
                        <option value="visitor">Visiteur</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: PUBLICATIONS EN ATTENTE & ENTREPRISES SUSPENDUES
         ========================================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-black text-slate-900">
              Traitement d'Urgence : Fiches en Attente et Entreprises Suspendues
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Validez en 1 clic les nouvelles inscriptions ou réactivez les comptes suspendus.
            </p>
          </div>

          <div className="space-y-3">
            {businesses.filter(b => b.status === 'pending' || b.status === 'suspended').length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 font-medium">
                Aucune entreprise en attente ou suspendue pour le moment.
              </div>
            ) : (
              businesses.filter(b => b.status === 'pending' || b.status === 'suspended').map(b => (
                <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {b.logo && b.logo.trim() ? (
                      <img src={b.logo} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {(b.name || 'G').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm">{b.name}</h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          b.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status === 'pending' ? 'En attente' : 'Suspendue'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{b.location.city} • {b.category} • {b.contact.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectBusiness(b)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Examiner la fiche
                    </button>

                    <button
                      onClick={() => handleChangeStatus(b.id, 'verified', 'Validation par administrateur')}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publier / Valider</span>
                    </button>

                    {b.status !== 'suspended' && (
                      <button
                        onClick={() => handleChangeStatus(b.id, 'suspended', 'Suspension administrative')}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Suspendre
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 10: GESTION DES SIGNALEMENTS
         ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Signalements & Anomalies Déclarées par les Utilisateurs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérifiez les erreurs d'adresse, de numéros fermés ou de suspicions de fraude.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              {pendingReportsCount} en attente
            </span>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 font-medium">
                Aucun signalement en attente. Tout est en ordre !
              </div>
            ) : (
              reports.map(rep => (
                <div key={rep.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        rep.status === 'pending' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rep.status === 'pending' ? 'En cours' : 'Résolu'}
                      </span>
                      <h4 className="font-black text-slate-900 text-xs">
                        Entreprise ciblée : {rep.businessName}
                      </h4>
                      <span className="text-slate-400 text-[10px]">
                        • {new Date(rep.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700">
                      <strong>Motif :</strong> {rep.reason} — <em>"{rep.details}"</em>
                    </p>

                    {rep.reporterEmail && (
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Signalé par : {rep.reporterEmail}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status === 'pending' && onResolveReport && (
                      <button
                        onClick={() => onResolveReport(rep.id)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Marquer comme Résolu</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 11: STATISTIQUES & RAPPORTS
         ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Rapports d'Activité et Statistiques de Conversion
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Données d'usage consolidées sur l'ensemble du territoire gabonais.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Exporter Rapport CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Most Viewed */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Top 5 des Entreprises les Plus Consultées
              </h3>
              <div className="space-y-2.5">
                {[...businesses]
                  .sort((a, b) => b.stats.views - a.stats.views)
                  .slice(0, 5)
                  .map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-xs text-slate-400 font-mono">#{idx + 1}</span>
                        {b.logo && b.logo.trim() ? (
                          <img src={b.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(b.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{b.name}</span>
                          <span className="text-[10px] text-slate-500">{b.location.city}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        {b.stats.views.toLocaleString()} vues
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top 5 Highest Rated */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Top 5 de la Satisfaction Client (Notes & Avis)
              </h3>
              <div className="space-y-2.5">
                {[...businesses]
                  .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
                  .slice(0, 5)
                  .map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-xs text-slate-400 font-mono">#{idx + 1}</span>
                        {b.logo && b.logo.trim() ? (
                          <img src={b.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(b.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{b.name}</span>
                          <span className="text-[10px] text-slate-500">{b.reviewsCount} avis certifiés</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{b.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 12: HISTORIQUE DES ACTIONS ADMINISTRATIVES (AUDIT TRAIL)
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Journal de Traçabilité & Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque publication, suspension, modification de coordonnées GPS ou suppression est consignée avec horodatage certifié.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rafraîchir les logs</span>
            </button>
          </div>

          {/* Audit Filters */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="Rechercher par administrateur, cible ou motif..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <select
              value={auditFilterAction}
              onChange={e => setAuditFilterAction(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
            >
              <option value="all">Toutes les actions</option>
              <option value="publish_business">Publication d'entreprise</option>
              <option value="suspend_business">Suspension d'entreprise</option>
              <option value="update_business">Mise à jour fiche</option>
              <option value="update_agency">Mise à jour agence / GPS</option>
              <option value="update_media">Modification photos / logo</option>
              <option value="delete_review">Suppression d'avis</option>
              <option value="update_settings">Paramètres plateforme</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Administrateur</th>
                  <th className="py-3 px-4">Type d'Action</th>
                  <th className="py-3 px-4">Cible</th>
                  <th className="py-3 px-4">Détails de l'Opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs
                  .filter(l => {
                    if (auditFilterAction !== 'all' && l.action !== auditFilterAction) return false;
                    if (auditSearch.trim()) {
                      const q = auditSearch.toLowerCase();
                      const match = 
                        l.adminName.toLowerCase().includes(q) ||
                        l.targetName.toLowerCase().includes(q) ||
                        l.details.toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    return true;
                  })
                  .map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{log.adminName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.adminEmail}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 uppercase tracking-wider">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-800 block">{log.targetName}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{log.targetType}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 13: PARAMÈTRES DE LA PLATEFORME
         ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-black text-slate-900">
              Configuration Système de Gabon Business Map
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gérez les paramètres globaux, la maintenance et les règles d'approbation.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom de la Plateforme</label>
                <input
                  type="text"
                  value={platformSettings.siteName}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email de Contact Officiel</label>
                <input
                  type="email"
                  value={platformSettings.contactEmail}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone Support Gabon</label>
                <input
                  type="text"
                  value={platformSettings.contactPhone}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Max Photos par Galerie</label>
                <input
                  type="number"
                  value={platformSettings.maxPhotosPerGallery}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, maxPhotosPerGallery: parseInt(e.target.value, 10) || 12 }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformSettings.allowPublicRegistrations}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, allowPublicRegistrations: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-800">
                  Autoriser les nouvelles inscriptions publiques d'entreprises
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformSettings.requireAdminApproval}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, requireAdminApproval: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-800">
                  Modération préalable obligatoire (Validation par un administrateur avant publication)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformSettings.maintenanceMode}
                  onChange={e => setPlatformSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <span className="text-xs font-bold text-rose-700">
                  Activer le Mode Maintenance (Réservé aux Super Administrateurs)
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Enregistrer la configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ÉDITION COMPLÈTE DE LA FICHE ENTREPRISE
         ========================================================================= */}
      {editingBusiness && (
        <BusinessEditModal
          business={editingBusiness}
          onClose={() => setEditingBusiness(null)}
          onSave={async (updated) => {
            if (onUpdateBusiness) {
              await onUpdateBusiness(editingBusiness.id, updated);
            } else {
              const res = await fetch(`/api/businesses/${editingBusiness.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updated)
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Échec de la mise à jour.');
              }
            }
            showNotice(`Fiche de l'entreprise « ${updated.name || editingBusiness.name} » enregistrée dans Supabase.`);
            fetchAuditLogs();
            setEditingBusiness(null);
          }}
          onPreview={() => {
            onSelectBusiness(editingBusiness);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 2: ÉDITION COMPLÈTE D'UNE AGENCE (AVEC CARTE LEAFLET)
         ========================================================================= */}
      {editingAgency && (
        <AgencyEditModal
          bizId={editingAgency.bizId}
          agency={editingAgency.agency}
          onClose={() => setEditingAgency(null)}
          onSave={async (updatedAgency) => {
            try {
              await fetch(`/api/businesses/${editingAgency.bizId}/branches/${editingAgency.agency.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updatedAgency)
              });
              const biz = businesses.find(b => b.id === editingAgency.bizId);
              if (biz && biz.branches) {
                const nextBranches = biz.branches.map(br => br.id === updatedAgency.id ? updatedAgency : br);
                if (onUpdateBusiness) await onUpdateBusiness(editingAgency.bizId, { branches: nextBranches });
              }
              showNotice(`Agence « ${updatedAgency.name} » mise à jour avec nouvelles coordonnées GPS.`);
              fetchAuditLogs();
            } catch (e) {
              console.error(e);
            }
            setEditingAgency(null);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 3: GESTION RAPIDE DES MÉDIAS (LOGO / COUVERTURE)
         ========================================================================= */}
      {mediaModalBiz && (
        <MediaReplaceModal
          business={mediaModalBiz}
          authToken={authToken}
          onClose={() => setMediaModalBiz(null)}
          onSave={async (logo, coverImage, images) => {
            if (onUpdateBusiness) {
              await onUpdateBusiness(mediaModalBiz.id, { logo, coverImage, images });
            } else {
              const res = await fetch(`/api/businesses/${mediaModalBiz.id}/images`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ logo, coverImage, images })
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Échec de la mise à jour des médias.');
              }
            }
            showNotice('Images de l’entreprise enregistrées dans Supabase Storage.');
            fetchAuditLogs();
            setMediaModalBiz(null);
          }}
        />
      )}

    </div>
  );
};

/* -------------------------------------------------------------------------
   SUBCOMPONENT: BusinessEditModal
------------------------------------------------------------------------- */
interface BusinessEditModalProps {
  business: Business;
  onClose: () => void;
  onSave: (updated: Partial<Business>) => Promise<void>;
  onPreview: () => void;
}

const ADMIN_PAYMENT_OPTIONS = [
  'Airtel Money',
  'Moov Money',
  'Espèces',
  'Carte bancaire',
  'Virement bancaire',
  'Chèque certifié'
];

const ADMIN_FACILITY_OPTIONS = [
  'Climatisation',
  'Accessible PMR',
  'Parking client',
  'Wi-Fi gratuit',
  'Groupe électrogène',
  'Sécurité 24h/24'
];

const BusinessEditModal: React.FC<BusinessEditModalProps> = ({
  business,
  onClose,
  onSave,
  onPreview
}) => {
  const [name, setName] = useState(business.name);
  const [legalName, setLegalName] = useState(business.legalName || business.name);
  const [nif, setNif] = useState(business.nif || '');
  const [creationYear, setCreationYear] = useState(business.creationYear ? String(business.creationYear) : '');
  const [category, setCategory] = useState<BusinessCategory>(business.category);
  const [subCategory, setSubCategory] = useState(business.subCategory || '');
  const [description, setDescription] = useState(business.description);
  const [status, setStatus] = useState<Business['status']>(business.status);
  const [featured, setFeatured] = useState(business.featured);

  // Contacts
  const [phone, setPhone] = useState(business.contact.phone);
  const [phoneSecondary, setPhoneSecondary] = useState(business.contact.phoneSecondary || '');
  const [email, setEmail] = useState(business.contact.email);
  const [website, setWebsite] = useState(business.contact.website || '');
  const [whatsapp, setWhatsapp] = useState(business.contact.whatsapp || '');
  const [facebook, setFacebook] = useState(business.contact.facebook || '');
  const [instagram, setInstagram] = useState(business.contact.instagram || '');
  const [linkedin, setLinkedin] = useState(business.contact.linkedin || '');

  // Location
  const [provinceCode, setProvinceCode] = useState<ProvinceCode>(business.location?.provinceCode || 'estuaire');
  const [city, setCity] = useState(business.location?.city || '');
  const [arrondissement, setArrondissement] = useState(business.location?.arrondissement || '');
  const [district, setDistrict] = useState(business.location?.district || '');
  const [address, setAddress] = useState(business.location?.address || '');

  // Coordonnées initiales garanties : priorité aux coordonnées existantes, repli province, repli Libreville
  const rawInitLat = business.location?.coordinates?.lat ?? (business as any).lat;
  const rawInitLng = business.location?.coordinates?.lng ?? (business as any).lng;
  const hasValidInitCoords =
    rawInitLat != null &&
    rawInitLng != null &&
    Number.isFinite(Number(rawInitLat)) &&
    Number.isFinite(Number(rawInitLng)) &&
    !(Number(rawInitLat) === 0 && Number(rawInitLng) === 0);

  const defaultProvCoords =
    PROVINCES.find(p => p.id === (business.location?.provinceCode || 'estuaire'))?.coordinates ||
    { lat: 0.3901, lng: 9.4536 };
  const initialLat = hasValidInitCoords ? Number(rawInitLat) : defaultProvCoords.lat;
  const initialLng = hasValidInitCoords ? Number(rawInitLng) : defaultProvCoords.lng;

  const [lat, setLat] = useState<number>(Math.round(initialLat * 1000000) / 1000000);
  const [lng, setLng] = useState<number>(Math.round(initialLng * 1000000) / 1000000);
  const [gpsPrecision, setGpsPrecision] = useState<GpsPrecision>(business.gpsPrecision || 'exact');

  // Services, Paiements & Commodités
  const [servicesStr, setServicesStr] = useState(business.details.services.join(', '));
  const [paymentMethods, setPaymentMethods] = useState<string[]>(business.details.paymentMethods || []);
  const [facilities, setFacilities] = useState<string[]>(business.details.facilities || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const togglePayment = (method: string) => {
    setPaymentMethods(prev => (prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]));
  };

  const toggleFacility = (fac: string) => {
    setFacilities(prev => (prev.includes(fac) ? prev.filter(f => f !== fac) : [...prev, fac]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const prov = PROVINCES.find(p => p.id === provinceCode);
    const services = servicesStr.split(',').map(s => s.trim()).filter(Boolean);
    const roundedLat = Math.round(Number(lat) * 1000000) / 1000000;
    const roundedLng = Math.round(Number(lng) * 1000000) / 1000000;

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave({
        name: name.trim(),
        legalName: legalName.trim() || name.trim(),
        nif: nif.trim() || undefined,
        creationYear: creationYear ? parseInt(creationYear, 10) : undefined,
        category,
        subCategory: subCategory.trim(),
        description: description.trim(),
        status,
        featured,
        gpsPrecision,
        contact: {
          phone: phone.trim(),
          phoneSecondary: phoneSecondary.trim() || undefined,
          email: email.trim(),
          website: website.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          facebook: facebook.trim() || undefined,
          instagram: instagram.trim() || undefined,
          linkedin: linkedin.trim() || undefined
        },
        location: {
          province: prov ? prov.name : (business.location?.province || 'Estuaire'),
          provinceCode,
          city: city.trim(),
          arrondissement: arrondissement.trim() || undefined,
          district: district.trim(),
          address: address.trim(),
          coordinates: { lat: roundedLat, lng: roundedLng }
        },
        // Transmission directe au niveau racine pour résilience maximale avec l'API
        ...({
          lat: roundedLat,
          lng: roundedLng
        } as any),
        details: {
          ...business.details,
          services: services.length > 0 ? services : business.details.services,
          paymentMethods,
          facilities
        }
      });
    } catch (err: any) {
      setSaveError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Édition Administrateur Directe
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              Modifier la Fiche : {business.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Informations Générales */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-600" />
              1. Informations Générales & Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nom Commercial *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Raison Sociale Légale</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Numéro NIF (Gabon)</label>
                <input
                  type="text"
                  value={nif}
                  onChange={e => setNif(e.target.value)}
                  placeholder="Ex: 700142A"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Année de création</label>
                <input
                  type="number"
                  min="1950"
                  max="2026"
                  value={creationYear}
                  onChange={e => setCreationYear(e.target.value)}
                  placeholder="Ex: 2015"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Secteur d'Activité *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as BusinessCategory)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Sous-catégorie / Spécialité</label>
                <input
                  type="text"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Description Complète</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Section 2: Statut & Mise en avant */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              2. Statut Administratif & Visibilité
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Statut de la Fiche</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Business['status'])}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  <option value="verified">Publiée (Vérifiée)</option>
                  <option value="pending">En attente de validation</option>
                  <option value="unverified">Dépubliée (Non vérifiée)</option>
                  <option value="suspended">Suspendue</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={e => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Mettre en avant sur la page d'accueil (Badge VIP / Sponsorisé)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Coordonnées & Réseaux Sociaux */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600" />
              3. Moyens de Contact & Liens Web
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Téléphone Principal *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Téléphone Secondaire</label>
                <input
                  type="text"
                  value={phoneSecondary}
                  onChange={e => setPhoneSecondary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Numéro WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Adresse E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Site Web Officiel</label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Facebook</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={e => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Instagram / LinkedIn</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Localisation & Coordonnées GPS */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              4. Siège Principal & Positionnement GPS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Province *</label>
                <select
                  value={provinceCode}
                  onChange={e => {
                    const nextCode = e.target.value as ProvinceCode;
                    setProvinceCode(nextCode);
                    const prov = PROVINCES.find(p => p.id === nextCode);
                    if (prov) {
                      setCity(prov.capital);
                      setLat(Math.round(prov.coordinates.lat * 1000000) / 1000000);
                      setLng(Math.round(prov.coordinates.lng * 1000000) / 1000000);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  {PROVINCES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ville *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Arrondissement</label>
                <input
                  type="text"
                  value={arrondissement}
                  onChange={e => setArrondissement(e.target.value)}
                  placeholder="Ex: 1er, 3e..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Quartier</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="Ex: Louis, Oloumi, Glass..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Adresse Complète</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Sélection interactive sur la carte (cliquez ou déplacez le repère)
              </label>
              <GpsLocationPicker
                lat={lat}
                lng={lng}
                gpsPrecision={gpsPrecision}
                provinceCode={provinceCode}
                onChange={({ lat: newLat, lng: newLng, precision: newPrec }) => {
                  setLat(newLat);
                  setLng(newLng);
                  if (newPrec) setGpsPrecision(newPrec);
                }}
              />
            </div>
          </div>

          {/* Section 5: Services, Paiements & Commodités */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Services Proposés (séparés par des virgules)
              </label>
              <input
                type="text"
                value={servicesStr}
                onChange={e => setServicesStr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Moyens de paiement</label>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_PAYMENT_OPTIONS.map(m => {
                    const active = paymentMethods.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => togglePayment(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {active ? '✓ ' : ''}{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Commodités</label>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_FACILITY_OPTIONS.map(f => {
                    const active = facilities.includes(f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => toggleFacility(f)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {active ? '✓ ' : ''}{f}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPreview}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Aperçu de la Fiche</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer & Appliquer'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
   SUBCOMPONENT: AgencyEditModal (avec Leaflet Drag Marker)
------------------------------------------------------------------------- */
interface AgencyEditModalProps {
  bizId: string;
  agency: Agency;
  onClose: () => void;
  onSave: (agency: Agency) => void;
}

const AgencyEditModal: React.FC<AgencyEditModalProps> = ({
  bizId,
  agency,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(agency.name);
  const [provinceCode, setProvinceCode] = useState<ProvinceCode>(agency.location.provinceCode);
  const [city, setCity] = useState(agency.location.city);
  const [district, setDistrict] = useState(agency.location.district);
  const [address, setAddress] = useState(agency.location.address);
  const [lat, setLat] = useState(agency.location.coordinates.lat);
  const [lng, setLng] = useState(agency.location.coordinates.lng);
  const [gpsPrecision, setGpsPrecision] = useState<GpsPrecision>(agency.gpsPrecision || 'exact');
  const [status, setStatus] = useState<BranchStatus>(agency.status);
  const [phone, setPhone] = useState(agency.contact?.phone || '');
  const [managerName, setManagerName] = useState(agency.managerName || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const prov = PROVINCES.find(p => p.id === provinceCode);
    const roundedLat = Math.round(Number(lat) * 1000000) / 1000000;
    const roundedLng = Math.round(Number(lng) * 1000000) / 1000000;
    onSave({
      ...agency,
      name,
      status,
      gpsPrecision,
      managerName,
      location: {
        province: prov ? prov.name : agency.location.province,
        provinceCode,
        city,
        district,
        address,
        coordinates: { lat: roundedLat, lng: roundedLng }
      },
      ...({ lat: roundedLat, lng: roundedLng } as any),
      contact: {
        ...agency.contact,
        phone
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Localisation & Coordonnées GPS
            </span>
            <h2 className="text-base font-black text-slate-900 mt-1">
              Modifier l'Agence : {agency.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nom de l'Agence *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Statut</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as BranchStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="open">Ouverte</option>
                <option value="temporarily_closed">Fermée temporairement</option>
                <option value="permanently_closed">Fermée définitivement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Province *</label>
              <select
                value={provinceCode}
                onChange={e => {
                  const nextCode = e.target.value as ProvinceCode;
                  setProvinceCode(nextCode);
                  const prov = PROVINCES.find(p => p.id === nextCode);
                  if (prov) {
                    setCity(prov.capital);
                    setLat(Math.round(prov.coordinates.lat * 1000000) / 1000000);
                    setLng(Math.round(prov.coordinates.lng * 1000000) / 1000000);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                {PROVINCES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ville *</label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quartier</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Adresse précise</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* GpsLocationPicker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Positionnement géographique de l’agence (cliquez ou déplacez le repère)
            </label>
            <GpsLocationPicker
              lat={lat}
              lng={lng}
              gpsPrecision={gpsPrecision}
              provinceCode={provinceCode}
              onChange={({ lat: newLat, lng: newLng, precision: newPrec }) => {
                setLat(newLat);
                setLng(newLng);
                if (newPrec) setGpsPrecision(newPrec);
              }}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
            >
              Enregistrer l'Agence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
   SUBCOMPONENT: MediaReplaceModal
------------------------------------------------------------------------- */
interface MediaReplaceModalProps {
  business: Business;
  authToken?: string | null;
  onClose: () => void;
  onSave: (logo: string, coverImage: string, images: string[]) => Promise<void>;
}

const MediaReplaceModal: React.FC<MediaReplaceModalProps> = ({
  business,
  authToken,
  onClose,
  onSave
}) => {
  const [logo, setLogo] = useState(business.logo);
  const [coverImage, setCoverImage] = useState(business.coverImage);
  const [images, setImages] = useState<string[]>(
    business.images && business.images.length > 0
      ? business.images.filter(Boolean)
      : business.coverImage
      ? [business.coverImage]
      : []
  );
  const [newUrl, setNewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setErrorMsg(null);
      setUploading(true);
      const url = await uploadOrProcessImage(file, business.id, 'logo', 400, 400, authToken);
      setLogo(url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du téléversement du logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setErrorMsg(null);
      setUploading(true);
      const url = await uploadOrProcessImage(file, business.id, 'cover', 1400, 800, authToken);
      setCoverImage(url);
      setImages(prev => (prev.includes(url) ? prev : [url, ...prev]));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du téléversement de la couverture.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = '';
    try {
      setErrorMsg(null);
      setUploading(true);
      const added: string[] = [];
      for (const f of fileList) {
        const url = await uploadOrProcessImage(f, business.id, 'gallery', 1200, 800, authToken);
        added.push(url);
      }
      setImages(prev => [...prev, ...added]);
      if (!coverImage && added.length > 0) {
        setCoverImage(added[0]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du téléversement des photos.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!newUrl.trim()) return;
    setImages(prev => [...prev, newUrl.trim()]);
    setNewUrl('');
  };

  const handleDeleteImage = (index: number) => {
    const target = images[index];
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (coverImage === target) {
      setCoverImage(next[0] || '');
    }
  };

  const handleConfirmSave = async () => {
    if (uploading || saving) return;
    try {
      setErrorMsg(null);
      setSaving(true);
      await onSave(logo, coverImage, images.filter(Boolean));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de la sauvegarde des médias.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Gestionnaire des Images (Bucket business-media)
            </span>
            <h2 className="text-base font-black text-slate-900 mt-1">
              Médias : {business.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Logo */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logo && logo.trim() ? (
                <img src={logo} alt="" className="w-14 h-14 rounded-xl object-cover bg-white border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                  {(business.name || 'G').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-slate-800 block">Logo de l'entreprise</span>
                <span className="text-[10px] text-slate-500">Format carré recommandé (JPG, PNG, WEBP)</span>
              </div>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => logoRef.current?.click()}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Envoi...' : 'Remplacer Logo'}
            </button>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadLogo}
            />
          </div>

          {/* Cover */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Photo de Couverture</span>
                <span className="text-[10px] text-slate-500">Bannière principale 16:9</span>
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => coverRef.current?.click()}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Envoi...' : 'Remplacer Couverture'}
              </button>
            </div>
            {coverImage && coverImage.trim() ? (
              <img src={coverImage} alt="" className="w-full h-36 object-cover rounded-xl border" />
            ) : (
              <div className="w-full h-24 rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                Aucune couverture définie
              </div>
            )}
            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadCover}
            />
          </div>

          {/* Gallery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 block">Galerie Photos ({images.length})</span>
              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryRef.current?.click()}
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg cursor-pointer"
              >
                + Téléverser photos
              </button>
              <input
                ref={galleryRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUploadGallery}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="Ou coller une URL d'image..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Ajouter
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {images.filter(img => Boolean(img && img.trim())).map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border bg-slate-100">
                  <img src={img} alt="" className="w-full h-20 object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(i)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={uploading || saving}
            onClick={handleConfirmSave}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md cursor-pointer"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
          </button>
        </div>
      </div>
    </div>
  );
};
