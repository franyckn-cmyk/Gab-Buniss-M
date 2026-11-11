import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Star,
  MapPin,
  Phone,
  MessageSquare,
  Navigation,
  Heart,
  ExternalLink,
  Scale,
  Layers,
  Compass,
  Building
} from 'lucide-react';
import { Business } from '../types';
import { getSectorPinColor, isBusinessOpenNow, formatGabonPhone } from '../utils/geo';

interface BusinessCardProps {
  business: Business;
  onSelect: (business: Business) => void;
  isFavorite: boolean;
  onToggleFavorite: (businessId: string) => void;
  isCompared: boolean;
  onToggleCompare: (business: Business) => void;
  onRecordAction: (businessId: string, action: 'phone' | 'whatsapp' | 'route') => void;
  distance?: number | null;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onSelect,
  isFavorite,
  onToggleFavorite,
  isCompared,
  onToggleCompare,
  onRecordAction,
  distance
}) => {
  const pinColor = getSectorPinColor(business.category);
  const openStatus = isBusinessOpenNow(business.details.openingHours);
  const [coverError, setCoverError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setCoverError(false);
    setLogoError(false);
  }, [business.coverImage, business.logo]);

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRecordAction(business.id, 'phone');
    window.location.href = `tel:${business.contact.phone}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRecordAction(business.id, 'whatsapp');
    const cleanPhone = (business.contact.whatsapp || business.contact.phone).replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Bonjour ${business.name}, je vous contacte depuis la plateforme Gabon Business Map concernant vos services.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleRouteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRecordAction(business.id, 'route');
    const { lat, lng } = business.location.coordinates;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const hasCover = Boolean(business.coverImage && business.coverImage.trim() && !coverError);
  const hasLogo = Boolean(business.logo && business.logo.trim() && !logoError);

  return (
    <article
      onClick={() => onSelect(business)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Cover Image & Quick Badges */}
      <div className="relative h-44 w-full bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 overflow-hidden">
        {hasCover ? (
          <img
            src={business.coverImage}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
            <Building className="w-10 h-10 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-wider">{business.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/15 to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
            {business.location.city} • {business.location.province}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Compare checkbox button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(business);
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                isCompared
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/80 text-slate-700 hover:bg-white'
              }`}
              title="Ajouter au comparateur"
            >
              <Scale className="w-3.5 h-3.5" />
            </button>

            {/* Favorite button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(business.id);
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                isFavorite
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
              }`}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logo and Sector over the image bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {hasLogo ? (
              <img
                src={business.logo}
                alt=""
                className="w-9 h-9 rounded-xl object-cover bg-white p-0.5 border border-white/60 shadow-sm"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-white/60 shadow-sm">
                {(business.name || 'G').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 drop-shadow-xs">
                {business.subCategory || business.category}
              </span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>{business.rating}</span>
            <span className="text-white/70 font-normal text-[10px]">({business.reviewsCount})</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Business Title & Verification */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1">
              {business.name}
            </h3>
            {business.status === 'verified' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Vérifié
              </span>
            )}
          </div>

          {/* Address & Quartier */}
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {business.location.district ? `${business.location.district}, ` : ''}{business.location.address}
            </span>
          </p>

          {/* Badges: Multi-Branch & GPS Precision */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {business.branches && business.branches.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <Layers className="w-3 h-3 text-blue-600" />
                {business.branches.length} agences au Gabon
              </span>
            )}
            {business.gpsPrecision === 'exact' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Coordonnées GPS réelles et vérifiées du bâtiment">
                <Compass className="w-3 h-3 text-emerald-600" />
                GPS exact
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Coordonnées GPS approximatives de la zone">
                <Compass className="w-3 h-3 text-amber-600" />
                GPS approx.
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {business.description}
          </p>

          {/* Opening Status & Distance info */}
          <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 mb-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${openStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={openStatus.isOpen ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                {openStatus.statusText}
              </span>
            </div>

            {distance !== undefined && distance !== null && (
              <span className="font-bold text-blue-600 text-[11px]">
                📍 à {distance} km
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-xs font-semibold">
          {/* Call button */}
          <button
            type="button"
            onClick={handlePhoneClick}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 transition-colors border border-slate-200/80"
            title={`Appeler (${formatGabonPhone(business.contact.phone)})`}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Appel</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 transition-colors border border-slate-200/80"
            title="Envoyer un message WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* GPS Route */}
          <button
            type="button"
            onClick={handleRouteClick}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-slate-700 transition-colors border border-slate-200/80"
            title="Calculer l'itinéraire GPS"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Itinéraire</span>
          </button>

          {/* View Details */}
          <button
            type="button"
            onClick={() => onSelect(business)}
            className="flex items-center justify-center gap-1 py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold shadow-2xs"
            title="Consulter la fiche détaillée"
          >
            <span>Fiche</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );
};
