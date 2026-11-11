import React from 'react';
import { X, Scale, Star, CheckCircle2, Phone, MessageSquare, Navigation, Check } from 'lucide-react';
import { Business } from '../types';
import { isBusinessOpenNow, formatGabonPhone } from '../utils/geo';

interface BusinessComparisonDrawerProps {
  comparedBusinesses: Business[];
  onRemoveFromComparison: (id: string) => void;
  onClearComparison: () => void;
  onSelectBusiness: (business: Business) => void;
}

export const BusinessComparisonDrawer: React.FC<BusinessComparisonDrawerProps> = ({
  comparedBusinesses,
  onRemoveFromComparison,
  onClearComparison,
  onSelectBusiness
}) => {
  if (comparedBusinesses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Scale className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          Comparateur d'entreprises vide
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Sélectionnez jusqu'à 3 entreprises depuis l'annuaire ou la carte en cliquant sur l'icône de balance pour les comparer côte-à-côte (horaires, services, avis, modes de paiement).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Comparateur d'entreprises ({comparedBusinesses.length}/3)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Comparez les prestations, la réputation et la localisation de vos prestataires au Gabon.
          </p>
        </div>

        <button
          onClick={onClearComparison}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
        >
          Effacer la comparaison
        </button>
      </div>

      {/* Comparison Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-w-[700px]">
          {comparedBusinesses.map(b => {
            const openStatus = isBusinessOpenNow(b.details.openingHours);

            return (
              <div key={b.id} className="p-5 flex flex-col justify-between space-y-4">
                <div>
                  {/* Top card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {b.logo && b.logo.trim() ? (
                      <img
                        src={b.logo}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-slate-200 shadow-2xs">
                        {(b.name || 'G').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => onRemoveFromComparison(b.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Retirer du comparateur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1">
                    {b.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold mb-3">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{b.rating} / 5</span>
                    <span className="text-slate-400 font-normal">({b.reviewsCount} avis)</span>
                  </div>

                  {/* Localisation */}
                  <div className="py-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Localisation
                    </span>
                    <span className="font-bold text-slate-800 block">
                      {b.location.city} ({b.location.province})
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {b.location.district ? b.location.district + ', ' : ''}{b.location.address}
                    </span>
                  </div>

                  {/* Statut ouverture */}
                  <div className="py-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Horaires actuels
                    </span>
                    <span className={`font-bold inline-flex items-center gap-1 ${
                      openStatus.isOpen ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${openStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {openStatus.statusText}
                    </span>
                  </div>

                  {/* Services */}
                  <div className="py-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Services clés
                    </span>
                    <ul className="space-y-1">
                      {b.details.services.slice(0, 4).map((s, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Moyens de paiement */}
                  <div className="py-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Moyens de paiement
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {b.details.paymentMethods.map((m, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => onSelectBusiness(b)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Voir la fiche complète
                  </button>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <a
                      href={`tel:${b.contact.phone}`}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-center rounded-lg border border-slate-200 font-semibold flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Appeler</span>
                    </a>

                    <a
                      href={`https://wa.me/${(b.contact.whatsapp || b.contact.phone).replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-center rounded-lg border border-slate-200 font-semibold flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-green-600" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
