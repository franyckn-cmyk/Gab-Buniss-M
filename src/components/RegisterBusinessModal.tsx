import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import {
  X,
  Building,
  Crosshair,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Upload,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Lock,
  Loader2
} from 'lucide-react';
import {
  BusinessCategory,
  ProvinceCode,
  Business,
  GpsPrecision,
  UserAccount
} from '../types';
import { PROVINCES, CATEGORIES } from '../data/gabonData';
import { uploadOrProcessImage } from '../utils/imageUpload';
import { GpsLocationPicker } from './GpsLocationPicker';

interface RegisterBusinessModalProps {
  onClose: () => void;
  onBusinessAdded: (newBusiness: Partial<Business>) => Promise<Business>;
  currentUser?: UserAccount;
  authToken?: string | null;
  onRequestAuth?: () => void;
}

const FACILITY_OPTIONS = [
  'Climatisation',
  'Accessible PMR',
  'Parking client',
  'Wi-Fi gratuit',
  'Groupe électrogène',
  'Sécurité 24h/24'
];

export const RegisterBusinessModal: React.FC<RegisterBusinessModalProps> = ({
  onClose,
  onBusinessAdded,
  currentUser,
  authToken,
  onRequestAuth
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const isAuthenticated = Boolean(
    authToken && currentUser && currentUser.id && currentUser.id !== 'usr-guest'
  );

  // Form State — Identité & Médias
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('commerce_distribution');
  const [subCategory, setSubCategory] = useState('');
  const [creationYear, setCreationYear] = useState('');
  const [nif, setNif] = useState('');
  const [description, setDescription] = useState('');

  // Médias (bucket business-media)
  const [logo, setLogo] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Location State
  const [selectedProvince, setSelectedProvince] = useState<ProvinceCode>('estuaire');
  const [city, setCity] = useState('Libreville');
  const [arrondissement, setArrondissement] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [gpsPrecision, setGpsPrecision] = useState<GpsPrecision>('exact');
  const [lat, setLat] = useState<number>(0.3901);
  const [lng, setLng] = useState<number>(9.4536);

  // Contacts & Détails
  const [phone, setPhone] = useState('+241 ');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [whatsapp, setWhatsapp] = useState('+241 ');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [openingHoursStr, setOpeningHoursStr] = useState('08:00 - 18:00');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'Airtel Money',
    'Moov Money',
    'Espèces'
  ]);
  const [facilities, setFacilities] = useState<string[]>([
    'Climatisation',
    'Parking client'
  ]);
  const [servicesStr, setServicesStr] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);

  // Keep default email synced when user logs in
  useEffect(() => {
    if (currentUser?.email && !email) {
      setEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  // Media upload handlers -> bucket Supabase Storage 'business-media'
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setMediaError(null);
      setUploadingMedia(true);
      const url = await uploadOrProcessImage(file, 'new', 'logo', 400, 400, authToken);
      setLogo(url);
    } catch (err: any) {
      setMediaError(err?.message || 'Erreur lors du téléversement du logo.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setMediaError(null);
      setUploadingMedia(true);
      const url = await uploadOrProcessImage(file, 'new', 'cover', 1400, 800, authToken);
      setCoverImage(url);
      setGalleryImages(prev => (prev.includes(url) ? prev : [url, ...prev]));
    } catch (err: any) {
      setMediaError(err?.message || 'Erreur lors du téléversement de la couverture.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = '';
    try {
      setMediaError(null);
      setUploadingMedia(true);
      const uploadedUrls: string[] = [];
      for (const f of fileList) {
        const url = await uploadOrProcessImage(f, 'new', 'gallery', 1200, 800, authToken);
        uploadedUrls.push(url);
      }
      setGalleryImages(prev => [...prev, ...uploadedUrls]);
      if (!coverImage && uploadedUrls.length > 0) {
        setCoverImage(uploadedUrls[0]);
      }
    } catch (err: any) {
      setMediaError(err?.message || 'Erreur lors du téléversement des photos.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemoveGalleryImage = (idx: number) => {
    const target = galleryImages[idx];
    const next = galleryImages.filter((_, i) => i !== idx);
    setGalleryImages(next);
    if (coverImage === target) {
      setCoverImage(next[0] || '');
    }
  };

  // When province changes, update default coordinates and default city
  const handleProvinceChange = (provCode: ProvinceCode) => {
    setSelectedProvince(provCode);
    const prov = PROVINCES.find(p => p.id === provCode);
    if (prov) {
      setCity(prov.capital);
      setLat(prov.coordinates.lat);
      setLng(prov.coordinates.lng);
    }
  };

  const handleTogglePayment = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleToggleFacility = (facility: string) => {
    setFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingMedia || isSubmitting) return;

    const currentProvinceObj = PROVINCES.find(p => p.id === selectedProvince);
    const servicesList = servicesStr
      ? servicesStr.split(',').map(s => s.trim()).filter(Boolean)
      : ['Accueil et conseil client', 'Vente directe', 'Prestations sur mesure'];

    const trimmedCover = coverImage.trim();
    const trimmedLogo = logo.trim();
    const effectiveGallery =
      galleryImages.length > 0
        ? galleryImages
        : trimmedCover
        ? [trimmedCover]
        : [];

    const newBiz: Partial<Business> = {
      name: name.trim(),
      legalName: legalName.trim() || name.trim(),
      category,
      subCategory: subCategory.trim() || 'Services généraux',
      creationYear: creationYear ? parseInt(creationYear, 10) : new Date().getFullYear(),
      nif: nif.trim() || undefined,
      description:
        description.trim() ||
        `Entreprise gabonaise spécialisée dans le secteur ${category}.`,
      coverImage: trimmedCover,
      logo: trimmedLogo,
      images: effectiveGallery,
      gpsPrecision,
      location: {
        province: currentProvinceObj ? currentProvinceObj.name : 'Estuaire',
        provinceCode: selectedProvince,
        city: city.trim() || 'Libreville',
        arrondissement: arrondissement.trim() || undefined,
        district: district.trim() || 'Centre-ville',
        address:
          address.trim() ||
          `${district.trim() ? district.trim() + ', ' : ''}${city.trim()}`,
        coordinates: {
          lat: Math.round(Number(lat) * 1000000) / 1000000,
          lng: Math.round(Number(lng) * 1000000) / 1000000
        }
      },
      ...({
        lat: Math.round(Number(lat) * 1000000) / 1000000,
        lng: Math.round(Number(lng) * 1000000) / 1000000
      } as any),
      contact: {
        phone: phone.trim(),
        phoneSecondary: phoneSecondary.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || currentUser?.email || 'contact@gabonbusiness.ga',
        website: website.trim() || undefined,
        facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined
      },
      details: {
        openingHours: {
          'Lundi - Vendredi': openingHoursStr || '08:00 - 18:00',
          Samedi: '08:30 - 13:00'
        },
        paymentMethods,
        services: servicesList,
        facilities
      }
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const created = await onBusinessAdded(newBiz);
      setCreatedBusiness(created);
      setIsSubmitted(true);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore confetti error
      }
      setTimeout(() => {
        onClose();
      }, 2600);
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          "Impossible d'enregistrer l'entreprise sur le serveur. Vérifiez votre connexion et vos champs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                Référencer une entreprise au Gabon
              </h2>
              <p className="text-xs text-slate-500">
                Enregistrement sécurisé dans PostgreSQL avec stockage des médias sur business-media
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step Navigation Tracker */}
        {isAuthenticated && !isSubmitted && (
          <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
            <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-emerald-700' : ''}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'
                }`}
              >
                1
              </span>
              <span>Identité & Médias</span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-emerald-700' : ''}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'
                }`}
              >
                2
              </span>
              <span>Position GPS & Carte</span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-emerald-700' : ''}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200'
                }`}
              >
                3
              </span>
              <span>Contacts & Horaires</span>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!isAuthenticated ? (
            <div className="py-10 px-4 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Connexion requise pour créer une fiche entreprise
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pour protéger l'annuaire national et associer votre entreprise ainsi que ses images (bucket{' '}
                <code className="font-mono text-emerald-700">business-media</code>) à votre compte propriétaire,
                veuillez d'abord vous connecter ou créer un compte gratuit.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onRequestAuth) {
                      onRequestAuth();
                    } else {
                      onClose();
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Se connecter ou créer un compte
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : isSubmitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {createdBusiness?.status === 'verified'
                  ? 'Entreprise enregistrée et publiée !'
                  : 'Demande transmise avec succès !'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                <span className="font-bold text-slate-900">
                  {createdBusiness?.name || name}
                </span>{' '}
                {createdBusiness?.status === 'verified'
                  ? 'a été enregistrée dans Supabase et publiée immédiatement sur l’annuaire national.'
                  : 'a été enregistrée dans Supabase avec ses coordonnées GPS et ses médias. Elle est en attente de validation par un administrateur avant publication sur l’annuaire public.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleFinalSubmit}>
              {/* STEP 1: IDENTITÉ & MÉDIAS */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom commercial de l'entreprise *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex : Supermarché Mbolo, Garage du Littoral..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Raison sociale officielle (si différente)
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={e => setLegalName(e.target.value)}
                        placeholder="Ex : Mbolo Distribution S.A."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Secteur d'activité principal *
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as BusinessCategory)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sous-catégorie ou Spécialité
                      </label>
                      <input
                        type="text"
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        placeholder="Ex : Grande distribution, Clinique dentaire, Audit..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro d'Identification Fiscale (NIF Gabon)
                      </label>
                      <input
                        type="text"
                        value={nif}
                        onChange={e => setNif(e.target.value)}
                        placeholder="Ex : GA-1234567-LIB"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Année de création
                      </label>
                      <input
                        type="number"
                        min="1950"
                        max="2026"
                        value={creationYear}
                        onChange={e => setCreationYear(e.target.value)}
                        placeholder="Ex : 2018"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description de l'activité & Histoire *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Présentez votre entreprise, ses atouts, ses produits et sa mission auprès des clients gabonais..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Médias Supabase Storage (business-media) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        Identité Visuelle & Photos (Bucket business-media)
                      </span>
                      {uploadingMedia && (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Téléversement en cours...
                        </span>
                      )}
                    </div>

                    {mediaError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{mediaError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Logo */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {logo && logo.trim() ? (
                            <img
                              src={logo}
                              alt="Logo"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Building className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block">Logo (1:1)</span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              {logo ? 'Téléversé ✓' : 'JPG, PNG ou WEBP'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={uploadingMedia}
                          onClick={() => logoInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Choisir</span>
                        </button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </div>

                      {/* Cover Image */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {coverImage && coverImage.trim() ? (
                            <img
                              src={coverImage}
                              alt="Couverture"
                              className="w-14 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block">Couverture (16:9)</span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              {coverImage ? 'Téléversée ✓' : 'Façade ou bannière'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={uploadingMedia}
                          onClick={() => coverInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Choisir</span>
                        </button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCoverFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Multi-photo gallery upload */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700">
                          Galerie photos complémentaires ({galleryImages.length})
                        </span>
                        <button
                          type="button"
                          disabled={uploadingMedia}
                          onClick={() => galleryInputRef.current?.click()}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Ajouter plusieurs photos</span>
                        </button>
                        <input
                          ref={galleryInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleGalleryFilesChange}
                          className="hidden"
                        />
                      </div>
                      {galleryImages.filter(imgUrl => Boolean(imgUrl && imgUrl.trim())).length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {galleryImages.filter(imgUrl => Boolean(imgUrl && imgUrl.trim())).map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-16 rounded-lg overflow-hidden border border-slate-200 bg-white group"
                            >
                              <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded opacity-90 hover:opacity-100"
                                title="Retirer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!name.trim() || !description.trim() || uploadingMedia}
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
                    >
                      <span>Étape suivante : Position GPS</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: POSITION GPS & CARTE */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Renseignez l'adresse de votre siège et sélectionnez son emplacement géographique précis sur la mini-carte interactive ci-dessous.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Province gabonaise *
                      </label>
                      <select
                        value={selectedProvince}
                        onChange={e => handleProvinceChange(e.target.value as ProvinceCode)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                      >
                        {PROVINCES.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.capital})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ville / Commune *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Ex : Libreville, Port-Gentil..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Arrondissement
                      </label>
                      <input
                        type="text"
                        value={arrondissement}
                        onChange={e => setArrondissement(e.target.value)}
                        placeholder="Ex : 1er, 2e, 3e Arrondissement..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quartier (important pour le repérage) *
                      </label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        placeholder="Ex : Batterie IV, Glass, Oloumi, Poto-Poto..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Adresse ou repère physique
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ex : Face à la pharmacie, Immeuble Horizon..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Interactive GPS Pin Map + Manual Lat/Lng + Precision */}
                  <div className="space-y-1.5 pt-1">
                    <GpsLocationPicker
                      lat={lat}
                      lng={lng}
                      gpsPrecision={gpsPrecision}
                      provinceCode={selectedProvince}
                      onChange={({ lat: newLat, lng: newLng, precision: newPrec }) => {
                        setLat(newLat);
                        setLng(newLng);
                        if (newPrec) setGpsPrecision(newPrec);
                      }}
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <button
                      type="button"
                      disabled={!city.trim() || !district.trim()}
                      onClick={() => setCurrentStep(3)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
                    >
                      <span>Étape suivante : Coordonnées</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CONTACTS, HORAIRES & ÉQUIPEMENTS */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Téléphone principal (+241) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+241 11 00 00 00"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Téléphone secondaire
                      </label>
                      <input
                        type="tel"
                        value={phoneSecondary}
                        onChange={e => setPhoneSecondary(e.target.value)}
                        placeholder="+241 66 00 00 00"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro WhatsApp commercial
                      </label>
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={e => setWhatsapp(e.target.value)}
                        placeholder="+241 77 00 00 00"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Adresse e-mail
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="contact@votre-entreprise.ga"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Site web officiel (optionnel)
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="https://www.votre-entreprise.ga"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Facebook (optionnel)
                      </label>
                      <input
                        type="text"
                        value={facebook}
                        onChange={e => setFacebook(e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Instagram (optionnel)
                      </label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={e => setInstagram(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        LinkedIn (optionnel)
                      </label>
                      <input
                        type="text"
                        value={linkedin}
                        onChange={e => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Horaires d'ouverture (Lundi - Vendredi)
                    </label>
                    <input
                      type="text"
                      value={openingHoursStr}
                      onChange={e => setOpeningHoursStr(e.target.value)}
                      placeholder="Ex : 08:00 - 18:00 (ou 24h/24)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Payment methods */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Moyens de paiement acceptés
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        'Airtel Money',
                        'Moov Money',
                        'Espèces',
                        'Carte bancaire',
                        'Virement bancaire',
                        'Chèque certifié'
                      ].map(method => {
                        const checked = paymentMethods.includes(method);
                        return (
                          <button
                            type="button"
                            key={method}
                            onClick={() => handleTogglePayment(method)}
                            className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-between transition-colors ${
                              checked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{method}</span>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Facilities / Commodités */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Commodités & Équipements sur place
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FACILITY_OPTIONS.map(fac => {
                        const checked = facilities.includes(fac);
                        return (
                          <button
                            type="button"
                            key={fac}
                            onClick={() => handleToggleFacility(fac)}
                            className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-between transition-colors ${
                              checked
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{fac}</span>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Services clés proposés (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={servicesStr}
                      onChange={e => setServicesStr(e.target.value)}
                      placeholder="Ex : Livraison express, Devis gratuit, Service après-vente"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || uploadingMedia}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Enregistrer et Publier mon Entreprise</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

