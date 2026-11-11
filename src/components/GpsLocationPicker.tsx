import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin, Navigation, Compass } from 'lucide-react';
import { GpsPrecision, ProvinceCode } from '../types';
import { PROVINCES } from '../data/gabonData';

export interface GpsLocationPickerProps {
  lat: number;
  lng: number;
  gpsPrecision?: GpsPrecision;
  onChange: (coords: { lat: number; lng: number; precision?: GpsPrecision }) => void;
  provinceCode?: ProvinceCode;
  heightClassName?: string;
  className?: string;
  showPrecisionSelector?: boolean;
}

// Coordonnées de repli gabonaises par défaut (Libreville)
const DEFAULT_GABON_LAT = 0.3901;
const DEFAULT_GABON_LNG = 9.4536;

/**
 * Résolution garantie des coordonnées GPS :
 * 1. Priorité aux coordonnées (lat, lng) passées en props (si valides et non [0, 0])
 * 2. Repli sur le chef-lieu de la province sélectionnée (si provinceCode)
 * 3. Repli national sur Libreville (0.3901, 9.4536)
 * STRICTEMENT SANS DÉCLENCHEMENT AUTOMATIQUE DE GÉOLOCALISATION APPAREIL
 */
function resolveCoords(lat?: number, lng?: number, provinceCode?: ProvinceCode): { lat: number; lng: number } {
  const hasLat = typeof lat === 'number' && Number.isFinite(lat);
  const hasLng = typeof lng === 'number' && Number.isFinite(lng);
  if (hasLat && hasLng && !(lat === 0 && lng === 0)) {
    return {
      lat: Math.round(lat * 1000000) / 1000000,
      lng: Math.round(lng * 1000000) / 1000000
    };
  }

  if (provinceCode) {
    const prov = PROVINCES.find((p) => p.id === provinceCode);
    if (prov?.coordinates) {
      return {
        lat: Math.round(prov.coordinates.lat * 1000000) / 1000000,
        lng: Math.round(prov.coordinates.lng * 1000000) / 1000000
      };
    }
  }

  return { lat: DEFAULT_GABON_LAT, lng: DEFAULT_GABON_LNG };
}

export const GpsLocationPicker: React.FC<GpsLocationPickerProps> = ({
  lat,
  lng,
  gpsPrecision = 'exact',
  onChange,
  provinceCode,
  heightClassName = 'h-56 sm:h-64',
  className = '',
  showPrecisionSelector = true
}) => {
  const initial = resolveCoords(lat, lng, provinceCode);

  const [currentLat, setCurrentLat] = useState<number>(initial.lat);
  const [currentLng, setCurrentLng] = useState<number>(initial.lng);
  const [precision, setPrecision] = useState<GpsPrecision>(gpsPrecision);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Synchronisation descendante si les props lat/lng ou la province changent depuis le formulaire parent
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const resolved = resolveCoords(lat, lng, provinceCode);

    setCurrentLat(resolved.lat);
    setCurrentLng(resolved.lng);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([resolved.lat, resolved.lng]);
      mapInstanceRef.current.panTo([resolved.lat, resolved.lng]);
    }
  }, [lat, lng, provinceCode]);

  useEffect(() => {
    setPrecision(gpsPrecision);
  }, [gpsPrecision]);

  // Propagation ascendante propre (nombres à 6 décimales)
  const emitChange = useCallback((newLat: number, newLng: number, newPrecision: GpsPrecision) => {
    isInternalUpdateRef.current = true;
    const roundedLat = Math.round(newLat * 1000000) / 1000000;
    const roundedLng = Math.round(newLng * 1000000) / 1000000;
    setCurrentLat(roundedLat);
    setCurrentLng(roundedLng);
    setPrecision(newPrecision);
    onChange({ lat: roundedLat, lng: roundedLng, precision: newPrecision });
  }, [onChange]);

  // Initialisation et gestion de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const safeLat = Number.isFinite(currentLat) && currentLat !== 0 ? currentLat : DEFAULT_GABON_LAT;
    const safeLng = Number.isFinite(currentLng) && currentLng !== 0 ? currentLng : DEFAULT_GABON_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [safeLat, safeLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Pin SVG gabonais aux couleurs nationales (vert forêt / blanc)
    const pinIcon = L.divIcon({
      className: 'gbm-gps-picker-pin',
      html: `
        <div style="position: relative; width: 36px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <svg viewBox="0 0 36 42" width="36" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.05887 0 0 8.05887 0 18C0 27.5 18 42 18 42C18 42 36 27.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#009e60"/>
            <circle cx="18" cy="16" r="8.5" fill="white"/>
            <circle cx="18" cy="16" r="4.5" fill="#009e60"/>
          </svg>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42]
    });

    const marker = L.marker([safeLat, safeLng], {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    // Déplacement par glisser-déposer (drag & drop)
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const roundedLat = Math.round(pos.lat * 1000000) / 1000000;
      const roundedLng = Math.round(pos.lng * 1000000) / 1000000;
      emitChange(roundedLat, roundedLng, 'exact');
    });

    // Clic n'importe où sur la carte pour positionner le repère
    map.on('click', (e: L.LeafletMouseEvent) => {
      const roundedLat = Math.round(e.latlng.lat * 1000000) / 1000000;
      const roundedLng = Math.round(e.latlng.lng * 1000000) / 1000000;
      marker.setLatLng([roundedLat, roundedLng]);
      emitChange(roundedLat, roundedLng, 'exact');
    });

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // GESTION CRITIQUE DU REDIMENSIONNEMENT EN CONTENEUR MODAL (invalidateSize)
    const invalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 250);
    const t3 = setTimeout(invalidate, 600);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        invalidate();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []); // Initialisation une seule fois sur montage du composant

  // Mise à jour manuelle des coordonnées au clavier
  const handleManualCoordChange = (nextLat: number, nextLng: number) => {
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    const roundedLat = Math.round(nextLat * 1000000) / 1000000;
    const roundedLng = Math.round(nextLng * 1000000) / 1000000;

    emitChange(roundedLat, roundedLng, precision);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
      mapInstanceRef.current.panTo([roundedLat, roundedLng]);
    }
  };

  // Détection de la position actuelle via Geolocation API
  const handleDetectPosition = () => {
    if (!navigator.geolocation) {
      setLocateError('La géolocalisation n’est pas disponible sur votre navigateur.');
      return;
    }
    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const userLng = Math.round(pos.coords.longitude * 1000000) / 1000000;

        emitChange(userLat, userLng, 'exact');

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 15);
          markerRef.current.setLatLng([userLat, userLng]);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocateError(
          err.code === 1
            ? 'Autorisation de géolocalisation refusée.'
            : 'Impossible d’obtenir votre position GPS.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Recentrer sur la province sélectionnée ou sur Libreville
  const handleCenterOnProvince = () => {
    const prov = PROVINCES.find((p) => p.id === provinceCode) || PROVINCES[0];
    const provLat = prov.coordinates.lat;
    const provLng = prov.coordinates.lng;

    emitChange(provLat, provLng, 'approximate');

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([provLat, provLng], 13);
      markerRef.current.setLatLng([provLat, provLng]);
    }
  };

  const handleCenterOnLibreville = () => {
    emitChange(DEFAULT_GABON_LAT, DEFAULT_GABON_LNG, 'exact');
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([DEFAULT_GABON_LAT, DEFAULT_GABON_LNG], 13);
      markerRef.current.setLatLng([DEFAULT_GABON_LAT, DEFAULT_GABON_LNG]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Barre d'information & boutons de raccourci */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Localisation sur la carte :</span>
          <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
            Cliquez sur la carte ou déplacez le repère pour ajuster la position exacte.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDetectPosition}
            disabled={isLocating}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            title="Utiliser la position GPS de votre appareil"
          >
            <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Recherche...' : 'Ma position'}</span>
          </button>

          {provinceCode && (
            <button
              type="button"
              onClick={handleCenterOnProvince}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Recentrer sur le chef-lieu de la province"
            >
              <Compass className="w-3 h-3 text-slate-500" />
              <span>Province</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCenterOnLibreville}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Recentrer sur Libreville (siège national)"
          >
            <Navigation className="w-3 h-3 text-slate-500" />
            <span>Libreville</span>
          </button>
        </div>
      </div>

      {locateError && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
          {locateError}
        </div>
      )}

      {/* Conteneur de la mini-carte interactive */}
      <div className="relative rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100">
        <div ref={mapContainerRef} className={`w-full ${heightClassName}`} />
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-sm border border-slate-200 text-[10px] text-slate-700 font-mono">
          Lat: <span className="font-bold text-emerald-700">{currentLat.toFixed(6)}</span> | Lng:{' '}
          <span className="font-bold text-emerald-700">{currentLng.toFixed(6)}</span>
        </div>
      </div>

      {/* Champs de saisie manuelle et sélecteur de précision */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Latitude GPS (Degrés décimaux)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLat}
            onChange={(e) => handleManualCoordChange(parseFloat(e.target.value) || 0, currentLng)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="0.390100"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Longitude GPS (Degrés décimaux)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLng}
            onChange={(e) => handleManualCoordChange(currentLat, parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="9.453600"
          />
        </div>

        {showPrecisionSelector && (
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              Précision du repérage
            </label>
            <select
              value={precision}
              onChange={(e) => {
                const nextPrec = e.target.value as GpsPrecision;
                setPrecision(nextPrec);
                emitChange(currentLat, currentLng, nextPrec);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="exact">GPS Exact (repère physique précis)</option>
              <option value="approximate">GPS Approximatif (zone quartier)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
