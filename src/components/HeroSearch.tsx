import React, { useState } from 'react';
import { Search, MapPin, Building, Crosshair, ArrowRight, ShieldCheck, Sparkles, Compass } from 'lucide-react';
import { PROVINCES, CATEGORIES } from '../data/gabonData';

interface HeroSearchProps {
  onSearch: (params: { query: string; province: string; category: string }) => void;
  onLocateMe: () => void;
  onOpenRegisterModal: () => void;
  totalBusinesses: number;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  onSearch,
  onLocateMe,
  onOpenRegisterModal,
  totalBusinesses
}) => {
  const [query, setQuery] = useState('');
  const [province, setProvince] = useState('all');
  const [category, setCategory] = useState('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ query, province, category });
  };

  const handleQuickTag = (tag: string, targetProvince: string = 'all', targetCategory: string = 'all') => {
    setQuery(tag);
    setProvince(targetProvince);
    setCategory(targetCategory);
    onSearch({ query: tag, province: targetProvince, category: targetCategory });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      {/* Background Subtle Map Graphic & Decorative Rings */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-5xl mx-auto text-center">
        
        {/* National Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-300 mb-6">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Plateforme Nationale de Référencement des Entreprises au Gabon
        </div>

        {/* Catchy Slogan requested by user */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
          Toutes les entreprises du Gabon,{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-yellow-300 to-teal-300 bg-clip-text text-transparent">
            à portée de clic !
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-8 font-normal">
          Recherchez, localisez sur carte interactive et contactez directement les professionnels, commerces, banques, cliniques et industries dans les 9 provinces gabonaises.
        </p>

        {/* Advanced Omni-Search Form */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-slate-100 text-slate-900">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
            
            {/* Input Keyword */}
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ex : Clinique, Restaurant, Comilog, SETRAG, BTP..."
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-50 border-0 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Province selector */}
            <div className="relative w-full md:w-52">
              <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                className="w-full pl-9 pr-8 py-3 text-xs sm:text-sm rounded-xl bg-slate-50 border-0 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 truncate"
              >
                <option value="all">Toutes les 9 provinces</option>
                {PROVINCES.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.capital})
                  </option>
                ))}
              </select>
            </div>

            {/* Category selector */}
            <div className="relative w-full md:w-52">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full pl-9 pr-8 py-3 text-xs sm:text-sm rounded-xl bg-slate-50 border-0 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 truncate"
              >
                <option value="all">Tous les secteurs</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit search button */}
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 shrink-0 hover:scale-[1.02]"
            >
              <span>Trouver</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick Search Suggestions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Recherches fréquentes :</span>
          <button
            onClick={() => handleQuickTag('BGFIBank', 'estuaire', 'banque_finance')}
            className="hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors"
          >
            BGFIBank Libreville
          </button>
          <span>•</span>
          <button
            onClick={() => handleQuickTag('COMILOG', 'haut_ogooue', 'energie_mines')}
            className="hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors"
          >
            COMILOG Moanda
          </button>
          <span>•</span>
          <button
            onClick={() => handleQuickTag('Albert Schweitzer', 'moyen_ogooue', 'sante_pharmacie')}
            className="hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors"
          >
            Hôpital Schweitzer Lambaréné
          </button>
          <span>•</span>
          <button
            onClick={() => handleQuickTag('TotalEnergies', 'ogooue_maritime', 'energie_mines')}
            className="hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors"
          >
            TotalEnergies Port-Gentil
          </button>
          <span>•</span>
          <button
            onClick={() => handleQuickTag('GSEZ', 'estuaire', 'agroalimentaire_foret')}
            className="hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors"
          >
            GSEZ Nkok
          </button>
        </div>

        {/* Key Statistics Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left sm:text-center">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/5">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">9 / 9</div>
            <div className="text-xs text-slate-300 font-medium">Provinces gabonaises couvertes</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/5">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">100%</div>
            <div className="text-xs text-slate-300 font-medium">Coordonnées GPS certifiées</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/5">
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-300">{totalBusinesses}+</div>
            <div className="text-xs text-slate-300 font-medium">Entreprises référencées</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/5">
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-400">24/7</div>
            <div className="text-xs text-slate-300 font-medium">Assistant IA & Itinéraires</div>
          </div>
        </div>

      </div>
    </div>
  );
};
