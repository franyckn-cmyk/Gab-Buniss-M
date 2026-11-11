/**
 * Moteur Intelligent NLP & Recherche Tolérante aux Fautes pour GABON BUSINESS MAP
 * Spécialisé sur le contexte économique, toponymique et linguistique du Gabon.
 */

import { Business, Agency, BusinessCategory, ProvinceCode } from '../types';

// Villes et communes du Gabon avec leurs provinces
export const GABON_CITIES: Array<{ name: string; aliases: string[]; province: string; provinceCode: ProvinceCode }> = [
  { name: 'Libreville', aliases: ['libreville', 'lbv', 'libre-ville', 'librevil'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Akanda', aliases: ['akanda', 'angondje', 'angondjé', 'avorbam'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Owendo', aliases: ['owendo', 'alibandeng', 'port owendo', 'gare owendo'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Ntoum', aliases: ['ntoum', 'ntum'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Cocobeach', aliases: ['cocobeach', 'coco beach'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Kango', aliases: ['kango'], province: 'Estuaire', provinceCode: 'estuaire' },
  { name: 'Port-Gentil', aliases: ['port-gentil', 'port gentil', 'pog', 'port-gantil', 'portgentil', 'mandji'], province: 'Ogooué-Maritime', provinceCode: 'ogooue_maritime' },
  { name: 'Gamba', aliases: ['gamba'], province: 'Ogooué-Maritime', provinceCode: 'ogooue_maritime' },
  { name: 'Omboué', aliases: ['omboue', 'omboué'], province: 'Ogooué-Maritime', provinceCode: 'ogooue_maritime' },
  { name: 'Franceville', aliases: ['franceville', 'fcv', 'masuku', 'france ville', 'francevil'], province: 'Haut-Ogooué', provinceCode: 'haut_ogooue' },
  { name: 'Moanda', aliases: ['moanda', 'mwanda'], province: 'Haut-Ogooué', provinceCode: 'haut_ogooue' },
  { name: 'Mounana', aliases: ['mounana', 'munana'], province: 'Haut-Ogooué', provinceCode: 'haut_ogooue' },
  { name: 'Bakoumba', aliases: ['bakoumba'], province: 'Haut-Ogooué', provinceCode: 'haut_ogooue' },
  { name: 'Okondja', aliases: ['okondja'], province: 'Haut-Ogooué', provinceCode: 'haut_ogooue' },
  { name: 'Oyem', aliases: ['oyem', 'oyèm', 'oyeme'], province: 'Woleu-Ntem', provinceCode: 'woleu_ntem' },
  { name: 'Bitam', aliases: ['bitam'], province: 'Woleu-Ntem', provinceCode: 'woleu_ntem' },
  { name: 'Mitzic', aliases: ['mitzic', 'missic'], province: 'Woleu-Ntem', provinceCode: 'woleu_ntem' },
  { name: 'Minvoul', aliases: ['minvoul'], province: 'Woleu-Ntem', provinceCode: 'woleu_ntem' },
  { name: 'Lambaréné', aliases: ['lambarene', 'lambaréné', 'lambarene ville'], province: 'Moyen-Ogooué', provinceCode: 'moyen_ogooue' },
  { name: 'Ndjolé', aliases: ['ndjole', 'ndjolé', 'njole'], province: 'Moyen-Ogooué', provinceCode: 'moyen_ogooue' },
  { name: 'Mouila', aliases: ['mouila', 'muila'], province: 'Ngounié', provinceCode: 'ngounie' },
  { name: 'Ndendé', aliases: ['ndende', 'ndendé'], province: 'Ngounié', provinceCode: 'ngounie' },
  { name: 'Fougamou', aliases: ['fougamou'], province: 'Ngounié', provinceCode: 'ngounie' },
  { name: 'Tchibanga', aliases: ['tchibanga', 'chibanga'], province: 'Nyanga', provinceCode: 'nyanga' },
  { name: 'Mayumba', aliases: ['mayumba'], province: 'Nyanga', provinceCode: 'nyanga' },
  { name: 'Makokou', aliases: ['makokou'], province: 'Ogooué-Ivindo', provinceCode: 'ogooue_ivindo' },
  { name: 'Booué', aliases: ['booue', 'booué', 'boue'], province: 'Ogooué-Ivindo', provinceCode: 'ogooue_ivindo' },
  { name: 'Koulamoutou', aliases: ['koulamoutou', 'kulamutu'], province: 'Ogooué-Lolo', provinceCode: 'ogooue_lolo' },
  { name: 'Lastoursville', aliases: ['lastoursville', 'lastourville', 'mandji-lastour'], province: 'Ogooué-Lolo', provinceCode: 'ogooue_lolo' }
];

// Provinces et leurs variantes courantes
export const GABON_PROVINCES: Array<{ code: ProvinceCode; name: string; aliases: string[] }> = [
  { code: 'estuaire', name: 'Estuaire', aliases: ['estuaire', 'g1', 'g-1'] },
  { code: 'haut_ogooue', name: 'Haut-Ogooué', aliases: ['haut-ogooue', 'haut ogooue', 'haut ogooué', 'g2', 'g-2'] },
  { code: 'moyen_ogooue', name: 'Moyen-Ogooué', aliases: ['moyen-ogooue', 'moyen ogooue', 'moyen ogooué', 'g3', 'g-3'] },
  { code: 'ngounie', name: 'Ngounié', aliases: ['ngounie', 'ngounié', 'g4', 'g-4'] },
  { code: 'nyanga', name: 'Nyanga', aliases: ['nyanga', 'g5', 'g-5'] },
  { code: 'ogooue_ivindo', name: 'Ogooué-Ivindo', aliases: ['ogooue-ivindo', 'ogooue ivindo', 'ogooué ivindo', 'g6', 'g-6'] },
  { code: 'ogooue_lolo', name: 'Ogooué-Lolo', aliases: ['ogooue-lolo', 'ogooue lolo', 'ogooué lolo', 'g7', 'g-7'] },
  { code: 'ogooue_maritime', name: 'Ogooué-Maritime', aliases: ['ogooue-maritime', 'ogooue maritime', 'ogooué maritime', 'g8', 'g-8'] },
  { code: 'woleu_ntem', name: 'Woleu-Ntem', aliases: ['woleu-ntem', 'woleu ntem', 'woleu-n’tem', 'g9', 'g-9'] }
];

// Dictionnaire de correction orthographique et synonymes métiers
export interface ConceptDictionary {
  canonicalTerm: string;
  category?: BusinessCategory;
  misspellingsAndSynonyms: string[];
  suggestedAction: string;
}

export const VOCABULARY_CONCEPTS: ConceptDictionary[] = [
  {
    canonicalTerm: 'restaurant',
    category: 'restauration_bars',
    misspellingsAndSynonyms: [
      'restaurant', 'restauarant', 'restorant', 'restorant', 'restau', 'restos', 'resto', 
      'manger', 'repas', 'bouffe', 'dejeuner', 'déjeuner', 'diner', 'dîner', 'gastronomie', 
      'cuisine', 'africain', 'maquis', 'cafeteria', 'snack', 'fastfood', 'fast food', 'buffet'
    ],
    suggestedAction: 'Trouver un restaurant ou un lieu de restauration'
  },
  {
    canonicalTerm: 'plombier',
    category: 'btp_immobilier',
    misspellingsAndSynonyms: [
      'plombier', 'plonbier', 'plomberie', 'plomberi', 'plonberie', 'tuyau', 'tuyauterie', 
      'fuite d eau', 'fuite eau', 'sanitaire', 'robinet', 'chauffe eau', 'canalisation', 'debouchage'
    ],
    suggestedAction: 'Trouver des artisans et entreprises de plomberie'
  },
  {
    canonicalTerm: 'construction',
    category: 'btp_immobilier',
    misspellingsAndSynonyms: [
      'construction', 'constructon', 'contruction', 'construire', 'batiment', 'bâtiment', 
      'btp', 'chantier', 'macon', 'maçon', 'maconnerie', 'genie civil', 'travaux publics', 
      'charpente', 'peinture btp', 'immobilier', 'lotissement'
    ],
    suggestedAction: 'Rechercher des entreprises de construction et BTP'
  },
  {
    canonicalTerm: 'magasin de téléphone',
    category: 'telecoms_tech',
    misspellingsAndSynonyms: [
      'magasin de telephone', 'magazin de telephone', 'magasin de téléphone', 'magazin de téléphone', 
      'boutique de telephone', 'achat telephone', 'smartphone', 'iphone', 'samsung', 'portable', 
      'vendeur telephone', 'recharge', 'carte sim', 'puce', 'forfait'
    ],
    suggestedAction: 'Rechercher des boutiques de téléphones et opérateurs mobiles'
  },
  {
    canonicalTerm: 'banque',
    category: 'banque_finance',
    misspellingsAndSynonyms: [
      'banque', 'banq', 'bancaire', 'agence bancaire', 'agences bancaires', 'distributeur', 
      'dab', 'retrait argent', 'compte bancaire', 'virement', 'credit', 'epargne', 'microfinance', 
      'bgfi', 'bicig', 'uba', 'ecobank', 'orabank'
    ],
    suggestedAction: 'Rechercher des banques et agences bancaires'
  },
  {
    canonicalTerm: 'transport',
    category: 'transport_logistique',
    misspellingsAndSynonyms: [
      'transport', 'transp', 'transporteur', 'transporteurs', 'deplacement', 'voyager', 
      'voyage', 'bus', 'car', 'gare', 'train', 'transgabonais', 'setrag', 'fret', 'colis', 
      'camion', 'demenagement', 'demenageur', 'logistique', 'livraison'
    ],
    suggestedAction: 'Rechercher des compagnies de transport et fret'
  },
  {
    canonicalTerm: 'garage automobile',
    category: 'automobile_mecanique',
    misspellingsAndSynonyms: [
      'garage', 'garagiste', 'reparer ma voiture', 'reparer voiture', 'reparation auto', 
      'mecanique', 'mecanicien', 'mécanicien', 'panne', 'vidange', 'pneu', 'depannage', 
      'depanneuse', 'pieces detachees', 'controle technique', 'voiture'
    ],
    suggestedAction: 'Rechercher un garage ou mécanicien automobile'
  },
  {
    canonicalTerm: 'coiffeur',
    category: 'services_conseil',
    misspellingsAndSynonyms: [
      'coiffeur', 'coiffeure', 'coiffeuse', 'coiffure', 'salon de coiffure', 'barbier', 
      'tresses', 'locks', 'beaute', 'soins capillaires', 'esthétique'
    ],
    suggestedAction: 'Trouver un salon de coiffure ou de soins'
  },
  {
    canonicalTerm: 'santé & pharmacie',
    category: 'sante_pharmacie',
    misspellingsAndSynonyms: [
      'sante', 'santé', 'hopital', 'hôpital', 'clinique', 'pharmacie', 'medicament', 
      'médicaments', 'docteur', 'medecin', 'médecin', 'urgence', 'analyse medicale', 
      'laboratoire', 'dispensaire', 'soins'
    ],
    suggestedAction: 'Trouver une pharmacie ou structure médicale'
  },
  {
    canonicalTerm: 'hôtel',
    category: 'hotellerie_tourisme',
    misspellingsAndSynonyms: [
      'hotel', 'hôtel', 'hebergement', 'hébergement', 'dormir', 'chambre', 'auberge', 
      'residence hoteliere', 'lodge', 'ecolodge', 'tourisme', 'sejour'
    ],
    suggestedAction: 'Trouver un hôtel ou hébergement'
  },
  {
    canonicalTerm: 'ordinateur & informatique',
    category: 'telecoms_tech',
    misspellingsAndSynonyms: [
      'ordinateur', 'pc', 'laptop', 'informatique', 'materiel informatique', 'bureautique', 
      'reparation ordinateur', 'imprimante', 'scanner'
    ],
    suggestedAction: 'Trouver du matériel informatique et ordinateurs'
  },
  {
    canonicalTerm: 'supermarché',
    category: 'commerce_distribution',
    misspellingsAndSynonyms: [
      'supermarche', 'supermarché', 'alimentation', 'courses', 'centre commercial', 
      'hypermarche', 'prix import', 'mbolo', 'ckc', 'epicerie', 'boutique', 'magasin'
    ],
    suggestedAction: 'Trouver des supermarchés et commerces'
  }
];

// Entreprises phares multi-agences
export const MAJOR_COMPANIES_ALIASES: Record<string, { id: string; name: string }> = {
  'libertis': { id: 'moov-africa-libertis', name: 'Moov Africa Gabon Telecom (Libertis)' },
  'moov': { id: 'moov-africa-libertis', name: 'Moov Africa Gabon Telecom (Libertis)' },
  'moov africa': { id: 'moov-africa-libertis', name: 'Moov Africa Gabon Telecom (Libertis)' },
  'gabon telecom': { id: 'moov-africa-libertis', name: 'Moov Africa Gabon Telecom (Libertis)' },
  'liberti': { id: 'moov-africa-libertis', name: 'Moov Africa Gabon Telecom (Libertis)' },
  'bgfi': { id: 'bgfi-bank-gabon', name: 'BGFIBank Gabon' },
  'bgfibank': { id: 'bgfi-bank-gabon', name: 'BGFIBank Gabon' },
  'setrag': { id: 'setrag-owendo', name: 'SETRAG (Société d’Exploitation du Transgabonais)' },
  'transgabonais': { id: 'setrag-owendo', name: 'SETRAG (Société d’Exploitation du Transgabonais)' },
  'radisson': { id: 'radisson-blu-okoume', name: 'Radisson Blu Okoumé Palace Hotel' },
  'prix import': { id: 'prix-import-gabon', name: 'Prix Import Gabon' },
  'comilog': { id: 'comilog-moanda', name: 'COMILOG (Compagnie Minière de l’Ogooué)' },
  'schweitzer': { id: 'hopital-albert-schweitzer', name: 'Hôpital Albert Schweitzer' },
  'albert schweitzer': { id: 'hopital-albert-schweitzer', name: 'Hôpital Albert Schweitzer' }
};

/**
 * Normalise un texte : retire les accents, ponctuation, minuscules
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // suppression
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Vérifie si deux mots correspondent de manière floue (tolère 1 à 2 erreurs selon la longueur)
 */
export function isFuzzyMatch(wordA: string, wordB: string): boolean {
  if (wordA === wordB) return true;
  if (wordA.length < 3 || wordB.length < 3) return wordA === wordB;

  const maxErrors = wordA.length <= 4 || wordB.length <= 4 ? 1 : wordA.length <= 8 ? 2 : 3;
  const dist = levenshteinDistance(wordA, wordB);
  return dist <= maxErrors;
}

export interface ExtractedQueryIntent {
  rawQuery: string;
  normalizedQuery: string;
  correctedTerms: string[];
  correctedQuery: string;
  hasTypo: boolean;
  detectedCity?: { name: string; province: string; provinceCode: ProvinceCode };
  detectedProvince?: { name: string; code: ProvinceCode };
  detectedCategory?: BusinessCategory;
  detectedConcept?: ConceptDictionary;
  targetCompany?: { id: string; name: string };
  isNearMe: boolean;
  isAgencyQuery: boolean;
  searchKeywords: string[];
}

/**
 * Analyse approfondie de la requête en langage naturel avec tolérance aux fautes
 */
export function analyzeQueryIntent(query: string): ExtractedQueryIntent {
  const rawQuery = query || '';
  const normalized = normalizeText(rawQuery);
  const words = normalized.split(' ').filter(w => w.length > 0);

  // Détection proximité "près de moi"
  const isNearMe =
    normalized.includes('pres de moi') ||
    normalized.includes('autour de moi') ||
    normalized.includes('proche de moi') ||
    normalized.includes('a cote') ||
    normalized.includes('proche') ||
    normalized.includes('plus proche');

  // Détection demande d'agence(s)
  const isAgencyQuery =
    normalized.includes('agence') ||
    normalized.includes('agences') ||
    normalized.includes('succursale') ||
    normalized.includes('guichet') ||
    normalized.includes('point de vente') ||
    normalized.includes('ou se trouve') ||
    normalized.includes('ou trouver');

  // Détection Ville
  let detectedCity: { name: string; province: string; provinceCode: ProvinceCode } | undefined;
  for (const city of GABON_CITIES) {
    for (const alias of city.aliases) {
      const normAlias = normalizeText(alias);
      if (normalized.includes(normAlias)) {
        detectedCity = { name: city.name, province: city.province, provinceCode: city.provinceCode };
        break;
      }
      // Tolérance aux fautes sur la ville (ex: akanda, liberiville, etc.)
      for (const w of words) {
        if (w.length >= 4 && isFuzzyMatch(w, normAlias)) {
          detectedCity = { name: city.name, province: city.province, provinceCode: city.provinceCode };
          break;
        }
      }
      if (detectedCity) break;
    }
    if (detectedCity) break;
  }

  // Détection Province
  let detectedProvince: { name: string; code: ProvinceCode } | undefined;
  for (const prov of GABON_PROVINCES) {
    for (const alias of prov.aliases) {
      const normAlias = normalizeText(alias);
      if (normalized.includes(normAlias)) {
        detectedProvince = { name: prov.name, code: prov.code };
        break;
      }
      for (const w of words) {
        if (w.length >= 5 && isFuzzyMatch(w, normAlias)) {
          detectedProvince = { name: prov.name, code: prov.code };
          break;
        }
      }
      if (detectedProvince) break;
    }
    if (detectedProvince) break;
  }

  // Si une ville est détectée sans province explicite, associer la province de la ville
  if (detectedCity && !detectedProvince) {
    const provMatch = GABON_PROVINCES.find(p => p.code === detectedCity?.provinceCode);
    if (provMatch) {
      detectedProvince = { name: provMatch.name, code: provMatch.code };
    }
  }

  // Détection Entreprise Phare (Libertis, BGFIBank, etc.)
  let targetCompany: { id: string; name: string } | undefined;
  for (const [key, val] of Object.entries(MAJOR_COMPANIES_ALIASES)) {
    const normKey = normalizeText(key);
    if (normalized.includes(normKey)) {
      targetCompany = val;
      break;
    }
    for (const w of words) {
      if (w.length >= 4 && isFuzzyMatch(w, normKey)) {
        targetCompany = val;
        break;
      }
    }
    if (targetCompany) break;
  }

  // Détection Concept Métier / Catégorie avec correction orthographique
  let detectedConcept: ConceptDictionary | undefined;
  let correctedTerms: string[] = [];
  let hasTypo = false;

  for (const concept of VOCABULARY_CONCEPTS) {
    for (const syn of concept.misspellingsAndSynonyms) {
      const normSyn = normalizeText(syn);
      // Correspondance exacte ou inclusion
      if (normalized.includes(normSyn)) {
        detectedConcept = concept;
        if (normSyn !== normalizeText(concept.canonicalTerm)) {
          hasTypo = true;
          correctedTerms.push(`${syn} → ${concept.canonicalTerm}`);
        }
        break;
      }

      // Correspondance floue par mot (ex: restauarant, plombier, magazin, constructon)
      for (const w of words) {
        if (w.length >= 4 && isFuzzyMatch(w, normSyn)) {
          detectedConcept = concept;
          hasTypo = true;
          correctedTerms.push(`${w} → ${concept.canonicalTerm}`);
          break;
        }
      }
      if (detectedConcept) break;
    }
    if (detectedConcept) break;
  }

  // Reconstruction de la requête propre / corrigée
  let correctedQuery = rawQuery;
  if (detectedConcept && hasTypo) {
    correctedQuery = `${detectedConcept.canonicalTerm}${detectedCity ? ` à ${detectedCity.name}` : ''}${detectedProvince && !detectedCity ? ` dans l’${detectedProvince.name}` : ''}`;
  }

  // Mots-clés filtrés sans mots vides français
  const stopWords = new Set([
    'a', 'de', 'du', 'la', 'le', 'les', 'un', 'une', 'des', 'dans', 'au', 'aux', 
    'en', 'pour', 'sur', 'chez', 'ou', 'vers', 'je', 'cherche', 'trouve', 'moi', 
    'ou', 'trouver', 'quelles', 'sont', 'veux', 'peux', 'peut', 'bon', 'bonne', 
    'faire', 'est', 'il', 'existe', 't', 'il'
  ]);
  const searchKeywords = words.filter(w => !stopWords.has(w) && w.length > 2);

  return {
    rawQuery,
    normalizedQuery: normalized,
    correctedTerms,
    correctedQuery,
    hasTypo,
    detectedCity,
    detectedProvince,
    detectedCategory: detectedConcept?.category,
    detectedConcept,
    targetCompany,
    isNearMe,
    isAgencyQuery,
    searchKeywords
  };
}

export interface SmartSearchResult {
  intent: ExtractedQueryIntent;
  matchedBusinesses: Business[];
  matchedAgencies: Array<{ agency: Agency; parentBusiness: Business }>;
  interpretationText: string;
  didYouMean?: string;
  hasExactMatches: boolean;
}

/**
 * Moteur de recherche tolérant aux fautes et sensible au réseau multi-agences
 */
export function executeSmartSearch(
  query: string,
  businesses: Business[],
  userLocation?: { lat: number; lng: number }
): SmartSearchResult {
  const intent = analyzeQueryIntent(query);

  let candidateBusinesses: Business[] = [];
  let candidateAgencies: Array<{ agency: Agency; parentBusiness: Business }> = [];

  // 1. Si une entreprise cible est explicitement mentionnée (ex: Libertis, BGFIBank)
  if (intent.targetCompany) {
    const parent = businesses.find(b => b.id === intent.targetCompany?.id);
    if (parent) {
      candidateBusinesses.push(parent);

      const allAgencies = parent.agencies || parent.branches || [];
      if (allAgencies.length > 0) {
        // Filtrer par ville ou province si spécifié
        if (intent.detectedCity) {
          const cityLower = intent.detectedCity.name.toLowerCase();
          const cityAgencies = allAgencies.filter(
            a => a.location.city.toLowerCase() === cityLower || a.name.toLowerCase().includes(cityLower)
          );
          if (cityAgencies.length > 0) {
            cityAgencies.forEach(ag => candidateAgencies.push({ agency: ag, parentBusiness: parent }));
          } else {
            // Aucune agence dans cette ville précise, mais on propose les autres
            allAgencies.forEach(ag => candidateAgencies.push({ agency: ag, parentBusiness: parent }));
          }
        } else if (intent.detectedProvince) {
          const provCode = intent.detectedProvince.code;
          const provAgencies = allAgencies.filter(a => a.location.provinceCode === provCode);
          if (provAgencies.length > 0) {
            provAgencies.forEach(ag => candidateAgencies.push({ agency: ag, parentBusiness: parent }));
          } else {
            allAgencies.forEach(ag => candidateAgencies.push({ agency: ag, parentBusiness: parent }));
          }
        } else {
          // Toutes les agences du Gabon
          allAgencies.forEach(ag => candidateAgencies.push({ agency: ag, parentBusiness: parent }));
        }
      }
    }
  }

  // 2. Recherche générale par concept, catégorie, ville ou mots-clés
  if (candidateBusinesses.length === 0) {
    const scoredBusinesses: Array<{ business: Business; score: number }> = [];

    for (const b of businesses) {
      let score = 0;

      // Score par catégorie correspondante
      if (intent.detectedCategory && b.category === intent.detectedCategory) {
        score += 40;
      }

      // Score par ville du siège
      if (intent.detectedCity) {
        const cityLower = intent.detectedCity.name.toLowerCase();
        if (b.location.city.toLowerCase() === cityLower) score += 30;
        if (b.location.district.toLowerCase().includes(cityLower)) score += 20;

        // Ou score si une de ses agences est dans cette ville !
        const agencies = b.agencies || b.branches || [];
        const matchingAgency = agencies.find(a => a.location.city.toLowerCase() === cityLower);
        if (matchingAgency) {
          score += 35;
          candidateAgencies.push({ agency: matchingAgency, parentBusiness: b });
        }
      }

      // Score par province
      if (intent.detectedProvince) {
        if (b.location.provinceCode === intent.detectedProvince.code) score += 20;
        const agencies = b.agencies || b.branches || [];
        const provAgency = agencies.find(a => a.location.provinceCode === intent.detectedProvince?.code);
        if (provAgency && !candidateAgencies.some(ca => ca.agency.id === provAgency.id)) {
          score += 25;
          candidateAgencies.push({ agency: provAgency, parentBusiness: b });
        }
      }

      // Score par correspondance de mots-clés sur le nom, description et services
      const normName = normalizeText(b.name);
      const normDesc = normalizeText(b.description);
      const normServices = normalizeText(b.details.services.join(' '));

      for (const kw of intent.searchKeywords) {
        if (normName.includes(kw)) score += 25;
        if (normDesc.includes(kw)) score += 10;
        if (normServices.includes(kw)) score += 15;

        // Tolérance floue
        const nameTokens = normName.split(' ');
        if (nameTokens.some(t => isFuzzyMatch(t, kw))) score += 15;
      }

      // Bonus note et fiches vérifiées
      if (b.status === 'verified') score += 5;
      score += Math.min(5, b.rating);

      if (score > 10) {
        scoredBusinesses.push({ business: b, score });
      }
    }

    // Tri par pertinence décroissante
    scoredBusinesses.sort((a, b) => b.score - a.score);
    candidateBusinesses = scoredBusinesses.map(sb => sb.business);
  }

  // Si recherche "près de moi" et qu'on a des coordonnées GPS
  if (intent.isNearMe && userLocation) {
    const calcDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    candidateBusinesses.sort((a, b) => {
      const distA = calcDistanceKm(userLocation.lat, userLocation.lng, a.location.coordinates.lat, a.location.coordinates.lng);
      const distB = calcDistanceKm(userLocation.lat, userLocation.lng, b.location.coordinates.lat, b.location.coordinates.lng);
      return distA - distB;
    });
  }

  // Construction du texte d'interprétation humaine
  let interpretationText = '';
  if (intent.targetCompany) {
    interpretationText = `Recherche ciblée sur l’entreprise **${intent.targetCompany.name}**`;
    if (intent.detectedCity) interpretationText += ` dans la ville de **${intent.detectedCity.name}**`;
    else if (intent.detectedProvince) interpretationText += ` dans la province du **${intent.detectedProvince.name}**`;
    else interpretationText += ` à travers ses agences au Gabon`;
  } else if (intent.detectedConcept) {
    interpretationText = `Recherche de **${intent.detectedConcept.canonicalTerm}**`;
    if (intent.detectedCity) interpretationText += ` à **${intent.detectedCity.name}**`;
    else if (intent.detectedProvince) interpretationText += ` dans la province **${intent.detectedProvince.name}**`;
  } else if (intent.detectedCity) {
    interpretationText = `Entreprises répertoriées à **${intent.detectedCity.name}** (${intent.detectedCity.province})`;
  } else {
    interpretationText = `Recherche dans l’annuaire des entreprises gabonaises`;
  }

  const hasExactMatches = candidateBusinesses.length > 0 || candidateAgencies.length > 0;

  let didYouMean: string | undefined;
  if (intent.hasTypo && intent.correctedTerms.length > 0) {
    didYouMean = intent.correctedQuery;
  }

  return {
    intent,
    matchedBusinesses: candidateBusinesses.slice(0, 8),
    matchedAgencies: candidateAgencies.slice(0, 6),
    interpretationText,
    didYouMean,
    hasExactMatches
  };
}

/**
 * Générateur de réponse conversationnelle en français structuré, respectant le contexte gabonais
 */
export function buildConversationalAnswer(
  searchResult: SmartSearchResult,
  allBusinesses: Business[]
): string {
  const { intent, matchedBusinesses, matchedAgencies, hasExactMatches, didYouMean } = searchResult;

  // Cas 1 : Requête sur une entreprise multi-agences (ex : Libertis ou BGFIBank)
  if (intent.targetCompany) {
    const company = matchedBusinesses[0];
    const agencies = matchedAgencies.map(m => m.agency);

    if (company && agencies.length > 0) {
      const cityFilter = intent.detectedCity?.name;
      let resp = `🇬🇦 **${company.name}** dispose d'un solide réseau de succursales réparties sur le territoire gabonais.\n\n`;

      if (cityFilter) {
        const matchingCityAgencies = agencies.filter(
          a => a.location.city.toLowerCase() === cityFilter.toLowerCase()
        );
        if (matchingCityAgencies.length > 0) {
          resp += `Voici l'agence identifiée à **${cityFilter}** :\n`;
          matchingCityAgencies.forEach(ag => {
            resp += `\n📍 **${ag.name}**`;
            resp += `\n- **Adresse :** ${ag.location.address} (${ag.location.district})`;
            resp += `\n- **Téléphone :** ${ag.contact.phone}`;
            resp += `\n- **Horaires :** ${Object.entries(ag.openingHours).map(([d, h]) => `${d}: ${h}`).join(', ')}`;
            resp += `\n- **Statut :** ${ag.status === 'open' ? '🟢 Ouverte' : '🟡 Fermée temporairement'}`;
            resp += `\n- **Précision GPS :** ${ag.gpsPrecision === 'exact' ? 'Exacte certifiée' : 'Approximative'}`;
          });
        } else {
          resp += `Aucune agence dédiée n'est répertoriée directement à ${cityFilter}, mais voici les principales agences disponibles au Gabon :\n`;
          agencies.slice(0, 4).forEach(ag => {
            resp += `\n• **${ag.name}** (${ag.location.city} - ${ag.location.province}) : Tél ${ag.contact.phone}`;
          });
        }
      } else {
        resp += `L'entreprise compte **${agencies.length} agences enregistrées** au Gabon :\n`;
        agencies.forEach((ag, idx) => {
          resp += `\n${idx + 1}. **${ag.name}** (${ag.location.city} – ${ag.location.province})`;
          resp += `\n   - Adresse : ${ag.location.address}`;
          resp += `\n   - Contact : ${ag.contact.phone}`;
          resp += `\n   - Statut : ${ag.status === 'open' ? 'Ouvert' : 'Fermé'}`;
        });
      }

      resp += `\n\n💡 *Vous pouvez cliquer sur les fiches ci-dessous pour voir l'itinéraire Google Maps ou ouvrir la localisation exacte sur la carte interactive.*`;
      return resp;
    }
  }

  // Cas 2 : Résultats trouvés (restaurants, banques, BTP, etc.)
  if (hasExactMatches) {
    let intro = '';
    if (didYouMean) {
      intro += `*(Correction automatique prise en compte : « ${didYouMean} »)*\n\n`;
    }

    if (intent.detectedCity && intent.detectedConcept) {
      intro += `Voici les options de **${intent.detectedConcept.canonicalTerm}** répertoriées à **${intent.detectedCity.name}** (${intent.detectedCity.province}) :\n\n`;
    } else if (intent.detectedCity) {
      intro += `Voici les établissements disponibles à **${intent.detectedCity.name}** :\n\n`;
    } else if (intent.detectedProvince) {
      intro += `Voici les entreprises trouvées dans la province de **${intent.detectedProvince.name}** :\n\n`;
    } else if (intent.detectedConcept) {
      intro += `Voici les professionnels et entreprises en **${intent.detectedConcept.canonicalTerm}** enregistrés sur Gabon Business Map :\n\n`;
    } else {
      intro += `J'ai trouvé plusieurs entreprises correspondant à votre recherche :\n\n`;
    }

    let itemsList = '';
    matchedBusinesses.slice(0, 4).forEach((b, idx) => {
      itemsList += `${idx + 1}. **${b.name}** ⭐ ${b.rating}/5 (${b.reviewsCount} avis)\n`;
      itemsList += `   - **Localisation :** ${b.location.city} (${b.location.district || b.location.province})\n`;
      itemsList += `   - **Activité :** ${b.details.services.slice(0, 2).join(', ')}\n`;
      itemsList += `   - **Contact :** ${b.contact.phone}${b.contact.whatsapp ? ` • WhatsApp : ${b.contact.whatsapp}` : ''}\n\n`;
    });

    if (matchedAgencies.length > 0) {
      itemsList += `🏢 **Agences locales rattachées :**\n`;
      matchedAgencies.slice(0, 2).forEach(ma => {
        itemsList += `• **${ma.agency.name}** (${ma.parentBusiness.name}) : ${ma.agency.location.address} - Tél: ${ma.agency.contact.phone}\n`;
      });
    }

    return intro + itemsList + `\n👉 Vous pouvez cliquer sur une fiche pour consulter les détails complets, horaires d'ouverture et géolocalisation.`;
  }

  // Cas 3 : Aucun résultat direct
  let noResultResp = `Mbolo ! Aucun résultat exact n'a été trouvé pour votre demande.`;
  if (intent.detectedConcept && intent.detectedCity) {
    noResultResp = `Aucune entreprise de **${intent.detectedConcept.canonicalTerm}** n'est encore enregistrée précisément à **${intent.detectedCity.name}** dans notre annuaire.`;
  }

  noResultResp += `\n\n💡 **Suggestions pour votre recherche :**\n`;
  noResultResp += `• Vérifiez si l'entreprise ou le service est situé dans une ville proche (ex: Libreville, Akanda, Port-Gentil ou Franceville).\n`;
  noResultResp += `• Essayez une recherche plus large comme « banques au Gabon », « restaurants à Libreville » ou « agences Libertis ».\n`;
  noResultResp += `• Si vous êtes propriétaire d'un établissement dans ce secteur, vous pouvez le référencer gratuitement via le bouton « Référencer mon entreprise ».`;

  return noResultResp;
}

/**
 * Suggestions d'autocomplétion en temps réel avec tolérance aux fautes
 */
export function getSmartSearchSuggestions(input: string): string[] {
  if (!input || input.trim().length < 2) {
    return [
      'Restaurants à Libreville',
      'Agences Libertis au Gabon',
      'Banques à Port-Gentil',
      'Plombiers à Akanda',
      'Magasins de téléphone à Franceville'
    ];
  }

  const norm = normalizeText(input);
  const suggestions: string[] = [];

  // 1. Suggestions basées sur les concepts
  for (const c of VOCABULARY_CONCEPTS) {
    for (const syn of c.misspellingsAndSynonyms) {
      if (syn.startsWith(norm) || isFuzzyMatch(norm, syn.slice(0, norm.length + 1))) {
        suggestions.push(`${c.canonicalTerm} à Libreville`);
        suggestions.push(`${c.canonicalTerm} à Port-Gentil`);
        break;
      }
    }
  }

  // 2. Suggestions basées sur les entreprises majeures
  for (const [alias, comp] of Object.entries(MAJOR_COMPANIES_ALIASES)) {
    if (alias.startsWith(norm) || isFuzzyMatch(norm, alias.slice(0, norm.length + 1))) {
      suggestions.push(`Agences de ${comp.name}`);
      suggestions.push(`${comp.name} à Libreville`);
      suggestions.push(`${comp.name} à Port-Gentil`);
    }
  }

  // 3. Suggestions basées sur les villes
  for (const city of GABON_CITIES) {
    if (normalizeText(city.name).startsWith(norm)) {
      suggestions.push(`Entreprises à ${city.name}`);
      suggestions.push(`Restaurants à ${city.name}`);
      suggestions.push(`Hôtels à ${city.name}`);
    }
  }

  // Dédoublonner et limiter à 5
  return Array.from(new Set(suggestions)).slice(0, 5);
}
