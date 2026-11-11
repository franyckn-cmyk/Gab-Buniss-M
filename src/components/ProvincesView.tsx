import React from 'react';
import { Layers, MapPin, Compass, ArrowRight, Building, CheckCircle2 } from 'lucide-react';
import { Province, Business } from '../types';
import { PROVINCES } from '../data/gabonData';

interface ProvincesViewProps {
  businesses: Business[];
  onSelectProvince: (provId: string) => void;
  onOpenMapWithProvince: (provId: string) => void;
}

export const ProvincesView: React.FC<ProvincesViewProps> = ({
  businesses,
  onSelectProvince,
  onOpenMapWithProvince
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          Découverte Régionale
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Les 9 Provinces de la République Gabonaise
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Explorez le dynamisme économique, les bassins d'activités et les entreprises implantées dans chaque province du territoire national.
        </p>
      </div>

      {/* Grid of the 9 Provinces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVINCES.map(p => {
          const provBusinesses = businesses.filter(b => b.location.provinceCode === p.id);

          return (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Province Header Card */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: p.flagAccent }}
                    />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Province {p.name}
                    </span>
                  </div>

                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                    {provBusinesses.length} entreprise(s)
                  </span>
                </div>

                <h2 className="text-xl font-black text-slate-900">
                  {p.name}
                </h2>

                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  Chef-lieu : <span className="font-bold text-slate-800">{p.capital}</span>
                </p>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Villes principales :
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.mainCities.map(city => (
                      <span key={city} className="bg-slate-50 border border-slate-200/80 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Pôle d'activité :</span>
                  <span className="text-[11px]">{p.economicKey}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  onClick={() => onSelectProvince(p.id)}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 transition-colors text-center"
                >
                  Voir les entreprises
                </button>

                <button
                  onClick={() => onOpenMapWithProvince(p.id)}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Sur la carte</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
