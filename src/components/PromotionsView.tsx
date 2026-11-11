import React, { useState } from 'react';
import { Tag, Calendar, MapPin, Phone, Building, ArrowRight, ExternalLink } from 'lucide-react';
import { Promotion, Business } from '../types';
import { PROVINCES, CATEGORIES } from '../data/gabonData';

interface PromotionsViewProps {
  promotions: Promotion[];
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  onOpenRegisterModal: () => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  promotions,
  businesses,
  onSelectBusiness,
  onOpenRegisterModal
}) => {
  const [selectedCity, setSelectedCity] = useState('all');

  const filtered = promotions.filter(p => {
    if (selectedCity !== 'all' && p.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200 mb-2">
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            Bons Plans & Actualités
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Offres Promotionnelles des Entreprises au Gabon
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Découvrez les remises exclusives, forfaits pro et nouveautés proposés par les commerces gabonais.
          </p>
        </div>

        <button
          onClick={onOpenRegisterModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          + Publier une offre commerciale
        </button>
      </div>

      {/* Grid of Promotions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(promo => {
          const biz = businesses.find(b => b.id === promo.businessId);

          return (
            <div
              key={promo.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={promo.image && promo.image.trim() ? promo.image : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600'}
                    alt={promo.title}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                  {promo.discountBadge && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-xl shadow-md">
                      {promo.discountBadge}
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-[11px] font-bold bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-md">
                      📍 {promo.city}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                    {promo.businessName}
                  </span>

                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                    {promo.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {promo.description}
                  </p>

                  <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Valable jusqu'au {new Date(promo.validUntil).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                {promo.contactPhone && (
                  <a
                    href={`tel:${promo.contactPhone}`}
                    className="py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Appeler</span>
                  </a>
                )}

                {biz && (
                  <button
                    onClick={() => onSelectBusiness(biz)}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors ml-auto flex items-center gap-1.5"
                  >
                    <span>Voir l'entreprise</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
