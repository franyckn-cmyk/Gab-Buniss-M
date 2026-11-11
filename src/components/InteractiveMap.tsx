import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  MapPin, 
  Layers, 
  Compass, 
  Search, 
  Filter, 
  CheckCircle2, 
  Star, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Phone, 
  MessageSquare,
  Crosshair,
  ArrowRight
} from 'lucide-react';
import { Business, Province, BusinessCategory } from '../types';
import { PROVINCES, CATEGORIES } from '../data/gabonData';
import { calculateDistanceKm, getSectorPinColor, isBusinessOpenNow } from '../utils/geo';

interface InteractiveMapProps {
  businesses: Business[];
  selectedBusiness?: Business | null;
  onSelectBusiness: (business: Business) => void;
  userCoords: { lat: number; lng: number } | null;
  setUserCoords: (coords: { lat: number; lng: number } | null) => void;
  initialProvinceId?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  businesses,
  selectedBusiness,
  onSelectBusiness,
  userCoords,
  setUserCoords,
  initialProvinceId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [activeProvince, setActiveProvince] = useState<string>(initialProvinceId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAgencies, setShowAgencies] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Filter businesses for map markers
  const filteredBusinesses = businesses.filter(b => {
    if (activeProvince !== 'all') {
      const parentMatch = b.location.provinceCode === activeProvince;
      const branchMatch = b.branches?.some(br => br.location.provinceCode === activeProvince);
      if (!parentMatch && !branchMatch) return false;
    }
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (verifiedOnly && b.status !== 'verified') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCity = b.location.city.toLowerCase().includes(q);
      const matchDistrict = b.location.district.toLowerCase().includes(q);
      const matchService = b.details.services.some(s => s.toLowerCase().includes(q));
      const matchBranch = b.branches?.some(br => 
        br.name.toLowerCase().includes(q) ||
        br.location.city.toLowerCase().includes(q) ||
        br.location.district.toLowerCase().includes(q) ||
        br.location.address.toLowerCase().includes(q)
      );
      if (!matchName && !matchCity && !matchDistrict && !matchService && !matchBranch) return false;
    }
    return true;
  });

  // Calculate distance if user coords available
  const businessesWithDistance = filteredBusinesses.map(b => {
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
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    return b.rating - a.rating;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Center on Gabon
    const initialLat = -0.8037;
    const initialLng = 11.6094;
    const initialZoom = 7;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Gabon Business Map',
      maxZoom: 19
    }).addTo(map);

    // Reposition zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers on filteredBusinesses change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredBusinesses.forEach(business => {
      const pinColor = getSectorPinColor(business.category);
      const isSelected = selectedBusiness?.id === business.id;

      // Custom SVG Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="position: relative; width: 36px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.2s ease;">
            <svg viewBox="0 0 36 42" width="36" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${pinColor}"/>
              <circle cx="18" cy="16" r="10" fill="white"/>
              <circle cx="18" cy="16" r="6" fill="${pinColor}"/>
            </svg>
            ${business.status === 'verified' ? `
              <div style="position: absolute; top: -2px; right: -2px; background: #009e60; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold;">
                ✓
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -40]
      });

      const marker = L.marker(
        [business.location.coordinates.lat, business.location.coordinates.lng],
        { icon: customIcon }
      );

      // Popup Content
      const openStatus = isBusinessOpenNow(business.details.openingHours);
      const coverUrl = business.coverImage && business.coverImage.trim()
        ? business.coverImage
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400';
      const popupHtml = `
        <div style="width: 270px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
          <div style="position: relative; height: 100px; width: 100%; overflow: hidden; background: #e2e8f0;">
            <img src="${coverUrl}" alt="${business.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400'" />
            <div style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
              ${business.location.city}
            </div>
            ${business.status === 'verified' ? `
              <div style="position: absolute; top: 8px; right: 8px; background: #009e60; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 3px;">
                Vérifié
              </div>
            ` : ''}
          </div>
          <div style="padding: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 600; color: ${pinColor}; text-transform: uppercase;">
                ${business.subCategory || business.category}
              </span>
              <div style="display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: #d97706;">
                ★ ${business.rating} <span style="font-size: 10px; color: #64748b; font-weight: normal;">(${business.reviewsCount})</span>
              </div>
            </div>
            <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; line-height: 1.2;">
              ${business.name}
            </h4>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0; line-height: 1.3;">
              📍 ${business.location.district ? business.location.district + ', ' : ''}${business.location.address}
            </p>
            <div style="font-size: 11px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${openStatus.isOpen ? '#10b981' : '#ef4444'};"></span>
              <span style="color: ${openStatus.isOpen ? '#047857' : '#b91c1c'}; font-weight: 600;">
                ${openStatus.statusText}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button 
                id="popup-btn-view-${business.id}"
                style="background: #009e60; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; text-align: center; transition: background 0.15s;"
              >
                Voir la fiche
              </button>
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=${business.location.coordinates.lat},${business.location.coordinates.lng}"
                target="_blank"
                rel="noreferrer"
                style="background: #f1f5f9; color: #334155; text-decoration: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px;"
              >
                Itinéraire
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, closeButton: true });

      // When popup opens, attach click event to "Voir la fiche"
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`popup-btn-view-${business.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectBusiness(business);
            };
          }
        }, 50);
      });

      marker.addTo(markersLayer);

      // Render Agency / Branch Markers if enabled
      if (showAgencies && business.branches && business.branches.length > 0) {
        business.branches.forEach(branch => {
          // Check province filter
          if (activeProvince !== 'all' && branch.location.provinceCode !== activeProvince) return;

          // Check search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchBranch = branch.name.toLowerCase().includes(q) ||
              branch.location.city.toLowerCase().includes(q) ||
              branch.location.district.toLowerCase().includes(q) ||
              business.name.toLowerCase().includes(q);
            if (!matchBranch) return;
          }

          // Branch pin icon (with an agency badge)
          const branchIcon = L.divIcon({
            className: 'custom-map-branch-marker',
            html: `
              <div style="position: relative; width: 32px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <svg viewBox="0 0 36 42" width="32" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#1e293b"/>
                  <circle cx="18" cy="16" r="10" fill="white"/>
                  <circle cx="18" cy="16" r="6" fill="${pinColor}"/>
                </svg>
                <div style="position: absolute; top: -3px; right: -3px; background: #2563eb; border-radius: 50%; width: 15px; height: 15px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 800;" title="Agence locale">
                  AG
                </div>
              </div>
            `,
            iconSize: [32, 38],
            iconAnchor: [16, 38],
            popupAnchor: [0, -36]
          });

          const branchMarker = L.marker(
            [branch.location.coordinates.lat, branch.location.coordinates.lng],
            { icon: branchIcon }
          );

          const branchPopupHtml = `
            <div style="width: 270px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
              <div style="background: #0f172a; padding: 10px 12px; color: white; border-radius: 8px 8px 0 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                  <span style="font-size: 10px; font-weight: 700; color: #38bdf8; text-transform: uppercase;">
                    Agence locale
                  </span>
                  <span style="font-size: 9px; font-weight: 700; background: ${branch.gpsPrecision === 'exact' ? '#059669' : '#d97706'}; color: white; padding: 1px 5px; border-radius: 4px;">
                    ${branch.gpsPrecision === 'exact' ? 'GPS Exact' : 'GPS Approx'}
                  </span>
                </div>
                <div style="font-size: 13px; font-weight: 800; color: white; line-height: 1.2;">
                  ${branch.name}
                </div>
                <div style="font-size: 10px; color: #94a3b8;">
                  Rattachée à : ${business.name}
                </div>
              </div>
              <div style="padding: 12px; background: white; border-radius: 0 0 8px 8px;">
                <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.3;">
                  📍 ${branch.location.district ? branch.location.district + ', ' : ''}${branch.location.address}, <strong>${branch.location.city}</strong>
                </p>
                ${branch.contact?.phone ? `
                  <p style="font-size: 11px; color: #0284c7; margin: 0 0 8px 0; font-weight: 600;">
                    📞 ${branch.contact.phone}
                  </p>
                ` : ''}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <button 
                    id="popup-btn-branch-view-${branch.id}"
                    style="background: #009e60; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer; text-align: center;"
                  >
                    Fiche société
                  </button>
                  <a 
                    href="https://www.google.com/maps/dir/?api=1&destination=${branch.location.coordinates.lat},${branch.location.coordinates.lng}"
                    target="_blank"
                    rel="noreferrer"
                    style="background: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; gap: 3px;"
                  >
                    Itinéraire
                  </a>
                </div>
              </div>
            </div>
          `;

          branchMarker.bindPopup(branchPopupHtml, { maxWidth: 280, closeButton: true });

          branchMarker.on('popupopen', () => {
            setTimeout(() => {
              const btn = document.getElementById(`popup-btn-branch-view-${branch.id}`);
              if (btn) {
                btn.onclick = () => {
                  onSelectBusiness(business);
                };
              }
            }, 50);
          });

          branchMarker.addTo(markersLayer);
        });
      }
    });
  }, [filteredBusinesses, selectedBusiness, onSelectBusiness, showAgencies, activeProvince, searchQuery]);

  // Fly to province when activeProvince changes
  const handleSelectProvince = (provId: string) => {
    setActiveProvince(provId);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (provId === 'all') {
      map.flyTo([-0.8037, 11.6094], 7, { duration: 1.2 });
    } else {
      const province = PROVINCES.find(p => p.id === provId);
      if (province) {
        map.flyTo([province.coordinates.lat, province.coordinates.lng], province.zoomLevel, {
          duration: 1.4
        });
      }
    }
  };

  // Fly to selected business
  useEffect(() => {
    if (!selectedBusiness || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [selectedBusiness.location.coordinates.lat, selectedBusiness.location.coordinates.lng],
      14,
      { duration: 1.2 }
    );
  }, [selectedBusiness]);

  // Locate User
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas prise en charge par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserCoords(coords);
        setIsLocating(false);

        const map = mapInstanceRef.current;
        if (!map) return;

        // Fly to user
        map.flyTo([coords.lat, coords.lng], 13, { duration: 1.5 });

        // User Marker
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position: relative; width: 24px; height: 24px;">
              <div style="position: absolute; inset: 0; background: #3b82f6; border-radius: 50%; opacity: 0.35; animation: ping-subtle 2s infinite;"></div>
              <div style="position: absolute; inset: 3px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.2);"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const userMarker = L.marker([coords.lat, coords.lng], { icon: userIcon })
          .bindPopup(`
            <div style="padding: 8px; font-size: 12px; font-weight: 600;">
              📍 Vous êtes ici<br/>
              <span style="font-size: 10px; color: #64748b;">Précision : ~${Math.round(position.coords.accuracy)} mètres</span>
            </div>
          `)
          .addTo(map);

        userMarkerRef.current = userMarker;
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Autorisation de géolocalisation refusée.");
        } else {
          setGeoError("Impossible de déterminer votre position actuelle.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100">
      
      {/* Top Filter Bar (Overlaid on Map) */}
      <div className="z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Province Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full lg:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              Provinces :
            </span>
            <button
              onClick={() => handleSelectProvince('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                activeProvince === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tout le Gabon ({businesses.length})
            </button>
            {PROVINCES.map(p => {
              const countInProv = businesses.filter(b => b.location.provinceCode === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProvince(p.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all flex items-center gap-1.5 ${
                    activeProvince === p.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={`${p.name} (Chef-lieu: ${p.capital})`}
                >
                  <span>{p.name}</span>
                  {countInProv > 0 && (
                    <span className={`text-[10px] px-1.5 rounded-full ${
                      activeProvince === p.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {countInProv}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Sector Filters in the top bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            {/* Search input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrer la carte..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700"
            >
              <option value="all">Tous les secteurs ({CATEGORIES.length})</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Verified Toggle */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                verifiedOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Afficher uniquement les fiches certifiées vérifiées"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Vérifiées</span>
            </button>

            {/* Agences Locales Toggle */}
            <button
              onClick={() => setShowAgencies(!showAgencies)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                showAgencies
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Afficher ou masquer les agences et succursales locales"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Agences</span>
            </button>

            {/* Geolocate Button */}
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                userCoords
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Centrer la carte sur ma position actuelle"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
              <span className="hidden md:inline">
                {isLocating ? 'Localisation...' : userCoords ? 'Autour de moi' : 'Près de moi'}
              </span>
            </button>

            {/* Toggle Sidebar */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              title={isSidebarOpen ? "Masquer la liste latérale" : "Afficher la liste latérale"}
            >
              {isSidebarOpen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {geoError && (
          <div className="mt-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-1 rounded border border-rose-200">
            {geoError}
          </div>
        )}
      </div>

      {/* Main Map Body with Side Panel */}
      <div className="relative flex-1 w-full flex overflow-hidden">
        
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full z-10" />

        {/* Legend Overlay at bottom-left */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md text-xs hidden sm:block max-w-xs">
          <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
            <span>Secteurs d'activité</span>
            <span className="text-[10px] text-slate-500 font-normal">
              {filteredBusinesses.length} entreprise(s) affichée(s)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]"></span>
              <span className="truncate">Banque & Finance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
              <span className="truncate">Pétrole & Mines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]"></span>
              <span className="truncate">Hôtellerie & Tourisme</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span>
              <span className="truncate">Santé & Pharmacie</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
              <span className="truncate">Télécoms & Tech</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
              <span className="truncate">Agro-industrie & Forêt</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Results List synced with Map */}
        {isSidebarOpen && (
          <aside className="w-full sm:w-80 md:w-96 bg-white border-l border-slate-200 z-20 flex flex-col shadow-xl absolute sm:relative right-0 inset-y-0 h-full">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Entreprises sur la carte
                </h3>
                <p className="text-xs text-slate-500">
                  {businessesWithDistance.length} résultat(s) correspondant(s)
                </p>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="sm:hidden p-1.5 text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
              {businessesWithDistance.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Aucune entreprise ne correspond à vos filtres dans cette zone.
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setActiveProvince('all');
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="text-emerald-600 font-semibold underline"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                </div>
              ) : (
                businessesWithDistance.map(b => {
                  const pinColor = getSectorPinColor(b.category);
                  const isSelected = selectedBusiness?.id === b.id;
                  const openStatus = isBusinessOpenNow(b.details.openingHours);

                  return (
                    <div
                      key={b.id}
                      onClick={() => onSelectBusiness(b)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {(b.logo && b.logo.trim()) || (b.coverImage && b.coverImage.trim()) ? (
                          <img
                            src={(b.logo && b.logo.trim()) || (b.coverImage && b.coverImage.trim()) || ''}
                            alt={b.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {(b.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span 
                              className="text-[10px] font-bold uppercase truncate"
                              style={{ color: pinColor }}
                            >
                              {b.subCategory || b.category}
                            </span>
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{b.rating}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({b.reviewsCount})</span>
                            </div>
                          </div>

                          <h4 className="font-bold text-xs text-slate-900 truncate flex items-center gap-1">
                            {b.name}
                            {b.status === 'verified' && (
                              <span title="Vérifié">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </h4>

                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            📍 {b.location.city} • {b.location.district || b.location.province}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${openStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className={openStatus.isOpen ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                                {openStatus.statusText}
                              </span>
                            </div>

                            {b.distance !== undefined && b.distance !== null && (
                              <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                à {b.distance} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
