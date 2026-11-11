import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  MessageSquare, 
  Navigation, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  Star, 
  Heart, 
  Share2, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  Send, 
  Check, 
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  ChevronLeft,
  ChevronRight,
  Layers,
  Copy,
  Compass,
  Search
} from 'lucide-react';
import { Business, Review, BusinessBranch } from '../types';
import { 
  getSectorPinColor, 
  isBusinessOpenNow, 
  formatGabonPhone,
  formatGpsCoordinates,
  getGoogleMapsSearchUrl,
  getGoogleMapsDirUrl,
  copyCoordinatesToClipboard
} from '../utils/geo';
import { PROVINCES } from '../data/gabonData';

interface BusinessDetailsModalProps {
  business: Business;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddReview: (businessId: string, review: { authorName: string; authorCity: string; rating: number; comment: string }) => void;
  onReportBusiness: (businessId: string, report: { reason: string; details: string; reporterEmail: string }) => void;
  onRecordAction: (businessId: string, action: 'phone' | 'whatsapp' | 'route') => void;
  reviews: Review[];
}

export const BusinessDetailsModal: React.FC<BusinessDetailsModalProps> = ({
  business,
  onClose,
  isFavorite,
  onToggleFavorite,
  onAddReview,
  onReportBusiness,
  onRecordAction,
  reviews
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'branches' | 'services' | 'reviews' | 'report'>('info');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGps, setCopiedGps] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setCoverError(false);
    setLogoError(false);
  }, [business.coverImage, business.logo]);

  // Branches Tab state
  const [selectedBranchProvince, setSelectedBranchProvince] = useState<string>('all');
  const [branchSearch, setBranchSearch] = useState<string>('');
  const branchesMapRef = useRef<HTMLDivElement>(null);
  const branchesMapInstance = useRef<L.Map | null>(null);
  const branchMarkersRef = useRef<Record<string, L.Marker>>({});

  // Review Form state
  const [authorName, setAuthorName] = useState('');
  const [authorCity, setAuthorCity] = useState(business.location.city || 'Libreville');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Report Form state
  const [reportReason, setReportReason] = useState('wrong_address');
  const [reportDetails, setReportDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Mini Map ref
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<L.Map | null>(null);

  const openStatus = isBusinessOpenNow(business.details.openingHours);
  const pinColor = getSectorPinColor(business.category);
  const formattedGps = formatGpsCoordinates(business.location.coordinates.lat, business.location.coordinates.lng);

  // Filter reviews for this business
  const businessReviews = reviews.filter(r => r.businessId === business.id);

  // Branches list
  const branches = business.branches || [];
  const filteredBranches = branches.filter(br => {
    if (selectedBranchProvince !== 'all' && br.location.provinceCode !== selectedBranchProvince) return false;
    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      const matchName = br.name.toLowerCase().includes(q);
      const matchCity = br.location.city.toLowerCase().includes(q);
      const matchDistrict = br.location.district.toLowerCase().includes(q);
      const matchAddress = br.location.address.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchDistrict && !matchAddress) return false;
    }
    return true;
  });

  const handleCopyGpsCoords = async (lat: number, lng: number) => {
    const ok = await copyCoordinatesToClipboard(lat, lng);
    if (ok) {
      setCopiedGps(true);
      setTimeout(() => setCopiedGps(false), 2500);
    }
  };

  // Initialize Multi-Branches Map when activeTab is 'branches'
  useEffect(() => {
    if (activeTab !== 'branches') return;
    if (!branchesMapRef.current) return;

    if (branchesMapInstance.current) {
      branchesMapInstance.current.remove();
      branchesMapInstance.current = null;
    }

    if (branches.length === 0) return;

    // Calculate center or bounds
    const lats = branches.map(b => b.location.coordinates.lat);
    const lngs = branches.map(b => b.location.coordinates.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const map = L.map(branchesMapRef.current, {
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markers: Record<string, L.Marker> = {};

    branches.forEach(br => {
      const isMain = br.isMainBranch;
      const branchIcon = L.divIcon({
        className: 'branch-marker-pin',
        html: `
          <div style="position: relative; width: 34px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 36 42" width="34" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${isMain ? '#009e60' : '#1e293b'}"/>
              <circle cx="18" cy="16" r="9" fill="white"/>
              <circle cx="18" cy="16" r="5" fill="${isMain ? '#009e60' : '#0284c7'}"/>
            </svg>
            <div style="position: absolute; top: -3px; right: -3px; background: ${isMain ? '#f59e0b' : '#3b82f6'}; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 800;">
              ${isMain ? '★' : 'AG'}
            </div>
          </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 40],
        popupAnchor: [0, -38]
      });

      const marker = L.marker([br.location.coordinates.lat, br.location.coordinates.lng], { icon: branchIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 2px; width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; color: ${isMain ? '#009e60' : '#0284c7'}; text-transform: uppercase;">
              ${isMain ? '★ Siège / Agence Principale' : 'Agence locale'}
            </span>
            <span style="font-size: 9px; font-weight: 700; background: ${br.gpsPrecision === 'exact' ? '#dcfce7' : '#fef3c7'}; color: ${br.gpsPrecision === 'exact' ? '#166534' : '#92400e'}; padding: 1px 4px; border-radius: 4px;">
              ${br.gpsPrecision === 'exact' ? 'GPS Exact' : 'GPS Approx'}
            </span>
          </div>
          <h5 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #0f172a;">${br.name}</h5>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">📍 ${br.location.address}, <strong>${br.location.city}</strong></p>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #0284c7; font-weight: 600;">📞 ${br.contact.phone}</p>
          <a href="${getGoogleMapsDirUrl(br.location.coordinates.lat, br.location.coordinates.lng)}" target="_blank" rel="noreferrer" style="display: block; background: #009e60; color: white; text-align: center; font-size: 11px; font-weight: 700; padding: 5px 8px; border-radius: 6px; text-decoration: none;">
            Itinéraire Google Maps
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markers[br.id] = marker;
    });

    branchMarkersRef.current = markers;

    if (branches.length === 1) {
      map.setView([branches[0].location.coordinates.lat, branches[0].location.coordinates.lng], 13);
    } else {
      map.fitBounds([
        [minLat - 0.05, minLng - 0.05],
        [maxLat + 0.05, maxLng + 0.05]
      ], { padding: [30, 30] });
    }

    branchesMapInstance.current = map;

    return () => {
      map.remove();
      branchesMapInstance.current = null;
    };
  }, [activeTab, business]);

  const handleZoomToBranch = (branch: BusinessBranch) => {
    if (branchesMapInstance.current) {
      branchesMapInstance.current.flyTo(
        [branch.location.coordinates.lat, branch.location.coordinates.lng],
        15,
        { duration: 1 }
      );
      const marker = branchMarkersRef.current[branch.id];
      if (marker) {
        setTimeout(() => marker.openPopup(), 1100);
      }
    }
  };

  // Initialize mini-map
  useEffect(() => {
    if (!miniMapRef.current) return;
    if (miniMapInstance.current) {
      miniMapInstance.current.remove();
    }

    const { lat, lng } = business.location.coordinates;
    const map = L.map(miniMapRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'mini-map-pin',
      html: `
        <div style="position: relative; width: 32px; height: 38px;">
          <svg viewBox="0 0 36 42" width="32" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${pinColor}"/>
            <circle cx="18" cy="16" r="8" fill="white"/>
            <circle cx="18" cy="16" r="4.5" fill="${pinColor}"/>
          </svg>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38]
    });

    L.marker([lat, lng], { icon: customIcon }).addTo(map);
    miniMapInstance.current = map;

    return () => {
      map.remove();
      miniMapInstance.current = null;
    };
  }, [business, pinColor]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;

    setSubmittingReview(true);
    onAddReview(business.id, {
      authorName,
      authorCity,
      rating,
      comment
    });

    setSubmittingReview(false);
    setReviewSuccess(true);
    setComment('');
    setTimeout(() => setReviewSuccess(false), 4000);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportBusiness(business.id, {
      reason: reportReason,
      details: reportDetails,
      reporterEmail
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setActiveTab('info');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header Cover */}
        <div className="relative h-48 sm:h-64 w-full bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 shrink-0">
          {business.coverImage && business.coverImage.trim() && !coverError ? (
            <img
              src={business.coverImage}
              alt={business.name}
              className="w-full h-full object-cover"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Building2 className="w-16 h-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent"></div>

          {/* Close & Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => {
                const shareText = encodeURIComponent(`Découvrez ${business.name} sur Gabon Business Map : ${window.location.href}`);
                window.open(`https://wa.me/?text=${shareText}`, '_blank');
              }}
              className="p-2.5 rounded-full bg-green-600/90 hover:bg-green-600 text-white backdrop-blur-md transition-colors"
              title="Partager sur WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md transition-colors"
              title="Copier le lien de la fiche"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onToggleFavorite(business.id)}
              className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                isFavorite ? 'bg-rose-600 text-white' : 'bg-slate-900/70 hover:bg-slate-900 text-white'
              }`}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Business Core Info over Cover Bottom */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            {business.logo && business.logo.trim() && !logoError ? (
              <img
                src={business.logo}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white p-1 border-2 border-white shadow-xl shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-xl shrink-0">
                {(business.name || 'G').slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="text-white flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span 
                  className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 backdrop-blur-md"
                  style={{ color: pinColor }}
                >
                  {business.subCategory || business.category}
                </span>

                {business.status === 'verified' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Entreprise Vérifiée
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate drop-shadow-md">
                {business.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-200 flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  {business.location.district ? `${business.location.district}, ` : ''}
                  {business.location.city} ({business.location.province})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Contact Action Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-3">
            {/* Direct Phone Call */}
            <a
              href={`tel:${business.contact.phone}`}
              onClick={() => onRecordAction(business.id, 'phone')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{formatGabonPhone(business.contact.phone)}</span>
            </a>

            {/* Direct WhatsApp */}
            <a
              href={`https://wa.me/${(business.contact.whatsapp || business.contact.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${business.name}, je vous contacte via Gabon Business Map.`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => onRecordAction(business.id, 'whatsapp')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Direct</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Itinerary */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.coordinates.lat},${business.location.coordinates.lng}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => onRecordAction(business.id, 'route')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Itinéraire GPS</span>
            </a>

            {business.contact.website && (
              <a
                href={business.contact.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Site Web</span>
              </a>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-6 flex items-center space-x-6 text-sm font-bold bg-white overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Présentation & Horaires</span>
          </button>

          {/* Tab: Nos Agences au Gabon (if branches exist) */}
          <button
            onClick={() => setActiveTab('branches')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'branches'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Nos agences au Gabon</span>
            {branches.length > 0 && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'branches' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {branches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'services'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Services & Paiements</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'reviews'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Avis Clients ({businessReviews.length})</span>
            <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded font-extrabold">
              ★ {business.rating}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ml-auto text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'report'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-rose-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Signaler une erreur</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: INFO & HORAIRES */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Description & Gallery */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    À propos de l'établissement
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                    {business.description}
                  </p>
                </div>

                {/* Key Legal / Administrative Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Raison sociale</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {business.legalName || business.name}
                    </span>
                  </div>

                  {business.creationYear && (
                    <div>
                      <span className="text-slate-400 block font-medium">Année de création</span>
                      <span className="font-bold text-slate-800">{business.creationYear}</span>
                    </div>
                  )}

                  {business.nif && (
                    <div>
                      <span className="text-slate-400 block font-medium">NIF (Gabon)</span>
                      <span className="font-mono font-bold text-slate-800">{business.nif}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block font-medium">Statut de vérification</span>
                    <span className="font-bold text-emerald-700">Certifié conforme</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Province</span>
                    <span className="font-bold text-slate-800">{business.location.province}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Ville & Quartier</span>
                    <span className="font-bold text-slate-800">{business.location.city}</span>
                  </div>
                </div>

                {/* Photos Gallery */}
                {business.images && business.images.filter(Boolean).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Galerie photos ({business.images.filter(Boolean).length})
                      </h3>
                      <span className="text-[11px] text-emerald-700 font-semibold cursor-pointer">
                        Cliquez pour agrandir
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {business.images.filter(Boolean).map((img, i) => (
                        <div
                          key={i}
                          onClick={() => setLightboxIndex(i)}
                          className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 cursor-pointer group hover:border-emerald-500 shadow-2xs transition-all bg-slate-100"
                        >
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            Agrandir
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Mini Map & Opening Hours */}
              <div className="space-y-6">
                
                {/* Location Card with Leaflet Mini-map */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      Localisation & GPS
                    </h4>
                    {business.gpsPrecision === 'exact' ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        GPS Exact Vérifié
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Position Approximative
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    📍 <strong>{business.location.district ? `${business.location.district}, ` : ''}</strong>
                    {business.location.address}, {business.location.city} ({business.location.province})
                  </p>

                  <div 
                    ref={miniMapRef} 
                    className="w-full h-36 rounded-lg overflow-hidden border border-slate-200 z-0"
                  />

                  {/* Coordinates Info & 1-click Copy */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono flex items-center justify-between">
                    <div>
                      <div className="text-slate-800 font-bold">{formattedGps.decimal}</div>
                      <div className="text-slate-500 text-[10px]">{formattedGps.dms}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyGpsCoords(business.location.coordinates.lat, business.location.coordinates.lng)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${
                        copiedGps ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Copier les coordonnées GPS"
                    >
                      {copiedGps ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGps ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  {/* Google Maps Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={getGoogleMapsDirUrl(business.location.coordinates.lat, business.location.coordinates.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Guidage GPS</span>
                    </a>
                    <a
                      href={getGoogleMapsSearchUrl(business.location.coordinates.lat, business.location.coordinates.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Google Maps</span>
                    </a>
                  </div>

                  {/* Multi-Branch Quick Link Banner */}
                  {branches.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>Réseau de {branches.length} agences au Gabon</span>
                      </div>
                      <p className="text-[11px] text-blue-700">
                        Cette entreprise est implantée dans plusieurs villes et provinces gabonaises.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('branches')}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors"
                      >
                        Consulter toutes les agences →
                      </button>
                    </div>
                  )}
                </div>

                {/* Opening Hours */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Horaires d'ouverture
                    </h4>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      openStatus.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {openStatus.statusText}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60 text-xs">
                    {Object.entries(business.details.openingHours).map(([days, hours]) => (
                      <div key={days} className="py-2 flex items-center justify-between">
                        <span className="text-slate-600 font-medium">{days}</span>
                        <span className="font-bold text-slate-900">{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Networks Links */}
                {(business.contact.facebook || business.contact.instagram || business.contact.linkedin) && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Réseaux officiels
                    </h4>
                    <div className="flex items-center gap-2">
                      {business.contact.facebook && (
                        <a
                          href={business.contact.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {business.contact.instagram && (
                        <a
                          href={business.contact.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {business.contact.linkedin && (
                        <a
                          href={business.contact.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: NOS AGENCES AU GABON */}
          {activeTab === 'branches' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header & Overview Stats */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl text-white shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-white/10 px-2 py-0.5 rounded">
                      Réseau National Multi-Agences
                    </span>
                    <h3 className="text-lg sm:text-xl font-black mt-1">
                      Agences & Points de Présence de {business.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-white/15 px-3 py-1 rounded-xl font-bold">
                      🏢 {branches.length} Agences
                    </span>
                    <span className="text-xs bg-white/15 px-3 py-1 rounded-xl font-bold">
                      📍 {new Set(branches.map(b => b.location.city)).size} Villes
                    </span>
                    <span className="text-xs bg-emerald-500/25 text-emerald-300 px-3 py-1 rounded-xl font-bold border border-emerald-500/30">
                      🌍 {new Set(branches.map(b => b.location.province)).size} Provinces
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Chaque agence dispose de son emplacement géographique réel et précis, de ses coordonnées de contact propres et de ses horaires spécifiques.
                </p>
              </div>

              {branches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-800">Aucune agence secondaire enregistrée</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cette entreprise n'a pas encore configuré d'agences multiples. Son point de contact principal est situé à {business.location.city}.
                  </p>
                </div>
              ) : (
                <>
                  {/* Interactive Multi-Agency Leaflet Map */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        Carte interactive de l'ensemble des agences au Gabon
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Cliquez sur un marqueur ou sur « Voir sur la carte » d'une agence
                      </span>
                    </div>

                    <div 
                      ref={branchesMapRef} 
                      className="w-full h-72 sm:h-80 rounded-2xl border border-slate-300 overflow-hidden shadow-inner z-0"
                    />

                    <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-600" />
                        Siège / Agence Principale
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-800" />
                        Agences régionales
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                        GPS Exact Vérifié
                      </span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={branchSearch}
                        onChange={e => setBranchSearch(e.target.value)}
                        placeholder="Rechercher une agence, ville, quartier..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                      <button
                        onClick={() => setSelectedBranchProvince('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                          selectedBranchProvince === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Toutes les provinces ({branches.length})
                      </button>

                      {Array.from(new Set(branches.map(b => b.location.provinceCode))).map(provCode => {
                        const prov = PROVINCES.find(p => p.id === provCode);
                        const count = branches.filter(b => b.location.provinceCode === provCode).length;
                        return (
                          <button
                            key={provCode}
                            onClick={() => setSelectedBranchProvince(provCode)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                              selectedBranchProvince === provCode
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>{prov ? prov.name : provCode}</span>
                            <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Agency Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBranches.map(br => {
                      const branchOpen = isBusinessOpenNow(br.openingHours);
                      const gpsFmt = formatGpsCoordinates(br.location.coordinates.lat, br.location.coordinates.lng);

                      return (
                        <div 
                          key={br.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 bg-white ${
                            br.isMainBranch
                              ? 'border-emerald-300 ring-1 ring-emerald-200 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {br.isMainBranch && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                    ★ Siège / Agence Principale
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  br.status === 'open' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {br.status === 'open' ? 'En activité' : 'Fermée temporairement'}
                                </span>
                                {br.code && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    {br.code}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-sm">
                                {br.name}
                              </h4>
                            </div>

                            {/* GPS Status Badge */}
                            {br.gpsPrecision === 'exact' ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0" title="Coordonnées réelles du bâtiment physique">
                                <Check className="w-3 h-3 text-emerald-600" />
                                GPS Exact
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0" title="Position approximative de la zone">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                GPS Approx
                              </span>
                            )}
                          </div>

                          {/* Address & District */}
                          <div className="text-xs text-slate-600 space-y-1">
                            <p className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>
                                {br.location.district ? <strong>{br.location.district}, </strong> : ''}
                                {br.location.address} — <strong className="text-slate-800">{br.location.city}</strong> ({br.location.province})
                              </span>
                            </p>
                          </div>

                          {/* Contacts & Live Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Téléphone direct</span>
                              <a href={`tel:${br.contact.phone}`} className="font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {formatGabonPhone(br.contact.phone)}
                              </a>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statut d'ouverture</span>
                              <span className="flex items-center gap-1.5 font-semibold text-slate-700 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${branchOpen.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {branchOpen.statusText}
                              </span>
                            </div>
                          </div>

                          {/* Coordinates Preview */}
                          <div className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 flex items-center justify-between">
                            <span>GPS: {gpsFmt.decimal}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyGpsCoords(br.location.coordinates.lat, br.location.coordinates.lng)}
                              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copier</span>
                            </button>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleZoomToBranch(br)}
                              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-600" />
                              <span>Voir sur la carte</span>
                            </button>

                            <a
                              href={getGoogleMapsDirUrl(br.location.coordinates.lat, br.location.coordinates.lng)}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Itinéraire Google Maps</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: SERVICES & PAIEMENTS */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Services & Produits */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Prestations & Services proposés
                </h3>
                <ul className="space-y-2.5">
                  {business.details.services.map((service, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>

                {business.details.facilities && (
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                      Équipements & Commodités
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {business.details.facilities.map((fac, idx) => (
                        <span key={idx} className="text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg">
                          ✓ {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Gabon */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Moyens de paiement acceptés
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Réglez vos achats ou prestations selon vos préférences au Gabon :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {business.details.paymentMethods.map((method, idx) => {
                    const isAirtel = method.toLowerCase().includes('airtel');
                    const isMoov = method.toLowerCase().includes('moov');
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                          isAirtel
                            ? 'bg-red-50/80 border-red-200 text-red-900'
                            : isMoov
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{method}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEWS & RATINGS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              
              {/* Ratings Summary Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="text-4xl font-black text-amber-400">
                    {business.rating}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= Math.round(business.rating) ? 'fill-current' : 'text-slate-600'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Basé sur {businessReviews.length} avis d'utilisateurs certifiés
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 max-w-xs text-center sm:text-right">
                  Partagez votre expérience réelle pour guider les citoyens et touristes au Gabon.
                </div>
              </div>

              {/* Add Review Form */}
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Publier votre avis sur cet établissement
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Votre Nom & Prénom</label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      placeholder="Ex : Guy Ondo"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Votre Ville de résidence</label>
                    <input
                      type="text"
                      value={authorCity}
                      onChange={e => setAuthorCity(e.target.value)}
                      placeholder="Ex : Libreville, Port-Gentil, Franceville..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Votre évaluation globale</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(st => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setRating(st)}
                        className={`p-1.5 rounded-lg transition-transform hover:scale-110 ${
                          st <= rating ? 'text-amber-500' : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {rating} / 5 étoiles
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Votre commentaire détaillé</label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Qualité de service, accueil, ponctualité, respect des tarifs..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {reviewSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Votre avis a été publié avec succès et contribue à la réputation de l'entreprise !</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReview ? 'Publication...' : 'Envoyer mon avis'}</span>
                </button>
              </form>

              {/* Existing Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tous les commentaires ({businessReviews.length})
                </h4>

                {businessReviews.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Aucun avis pour le moment. Soyez le premier à donner votre avis !
                  </p>
                ) : (
                  businessReviews.map(rev => (
                    <div key={rev.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {rev.authorName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{rev.authorName}</span>
                            <span className="text-[10px] text-slate-400">{rev.authorCity || 'Gabon'} • {new Date(rev.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-current' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {rev.comment}
                      </p>

                      {/* Business Response if any */}
                      {rev.businessResponse && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs">
                          <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Réponse de {business.name} :
                          </div>
                          <p className="text-slate-700 italic">
                            "{rev.businessResponse.comment}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SIGNALEMENT D'ERREURS */}
          {activeTab === 'report' && (
            <div className="max-w-xl mx-auto py-4">
              <form onSubmit={handleReportSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Signaler une information incorrecte
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Aidez la communauté gabonaise à maintenir un annuaire de qualité. Votre signalement sera vérifié par notre équipe de modération.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motif du signalement</label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="wrong_address">Adresse ou localisation GPS erronée</option>
                    <option value="wrong_phone">Numéro de téléphone non fonctionnel</option>
                    <option value="closed">Entreprise définitivement fermée</option>
                    <option value="fraud">Suspicion de fraude ou fausse entreprise</option>
                    <option value="other">Autre problème d'information</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Détails de l'anomalie constatée</label>
                  <textarea
                    required
                    rows={3}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Précisez la bonne adresse, le bon numéro ou la raison de votre signalement..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Votre email (optionnel, pour suivi)</label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={e => setReporterEmail(e.target.value)}
                    placeholder="votre-email@domaine.ga"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {reportSubmitted ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                    Merci ! Votre signalement a été transmis à l'équipe d'administration de Gabon Business Map.
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                  >
                    Transmettre le signalement
                  </button>
                )}
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && business.images && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">{business.name}</span>
              <span className="text-xs text-slate-400">
                Photo {lightboxIndex + 1} / {business.images.length}
              </span>
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image */}
          <div 
            className="relative max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {business.images[lightboxIndex] && business.images[lightboxIndex].trim() ? (
              <img
                src={business.images[lightboxIndex]}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : null}
          </div>

          {/* Controls Prev/Next */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + business.images.length) % business.images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            title="Photo précédente"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % business.images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            title="Photo suivante"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
