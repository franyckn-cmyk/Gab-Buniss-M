import { useEffect } from 'react';
import { Business } from '../types';

export interface SEOData {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
  canonicalUrl?: string;
  jsonLd?: object;
}

/**
 * Sets or creates a meta tag in document head
 */
function setMetaTag(selector: string, attribute: 'name' | 'property', name: string, content: string) {
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Updates document title, meta tags, and structured data
 */
export function updateDocumentSEO(data: SEOData): void {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  document.title = data.title;

  // 2. Standard Meta Description
  setMetaTag('meta[name="description"]', 'name', 'description', data.description);

  // 3. OpenGraph tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', data.ogTitle || data.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', data.ogDescription || data.description);
  
  if (data.image) {
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', data.image);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', data.image);
  }

  // 4. Twitter tags
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', data.ogTitle || data.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', data.ogDescription || data.description);

  // 5. Canonical link tag
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const canonicalUrl = data.canonicalUrl || currentOrigin;
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonicalUrl) {
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);
  }

  // 6. JSON-LD structured data tag
  const scriptId = 'gabon-business-map-jsonld';
  let jsonLdScript = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (data.jsonLd) {
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = scriptId;
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(data.jsonLd);
  } else if (jsonLdScript) {
    jsonLdScript.remove();
  }
}

/**
 * Resolves SEO configurations for tabs or individual businesses
 */
export function getPageSEOConfig(activeTab: string, selectedBusiness?: Business | null): SEOData {
  // If a business is selected / modal is active, prioritize business-specific rich SEO
  if (selectedBusiness) {
    const city = selectedBusiness.location.city;
    const province = selectedBusiness.location.province;
    const category = selectedBusiness.subCategory || selectedBusiness.category;
    const descExcerpt = selectedBusiness.description
      ? selectedBusiness.description.replace(/\s+/g, ' ').slice(0, 140) + '...'
      : `Consultez les horaires, contacts et avis pour ${selectedBusiness.name}.`;

    return {
      title: `${selectedBusiness.name} à ${city} (${province}) | Gabon Business Map`,
      description: `${selectedBusiness.name} – ${category} à ${city}, Gabon. ${descExcerpt}`,
      image: selectedBusiness.coverImage || selectedBusiness.logo,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: selectedBusiness.name,
        legalName: selectedBusiness.legalName || selectedBusiness.name,
        description: selectedBusiness.description,
        image: selectedBusiness.coverImage || selectedBusiness.logo,
        telephone: selectedBusiness.contact.phone,
        email: selectedBusiness.contact.email,
        url: selectedBusiness.contact.website || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: selectedBusiness.location.address,
          addressLocality: selectedBusiness.location.city,
          addressRegion: selectedBusiness.location.province,
          addressCountry: 'GA'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: selectedBusiness.location.coordinates.lat,
          longitude: selectedBusiness.location.coordinates.lng
        },
        aggregateRating: selectedBusiness.reviewsCount > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: selectedBusiness.rating,
          reviewCount: selectedBusiness.reviewsCount,
          bestRating: 5,
          worstRating: 1
        } : undefined
      }
    };
  }

  // Otherwise, configure per active tab
  switch (activeTab) {
    case 'map':
      return {
        title: 'Carte Interactive du Gabon | Localisation des Entreprises par Province',
        description: 'Explorez la carte interactive des entreprises dans les 9 provinces gabonaises. Repérez commerces, cliniques et services avec itinéraire GPS en direct.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Carte Interactive des Entreprises au Gabon',
          description: 'Cartographie dynamique nationale pour localiser les entreprises au Gabon.'
        }
      };

    case 'directory':
      return {
        title: 'Annuaire des Entreprises au Gabon | Recherche, Filtres & Avis',
        description: 'Consultez l’annuaire complet des entreprises au Gabon. Filtrez par secteur, province, ville et note des clients certifiés.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Annuaire des Entreprises au Gabon',
          description: 'Annuaire officiel des professionnels, commerces et industries au Gabon.'
        }
      };

    case 'provinces':
      return {
        title: 'Les 9 Provinces du Gabon | Pôles Économiques & Entreprises Locales',
        description: 'Découvrez le tissu économique des 9 provinces du Gabon : Estuaire, Haut-Ogooué, Moyen-Ogooué, Ngounié, Nyanga, Ogooué-Maritime, Woleu-Ntem.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Les 9 Provinces du Gabon',
          description: 'Panorama régional et économique des provinces gabonaises.'
        }
      };

    case 'promotions':
      return {
        title: 'Offres & Bons Plans des Entreprises au Gabon | Gabon Business Map',
        description: 'Profitez des remises, offres promotionnelles exclusives et nouveautés publiées par les commerces et prestataires à Libreville et dans tout le Gabon.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'OfferCatalog',
          name: 'Offres promotionnelles des entreprises au Gabon'
        }
      };

    case 'comparator':
      return {
        title: 'Comparateur d’Entreprises au Gabon | Gabon Business Map',
        description: 'Comparez côte-à-côte les prestations, horaires, avis et coordonnées des entreprises et professionnels gabonais.',
      };

    case 'agents':
      return {
        title: 'Équipe Multi-Agents IA | Architecture Gabon Business Map',
        description: 'Découvrez l’organisation et les livrables des 9 agents IA spécialisés ayant conçu et développé Gabon Business Map.',
      };

    case 'admin_dashboard':
      return {
        title: 'Tableau de bord Administrateur | Gabon Business Map',
        description: 'Espace de modération et gestion centralisée des entreprises, avis et signalements d’erreurs au Gabon.',
      };

    case 'pro_dashboard':
      return {
        title: 'Espace Professionnel & Statistiques | Gabon Business Map',
        description: 'Tableau de bord pour chefs d’entreprise : suivi des vues de fiche, clics téléphone, WhatsApp, itinéraires et gestion des avis.',
      };

    case 'home':
    default:
      return {
        title: 'Gabon Business Map | Annuaire & Cartographie des Entreprises au Gabon',
        description: 'Plateforme nationale interactive de référencement, géolocalisation et découverte des entreprises dans les 9 provinces du Gabon avec cartographie et assistant IA.',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Gabon Business Map',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          description: 'Annuaire numérique et cartographie interactive des entreprises au Gabon avec assistant IA.',
          inLanguage: 'fr-GA'
        }
      };
  }
}

/**
 * Custom React Hook to keep document title and meta description synced
 */
export function useDynamicSEO(activeTab: string, selectedBusiness?: Business | null): void {
  useEffect(() => {
    const config = getPageSEOConfig(activeTab, selectedBusiness);
    updateDocumentSEO(config);
  }, [activeTab, selectedBusiness]);
}
