import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle2, 
  Star, 
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  Building
} from 'lucide-react';
import { Business } from '../types';
import { PROVINCES, CATEGORIES } from '../data/gabonData';
import { BusinessCard } from './BusinessCard';
import { calculateDistanceKm } from '../utils/geo';

interface DirectoryViewProps {
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  comparedBusinesses: Business[];
  onToggleCompare: (business: Business) => void;
  onRecordAction: (businessId: string, action: 'phone' | 'whatsapp' | 'route') => void;
  userCoords: { lat: number; lng: number } | null;
  onOpenMap: () => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  businesses,
  onSelectBusiness,
  favorites,
  onToggleFavorite,
  comparedBusinesses,
  onToggleCompare,
  onRecordAction,
  userCoords,
  onOpenMap
}) => {
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'views' | 'name' | 'distance'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter
  const filtered = businesses.filter(b => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCity = b.location.city.toLowerCase().includes(q);
      const matchDistrict = b.location.district.toLowerCase().includes(q);
      const matchDesc = b.description.toLowerCase().includes(q);
      const matchService = b.details.services.some(s => s.toLowerCase().includes(q));
      const matchBranch = b.branches?.some(br => 
        br.name.toLowerCase().includes(q) ||
        br.location.city.toLowerCase().includes(q) ||
        br.location.district.toLowerCase().includes(q) ||
        br.location.address.toLowerCase().includes(q)
      );
      if (!matchName && !matchCity && !matchDistrict && !matchDesc && !matchService && !matchBranch) return false;
    }

    if (selectedProvince !== 'all') {
      const matchParent = b.location.provinceCode === selectedProvince;
      const matchBranchProvince = b.branches?.some(br => br.location.provinceCode === selectedProvince);
      if (!matchParent && !matchBranchProvince) return false;
    }
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (verifiedOnly && b.status !== 'verified') return false;
    if (minRating > 0 && b.rating < minRating) return false;

    return true;
  });

  // Calculate distance & Sort
  const processed = filtered.map(b => {
    let distance: number | null = null;
    if (userCoords) {
      distance = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        b.location.coordinates.lat,
        b.location.coordinates.lng
      );
    }
    return { ...b, distance };
  }).sort((a, b) => {
    if (sortBy === 'distance' && a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    if (sortBy === 'views') {
      return (b.stats?.views || 0) - (a.stats?.views || 0);
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return b.rating - a.rating;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Annuaire des Entreprises au Gabon
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Trouvez les meilleurs prestataires, commerces et industries parmi {businesses.length} entreprises répertoriées.
          </p>
        </div>

        <button
          onClick={onOpenMap}
          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
        >
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>Afficher sur la carte interactive</span>
        </button>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Keyword search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, produit, service..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Province */}
          <div>
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
            >
              <option value="all">Toutes les provinces (9)</option>
              {PROVINCES.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.capital})</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
            >
              <option value="all">Tous les secteurs (12)</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
            >
              <option value="rating">Trier par : Meilleures notes</option>
              <option value="views">Trier par : Plus consultées</option>
              {userCoords && <option value="distance">Trier par : Proximité (km)</option>}
              <option value="name">Trier par : Nom alphabétique</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                verifiedOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vérifiées uniquement</span>
            </button>

            <button
              onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                minRating >= 4.5
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>4.5 étoiles et plus</span>
            </button>

            {(search || selectedProvince !== 'all' || selectedCategory !== 'all' || verifiedOnly || minRating > 0) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedProvince('all');
                  setSelectedCategory('all');
                  setVerifiedOnly(false);
                  setMinRating(0);
                }}
                className="text-rose-600 hover:underline font-semibold ml-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              <strong className="text-slate-900">{processed.length}</strong> entreprise(s) trouvée(s)
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-500'}`}
                title="Affichage grille"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-500'}`}
                title="Affichage liste"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {processed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Building className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">
            Aucune entreprise ne correspond à votre recherche
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Essayez d'élargir votre recherche, de changer de province ou de réinitialiser vos filtres.
          </p>
        </div>
      ) : (
        <div className={`grid gap-5 ${
          viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
        }`}>
          {processed.map(biz => (
            <BusinessCard
              key={biz.id}
              business={biz}
              onSelect={onSelectBusiness}
              isFavorite={favorites.includes(biz.id)}
              onToggleFavorite={onToggleFavorite}
              isCompared={comparedBusinesses.some(c => c.id === biz.id)}
              onToggleCompare={onToggleCompare}
              onRecordAction={onRecordAction}
              distance={biz.distance}
            />
          ))}
        </div>
      )}

    </div>
  );
};
