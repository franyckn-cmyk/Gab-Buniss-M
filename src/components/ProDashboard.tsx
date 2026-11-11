import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Building, 
  Eye, 
  Phone, 
  MessageSquare, 
  Navigation, 
  Heart, 
  Edit3, 
  PlusCircle, 
  Star, 
  Send, 
  CheckCircle2, 
  Tag, 
  Clock, 
  Share2,
  Calendar,
  Image as ImageIcon,
  Upload,
  Trash2,
  MoveLeft,
  MoveRight,
  Sparkles,
  MapPin,
  Check,
  CreditCard,
  Building2,
  Globe,
  Crosshair,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  AlertCircle,
  ExternalLink,
  Copy,
  Compass,
  X,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { Business, Review, Promotion, BusinessCategory, ProvinceCode, BusinessBranch, BranchStatus, GpsPrecision } from '../types';
import { 
  formatGabonPhone, 
  isBusinessOpenNow, 
  getSectorPinColor,
  formatGpsCoordinates,
  getGoogleMapsSearchUrl,
  getGoogleMapsDirUrl,
  copyCoordinatesToClipboard,
  reverseGeocodeGabon
} from '../utils/geo';
import { PROVINCES, CATEGORIES } from '../data/gabonData';
import { uploadOrProcessImage } from '../utils/imageUpload';

interface ProDashboardProps {
  ownedBusiness: Business;
  onUpdateBusiness: (updated: Partial<Business>) => Promise<Business | null | void>;
  reviews: Review[];
  onReplyReview: (reviewId: string, reply: string) => void;
  promotions: Promotion[];
  onAddPromotion: (promo: Partial<Promotion>) => void;
  onSelectBusiness: (business: Business) => void;
  isAdminMode?: boolean;
  adminName?: string;
  onExitAdminMode?: () => void;
  authToken?: string | null;
}

export const ProDashboard: React.FC<ProDashboardProps> = ({
  ownedBusiness,
  onUpdateBusiness,
  reviews,
  onReplyReview,
  promotions,
  onAddPromotion,
  onSelectBusiness,
  isAdminMode = false,
  adminName,
  onExitAdminMode,
  authToken
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'images' | 'coords' | 'location' | 'branches' | 'hours' | 'services' | 'reviews' | 'promos'>('stats');

  // Success & error notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorToastMessage, setErrorToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setErrorToastMessage(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setToastMessage(null);
    setErrorToastMessage(msg);
    setTimeout(() => setErrorToastMessage(null), 5000);
  };

  const buildAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('gbm_auth_token') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // --- 1. IMAGES MANAGEMENT STATE ---
  const [logo, setLogo] = useState(ownedBusiness.logo);
  const [coverImage, setCoverImage] = useState(ownedBusiness.coverImage);
  const [galleryImages, setGalleryImages] = useState<string[]>(
    ownedBusiness.images && ownedBusiness.images.length > 0
      ? ownedBusiness.images.filter(Boolean)
      : ownedBusiness.coverImage
      ? [ownedBusiness.coverImage]
      : []
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Upload handlers -> bucket Supabase Storage 'business-media'
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadOrProcessImage(file, ownedBusiness.id, 'logo', 400, 400, authToken);
      setLogo(url);
      showToast('Logo téléversé dans business-media. Cliquez sur "Enregistrer et Publier les Images" pour valider.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du chargement du logo');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadOrProcessImage(file, ownedBusiness.id, 'cover', 1400, 800, authToken);
      setCoverImage(url);
      setGalleryImages(prev => (prev.includes(url) ? prev : [url, ...prev]));
      showToast('Image de couverture téléversée dans business-media.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du chargement de la couverture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = '';
    try {
      setUploadingImage(true);
      const newUrls: string[] = [];
      for (const f of fileList) {
        const url = await uploadOrProcessImage(f, ownedBusiness.id, 'gallery', 1200, 800, authToken);
        newUrls.push(url);
      }
      setGalleryImages(prev => [...prev, ...newUrls]);
      if (!coverImage && newUrls.length > 0) {
        setCoverImage(newUrls[0]);
      }
      showToast(`${newUrls.length} photo(s) ajoutée(s) dans business-media.`);
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du chargement des images');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setGalleryImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    showToast('Photo ajoutée depuis l’URL.');
  };

  const handleSetPrimaryImage = (imgUrl: string) => {
    setCoverImage(imgUrl);
    // Move to front of gallery
    const reordered = [imgUrl, ...galleryImages.filter(url => url !== imgUrl)];
    setGalleryImages(reordered);
    showToast('Image définie comme image principale (couverture et annuaire).');
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryImages.length) return;

    const updated = [...galleryImages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setGalleryImages(updated);
  };

  const handleDeleteGalleryImage = (index: number) => {
    const removedUrl = galleryImages[index];
    const updated = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(updated);

    if (coverImage === removedUrl) {
      setCoverImage(updated[0] || '');
    }
    showToast('Photo supprimée de la galerie.');
  };

  const handleSaveAllImages = async () => {
    try {
      await onUpdateBusiness({
        logo,
        coverImage,
        images: galleryImages.filter(Boolean)
      });
      showToast('Toutes les modifications d’images ont été enregistrées sur Supabase !');
    } catch (e: any) {
      showError(e?.message || 'Impossible de sauvegarder les images.');
    }
  };

  // --- 2. INFORMATION & CONTACTS STATE ---
  const [bizName, setBizName] = useState(ownedBusiness.name);
  const [legalName, setLegalName] = useState(ownedBusiness.legalName || ownedBusiness.name);
  const [category, setCategory] = useState<BusinessCategory>(ownedBusiness.category);
  const [subCategory, setSubCategory] = useState(ownedBusiness.subCategory || '');
  const [creationYear, setCreationYear] = useState(ownedBusiness.creationYear ? String(ownedBusiness.creationYear) : '');
  const [nif, setNif] = useState(ownedBusiness.nif || '');
  const [description, setDescription] = useState(ownedBusiness.description);
  const [phone, setPhone] = useState(ownedBusiness.contact.phone);
  const [phoneSecondary, setPhoneSecondary] = useState(ownedBusiness.contact.phoneSecondary || '');
  const [whatsapp, setWhatsapp] = useState(ownedBusiness.contact.whatsapp || '');
  const [email, setEmail] = useState(ownedBusiness.contact.email);
  const [website, setWebsite] = useState(ownedBusiness.contact.website || '');
  const [facebook, setFacebook] = useState(ownedBusiness.contact.facebook || '');
  const [instagram, setInstagram] = useState(ownedBusiness.contact.instagram || '');
  const [linkedin, setLinkedin] = useState(ownedBusiness.contact.linkedin || '');

  const handleSaveCoords = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateBusiness({
        name: bizName,
        legalName,
        category,
        subCategory,
        creationYear: creationYear ? parseInt(creationYear, 10) : undefined,
        nif: nif || undefined,
        description,
        contact: {
          ...ownedBusiness.contact,
          phone,
          phoneSecondary,
          whatsapp,
          email,
          website,
          facebook,
          instagram,
          linkedin
        }
      });
      showToast('Coordonnées et informations enregistrées sur Supabase.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la mise à jour des coordonnées.');
    }
  };

  // --- 3. LOCATION & MAP GPS STATE ---
  const [provinceCode, setProvinceCode] = useState<ProvinceCode>(ownedBusiness.location.provinceCode);
  const [city, setCity] = useState(ownedBusiness.location.city);
  const [arrondissement, setArrondissement] = useState(ownedBusiness.location.arrondissement || '');
  const [district, setDistrict] = useState(ownedBusiness.location.district);
  const [address, setAddress] = useState(ownedBusiness.location.address);
  const [coordsLat, setCoordsLat] = useState(ownedBusiness.location.coordinates.lat);
  const [coordsLng, setCoordsLng] = useState(ownedBusiness.location.coordinates.lng);
  const [gpsPrecision, setGpsPrecision] = useState<GpsPrecision>(ownedBusiness.gpsPrecision || 'exact');
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [reverseGeoAddress, setReverseGeoAddress] = useState<string | null>(null);

  // Sync form states when switching managed business
  useEffect(() => {
    setLogo(ownedBusiness.logo);
    setCoverImage(ownedBusiness.coverImage);
    setGalleryImages(
      ownedBusiness.images && ownedBusiness.images.length > 0
        ? ownedBusiness.images.filter(Boolean)
        : ownedBusiness.coverImage
        ? [ownedBusiness.coverImage]
        : []
    );
    setBizName(ownedBusiness.name);
    setLegalName(ownedBusiness.legalName || ownedBusiness.name);
    setCategory(ownedBusiness.category);
    setSubCategory(ownedBusiness.subCategory || '');
    setCreationYear(ownedBusiness.creationYear ? String(ownedBusiness.creationYear) : '');
    setNif(ownedBusiness.nif || '');
    setDescription(ownedBusiness.description);
    setPhone(ownedBusiness.contact.phone);
    setPhoneSecondary(ownedBusiness.contact.phoneSecondary || '');
    setWhatsapp(ownedBusiness.contact.whatsapp || '');
    setEmail(ownedBusiness.contact.email);
    setWebsite(ownedBusiness.contact.website || '');
    setFacebook(ownedBusiness.contact.facebook || '');
    setInstagram(ownedBusiness.contact.instagram || '');
    setLinkedin(ownedBusiness.contact.linkedin || '');
    setProvinceCode(ownedBusiness.location.provinceCode);
    setCity(ownedBusiness.location.city);
    setArrondissement(ownedBusiness.location.arrondissement || '');
    setDistrict(ownedBusiness.location.district);
    setAddress(ownedBusiness.location.address);
    setCoordsLat(ownedBusiness.location.coordinates.lat);
    setCoordsLng(ownedBusiness.location.coordinates.lng);
    setGpsPrecision(ownedBusiness.gpsPrecision || 'exact');
  }, [ownedBusiness.id]);

  // --- MULTI-BRANCH / RÉSEAU AGENCES STATE ---
  const [branches, setBranches] = useState<BusinessBranch[]>(ownedBusiness.branches || []);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Branch Modal Form Fields
  const [bName, setBName] = useState('');
  const [bCode, setBCode] = useState('');
  const [bIsMain, setBIsMain] = useState(false);
  const [bStatus, setBStatus] = useState<BranchStatus>('open');
  const [bProvinceCode, setBProvinceCode] = useState<ProvinceCode>('estuaire');
  const [bCity, setBCity] = useState('Libreville');
  const [bDistrict, setBDistrict] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bLat, setBLat] = useState(0.3901);
  const [bLng, setBLng] = useState(9.4544);
  const [bGpsPrecision, setBGpsPrecision] = useState<GpsPrecision>('exact');
  const [bPhone, setBPhone] = useState('');
  const [bPhoneSecondary, setBPhoneSecondary] = useState('');
  const [bEmail, setBEmail] = useState('');
  const [bWhatsapp, setBWhatsapp] = useState('');
  const [bManagerName, setBManagerName] = useState('');
  const [bNotes, setBNotes] = useState('');
  const [bHours, setBHours] = useState<Record<string, string>>({
    'Lundi - Vendredi': '08:00 - 17:00',
    'Samedi': '08:30 - 12:30',
    'Dimanche': 'Fermé'
  });
  const [bIsLocating, setBIsLocating] = useState(false);

  // Branch map refs
  const branchModalMapRef = useRef<HTMLDivElement>(null);
  const branchModalMapInstance = useRef<L.Map | null>(null);
  const branchModalMarkerRef = useRef<L.Marker | null>(null);

  const branchesOverviewMapRef = useRef<HTMLDivElement>(null);
  const branchesOverviewMapInstance = useRef<L.Map | null>(null);

  // Sync branches if ownedBusiness changes
  useEffect(() => {
    setBranches(ownedBusiness.branches || []);
  }, [ownedBusiness]);

  useEffect(() => {
    if (activeTab !== 'location') return;
    if (!proMapContainerRef.current) return;

    if (proMapInstanceRef.current) {
      proMapInstanceRef.current.remove();
    }

    const map = L.map(proMapContainerRef.current, {
      center: [coordsLat, coordsLng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'pro-location-pin',
      html: `
        <div style="position: relative; width: 36px; height: 42px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 36 42" width="36" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#009e60"/>
            <circle cx="18" cy="16" r="9" fill="white"/>
            <circle cx="18" cy="16" r="5" fill="#009e60"/>
          </svg>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42]
    });

    const marker = L.marker([coordsLat, coordsLng], { icon: pinIcon, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const nLat = Math.round(pos.lat * 1000000) / 1000000;
      const nLng = Math.round(pos.lng * 1000000) / 1000000;
      setCoordsLat(nLat);
      setCoordsLng(nLng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      const nLat = Math.round(e.latlng.lat * 1000000) / 1000000;
      const nLng = Math.round(e.latlng.lng * 1000000) / 1000000;
      setCoordsLat(nLat);
      setCoordsLng(nLng);
    });

    proMapMarkerRef.current = marker;
    proMapInstanceRef.current = map;

    const invalidate = () => {
      if (proMapInstanceRef.current) {
        proMapInstanceRef.current.invalidateSize();
      }
    };
    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 250);
    const t3 = setTimeout(invalidate, 600);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && proMapContainerRef.current) {
      ro = new ResizeObserver(() => invalidate());
      ro.observe(proMapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
      map.remove();
      proMapInstanceRef.current = null;
    };
  }, [activeTab]);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas prise en charge par votre navigateur.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const newLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const newLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setCoordsLat(newLat);
        setCoordsLng(newLng);
        setGpsPrecision('exact');

        if (proMapInstanceRef.current && proMapMarkerRef.current) {
          proMapInstanceRef.current.flyTo([newLat, newLng], 16);
          proMapMarkerRef.current.setLatLng([newLat, newLng]);
        }
        showToast('Position GPS exacte détectée par le capteur de votre appareil.');
      },
      () => {
        setIsLocating(false);
        alert('Impossible de récupérer votre position GPS. Veuillez vérifier vos autorisations.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReverseGeocodeCurrent = async () => {
    setIsReverseGeocoding(true);
    const res = await reverseGeocodeGabon(coordsLat, coordsLng);
    setIsReverseGeocoding(false);
    if (res.address || res.displayName) {
      setReverseGeoAddress(res.address || res.displayName || '');
      if (res.city && !city) setCity(res.city);
      if (res.district && !district) setDistrict(res.district);
      showToast(`Adresse identifiée : ${res.address || res.city}`);
    } else {
      showToast('Aucune adresse textuelle précise trouvée pour ces coordonnées.');
    }
  };

  const proMapContainerRef = useRef<HTMLDivElement>(null);
  const proMapInstanceRef = useRef<L.Map | null>(null);
  const proMapMarkerRef = useRef<L.Marker | null>(null);

  const handleManualCoordsChange = (nextLat: number, nextLng: number) => {
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    setCoordsLat(nextLat);
    setCoordsLng(nextLng);
    setGpsPrecision('exact');
    if (proMapInstanceRef.current && proMapMarkerRef.current) {
      proMapMarkerRef.current.setLatLng([nextLat, nextLng]);
      proMapInstanceRef.current.panTo([nextLat, nextLng]);
    }
  };

  const handleSaveLocation = async () => {
    const provObj = PROVINCES.find(p => p.id === provinceCode);
    const roundedLat = Math.round(Number(coordsLat) * 1000000) / 1000000;
    const roundedLng = Math.round(Number(coordsLng) * 1000000) / 1000000;
    try {
      await onUpdateBusiness({
        gpsPrecision,
        location: {
          province: provObj ? provObj.name : ownedBusiness.location.province,
          provinceCode,
          city,
          arrondissement: arrondissement.trim() || undefined,
          district,
          address,
          coordinates: { lat: roundedLat, lng: roundedLng }
        },
        ...({ lat: roundedLat, lng: roundedLng } as any)
      });
      showToast('Emplacement et coordonnées GPS sauvegardés avec succès !');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la sauvegarde de la localisation.');
    }
  };

  // --- MULTI-BRANCH HANDLERS ---
  const handleOpenAddBranch = () => {
    setEditingBranchId(null);
    setBName('');
    setBCode(`AG-${provinceCode.slice(0, 3).toUpperCase()}-${branches.length + 1}`);
    setBIsMain(branches.length === 0);
    setBStatus('open');
    setBProvinceCode(provinceCode);
    setBCity(city);
    setBDistrict('');
    setBAddress('');
    setBLat(coordsLat);
    setBLng(coordsLng);
    setBGpsPrecision('exact');
    setBPhone(ownedBusiness.contact.phone);
    setBPhoneSecondary('');
    setBEmail(ownedBusiness.contact.email);
    setBWhatsapp(ownedBusiness.contact.whatsapp || '');
    setBManagerName('');
    setBNotes('');
    setBHours({
      'Lundi - Vendredi': '08:00 - 17:00',
      'Samedi': '08:30 - 12:30',
      'Dimanche': 'Fermé'
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: BusinessBranch) => {
    setEditingBranchId(branch.id);
    setBName(branch.name);
    setBCode(branch.code || '');
    setBIsMain(branch.isMainBranch);
    setBStatus(branch.status);
    setBProvinceCode(branch.location.provinceCode);
    setBCity(branch.location.city);
    setBDistrict(branch.location.district);
    setBAddress(branch.location.address);
    setBLat(branch.location.coordinates.lat);
    setBLng(branch.location.coordinates.lng);
    setBGpsPrecision(branch.gpsPrecision || 'exact');
    setBPhone(branch.contact.phone);
    setBPhoneSecondary(branch.contact.phoneSecondary || '');
    setBEmail(branch.contact.email || '');
    setBWhatsapp(branch.contact.whatsapp || '');
    setBManagerName(branch.managerName || '');
    setBNotes(branch.notes || '');
    setBHours(branch.openingHours || {
      'Lundi - Vendredi': '08:00 - 17:00',
      'Samedi': '08:30 - 12:30',
      'Dimanche': 'Fermé'
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranchForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim() || !bCity.trim() || !bAddress.trim()) {
      alert('Veuillez renseigner le nom, la ville et l’adresse de l’agence.');
      return;
    }

    const provObj = PROVINCES.find(p => p.id === bProvinceCode);
    const provName = provObj ? provObj.name : 'Estuaire';

    let updatedBranches = [...branches];

    if (bIsMain) {
      // Demote previous main branch
      updatedBranches = updatedBranches.map(b => ({ ...b, isMainBranch: false }));
    }

    if (editingBranchId) {
      // Edit existing
      updatedBranches = updatedBranches.map(b => {
        if (b.id !== editingBranchId) return b;
        return {
          ...b,
          name: bName,
          code: bCode,
          isMainBranch: bIsMain,
          status: bStatus,
          gpsPrecision: bGpsPrecision,
          location: {
            province: provName,
            provinceCode: bProvinceCode,
            city: bCity,
            district: bDistrict,
            address: bAddress,
            coordinates: { lat: bLat, lng: bLng }
          },
          contact: {
            phone: bPhone,
            phoneSecondary: bPhoneSecondary || undefined,
            email: bEmail || undefined,
            whatsapp: bWhatsapp || undefined
          },
          openingHours: bHours,
          managerName: bManagerName,
          notes: bNotes
        };
      });
      showToast(`Agence « ${bName} » modifiée avec succès.`);
    } else {
      // Create new
      const newBranch: BusinessBranch = {
        id: `branch-${Date.now()}`,
        businessId: ownedBusiness.id,
        name: bName,
        code: bCode,
        isMainBranch: bIsMain,
        status: bStatus,
        gpsPrecision: bGpsPrecision,
        location: {
          province: provName,
          provinceCode: bProvinceCode,
          city: bCity,
          district: bDistrict,
          address: bAddress,
          coordinates: { lat: bLat, lng: bLng }
        },
        contact: {
          phone: bPhone,
          phoneSecondary: bPhoneSecondary || undefined,
          email: bEmail || undefined,
          whatsapp: bWhatsapp || undefined
        },
        openingHours: bHours,
        photos: [ownedBusiness.coverImage || ownedBusiness.logo],
        images: [ownedBusiness.coverImage || ownedBusiness.logo],
        managerName: bManagerName,
        notes: bNotes,
        createdAt: new Date().toISOString()
      };
      updatedBranches.push(newBranch);
      showToast(`Nouvelle agence « ${bName} » ajoutée avec succès au réseau.`);
    }

    // Ensure at least one main branch
    if (!updatedBranches.some(b => b.isMainBranch) && updatedBranches.length > 0) {
      updatedBranches[0].isMainBranch = true;
    }

    setBranches(updatedBranches);
    onUpdateBusiness({ branches: updatedBranches }).catch(() => {});
    setIsBranchModalOpen(false);

    // Call authenticated server API for branch sync
    const branchPayload = {
      name: bName,
      code: bCode,
      isMainBranch: bIsMain,
      status: bStatus,
      gpsPrecision: bGpsPrecision,
      location: {
        province: provName,
        provinceCode: bProvinceCode,
        city: bCity,
        district: bDistrict,
        address: bAddress,
        coordinates: { lat: bLat, lng: bLng }
      },
      contact: { phone: bPhone, phoneSecondary: bPhoneSecondary, email: bEmail, whatsapp: bWhatsapp },
      openingHours: bHours,
      managerName: bManagerName,
      notes: bNotes
    };

    if (editingBranchId) {
      fetch(`/api/businesses/${ownedBusiness.id}/branches/${editingBranchId}`, {
        method: 'PUT',
        headers: buildAuthHeaders(),
        body: JSON.stringify(branchPayload)
      }).catch(() => {});
    } else {
      fetch(`/api/businesses/${ownedBusiness.id}/branches`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(branchPayload)
      })
        .then(r => (r.ok ? r.json() : null))
        .then(savedBranch => {
          if (savedBranch && savedBranch.id) {
            setBranches(prev => {
              const synced = prev.map(b => (b.name === bName && b.id.startsWith('branch-') ? savedBranch : b));
              onUpdateBusiness({ branches: synced }).catch(() => {});
              return synced;
            });
          }
        })
        .catch(() => {});
    }
  };

  const handleToggleBranchStatus = (branchId: string) => {
    const target = branches.find(b => b.id === branchId);
    const nextStatus: BranchStatus = target?.status === 'open' ? 'temporarily_closed' : 'open';
    const updated = branches.map(b => (b.id !== branchId ? b : { ...b, status: nextStatus }));
    setBranches(updated);
    onUpdateBusiness({ branches: updated }).catch(() => {});
    fetch(`/api/businesses/${ownedBusiness.id}/branches/${branchId}`, {
      method: 'PUT',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ status: nextStatus })
    }).catch(() => {});
    showToast('Statut de l’agence mis à jour.');
  };

  const handleSetMainBranch = (branchId: string) => {
    const updated = branches.map(b => ({
      ...b,
      isMainBranch: b.id === branchId
    }));
    setBranches(updated);
    onUpdateBusiness({ branches: updated }).catch(() => {});
    fetch(`/api/businesses/${ownedBusiness.id}/branches/${branchId}`, {
      method: 'PUT',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ isMainBranch: true })
    }).catch(() => {});
    showToast('Cette agence a été désignée comme Siège / Agence Principale.');
  };

  const handleDeleteBranch = (branchId: string, branchName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'agence « ${branchName} » ? Cette action est irréversible.`)) {
      return;
    }
    const updated = branches.filter(b => b.id !== branchId);
    if (updated.length > 0 && !updated.some(b => b.isMainBranch)) {
      updated[0].isMainBranch = true;
    }
    setBranches(updated);
    onUpdateBusiness({ branches: updated }).catch(() => {});
    showToast(`Agence « ${branchName} » supprimée.`);

    fetch(`/api/businesses/${ownedBusiness.id}/branches/${branchId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders()
    }).catch(() => {});
  };

  // Branch Modal Leaflet Map initialization
  useEffect(() => {
    if (!isBranchModalOpen) return;
    if (!branchModalMapRef.current) return;

    if (branchModalMapInstance.current) {
      branchModalMapInstance.current.remove();
      branchModalMapInstance.current = null;
    }

    const map = L.map(branchModalMapRef.current, {
      center: [bLat, bLng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'branch-pin-marker',
      html: `
        <div style="position: relative; width: 36px; height: 42px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 36 42" width="36" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#1e293b"/>
            <circle cx="18" cy="16" r="9" fill="white"/>
            <circle cx="18" cy="16" r="5" fill="#0284c7"/>
          </svg>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42]
    });

    const marker = L.marker([bLat, bLng], { icon: pinIcon, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const nLat = Math.round(pos.lat * 1000000) / 1000000;
      const nLng = Math.round(pos.lng * 1000000) / 1000000;
      setBLat(nLat);
      setBLng(nLng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      const nLat = Math.round(e.latlng.lat * 1000000) / 1000000;
      const nLng = Math.round(e.latlng.lng * 1000000) / 1000000;
      setBLat(nLat);
      setBLng(nLng);
    });

    branchModalMarkerRef.current = marker;
    branchModalMapInstance.current = map;

    return () => {
      map.remove();
      branchModalMapInstance.current = null;
    };
  }, [isBranchModalOpen]);

  // Branch Overview Map (All branches across Gabon)
  useEffect(() => {
    if (activeTab !== 'branches') return;
    if (!branchesOverviewMapRef.current) return;

    if (branchesOverviewMapInstance.current) {
      branchesOverviewMapInstance.current.remove();
      branchesOverviewMapInstance.current = null;
    }

    if (branches.length === 0) return;

    const lats = branches.map(b => b.location.coordinates.lat);
    const lngs = branches.map(b => b.location.coordinates.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const map = L.map(branchesOverviewMapRef.current, {
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    branches.forEach(br => {
      const isMain = br.isMainBranch;
      const branchIcon = L.divIcon({
        className: 'branch-pin-overview',
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
        iconAnchor: [17, 40]
      });

      const marker = L.marker([br.location.coordinates.lat, br.location.coordinates.lng], { icon: branchIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 2px;">
          <strong style="color: ${isMain ? '#009e60' : '#0284c7'}; font-size: 11px;">${isMain ? '★ Siège / Agence Principale' : 'Agence locale'}</strong>
          <h5 style="margin: 2px 0; font-size: 13px;">${br.name}</h5>
          <p style="margin: 0; font-size: 11px; color: #475569;">📍 ${br.location.address}, ${br.location.city}</p>
        </div>
      `);
    });

    if (branches.length === 1) {
      map.setView([branches[0].location.coordinates.lat, branches[0].location.coordinates.lng], 13);
    } else {
      map.fitBounds([
        [minLat - 0.05, minLng - 0.05],
        [maxLat + 0.05, maxLng + 0.05]
      ], { padding: [30, 30] });
    }

    branchesOverviewMapInstance.current = map;

    return () => {
      map.remove();
      branchesOverviewMapInstance.current = null;
    };
  }, [activeTab, branches]);

  const handleDetectGPSBranch = () => {
    if (!navigator.geolocation) return;
    setBIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBIsLocating(false);
        const newLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const newLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setBLat(newLat);
        setBLng(newLng);
        setBGpsPrecision('exact');
        if (branchModalMapInstance.current && branchModalMarkerRef.current) {
          branchModalMapInstance.current.flyTo([newLat, newLng], 16);
          branchModalMarkerRef.current.setLatLng([newLat, newLng]);
        }
        showToast('Position GPS exacte de l’agence détectée.');
      },
      () => setBIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // --- 4. OPENING HOURS STATE ---
  const [openingHours, setOpeningHours] = useState<Record<string, string>>({
    'Lundi - Vendredi': ownedBusiness.details.openingHours['Lundi - Vendredi'] || '08:00 - 18:00',
    'Samedi': ownedBusiness.details.openingHours['Samedi'] || '08:30 - 13:00',
    'Dimanche': ownedBusiness.details.openingHours['Dimanche'] || 'Fermé'
  });

  const handleApplyPresetHours = (preset: 'standard' | 'retail' | '24h') => {
    if (preset === 'standard') {
      setOpeningHours({
        'Lundi - Vendredi': '08:00 - 17:30',
        'Samedi': '08:30 - 12:30',
        'Dimanche': 'Fermé'
      });
    } else if (preset === 'retail') {
      setOpeningHours({
        'Lundi - Samedi': '08:30 - 19:30',
        'Dimanche': '09:00 - 13:00'
      });
    } else if (preset === '24h') {
      setOpeningHours({
        'Lundi - Dimanche': '24h/24'
      });
    }
  };

  const handleSaveHours = async () => {
    try {
      await onUpdateBusiness({
        details: {
          ...ownedBusiness.details,
          openingHours
        }
      });
      showToast('Horaires d’ouverture mis à jour et enregistrés.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de l’enregistrement des horaires.');
    }
  };

  // --- 5. SERVICES & PAYMENTS STATE ---
  const [servicesList, setServicesList] = useState<string[]>([...ownedBusiness.details.services]);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([...ownedBusiness.details.paymentMethods]);
  const [facilities, setFacilities] = useState<string[]>([...(ownedBusiness.details.facilities || [])]);

  const handleAddService = () => {
    if (!newServiceInput.trim()) return;
    setServicesList(prev => [...prev, newServiceInput.trim()]);
    setNewServiceInput('');
  };

  const handleRemoveService = (idx: number) => {
    setServicesList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTogglePayment = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleToggleFacility = (fac: string) => {
    setFacilities(prev =>
      prev.includes(fac) ? prev.filter(f => f !== fac) : [...prev, fac]
    );
  };

  const handleSaveServices = async () => {
    try {
      await onUpdateBusiness({
        details: {
          ...ownedBusiness.details,
          services: servicesList,
          paymentMethods,
          facilities
        }
      });
      showToast('Services, moyens de paiement et commodités enregistrés.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de l’enregistrement des services.');
    }
  };

  // --- 6. REVIEWS MANAGEMENT ---
  const businessReviews = reviews.filter(r => r.businessId === ownedBusiness.id);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  const handleSendReply = (reviewId: string) => {
    const text = replyTextMap[reviewId];
    if (!text?.trim()) return;
    onReplyReview(reviewId, text.trim());
    setReplyTextMap(prev => ({ ...prev, [reviewId]: '' }));
    showToast('Réponse officielle enregistrée et visible sur votre fiche.');
  };

  // --- 7. PROMOTIONS PUBLICATION ---
  const businessPromos = promotions.filter(p => p.businessId === ownedBusiness.id);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoBadge, setPromoBadge] = useState('-20%');
  const [promoDate, setPromoDate] = useState('2026-12-31');

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoDesc.trim()) return;

    onAddPromotion({
      businessId: ownedBusiness.id,
      businessName: ownedBusiness.name,
      title: promoTitle,
      description: promoDesc,
      discountBadge: promoBadge,
      validUntil: promoDate,
      category: ownedBusiness.category,
      city: ownedBusiness.location.city,
      contactPhone: ownedBusiness.contact.phone,
      image: coverImage
    });

    setPromoTitle('');
    setPromoDesc('');
    showToast('Offre promotionnelle publiée avec succès !');
  };

  const openStatus = isBusinessOpenNow(openingHours);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500/40 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorToastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-rose-950 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-rose-500/50 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorToastMessage}</span>
        </div>
      )}

      {/* Admin Delegation Banner */}
      {isAdminMode && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 text-white rounded-3xl p-5 shadow-2xl border-2 border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-600/30 border border-rose-500/50 text-rose-300 shrink-0">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                  Super Administrateur
                </span>
                <span className="text-[11px] font-semibold text-rose-200">
                  Mode Gestion Déléguée
                </span>
                {adminName && (
                  <span className="text-[10px] text-amber-300 font-mono">
                    ({adminName})
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Gestion complète de la fiche : <span className="text-amber-300 underline underline-offset-2">{ownedBusiness.name}</span>
              </h2>
              <p className="text-xs text-rose-200/90 mt-0.5 max-w-2xl">
                Vous avez les pleins pouvoirs administrateur pour modifier les informations, ajouter/éditer les agences secondaires, régler le GPS Leaflet, renouveler les images et publier des offres sans identifiants du propriétaire.
              </p>
            </div>
          </div>
          {onExitAdminMode && (
            <button
              onClick={onExitAdminMode}
              className="px-4 py-2.5 bg-white text-rose-950 hover:bg-rose-50 font-bold text-xs rounded-xl shadow-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer border border-white/60"
            >
              <span>← Retour au Tableau Administrateur</span>
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {logo && logo.trim() ? (
              <img
                src={logo}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white p-1 shadow-lg shrink-0 border border-white/40"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-lg shrink-0 border border-white/40">
                {(ownedBusiness.name || 'G').slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => {
                setActiveTab('images');
                logoInputRef.current?.click();
              }}
              className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
              title="Changer le logo"
            >
              Modifier
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">
                Espace Professionnel Autonome
              </span>
              {ownedBusiness.status === 'pending' ? (
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  En attente de validation admin
                </span>
              ) : ownedBusiness.status === 'suspended' ? (
                <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Compte Suspendu
                </span>
              ) : ownedBusiness.status === 'unverified' ? (
                <span className="text-[11px] font-bold text-slate-300 bg-slate-700/60 border border-slate-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                  Non Vérifié
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Entreprise Certifiée
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {ownedBusiness.name}
            </h1>
            <p className="text-xs text-slate-300">
              📍 {ownedBusiness.location.district ? ownedBusiness.location.district + ', ' : ''}
              {ownedBusiness.location.city} ({ownedBusiness.location.province}) • NIF : {ownedBusiness.nif || 'Enregistré'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onSelectBusiness(ownedBusiness)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aperçu Fiche Publique</span>
          </button>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {ownedBusiness.status === 'pending' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-amber-900">
              Fiche entreprise en cours de validation par les administrateurs
            </h3>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              Votre établissement a bien été enregistré sur Gabon Business Map. Il sera visible par le grand public sur la carte et le catalogue dès sa validation par l'équipe administrative. En attendant, vous pouvez compléter vos photos, vos agences secondaires, vos horaires et vos coordonnées.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none shadow-2xs">
        {[
          { id: 'stats', label: 'Statistiques & Performance', icon: Eye },
          { id: 'images', label: 'Photos & Galerie (Priorité 1)', icon: ImageIcon, badge: galleryImages.length },
          { id: 'coords', label: 'Informations & Contacts', icon: Building },
          { id: 'location', label: 'Position GPS & Carte', icon: MapPin },
          { id: 'branches', label: 'Mes agences au Gabon', icon: Layers, badge: branches.length },
          { id: 'hours', label: 'Horaires d’Ouverture', icon: Clock },
          { id: 'services', label: 'Services & Paiements', icon: CreditCard },
          { id: 'reviews', label: 'Avis Clients & Réponses', icon: Star, badge: businessReviews.length },
          { id: 'promos', label: 'Offres Promotionnelles', icon: Tag, badge: businessPromos.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: IMAGES MANAGEMENT (PRIORITÉ 1) --- */}
      {activeTab === 'images' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Explanation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Gestionnaire des Images de l'Entreprise
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personnalisez le logo, la couverture principale et la galerie de photos visible par tous les visiteurs sur Gabon Business Map.
              </p>
            </div>

            <button
              onClick={handleSaveAllImages}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer et Publier les Images</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Logo, Cover & Gallery */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. LOGO & COVER SECTION */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Logo & Image de Couverture Principale
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Logo block */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-bold text-slate-700">Logo de l'entreprise</span>
                    {logo && logo.trim() ? (
                      <img
                        src={logo}
                        alt="Logo"
                        className="w-20 h-20 rounded-2xl object-cover bg-white border-2 border-slate-200 p-1 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center border-2 border-slate-200 shadow-sm">
                        {(ownedBusiness.name || 'G').slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Téléverser depuis l'appareil</span>
                      </button>

                      <input
                        type="text"
                        value={logo}
                        onChange={e => setLogo(e.target.value)}
                        placeholder="Ou coller une URL d'image..."
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Cover block */}
                  <div className="sm:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Couverture (Résultats de recherche & Fiche)</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Image Principale Active
                      </span>
                    </div>

                    <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-300">
                      {coverImage && coverImage.trim() ? (
                        <img
                          src={coverImage}
                          alt="Couverture"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30">
                          <Building className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Remplacer la couverture</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={coverInputRef}
                      onChange={handleCoverUpload}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Téléverser</span>
                      </button>

                      <input
                        type="text"
                        value={coverImage}
                        onChange={e => {
                          setCoverImage(e.target.value);
                          if (!galleryImages.includes(e.target.value)) {
                            setGalleryImages(prev => [e.target.value, ...prev]);
                          }
                        }}
                        placeholder="Ou URL de l'image de couverture..."
                        className="flex-1 px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. GALLERY OF PHOTOS (PRODUITS, SERVICES, LOCAUX) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      2. Galerie de Photos ({galleryImages.length} images)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ajoutez des photos de vos produits, locaux, équipes et réalisations. Choisissez l'ordre et l'image mise en avant.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={galleryInputRef}
                      onChange={handleGalleryUpload}
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Ajouter des photos</span>
                    </button>
                  </div>
                </div>

                {/* Add by URL */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Coller l'URL d'une photo de produit ou service..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={!newImageUrl.trim()}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Ajouter URL
                  </button>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {galleryImages.filter(imgUrl => Boolean(imgUrl && imgUrl.trim())).map((imgUrl, index) => {
                    const isPrimary = imgUrl === coverImage;

                    return (
                      <div
                        key={index}
                        className={`group relative rounded-xl border overflow-hidden flex flex-col justify-between bg-white shadow-2xs transition-all ${
                          isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />

                          {/* Primary Badge */}
                          {isPrimary && (
                            <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              Image Principale
                            </span>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow-sm opacity-90 transition-opacity"
                            title="Supprimer cette photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Controls Bottom Bar */}
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, 'left')}
                              disabled={index === 0}
                              className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-700"
                              title="Déplacer vers la gauche"
                            >
                              <MoveLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-400">
                              #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, 'right')}
                              disabled={index === galleryImages.length - 1}
                              className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-700"
                              title="Déplacer vers la droite"
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Set as Primary Cover */}
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(imgUrl)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              Définir principale
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right 1 Col: Live Preview on Public Card */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 sticky top-24">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    Aperçu Public en Direct
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                    Vue Visiteurs
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Voici comment votre entreprise apparaît dans l'annuaire et sur les cartes de recherche :
                </p>

                {/* Simulated Business Card */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
                  <div className="relative h-36 w-full bg-slate-800 overflow-hidden">
                    {coverImage && coverImage.trim() ? (
                      <img
                        src={coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <Building className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md">
                      {ownedBusiness.location.city}
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        {logo && logo.trim() ? (
                          <img
                            src={logo}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover bg-white p-0.5 border border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-white">
                            {(ownedBusiness.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[10px] font-bold uppercase text-amber-300">
                          {ownedBusiness.subCategory || ownedBusiness.category}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded">
                        ★ {ownedBusiness.rating}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 truncate">
                      {ownedBusiness.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      📍 {ownedBusiness.location.district ? ownedBusiness.location.district + ', ' : ''}{ownedBusiness.location.address}
                    </p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {ownedBusiness.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                      <span>✓ Images vérifiées</span>
                      <button
                        onClick={handleSaveAllImages}
                        className="text-xs text-emerald-700 underline font-bold"
                      >
                        Publier maintenant
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
                  💡 <strong>Astuce Pro :</strong> Des photos réelles et soignées de vos produits et façades augmentent les clics d'appel téléphonique et WhatsApp de plus de 45% au Gabon !
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: INFORMATIONS & CONTACTS --- */}
      {activeTab === 'coords' && (
        <form onSubmit={handleSaveCoords} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Informations Générales & Contacts Professionnels
              </h2>
              <p className="text-xs text-slate-500">
                Mettez à jour les coordonnées directes par lesquelles les clients vous joignent au Gabon.
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Enregistrer les coordonnées
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nom commercial</label>
              <input
                type="text"
                required
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Raison sociale légale</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Secteur principal</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as BusinessCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sous-catégorie</label>
              <input
                type="text"
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">NIF (Gabon)</label>
              <input
                type="text"
                value={nif}
                onChange={e => setNif(e.target.value)}
                placeholder="GA-XXXXXXX-LIB"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description détaillée</label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Contact Directs */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Moyens de Contact Directs (+241)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Appel *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Numéro WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Online & Socials */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Site Web & Réseaux Sociaux
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Site Web</label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facebook</label>
                <input
                  type="url"
                  value={facebook}
                  onChange={e => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instagram</label>
                <input
                  type="url"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn</label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* --- TAB 3: POSITION GPS & CARTE --- */}
      {activeTab === 'location' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Localisation & Positionnement GPS sur la Carte
              </h2>
              <p className="text-xs text-slate-500">
                Déplacez le repère vert sur la carte pour définir avec une précision métrique l'entrée de votre magasin ou siège au Gabon.
              </p>
            </div>

            <button
              onClick={handleSaveLocation}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Enregistrer la position GPS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Province *</label>
              <select
                value={provinceCode}
                onChange={e => {
                  const pCode = e.target.value as ProvinceCode;
                  setProvinceCode(pCode);
                  const prov = PROVINCES.find(p => p.id === pCode);
                  if (prov) {
                    setCity(prov.capital);
                    setCoordsLat(prov.coordinates.lat);
                    setCoordsLng(prov.coordinates.lng);
                    if (proMapInstanceRef.current && proMapMarkerRef.current) {
                      proMapInstanceRef.current.flyTo([prov.coordinates.lat, prov.coordinates.lng], 13);
                      proMapMarkerRef.current.setLatLng([prov.coordinates.lat, prov.coordinates.lng]);
                    }
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              >
                {PROVINCES.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.capital})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ville / Commune *</label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Arrondissement</label>
              <input
                type="text"
                value={arrondissement}
                onChange={e => setArrondissement(e.target.value)}
                placeholder="Ex : 1er, 2e, 3e..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quartier *</label>
              <input
                type="text"
                required
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="Ex : Batterie IV, Oloumi, Glass..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Adresse physique ou repères visuels</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex : Face à l'immeuble Horizon, Boulevard de l'Indépendance..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Latitude GPS</label>
                <input
                  type="number"
                  step="0.000001"
                  value={coordsLat}
                  onChange={e => handleManualCoordsChange(parseFloat(e.target.value), coordsLng)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitude GPS</label>
                <input
                  type="number"
                  step="0.000001"
                  value={coordsLng}
                  onChange={e => handleManualCoordsChange(coordsLat, parseFloat(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          {/* GPS Precision Declaration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Niveau de précision GPS déclaré pour le siège *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGpsPrecision('exact')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  gpsPrecision === 'exact'
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  {gpsPrecision === 'exact' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Position GPS exacte vérifiée
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Le marqueur est positionné à l'entrée exacte de votre bâtiment au Gabon.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGpsPrecision('approximate')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  gpsPrecision === 'approximate'
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className="w-4 h-4 rounded-full border border-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  {gpsPrecision === 'approximate' && <span className="w-2 h-2 rounded-full bg-amber-600" />}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Position approximative (à confirmer)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Position estimée dans la zone ou la ville, en attente de repérage GPS précis.
                  </span>
                </div>
              </button>
            </div>

            {gpsPrecision === 'approximate' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 mt-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Important :</strong> La plateforme affiche une mention explicite « Position approximative » aux visiteurs afin de garantir une transparence totale. Veuillez corriger la position en déplaçant le marqueur sur la carte dès que possible.
                </span>
              </div>
            )}
          </div>

          {/* Interactive Map Box */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-600" />
                Déplacez le marqueur vert sur l'entrée exacte de votre établissement
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleReverseGeocodeCurrent}
                  disabled={isReverseGeocoding}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-200 transition-colors"
                  title="Détecter l'adresse depuis les coordonnées du marqueur"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isReverseGeocoding ? 'Recherche...' : 'Détecter adresse'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Détection...' : 'Ma position GPS actuelle'}</span>
                </button>
              </div>
            </div>

            <div
              ref={proMapContainerRef}
              className="w-full h-80 rounded-2xl border border-slate-300 overflow-hidden shadow-inner z-0"
            />

            {/* Coordinates Formatting Strip & External Tools */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="font-mono">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Coordonnées GPS Actuelles :</span>
                <span className="text-slate-900 font-bold">{coordsLat.toFixed(6)}, {coordsLng.toFixed(6)}</span>
                <span className="text-slate-500 text-[11px] ml-2 font-normal">
                  ({formatGpsCoordinates(coordsLat, coordsLng).dms})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyCoordinatesToClipboard(coordsLat, coordsLng);
                    if (ok) showToast('Coordonnées GPS copiées dans le presse-papier !');
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-bold flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier GPS</span>
                </button>

                <a
                  href={getGoogleMapsSearchUrl(coordsLat, coordsLng)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-bold flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tester Google Maps</span>
                </a>
              </div>
            </div>

            {reverseGeoAddress && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2">
                <span>📍 Adresse détectée : <strong>{reverseGeoAddress}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setAddress(reverseGeoAddress);
                    showToast('Adresse appliquée au formulaire.');
                  }}
                  className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-bold"
                >
                  Appliquer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: GESTION DU RÉSEAU MULTI-AGENCES --- */}
      {activeTab === 'branches' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Système Multi-Agences
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Réseau national au Gabon
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Agences & Points de Présence ({branches.length})
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl mt-1">
                Enregistrez toutes vos succursales à travers les provinces gabonaises (Libreville, Port-Gentil, Franceville, Oyem, Moanda...). Chaque agence possède sa propre position GPS exacte, ses horaires et ses contacts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddBranch}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajouter une agence</span>
            </button>
          </div>

          {/* Quick KPI stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Agences</span>
              <span className="text-2xl font-black text-slate-900">{branches.length}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Agences Ouvertes</span>
              <span className="text-2xl font-black text-emerald-600">
                {branches.filter(b => b.status === 'open').length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Villes Couvertes</span>
              <span className="text-2xl font-black text-blue-600">
                {new Set(branches.map(b => b.location.city)).size}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Provinces</span>
              <span className="text-2xl font-black text-amber-600">
                {new Set(branches.map(b => b.location.provinceCode)).size} / 9
              </span>
            </div>
          </div>

          {/* Unified Map of All Branches Across Gabon */}
          {branches.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  Aperçu cartographique national de votre réseau d'agences
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {branches.length} point{branches.length > 1 ? 's' : ''} d'implantation
                </span>
              </div>

              <div
                ref={branchesOverviewMapRef}
                className="w-full h-72 sm:h-80 rounded-xl border border-slate-300 overflow-hidden shadow-inner z-0"
              />
            </div>
          )}

          {/* List of Branches */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Liste détaillée des agences enregistrées</span>
              <span className="text-xs font-normal text-slate-500">({branches.length})</span>
            </h3>

            {branches.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800">Aucune agence secondaire configurée</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Votre entreprise ne dispose actuellement que de sa fiche principale. Ajoutez vos agences de Franceville, Port-Gentil, Oyem ou d'autres quartiers pour permettre aux clients locaux de vous trouver facilement.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddBranch}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  Ajouter ma première agence
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map(br => {
                  const gpsFmt = formatGpsCoordinates(br.location.coordinates.lat, br.location.coordinates.lng);
                  const isMain = br.isMainBranch;

                  return (
                    <div
                      key={br.id}
                      className={`bg-white rounded-2xl p-5 border transition-all space-y-3 shadow-2xs ${
                        isMain
                          ? 'border-emerald-300 ring-1 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {isMain && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                ★ Siège / Agence Principale
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleBranchStatus(br.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                br.status === 'open'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Cliquer pour changer le statut d'activité"
                            >
                              {br.status === 'open' ? '● En activité' : '○ Fermée temporairement'}
                            </button>
                            {br.code && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                {br.code}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {br.name}
                          </h4>
                        </div>

                        {/* GPS Precision Badge */}
                        {br.gpsPrecision === 'exact' ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                            GPS Exact
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            GPS Approx
                          </span>
                        )}
                      </div>

                      {/* Location Information */}
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {br.location.district ? <strong>{br.location.district}, </strong> : ''}
                          {br.location.address} — <strong className="text-slate-800">{br.location.city}</strong> ({br.location.province})
                        </span>
                      </p>

                      {/* Contacts & GPS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Téléphone direct</span>
                          <span className="font-bold text-slate-800">{formatGabonPhone(br.contact.phone)}</span>
                        </div>
                        {br.managerName && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsable</span>
                            <span className="font-bold text-slate-800">{br.managerName}</span>
                          </div>
                        )}
                      </div>

                      {/* GPS display */}
                      <div className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 flex items-center justify-between">
                        <span>GPS: {gpsFmt.decimal}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copyCoordinatesToClipboard(br.location.coordinates.lat, br.location.coordinates.lng);
                              if (ok) showToast('Coordonnées de l’agence copiées !');
                            }}
                            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </button>
                          <a
                            href={getGoogleMapsSearchUrl(br.location.coordinates.lat, br.location.coordinates.lng)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Tester GMaps</span>
                          </a>
                        </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditBranch(br)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>

                          {!isMain && (
                            <button
                              type="button"
                              onClick={() => handleSetMainBranch(br.id)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                              title="Définir comme agence principale"
                            >
                              Définir principale
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(br.id, br.name)}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Supprimer cette agence"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BRANCH EDIT / ADD MODAL */}
          {isBranchModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingBranchId ? 'Modifier l’agence' : 'Ajouter une agence au réseau'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Renseignez les coordonnées géographiques et les détails de cette succursale au Gabon.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBranchModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveBranchForm} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom de l’agence *</label>
                      <input
                        type="text"
                        required
                        value={bName}
                        onChange={e => setBName(e.target.value)}
                        placeholder="Ex : Agence Franceville Poto-Poto"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Code / Référence interne</label>
                      <input
                        type="text"
                        value={bCode}
                        onChange={e => setBCode(e.target.value)}
                        placeholder="Ex : LIB-HO-02"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* Main Branch & Status Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={bIsMain}
                        onChange={e => setBIsMain(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Siège ou Agence Principale</span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Statut d’activité</label>
                      <select
                        value={bStatus}
                        onChange={e => setBStatus(e.target.value as BranchStatus)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
                      >
                        <option value="open">Ouverte / En activité</option>
                        <option value="temporarily_closed">Fermée temporairement</option>
                        <option value="permanently_closed">Fermée définitivement</option>
                      </select>
                    </div>
                  </div>

                  {/* Geographical Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Province *</label>
                      <select
                        value={bProvinceCode}
                        onChange={e => {
                          const pCode = e.target.value as ProvinceCode;
                          setBProvinceCode(pCode);
                          const prov = PROVINCES.find(p => p.id === pCode);
                          if (prov) {
                            setBCity(prov.capital);
                            setBLat(prov.coordinates.lat);
                            setBLng(prov.coordinates.lng);
                            if (branchModalMapInstance.current && branchModalMarkerRef.current) {
                              branchModalMapInstance.current.flyTo([prov.coordinates.lat, prov.coordinates.lng], 13);
                              branchModalMarkerRef.current.setLatLng([prov.coordinates.lat, prov.coordinates.lng]);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                      >
                        {PROVINCES.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ville / Commune *</label>
                      <input
                        type="text"
                        required
                        value={bCity}
                        onChange={e => setBCity(e.target.value)}
                        placeholder="Ex : Franceville"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Quartier</label>
                      <input
                        type="text"
                        value={bDistrict}
                        onChange={e => setBDistrict(e.target.value)}
                        placeholder="Ex : Poto-Poto"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Adresse précise & repères visuels *</label>
                    <input
                      type="text"
                      required
                      value={bAddress}
                      onChange={e => setBAddress(e.target.value)}
                      placeholder="Ex : Avenue de l'Indépendance, face à la pharmacie"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  {/* GPS Precision Choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Niveau de précision GPS de l'agence *</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setBGpsPrecision('exact')}
                        className={`p-2.5 rounded-lg border text-left font-bold transition-all ${
                          bGpsPrecision === 'exact'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        ✓ GPS exact vérifié
                      </button>
                      <button
                        type="button"
                        onClick={() => setBGpsPrecision('approximate')}
                        className={`p-2.5 rounded-lg border text-left font-bold transition-all ${
                          bGpsPrecision === 'approximate'
                            ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        ⚠️ Position approximative
                      </button>
                    </div>
                  </div>

                  {/* Interactive Pin Placement Map */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Déplacez le marqueur sur le toit du bâtiment de l'agence
                      </span>
                      <button
                        type="button"
                        onClick={handleDetectGPSBranch}
                        disabled={bIsLocating}
                        className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-blue-100"
                      >
                        <Crosshair className={`w-3 h-3 ${bIsLocating ? 'animate-spin' : ''}`} />
                        <span>{bIsLocating ? 'Détection...' : 'GPS appareil'}</span>
                      </button>
                    </div>

                    <div
                      ref={branchModalMapRef}
                      className="w-full h-56 rounded-xl border border-slate-300 overflow-hidden z-0"
                    />

                    <div className="flex items-center justify-between text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span>Lat: {bLat.toFixed(6)} | Lng: {bLng.toFixed(6)}</span>
                      <a
                        href={getGoogleMapsSearchUrl(bLat, bLng)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Tester Google Maps</span>
                      </a>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone direct de l'agence *</label>
                      <input
                        type="text"
                        required
                        value={bPhone}
                        onChange={e => setBPhone(e.target.value)}
                        placeholder="Ex : +241 11 67 20 40"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp de l'agence</label>
                      <input
                        type="text"
                        value={bWhatsapp}
                        onChange={e => setBWhatsapp(e.target.value)}
                        placeholder="Ex : +241 66 12 40 50"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email de l'agence</label>
                      <input
                        type="email"
                        value={bEmail}
                        onChange={e => setBEmail(e.target.value)}
                        placeholder="agence.franceville@entreprise.ga"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom du responsable</label>
                      <input
                        type="text"
                        value={bManagerName}
                        onChange={e => setBManagerName(e.target.value)}
                        placeholder="Ex : Mme Sylvie Ondounet"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Opening Hours */}
                  <div>
                    <span className="block text-xs font-bold text-slate-700 mb-2">Horaires d'ouverture de cette agence</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {Object.entries(bHours).map(([days, hours]) => (
                        <div key={days} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-800 block mb-1">{days}</span>
                          <input
                            type="text"
                            value={hours}
                            onChange={e => setBHours({ ...bHours, [days]: e.target.value })}
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                      type="button"
                      onClick={() => setIsBranchModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      {editingBranchId ? 'Enregistrer les modifications' : 'Ajouter l’agence'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: HORAIRES D'OUVERTURE --- */}
      {activeTab === 'hours' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in duration-200 max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Horaires d'Ouverture Hebdomadaires
              </h2>
              <p className="text-xs text-slate-500">
                Indiquez clairement vos plages d'accueil pour que les visiteurs sachent si vous êtes ouvert actuellement.
              </p>
            </div>

            <button
              onClick={handleSaveHours}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Enregistrer les horaires
            </button>
          </div>

          {/* Current Live Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Statut en direct selon l'heure du Gabon (UTC+1) :</span>
            <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
              openStatus.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${openStatus.isOpen ? 'bg-emerald-600' : 'bg-rose-600'}`} />
              {openStatus.statusText}
            </span>
          </div>

          {/* Presets */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Préréglages rapides :
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPresetHours('standard')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Bureaux standard (08h00 - 17h30)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetHours('retail')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Commerce & Magasin (08h30 - 19h30)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetHours('24h')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Continu 24h/24 (Hôtels, Urgences)
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            {Object.entries(openingHours).map(([dayKey, hoursStr]) => (
              <div key={dayKey} className="grid grid-cols-3 items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-xs text-slate-800">{dayKey}</span>
                <input
                  type="text"
                  value={hoursStr}
                  onChange={e => setOpeningHours({ ...openingHours, [dayKey]: e.target.value })}
                  placeholder="Ex : 08:00 - 18:00 ou Fermé"
                  className="col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 5: SERVICES & PAIEMENTS --- */}
      {activeTab === 'services' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Prestations, Moyens de Paiement & Commodités
              </h2>
              <p className="text-xs text-slate-500">
                Renseignez tous les atouts de votre établissement pour faciliter la venue de vos clients.
              </p>
            </div>

            <button
              onClick={handleSaveServices}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Enregistrer les prestations
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Services List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Prestations & Services proposés
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newServiceInput}
                  onChange={e => setNewServiceInput(e.target.value)}
                  placeholder="Ex : Livraison à domicile, Vente au détail..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg"
                >
                  Ajouter
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {servicesList.map((srv, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{srv}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments & Amenities */}
            <div className="space-y-5">
              {/* Payments */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Moyens de paiement acceptés
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Airtel Money',
                    'Moov Money',
                    'Espèces',
                    'Carte bancaire (Visa/Mastercard)',
                    'Virement bancaire',
                    'Chèque certifié'
                  ].map(method => {
                    const checked = paymentMethods.includes(method);
                    return (
                      <button
                        type="button"
                        key={method}
                        onClick={() => handleTogglePayment(method)}
                        className={`p-2.5 rounded-xl border text-left font-bold flex items-center justify-between transition-colors ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{method}</span>
                        {checked && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Équipements & Commodités
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Climatisation',
                    'Wi-Fi gratuit',
                    'Parking gardé',
                    'Accessible PMR',
                    'Terrasse extérieure',
                    'Service VIP'
                  ].map(fac => {
                    const checked = facilities.includes(fac);
                    return (
                      <button
                        type="button"
                        key={fac}
                        onClick={() => handleToggleFacility(fac)}
                        className={`p-2 rounded-xl border text-left font-semibold flex items-center justify-between transition-colors ${
                          checked
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{fac}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: STATISTIQUES & PERFORMANCE --- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Funnel KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vues Totales</span>
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{ownedBusiness.stats.views.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-600 font-bold">+18% ce mois</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clics Téléphone</span>
                <Phone className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{ownedBusiness.stats.phoneClicks.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Taux d'appel direct</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clics WhatsApp</span>
                <MessageSquare className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-black text-green-600">{ownedBusiness.stats.whatsappClicks.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Conversations engagées</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demandes Itinéraire</span>
                <Navigation className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black text-sky-600">{ownedBusiness.stats.routeClicks.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Visiteurs en magasin</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mis en Favoris</span>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-600">{ownedBusiness.stats.favorites.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Clients fidélisés</span>
            </div>
          </div>

          {/* Action Conversion Funnel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Entonnoir de Conversion des Visiteurs
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">1. Consultations de la fiche</span>
                  <span className="font-bold text-slate-900">{ownedBusiness.stats.views} vues</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">2. Prises de contact directes (Appel + WhatsApp)</span>
                  <span className="font-bold text-emerald-700">
                    {ownedBusiness.stats.phoneClicks + ownedBusiness.stats.whatsappClicks} contacts ({Math.round(((ownedBusiness.stats.phoneClicks + ownedBusiness.stats.whatsappClicks) / (ownedBusiness.stats.views || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, Math.round(((ownedBusiness.stats.phoneClicks + ownedBusiness.stats.whatsappClicks) / (ownedBusiness.stats.views || 1)) * 100))}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">3. Guidages GPS & Déplacements vers l'entreprise</span>
                  <span className="font-bold text-sky-700">
                    {ownedBusiness.stats.routeClicks} itinéraires ({Math.round((ownedBusiness.stats.routeClicks / (ownedBusiness.stats.views || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 rounded-full" 
                    style={{ width: `${Math.min(100, Math.round((ownedBusiness.stats.routeClicks / (ownedBusiness.stats.views || 1)) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 7: AVIS CLIENTS & RÉPONSES --- */}
      {activeTab === 'reviews' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Avis Clients ({businessReviews.length}) & Réponses Officielles
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Répondez à vos clients pour soigner la réputation de votre établissement et rassurer les nouveaux prospects au Gabon.
            </p>

            {businessReviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 text-center bg-slate-50 rounded-xl">
                Aucun avis pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {businessReviews.map(r => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{r.authorName}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({r.authorCity || 'Gabon'}) • {new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{r.rating} / 5</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">"{r.comment}"</p>

                    {/* Official Response */}
                    {r.businessResponse ? (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                        <div className="font-bold text-emerald-900 mb-0.5">Votre réponse enregistrée :</div>
                        <p className="text-slate-700 italic">"{r.businessResponse.comment}"</p>
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyTextMap[r.id] || ''}
                          onChange={e => setReplyTextMap({ ...replyTextMap, [r.id]: e.target.value })}
                          placeholder="Rédiger une réponse officielle bienveillante..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Répondre</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 8: PROMOTIONS & OFFRES --- */}
      {activeTab === 'promos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <form onSubmit={handleCreatePromo} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              Créer une offre promotionnelle ou une actualité
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la promotion *</label>
              <input
                type="text"
                required
                value={promoTitle}
                onChange={e => setPromoTitle(e.target.value)}
                placeholder="Ex : -25% sur les séjours week-end, Pack Rentrée..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Badge de réduction</label>
                <input
                  type="text"
                  value={promoBadge}
                  onChange={e => setPromoBadge(e.target.value)}
                  placeholder="Ex : -20%, Offert, Pack Pro"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date d'expiration</label>
                <input
                  type="date"
                  value={promoDate}
                  onChange={e => setPromoDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Détails de l'offre *</label>
              <textarea
                required
                rows={3}
                value={promoDesc}
                onChange={e => setPromoDesc(e.target.value)}
                placeholder="Conditions, avantages et modalités pour en profiter..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publier la promotion</span>
            </button>
          </form>

          {/* Active Promos List */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Vos promotions actives ({businessPromos.length})</h3>
            {businessPromos.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 bg-slate-50 rounded-2xl text-center">
                Aucune promotion en cours.
              </p>
            ) : (
              businessPromos.map(pr => (
                <div key={pr.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{pr.title}</span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {pr.discountBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{pr.description}</p>
                  <span className="text-[10px] text-slate-400 block">
                    Valable jusqu'au {new Date(pr.validUntil).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
