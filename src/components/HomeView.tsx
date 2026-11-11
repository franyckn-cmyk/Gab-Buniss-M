import React from 'react';
import { 
  Building, 
  MapPin, 
  Compass, 
  Star, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  PlusCircle,
  Car,
  Trees,
  Briefcase,
  Flame,
  Landmark,
  Hotel,
  Utensils,
  ShoppingBag,
  HeartPulse,
  Building2,
  Smartphone,
  Truck
} from 'lucide-react';
import { Business, BusinessCategory } from '../types';
import { HeroSearch } from './HeroSearch';
import { BusinessCard } from './BusinessCard';
import { CATEGORIES, PROVINCES } from '../data/gabonData';

interface HomeViewProps {
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  comparedBusinesses: Business[];
  onToggleCompare: (business: Business) => void;
  onRecordAction: (businessId: string, action: 'phone' | 'whatsapp' | 'route') => void;
  onOpenMap: () => void;
  onOpenRegisterModal: () => void;
  onOpenAiAssistant: () => void;
  onSearchSubmit: (params: { query: string; province: string; category: string }) => void;
  onSelectProvince: (provId: string) => void;
  onSelectCategory: (catId: BusinessCategory) => void;
  onLocateMe: () => void;
  userCoords: { lat: number; lng: number } | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  businesses,
  onSelectBusiness,
  favorites,
  onToggleFavorite,
  comparedBusinesses,
  onToggleCompare,
  onRecordAction,
  onOpenMap,
  onOpenRegisterModal,
  onOpenAiAssistant,
  onSearchSubmit,
  onSelectProvince,
  onSelectCategory,
  onLocateMe,
  userCoords
}) => {
  // Highest rated businesses (4.7+)
  const topRated = [...businesses].sort((a, b) => b.rating - a.rating).slice(0, 3);
  // Recently added or featured businesses
  const recentBusinesses = [...businesses].slice(3, 9);

  const getCategoryIcon = (id: BusinessCategory) => {
    switch (id) {
      case 'banque_finance': return Landmark;
      case 'energie_mines': return Flame;
      case 'hotellerie_tourisme': return Hotel;
      case 'restauration_bars': return Utensils;
      case 'commerce_distribution': return ShoppingBag;
      case 'sante_pharmacie': return HeartPulse;
      case 'btp_immobilier': return Building2;
      case 'telecoms_tech': return Smartphone;
      case 'transport_logistique': return Truck;
      case 'agroalimentaire_foret': return Trees;
      case 'services_conseil': return Briefcase;
      case 'automobile_mecanique': return Car;
      default: return Building;
    }
  };

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. HERO OMNI-SEARCH */}
      <HeroSearch
        onSearch={onSearchSubmit}
        onLocateMe={onLocateMe}
        onOpenRegisterModal={onOpenRegisterModal}
        totalBusinesses={businesses.length}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* 2. POPULAR CATEGORIES GRID */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Secteurs Économiques
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Principales Activités au Gabon
              </h2>
            </div>
            <button
              onClick={() => onSearchSubmit({ query: '', province: 'all', category: 'all' })}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              <span>Voir tout l'annuaire</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {CATEGORIES.map(cat => {
              const Icon = getCategoryIcon(cat.id);
              const count = businesses.filter(b => b.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between group"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: cat.bgColor, color: cat.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 line-clamp-1">
                      {cat.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {count} entreprise(s)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. INTERACTIVE MAP PREVIEW CALLOUT */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
              <Compass className="w-3.5 h-3.5" />
              Cartographie Interactive Nationale
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Visualisez toutes les entreprises sur la carte du Gabon
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explorez les 9 provinces, activez le filtre « Autour de moi » avec votre position GPS, et trouvez les itinéraires directs vers vos fournisseurs et commerces préférés.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenMap}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02]"
              >
                <Compass className="w-4 h-4" />
                <span>Ouvrir la Carte Interactive</span>
              </button>

              <button
                onClick={onOpenAiAssistant}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold rounded-xl transition-all backdrop-blur-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Demander à l'IA</span>
              </button>
            </div>
          </div>

          {/* Graphic Element */}
          <div className="absolute right-6 -bottom-10 opacity-15 pointer-events-none hidden lg:block">
            <Compass className="w-80 h-80 text-white" />
          </div>
        </section>

        {/* 4. ENTREPRISES LES MIEUX NOTÉES */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Recommandations Certifiées
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Les Entreprises les Mieux Notées du Gabon
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topRated.map(biz => (
              <BusinessCard
                key={biz.id}
                business={biz}
                onSelect={onSelectBusiness}
                isFavorite={favorites.includes(biz.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={comparedBusinesses.some(c => c.id === biz.id)}
                onToggleCompare={onToggleCompare}
                onRecordAction={onRecordAction}
              />
            ))}
          </div>
        </section>

        {/* 5. 9 PROVINCES QUICK SELECTOR */}
        <section className="space-y-6 bg-slate-100/70 p-6 sm:p-8 rounded-3xl border border-slate-200">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Maillage Territorial
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Découvrez les Entreprises par Province
            </h2>
            <p className="text-xs text-slate-500">
              Cliquez sur une province pour afficher immédiatement ses commerces et entreprises phares.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3.5">
            {PROVINCES.map(p => {
              const countInProv = businesses.filter(b => b.location.provinceCode === p.id).length;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelectProvince(p.id)}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0" 
                      style={{ backgroundColor: p.flagAccent }}
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Chef-lieu : {p.capital}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-800 text-slate-600 px-2 py-1 rounded-lg">
                    {countInProv} ent.
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. RÉCEMMENT AJOUTÉES */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Annuaire Dynamique
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Entreprises à Découvrir
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentBusinesses.map(biz => (
              <BusinessCard
                key={biz.id}
                business={biz}
                onSelect={onSelectBusiness}
                isFavorite={favorites.includes(biz.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={comparedBusinesses.some(c => c.id === biz.id)}
                onToggleCompare={onToggleCompare}
                onRecordAction={onRecordAction}
              />
            ))}
          </div>
        </section>

        {/* 7. CTA FOR PROFESSIONALS TO REGISTER */}
        <section className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Vous êtes chef d'entreprise au Gabon ?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Rejoignez gratuitement l'annuaire national. Renseignez vos coordonnées GPS, vos horaires et augmentez votre visibilité auprès de milliers de clients potentiels chaque jour.
            </p>
          </div>

          <button
            onClick={onOpenRegisterModal}
            className="px-6 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            Référencer mon entreprise maintenant
          </button>
        </section>

      </div>
    </div>
  );
};
