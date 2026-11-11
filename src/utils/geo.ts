import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CategoryInfo, BusinessCategory } from '../types';
import { CATEGORIES } from '../data/gabonData';

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

/**
 * Format phone number cleanly for Gabon
 */
export function formatGabonPhone(phone: string): string {
  if (!phone) return '';
  return phone.trim();
}

/**
 * Check if a business is currently open in Gabon time zone (UTC+1 / West Africa Time)
 */
export function isBusinessOpenNow(openingHours: Record<string, string>): {
  isOpen: boolean;
  statusText: string;
} {
  try {
    // Current day in French
    const daysMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const now = new Date();
    // Gabon is WAT (UTC+1)
    const gabonHour = (now.getUTCHours() + 1) % 24;
    const gabonMinute = now.getUTCMinutes();
    const currentDay = daysMap[now.getUTCDay()];

    // Check matching key
    for (const [dayKey, hoursStr] of Object.entries(openingHours)) {
      if (hoursStr.toLowerCase().includes('24h/24')) {
        return { isOpen: true, statusText: 'Ouvert 24h/24' };
      }

      if (hoursStr.toLowerCase().includes('fermé')) {
        if (dayKey.includes(currentDay)) {
          return { isOpen: false, statusText: 'Fermé aujourd’hui' };
        }
      }

      // Check if current day is included in range like "Lundi - Vendredi"
      let appliesToday = false;
      if (dayKey.includes(currentDay)) {
        appliesToday = true;
      } else if (dayKey.includes('Lundi - Vendredi')) {
        const d = now.getUTCDay();
        if (d >= 1 && d <= 5) appliesToday = true;
      } else if (dayKey.includes('Lundi - Samedi')) {
        const d = now.getUTCDay();
        if (d >= 1 && d <= 6) appliesToday = true;
      }

      if (appliesToday) {
        // Parse time ranges e.g. "08:00 - 18:00"
        const timeMatch = hoursStr.match(/(\d{1,2})[:h](\d{2})\s*[-–]\s*(\d{1,2})[:h](\d{2})/);
        if (timeMatch) {
          const startMin = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
          const endMin = parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10);
          const currentTotalMin = gabonHour * 60 + gabonMinute;

          if (currentTotalMin >= startMin && currentTotalMin <= endMin) {
            return { isOpen: true, statusText: `Ouvert jusqu'à ${timeMatch[3]}:${timeMatch[4]}` };
          } else if (currentTotalMin < startMin) {
            return { isOpen: false, statusText: `Ouvre à ${timeMatch[1]}:${timeMatch[2]}` };
          } else {
            return { isOpen: false, statusText: 'Fermé pour la journée' };
          }
        }
      }
    }
  } catch (e) {
    // fallback
  }

  return { isOpen: true, statusText: 'Consulter horaires' };
}

/**
 * Get category configuration
 */
export function getCategoryInfo(categoryId: BusinessCategory): CategoryInfo {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (cat) return cat;
  return {
    id: categoryId,
    name: 'Général',
    nameEn: 'General',
    icon: 'Building2',
    color: '#059669',
    bgColor: '#d1fae5',
    description: 'Activités et services professionnels'
  };
}

/**
 * Get marker pin color based on sector
 */
export function getSectorPinColor(category: BusinessCategory): string {
  switch (category) {
    case 'banque_finance': return '#0284c7';
    case 'energie_mines': return '#ea580c';
    case 'hotellerie_tourisme': return '#0d9488';
    case 'restauration_bars': return '#e11d48';
    case 'commerce_distribution': return '#7c3aed';
    case 'sante_pharmacie': return '#16a34a';
    case 'btp_immobilier': return '#d97706';
    case 'telecoms_tech': return '#2563eb';
    case 'transport_logistique': return '#334155';
    case 'agroalimentaire_foret': return '#059669';
    case 'services_conseil': return '#4f46e5';
    case 'automobile_mecanique': return '#b91c1c';
    default: return '#009e60';
  }
}

/**
 * Format GPS coordinates in human-readable and standard formats
 */
export function formatGpsCoordinates(lat: number, lng: number): {
  decimal: string;
  dms: string;
} {
  const safeLat = typeof lat === 'number' ? lat : parseFloat(String(lat) || '0');
  const safeLng = typeof lng === 'number' ? lng : parseFloat(String(lng) || '0');

  const decimal = `${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`;

  const latHem = safeLat >= 0 ? 'N' : 'S';
  const lngHem = safeLng >= 0 ? 'E' : 'O';

  const latAbs = Math.abs(safeLat);
  const lngAbs = Math.abs(safeLng);

  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = Math.round(((latAbs - latDeg) * 60 - latMin) * 60);

  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = Math.round(((lngAbs - lngDeg) * 60 - lngMin) * 60);

  const dms = `${latDeg}°${latMin}'${latSec}"${latHem}, ${lngDeg}°${lngMin}'${lngSec}"${lngHem}`;

  return { decimal, dms };
}

/**
 * Generate Google Maps navigation URL (directions / itinerary)
 */
export function getGoogleMapsDirUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Generate Google Maps search / pin URL
 */
export function getGoogleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Copy coordinates to clipboard safely
 */
export async function copyCoordinatesToClipboard(lat: number, lng: number): Promise<boolean> {
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy coordinates:', err);
    return false;
  }
}

/**
 * Reverse geocode a GPS point in Gabon using OpenStreetMap Nominatim with safe fallbacks
 */
export async function reverseGeocodeGabon(lat: number, lng: number): Promise<{
  address?: string;
  city?: string;
  province?: string;
  district?: string;
  country?: string;
  displayName?: string;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GabonBusinessMap/2.0'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      const district = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district || '';
      const province = addr.state || addr.region || addr.county || '';
      const road = addr.road || addr.pedestrian || addr.footway || addr.house_number ? `${addr.house_number || ''} ${addr.road || ''}`.trim() : '';

      return {
        address: road || data.display_name?.split(',')[0] || '',
        city,
        province,
        district,
        country: addr.country || 'Gabon',
        displayName: data.display_name || ''
      };
    }
  } catch (err) {
    // Network or rate limit fallback
  }

  return {};
}

