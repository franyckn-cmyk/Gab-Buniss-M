import type { Province, CategoryInfo, Business, Promotion, Review, AgentContribution, UserAccount } from '../types/index.ts';

export const PROVINCES: Province[] = [
  {
    id: 'estuaire',
    name: 'Estuaire',
    capital: 'Libreville',
    mainCities: ['Libreville', 'Owendo', 'Akanda', 'Ntoum', 'Kango'],
    coordinates: { lat: 0.3901, lng: 9.4544 },
    zoomLevel: 11,
    description: 'Poumon politique, financier et tertiaire du Gabon abritant la capitale Libreville et le port d’Owendo.',
    economicKey: 'Services financiers, Sièges d’entreprises, Port de commerce, Zone Économique Spéciale de Nkok.',
    flagAccent: '#009e60',
  },
  {
    id: 'haut_ogooue',
    name: 'Haut-Ogooué',
    capital: 'Franceville',
    mainCities: ['Franceville', 'Moanda', 'Mounana', 'Bongoville', 'Bakoumba'],
    coordinates: { lat: -1.6333, lng: 13.5833 },
    zoomLevel: 11,
    description: 'Pôle minier et universitaire stratégique mondial pour le manganèse de Moanda et terminus du Transgabonais.',
    economicKey: 'Extraction minière de manganèse (Comilog), métallurgie, recherche médicale (CIRMF).',
    flagAccent: '#fcd116',
  },
  {
    id: 'moyen_ogooue',
    name: 'Moyen-Ogooué',
    capital: 'Lambaréné',
    mainCities: ['Lambaréné', 'Ndjolé'],
    coordinates: { lat: -0.7001, lng: 10.2300 },
    zoomLevel: 11,
    description: 'Carrefour fluvial et historique réputé mondialement pour l’Hôpital Albert Schweitzer et son réseau de lacs.',
    economicKey: 'Pêche continentale, écotourisme fluvial, santé, transport fluvial et routier.',
    flagAccent: '#3a75c4',
  },
  {
    id: 'ngounie',
    name: 'Ngounié',
    capital: 'Mouila',
    mainCities: ['Mouila', 'Ndendé', 'Fougamou', 'Lébamba', 'Mbigou'],
    coordinates: { lat: -1.8685, lng: 11.0559 },
    zoomLevel: 11,
    description: 'Vaste bassin agricole et agro-industriel au centre-sud du pays, traversé par la rivière Ngounié.',
    economicKey: 'Palmier à huile (Olam Palm), agro-pastoral, forêt, artisanat et commerce de transit.',
    flagAccent: '#009e60',
  },
  {
    id: 'nyanga',
    name: 'Nyanga',
    capital: 'Tchibanga',
    mainCities: ['Tchibanga', 'Mayumba', 'Moabi'],
    coordinates: { lat: -2.8500, lng: 11.0333 },
    zoomLevel: 11,
    description: 'Province côtière méridionale célèbre pour le parc national de Mayumba, ses savanes et son potentiel halieutique.',
    economicKey: 'Écotourisme marin, pêche artisanale et industrielle, marbre, élevage bovin.',
    flagAccent: '#3a75c4',
  },
  {
    id: 'ogooue_ivindo',
    name: 'Ogooué-Ivindo',
    capital: 'Makokou',
    mainCities: ['Makokou', 'Booué', 'Ovan', 'Mékambo'],
    coordinates: { lat: 0.5739, lng: 12.8642 },
    zoomLevel: 10,
    description: 'Royaume de la forêt équatoriale profonde, des chutes de l’Ivindo (Kongou, Mingouli) et du gisement de fer de Bélinga.',
    economicKey: 'Éco-foresterie durable, biodiversité mondiale, grand projet minier de Bélinga.',
    flagAccent: '#009e60',
  },
  {
    id: 'ogooue_lolo',
    name: 'Ogooué-Lolo',
    capital: 'Koulamoutou',
    mainCities: ['Koulamoutou', 'Lastoursville', 'Pana', 'Iboundji'],
    coordinates: { lat: -1.1333, lng: 12.4833 },
    zoomLevel: 11,
    description: 'Province centrale vallonnée, berceau de l’exploitation forestière certifiée et des grottes historiques de Lastoursville.',
    economicKey: 'Transformation industrielle du bois, écotourisme spéléologique, agriculture vivrière.',
    flagAccent: '#fcd116',
  },
  {
    id: 'ogooue_maritime',
    name: 'Ogooué-Maritime',
    capital: 'Port-Gentil',
    mainCities: ['Port-Gentil', 'Gamba', 'Omboué'],
    coordinates: { lat: -0.7193, lng: 8.7815 },
    zoomLevel: 12,
    description: 'Capitale économique du Gabon et centre névralgique de l’industrie pétrolière et parapétrolière nationale.',
    economicKey: 'Production & raffinage pétrolier, services offshore, transformation du bois (okoumé), port en eau profonde.',
    flagAccent: '#3a75c4',
  },
  {
    id: 'woleu_ntem',
    name: 'Woleu-Ntem',
    capital: 'Oyem',
    mainCities: ['Oyem', 'Bitam', 'Mitzic', 'Minvoul', 'Medouneu'],
    coordinates: { lat: 1.5995, lng: 11.5793 },
    zoomLevel: 11,
    description: 'Zone frontalière stratégique bordant le Cameroun et la Guinée Équatoriale, premier bassin cacaoyer du Gabon.',
    economicKey: 'Commerce transfrontalier CEMAC, cacao, caoutchouc naturel, agriculture maraîchère.',
    flagAccent: '#009e60',
  },
];

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'banque_finance',
    name: 'Banque & Finance',
    nameEn: 'Banking & Finance',
    icon: 'Landmark',
    color: '#0284c7', // Sky-600
    bgColor: '#e0f2fe',
    description: 'Banques commerciales, microfinance, assurances et services de transfert d’argent.',
  },
  {
    id: 'energie_mines',
    name: 'Énergie, Pétrole & Mines',
    nameEn: 'Energy, Oil & Mining',
    icon: 'Flame',
    color: '#ea580c', // Orange-600
    bgColor: '#ffedd5',
    description: 'Pétrole offshore, exploitation minière de manganèse et fer, énergie et eau.',
  },
  {
    id: 'hotellerie_tourisme',
    name: 'Hôtellerie & Tourisme',
    nameEn: 'Hospitality & Tourism',
    icon: 'Hotel',
    color: '#0d9488', // Teal-600
    bgColor: '#ccfbf1',
    description: 'Hôtels, résidences hôtelières, écolodges et agences de tourisme réceptif.',
  },
  {
    id: 'restauration_bars',
    name: 'Restaurants & Gastronomie',
    nameEn: 'Restaurants & Dining',
    icon: 'Utensils',
    color: '#e11d48', // Rose-600
    bgColor: '#ffe4e6',
    description: 'Cuisine gabonaise locale, gastronomie internationale, cafés et glaciers.',
  },
  {
    id: 'commerce_distribution',
    name: 'Commerce & Supermarchés',
    nameEn: 'Retail & Supermarkets',
    icon: 'ShoppingBag',
    color: '#7c3aed', // Violet-600
    bgColor: '#ede9fe',
    description: 'Grandes surfaces, épiceries de quartier, import-export et quincailleries.',
  },
  {
    id: 'sante_pharmacie',
    name: 'Santé & Pharmacies',
    nameEn: 'Healthcare & Pharmacies',
    icon: 'HeartPulse',
    color: '#16a34a', // Green-600
    bgColor: '#dcfce7',
    description: 'Cliniques, hôpitaux, pharmacies de garde, laboratoires d’analyses et cabinets.',
  },
  {
    id: 'btp_immobilier',
    name: 'BTP & Immobilier',
    nameEn: 'Construction & Real Estate',
    icon: 'Building2',
    color: '#d97706', // Amber-600
    bgColor: '#fef3c7',
    description: 'Génie civil, travaux publics, architecture, promotion immobilière et matériaux.',
  },
  {
    id: 'telecoms_tech',
    name: 'Télécoms & Numérique',
    nameEn: 'Telecoms & Tech',
    icon: 'Smartphone',
    color: '#2563eb', // Blue-600
    bgColor: '#dbeafe',
    description: 'Opérateurs de téléphonie, fournisseurs internet, agences digitales et startups.',
  },
  {
    id: 'transport_logistique',
    name: 'Transport & Logistique',
    nameEn: 'Transport & Logistics',
    icon: 'Truck',
    color: '#475569', // Slate-600
    bgColor: '#f1f5f9',
    description: 'Fret maritime, transport ferroviaire (SETRAG), aérien, agences de voyage et bus.',
  },
  {
    id: 'agroalimentaire_foret',
    name: 'Agroalimentaire & Forêt',
    nameEn: 'Agri-food & Timber',
    icon: 'Trees',
    color: '#059669', // Emerald-600
    bgColor: '#d1fae5',
    description: 'Transformation du bois certifié, cultures pérennes (palmier, cacao), élevage et pêche.',
  },
  {
    id: 'services_conseil',
    name: 'Services aux Entreprises',
    nameEn: 'Corporate Services',
    icon: 'Briefcase',
    color: '#4f46e5', // Indigo-600
    bgColor: '#e0e7ff',
    description: 'Cabinets juridiques, comptabilité, audit, sécurité privée et agences de com.',
  },
  {
    id: 'automobile_mecanique',
    name: 'Automobile & Mobilité',
    nameEn: 'Automotive & Mobility',
    icon: 'Car',
    color: '#b91c1c', // Red-700
    bgColor: '#fee2e2',
    description: 'Concessionnaires automobiles, garages agréés, pièces détachées et contrôle technique.',
  },
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'moov-africa-libertis',
    name: 'Moov Africa Gabon Telecom (Libertis)',
    legalName: 'Gabon Telecom S.A. / Moov Africa',
    slug: 'moov-africa-libertis-gabon',
    category: 'telecoms_tech',
    subCategory: 'Opérateur Téléphonie & Internet Fixe / Mobile',
    description: 'Opérateur historique des télécommunications au Gabon, fournissant la téléphonie mobile (Libertis), l’Internet très haut débit par Fibre optique et les services financiers Moov Money à travers un réseau national d’agences.',
    logo: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1999,
    nif: 'GA-9912044-LIB',
    rating: 4.6,
    reviewsCount: 47,
    gpsPrecision: 'exact',
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '1er Arrondissement',
      district: 'Bord de Mer - Centre Ville',
      address: 'Boulevard Triomphal Omar Bongo, Immeuble Libertis',
      coordinates: { lat: 0.4022, lng: 9.4478 },
    },
    contact: {
      phone: '+241 11 79 12 12',
      phoneSecondary: '+241 66 00 22 22',
      email: 'serviceclient@moov-africa.ga',
      website: 'https://www.moov-africa.ga',
      whatsapp: '+241 66 00 22 22',
      facebook: 'https://facebook.com/MoovAfricaGabon',
      linkedin: 'https://linkedin.com/company/moov-africa-gabon-telecom'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:45 - 17:00',
        'Samedi': '08:30 - 13:00',
        'Dimanche': 'Fermé'
      },
      paymentMethods: ['Moov Money', 'Airtel Money', 'Carte bancaire', 'Espèces'],
      services: ['Abonnements Fibre Optique', 'Recharges & Cartes SIM Libertis', 'Transferts d’argent Moov Money', 'Solutions Internet Entreprises', 'Vente de Smartphones 4G/5G'],
      facilities: ['Climatisation', 'Accessible PMR', 'Borne libre-service Moov Money', 'Parking clients']
    },
    stats: {
      views: 6420,
      phoneClicks: 580,
      whatsappClicks: 710,
      routeClicks: 620,
      favorites: 310
    },
    createdAt: '2024-01-02T08:00:00Z',
    claimed: true,
    claimedByEmail: 'admin@moov-africa.ga',
    branches: [
      {
        id: 'branch-libertis-siege-lbv',
        businessId: 'moov-africa-libertis',
        name: 'Siège Central & Agence Principale Libertis - Libreville',
        code: 'LIB-EST-01',
        isMainBranch: true,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Estuaire',
          provinceCode: 'estuaire',
          city: 'Libreville',
          arrondissement: '1er Arrondissement',
          district: 'Centre-Ville Triomphal',
          address: 'Boulevard Triomphal Omar Bongo, Face Ministère des Affaires Étrangères',
          coordinates: { lat: 0.4022, lng: 9.4478 }
        },
        contact: {
          phone: '+241 11 79 12 12',
          phoneSecondary: '+241 66 00 22 22',
          email: 'agence.triomphal@moov-africa.ga',
          whatsapp: '+241 66 00 22 22'
        },
        openingHours: {
          'Lundi - Vendredi': '07:45 - 17:00',
          'Samedi': '08:30 - 13:00',
          'Dimanche': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Arnaud Mengue',
        createdAt: '2024-01-02T08:00:00Z'
      },
      {
        id: 'branch-libertis-franceville',
        businessId: 'moov-africa-libertis',
        name: 'Agence Libertis - Franceville',
        code: 'LIB-HO-02',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Haut-Ogooué',
          provinceCode: 'haut_ogooue',
          city: 'Franceville',
          district: 'Quartier Poto-Poto / Centre Commercial',
          address: 'Avenue de l’Indépendance, Face à la Pharmacie des Plateaux, Franceville',
          coordinates: { lat: -1.6324, lng: 13.5842 }
        },
        contact: {
          phone: '+241 11 67 20 40',
          email: 'agence.franceville@moov-africa.ga',
          whatsapp: '+241 66 12 40 50'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:30',
          'Samedi': '08:30 - 12:30',
          'Dimanche': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Sylvie Ondounet',
        createdAt: '2024-01-05T09:00:00Z'
      },
      {
        id: 'branch-libertis-port-gentil',
        businessId: 'moov-africa-libertis',
        name: 'Agence Libertis - Port-Gentil',
        code: 'LIB-OM-03',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Ogooué-Maritime',
          provinceCode: 'ogooue_maritime',
          city: 'Port-Gentil',
          district: 'Quartier du Port / Centre Commercial',
          address: 'Boulevard Léon Mba, Immeuble Libertis, BP 600, Port-Gentil',
          coordinates: { lat: -0.7185, lng: 8.7812 }
        },
        contact: {
          phone: '+241 11 55 42 00',
          email: 'agence.pog@moov-africa.ga',
          whatsapp: '+241 66 55 42 00'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 17:00',
          'Samedi': '08:30 - 13:00',
          'Dimanche': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Christian Ogoula',
        createdAt: '2024-01-07T10:00:00Z'
      },
      {
        id: 'branch-libertis-oyem',
        businessId: 'moov-africa-libertis',
        name: 'Agence Libertis - Oyem',
        code: 'LIB-WN-04',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Woleu-Ntem',
          provinceCode: 'woleu_ntem',
          city: 'Oyem',
          district: 'Marché Central / Tribune Officielle',
          address: 'Avenue du Gouverneur Général, Oyem',
          coordinates: { lat: 1.6033, lng: 11.5824 }
        },
        contact: {
          phone: '+241 11 98 60 10',
          email: 'agence.oyem@moov-africa.ga',
          whatsapp: '+241 66 98 60 10'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:30',
          'Samedi': '08:30 - 12:30',
          'Dimanche': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Bertrand Ekomi',
        createdAt: '2024-01-10T11:00:00Z'
      },
      {
        id: 'branch-libertis-moanda',
        businessId: 'moov-africa-libertis',
        name: 'Agence Libertis - Moanda',
        code: 'LIB-HO-05',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Haut-Ogooué',
          provinceCode: 'haut_ogooue',
          city: 'Moanda',
          district: 'Plateau Commercial / Cité Minière',
          address: 'Axe principal RN3, Face Gare Routière, Moanda',
          coordinates: { lat: -1.5641, lng: 13.2058 }
        },
        contact: {
          phone: '+241 11 66 22 10',
          email: 'agence.moanda@moov-africa.ga',
          whatsapp: '+241 66 66 22 10'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:30',
          'Samedi': '08:30 - 12:30',
          'Dimanche': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Nadège Mboumba',
        createdAt: '2024-01-12T08:30:00Z'
      }
    ]
  },
  {
    id: 'bgfi-bank-gabon',
    name: 'BGFIBank Gabon',
    legalName: 'BGFIBank Gabon S.A.',
    slug: 'bgfibank-gabon',
    category: 'banque_finance',
    subCategory: 'Banque universelle',
    description: 'Premier groupe bancaire et financier d’Afrique Centrale. Solutions pour particuliers, PME et grandes entreprises avec un vaste réseau d’agences et de distributeurs automatiques.',
    logo: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1971,
    nif: 'GA-7104829-LIB',
    rating: 4.7,
    reviewsCount: 38,
    gpsPrecision: 'exact',
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '1er Arrondissement',
      district: 'Bord de Mer - Centre Ville',
      address: 'Boulevard Triomphal Omar Bongo, Immeuble Siège',
      coordinates: { lat: 0.4042, lng: 9.4441 },
    },
    contact: {
      phone: '+241 11 76 23 23',
      phoneSecondary: '+241 74 00 11 22',
      email: 'contact@bgfibank.ga',
      website: 'https://www.bgfibank.com',
      whatsapp: '+241 74 00 11 22',
      facebook: 'https://facebook.com/BGFIBankGabon',
      linkedin: 'https://linkedin.com/company/bgfibank',
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:45 - 16:30',
        'Samedi': '08:30 - 12:30',
        'Dimanche': 'Fermé (GAB 24h/24)'
      },
      paymentMethods: ['Carte bancaire (Visa/Mastercard)', 'Airtel Money', 'Moov Money', 'Virement bancaire'],
      services: ['Comptes d’épargne & courant', 'Crédits immobiliers & consommation', 'Banque digitale BGFI Mobile', 'Change de devises'],
      facilities: ['Guichet automatique 24/7', 'Climatisation', 'Accessible PMR', 'Parking sécurisé']
    },
    stats: {
      views: 3420,
      phoneClicks: 284,
      whatsappClicks: 195,
      routeClicks: 412,
      favorites: 189
    },
    createdAt: '2024-01-10T10:00:00Z',
    claimed: true,
    claimedByEmail: 'admin@bgfibank.ga',
    branches: [
      {
        id: 'branch-bgfi-siege-lbv',
        businessId: 'bgfi-bank-gabon',
        name: 'Agence Siège Prestige - Libreville',
        code: 'BGF-EST-01',
        isMainBranch: true,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Estuaire',
          provinceCode: 'estuaire',
          city: 'Libreville',
          arrondissement: '1er Arrondissement',
          district: 'Bord de Mer - Centre Ville',
          address: 'Boulevard Triomphal Omar Bongo, Immeuble Siège BGFIBank',
          coordinates: { lat: 0.4042, lng: 9.4441 }
        },
        contact: {
          phone: '+241 11 76 23 23',
          email: 'siege.libreville@bgfibank.ga',
          whatsapp: '+241 74 00 11 22'
        },
        openingHours: {
          'Lundi - Vendredi': '07:45 - 16:30',
          'Samedi': '08:30 - 12:30'
        },
        photos: [
          'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Pierre-Claver Mouity',
        createdAt: '2024-01-10T10:00:00Z'
      },
      {
        id: 'branch-bgfi-pog-littoral',
        businessId: 'bgfi-bank-gabon',
        name: 'Agence BGFIBank Littoral - Port-Gentil',
        code: 'BGF-OM-02',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Ogooué-Maritime',
          provinceCode: 'ogooue_maritime',
          city: 'Port-Gentil',
          district: 'Quartier Commercial Littoral',
          address: 'Avenue Savorgnan de Brazza, Port-Gentil',
          coordinates: { lat: -0.7196, lng: 8.7831 }
        },
        contact: {
          phone: '+241 11 55 20 20',
          email: 'littoral.pog@bgfibank.ga',
          whatsapp: '+241 74 55 20 20'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:30',
          'Samedi': '08:30 - 12:00'
        },
        photos: [
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Marcelle Nziengui',
        createdAt: '2024-01-11T09:00:00Z'
      },
      {
        id: 'branch-bgfi-franceville-mvengue',
        businessId: 'bgfi-bank-gabon',
        name: 'Agence BGFIBank - Franceville M’Vengue',
        code: 'BGF-HO-03',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Haut-Ogooué',
          provinceCode: 'haut_ogooue',
          city: 'Franceville',
          district: 'Quartier M’Vengue / Centre',
          address: 'Avenue Omar Bongo, Immeuble BGFIBank, Franceville',
          coordinates: { lat: -1.6305, lng: 13.5867 }
        },
        contact: {
          phone: '+241 11 67 15 00',
          email: 'franceville@bgfibank.ga',
          whatsapp: '+241 74 67 15 00'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:00',
          'Samedi': '08:30 - 12:00'
        },
        photos: [
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Joseph Antchouet',
        createdAt: '2024-01-14T10:00:00Z'
      },
      {
        id: 'branch-bgfi-lambarene',
        businessId: 'bgfi-bank-gabon',
        name: 'Agence BGFIBank - Lambaréné Adouma',
        code: 'BGF-MO-04',
        isMainBranch: false,
        status: 'open',
        gpsPrecision: 'exact',
        location: {
          province: 'Moyen-Ogooué',
          provinceCode: 'moyen_ogooue',
          city: 'Lambaréné',
          district: 'Quartier Adouma Rive Gauche',
          address: 'Carrefour Schweitzer, Lambaréné',
          coordinates: { lat: -0.7012, lng: 10.2295 }
        },
        contact: {
          phone: '+241 11 58 12 00',
          email: 'lambarene@bgfibank.ga',
          whatsapp: '+241 74 58 12 00'
        },
        openingHours: {
          'Lundi - Vendredi': '08:00 - 16:00',
          'Samedi': 'Fermé'
        },
        photos: [
          'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&auto=format&fit=crop&q=80'
        ],
        images: [
          'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&auto=format&fit=crop&q=80'
        ],
        managerName: 'Clarisse Bikoro',
        createdAt: '2024-01-18T11:00:00Z'
      }
    ]
  },
  {
    id: 'radisson-blu-okoume',
    name: 'Radisson Blu Okoumé Palace Hotel',
    legalName: 'Société Hôtelière du Gabon S.A.',
    slug: 'radisson-blu-okoume-palace-hotel',
    category: 'hotellerie_tourisme',
    subCategory: 'Hôtel 5 étoiles de luxe',
    description: 'Hôtel haut de gamme face à l’Océan Atlantique à Libreville. Chambres luxueuses avec vue mer, piscine à débordement, centre de conférences international et cuisine raffinée.',
    logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1980,
    nif: 'GA-801249-LIB',
    rating: 4.8,
    reviewsCount: 52,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '1er Arrondissement',
      district: 'Batterie IV / Boulevard de Nice',
      address: '5 Boulevard de Nice, BP 48',
      coordinates: { lat: 0.4412, lng: 9.4187 },
    },
    contact: {
      phone: '+241 11 44 80 00',
      email: 'info.libreville@radissonblu.com',
      website: 'https://www.radissonhotels.com',
      whatsapp: '+241 77 12 34 56',
      facebook: 'https://facebook.com/RadissonBluLibreville',
      instagram: 'https://instagram.com/radissonblulbv'
    },
    details: {
      openingHours: {
        'Lundi - Dimanche': '24h/24'
      },
      paymentMethods: ['Carte bancaire', 'Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Hébergement 5 étoiles', 'Salles de séminaire (1000 places)', 'Restaurant gastronomique Le Tamanoir', 'Spa & Fitness'],
      facilities: ['Piscine olympique', 'Navette aéroport', 'Wi-Fi haut débit gratuit', 'Plage privée']
    },
    stats: {
      views: 4890,
      phoneClicks: 410,
      whatsappClicks: 320,
      routeClicks: 645,
      favorites: 245
    },
    createdAt: '2024-01-12T09:00:00Z',
    claimed: true,
    claimedByEmail: 'direction@radissonokoume.ga'
  },
  {
    id: 'airtel-gabon',
    name: 'Airtel Gabon',
    legalName: 'Airtel Gabon S.A.',
    slug: 'airtel-gabon',
    category: 'telecoms_tech',
    subCategory: 'Opérateur Télécom & Mobile Money',
    description: 'Opérateur leader de télécommunications au Gabon, pionnier de la 4G/5G et de la finance mobile avec Airtel Money. Réseau étendu couvrant l’ensemble des 9 provinces.',
    logo: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1999,
    rating: 4.4,
    reviewsCount: 64,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '2ème Arrondissement',
      district: 'Glass',
      address: 'Immeuble Airtel, Rue Pecqueur, Glass',
      coordinates: { lat: 0.3812, lng: 9.4521 },
    },
    contact: {
      phone: '+241 11 79 00 00',
      email: 'service.client@ga.airtel.com',
      website: 'https://www.airtel.ga',
      whatsapp: '+241 77 00 01 11',
      facebook: 'https://facebook.com/AirtelGabon'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '08:00 - 17:30',
        'Samedi': '08:30 - 13:00'
      },
      paymentMethods: ['Airtel Money', 'Carte bancaire', 'Espèces'],
      services: ['Forfaits 4G/Internet Fibre', 'Paiement mobile Airtel Money', 'Solutions entreprises & Cloud', 'Cartes SIM & eSIM'],
      facilities: ['Espace VIP Entreprises', 'Climatisation', 'Accès PMR']
    },
    stats: {
      views: 5210,
      phoneClicks: 530,
      whatsappClicks: 680,
      routeClicks: 490,
      favorites: 310
    },
    createdAt: '2024-01-05T08:00:00Z',
    claimed: true
  },
  {
    id: 'comilog-moanda',
    name: 'COMILOG (Compagnie Minière de l’Ogooué)',
    legalName: 'Compagnie Minière de l’Ogooué - Groupe Eramet',
    slug: 'comilog-moanda',
    category: 'energie_mines',
    subCategory: 'Exploitation minière & Métallurgie',
    description: 'Deuxième producteur mondial de minerai de manganèse à haute teneur. Moteur économique de la province du Haut-Ogooué depuis plus de 60 ans avec le complexe métallurgique de Moanda.',
    logo: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1953,
    rating: 4.9,
    reviewsCount: 29,
    location: {
      province: 'Haut-Ogooué',
      provinceCode: 'haut_ogooue',
      city: 'Moanda',
      district: 'Plateau Bangombé / Cité Cadres',
      address: 'Route Nationale 3, Plateau Minier de Moanda',
      coordinates: { lat: -1.5658, lng: 13.2082 },
    },
    contact: {
      phone: '+241 11 66 11 00',
      email: 'communication.comilog@eramet.com',
      website: 'https://www.eramet.com/fr/activites/manganese',
      linkedin: 'https://linkedin.com/company/comilog'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:30 - 17:00'
      },
      paymentMethods: ['Virement bancaire professionnel'],
      services: ['Extraction de manganèse', 'Agglomération & Métallurgie', 'Développement local & RSE', 'Formation professionnelle (E3MG)'],
      facilities: ['Site sécurisé', 'Centre médical minier', 'Héliport']
    },
    stats: {
      views: 4120,
      phoneClicks: 190,
      whatsappClicks: 85,
      routeClicks: 320,
      favorites: 215
    },
    createdAt: '2024-01-08T11:00:00Z',
    claimed: true
  },
  {
    id: 'hopital-albert-schweitzer',
    name: 'Hôpital Albert Schweitzer de Lambaréné',
    legalName: 'Fondation Internationale de l’Hôpital Albert Schweitzer',
    slug: 'hopital-albert-schweitzer-lambarene',
    category: 'sante_pharmacie',
    subCategory: 'Centre hospitalier & Recherche clinique',
    description: 'Hôpital historique fondé en 1913 par le Prix Nobel de la Paix Albert Schweitzer. Centre d’excellence médicale et de recherche clinique mondiale (CERMEL) sur le paludisme et les maladies tropicales.',
    logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1913,
    rating: 4.8,
    reviewsCount: 44,
    location: {
      province: 'Moyen-Ogooué',
      provinceCode: 'moyen_ogooue',
      city: 'Lambaréné',
      district: 'Quartier Adouma - Rive gauche',
      address: 'Route de Schweitzer, B.P. 118 Adouma',
      coordinates: { lat: -0.6978, lng: 10.2341 },
    },
    contact: {
      phone: '+241 11 58 11 20',
      phoneSecondary: '+241 77 58 20 00',
      email: 'contact@schweitzerhospital.org',
      website: 'https://www.cermel.org',
      whatsapp: '+241 77 58 20 00'
    },
    details: {
      openingHours: {
        'Urgences': '24h/24 et 7j/7',
        'Consultations': '08:00 - 16:30'
      },
      paymentMethods: ['CNAMGS', 'Espèces', 'Airtel Money', 'Moov Money'],
      services: ['Urgences 24h/24', 'Chirurgie générale & pédiatrique', 'Maternité & Néonatalogie', 'Laboratoire de recherche CERMEL'],
      facilities: ['Musée historique Albert Schweitzer', 'Pharmacie hospitalière', 'Accès pirogue fluviale', 'Parking']
    },
    stats: {
      views: 3870,
      phoneClicks: 320,
      whatsappClicks: 140,
      routeClicks: 410,
      favorites: 198
    },
    createdAt: '2024-01-02T12:00:00Z',
    claimed: true
  },
  {
    id: 'totalenergies-port-gentil',
    name: 'TotalEnergies EP Gabon',
    legalName: 'TotalEnergies EP Gabon S.A.',
    slug: 'totalenergies-ep-gabon-port-gentil',
    category: 'energie_mines',
    subCategory: 'Exploration & Production pétrolière',
    description: 'Pionnier de l’industrie pétrolière au Gabon présent depuis plus de 90 ans. Siège opérationnel situé à Port-Gentil, opérant des terminaux maritimes et des champs offshore majeurs.',
    logo: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 1949,
    rating: 4.7,
    reviewsCount: 31,
    location: {
      province: 'Ogooué-Maritime',
      provinceCode: 'ogooue_maritime',
      city: 'Port-Gentil',
      district: 'Quartier du Port / Boulevard Léon Mba',
      address: 'Boulevard Léon Mba, BP 525, Port-Gentil',
      coordinates: { lat: -0.7208, lng: 8.7842 },
    },
    contact: {
      phone: '+241 11 55 60 00',
      email: 'contact.gabon@totalenergies.com',
      website: 'https://totalenergies.ga',
      linkedin: 'https://linkedin.com/company/totalenergies'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:30 - 17:00'
      },
      paymentMethods: ['Virement d’entreprise'],
      services: ['Production pétrolière offshore', 'Terminal pétrolier du Cap Lopez', 'Projets solaires & décarbonation', 'Soutien aux PME locales'],
      facilities: ['Contrôle d’accès biométrique', 'Zone héliportuaire', 'Infirmerie']
    },
    stats: {
      views: 3650,
      phoneClicks: 215,
      whatsappClicks: 90,
      routeClicks: 310,
      favorites: 176
    },
    createdAt: '2024-01-06T14:00:00Z',
    claimed: true
  },
  {
    id: 'gsez-nkok',
    name: 'Zone Économique Spéciale de Nkok (GSEZ)',
    legalName: 'Gabon Special Economic Zone S.A.',
    slug: 'gsez-nkok',
    category: 'agroalimentaire_foret',
    subCategory: 'Hub industriel & Transformation du bois',
    description: 'Première zone économique spéciale certifiée neutre en carbone en Afrique. Hub industriel majeur pour la 2ème et 3ème transformation du bois d’okoumé et l’exportation manufacturée.',
    logo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 2010,
    rating: 4.8,
    reviewsCount: 37,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Ntoum',
      district: 'Nkok - PK 27',
      address: 'Route Nationale 1, Zone Industrielle de Nkok',
      coordinates: { lat: 0.3541, lng: 9.6892 },
    },
    contact: {
      phone: '+241 11 74 12 00',
      email: 'invest@arisenet.com',
      website: 'https://www.gsez.com',
      whatsapp: '+241 76 54 32 10',
      linkedin: 'https://linkedin.com/company/gsez'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '08:00 - 17:00'
      },
      paymentMethods: ['Virement bancaire'],
      services: ['Guichet unique pour investisseurs', 'Usines de placage & contreplaqué', 'Centre de formation des métiers du bois', 'Zone douanière intégrée'],
      facilities: ['Sécurité 24/7', 'Connexion ferroviaire directe', 'Fibre optique dédiée']
    },
    stats: {
      views: 4210,
      phoneClicks: 260,
      whatsappClicks: 180,
      routeClicks: 430,
      favorites: 230
    },
    createdAt: '2024-01-09T08:30:00Z',
    claimed: true
  },
  {
    id: 'prix-import-lbv',
    name: 'Prix Import Oloumi',
    legalName: 'Prix Import Gabon S.A.R.L.',
    slug: 'prix-import-oloumi',
    category: 'commerce_distribution',
    subCategory: 'Hypermarché & Grande Distribution',
    description: 'Chaîne d’hypermarchés de référence au Gabon offrant produits frais, alimentation générale, boucherie de qualité, électroménager et produits locaux de première fraîcheur.',
    logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 1994,
    rating: 4.5,
    reviewsCount: 41,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '4ème Arrondissement',
      district: 'Zone Industrielle d’Oloumi',
      address: 'Voie express Oloumi, en face des ateliers',
      coordinates: { lat: 0.3891, lng: 9.4678 },
    },
    contact: {
      phone: '+241 11 72 20 10',
      email: 'service-client@priximport.ga',
      website: 'https://www.priximport.ga',
      whatsapp: '+241 74 15 20 30',
      facebook: 'https://facebook.com/PrixImportGabon'
    },
    details: {
      openingHours: {
        'Lundi - Samedi': '08:30 - 19:30',
        'Dimanche': '09:00 - 13:00'
      },
      paymentMethods: ['Airtel Money', 'Moov Money', 'Carte bancaire', 'Espèces', 'Bons d’achat'],
      services: ['Rayon produits bio & locaux', 'Boulangerie-pâtisserie artisanale', 'Livraison à domicile', 'Vente en gros & demi-gros'],
      facilities: ['Vaste parking surveillé', 'Climatisation', 'Accessible chariots et PMR']
    },
    stats: {
      views: 3100,
      phoneClicks: 180,
      whatsappClicks: 210,
      routeClicks: 390,
      favorites: 145
    },
    createdAt: '2024-01-15T09:00:00Z',
    claimed: true
  },
  {
    id: 'olam-palm-mouila',
    name: 'Olam Palm Gabon - Mouila',
    legalName: 'Olam Palm Gabon S.A.',
    slug: 'olam-palm-gabon-mouila',
    category: 'agroalimentaire_foret',
    subCategory: 'Agro-industrie durable & Huilerie',
    description: 'Plus grande plantation de palmier à huile certifiée RSPO en Afrique subsaharienne. Usine d’extraction moderne produisant de l’huile de palme brute et raffinée pour le marché national et sous-régional.',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 2011,
    rating: 4.6,
    reviewsCount: 22,
    location: {
      province: 'Ngounié',
      provinceCode: 'ngounie',
      city: 'Mouila',
      district: 'Bassin de la Dola / Val Marie',
      address: 'Route Nationale 1, Axe Mouila - Ndendé',
      coordinates: { lat: -1.9124, lng: 11.0821 },
    },
    contact: {
      phone: '+241 11 76 55 00',
      email: 'info.mouila@olamgroup.com',
      website: 'https://www.olamgroup.com',
      linkedin: 'https://linkedin.com/company/olam-gabon'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:00 - 16:30',
        'Samedi': '07:00 - 12:00'
      },
      paymentMethods: ['Virement bancaire'],
      services: ['Culture du palmier certifiée RSPO', 'Extraction d’huile végétale pure', 'Partenariats avec planteurs villageois (GRAINE)', 'Centre de santé communautaire'],
      facilities: ['Usine de biomasse', 'Logements communautaires', 'Gardiennage 24/7']
    },
    stats: {
      views: 2410,
      phoneClicks: 115,
      whatsappClicks: 65,
      routeClicks: 190,
      favorites: 98
    },
    createdAt: '2024-01-18T10:30:00Z',
    claimed: true
  },
  {
    id: 'pharmacie-forestiers-oyem',
    name: 'Pharmacie des Forestiers d’Oyem',
    legalName: 'Pharmacie des Forestiers S.A.R.L.',
    slug: 'pharmacie-des-forestiers-oyem',
    category: 'sante_pharmacie',
    subCategory: 'Officine pharmaceutique & Conseils',
    description: 'Pharmacie centrale d’Oyem assurant la permanence des soins, délivrance de médicaments certifiés, parapharmacie, produits pédiatriques et service de garde régulier.',
    logo: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 2004,
    rating: 4.7,
    reviewsCount: 19,
    location: {
      province: 'Woleu-Ntem',
      provinceCode: 'woleu_ntem',
      city: 'Oyem',
      district: 'Centre Commercial / Marché Central',
      address: 'Avenue du Gouverneur Général, face à la tribune officielle',
      coordinates: { lat: 1.6021, lng: 11.5812 },
    },
    contact: {
      phone: '+241 11 98 62 44',
      phoneSecondary: '+241 77 44 20 10',
      email: 'pharma.forestiers@yahoo.fr',
      whatsapp: '+241 77 44 20 10'
    },
    details: {
      openingHours: {
        'Lundi - Samedi': '07:30 - 20:30',
        'Dimanche & Jours fériés': '08:30 - 13:00 (Garde selon calendrier)'
      },
      paymentMethods: ['CNAMGS', 'Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Médicaments sur ordonnance', 'Tension artérielle & glycémie', 'Produits vétérinaires pour plantations', 'Conseils dermato-cosmétique'],
      facilities: ['Climatisation', 'Accessible aux personnes à mobilité réduite']
    },
    stats: {
      views: 1980,
      phoneClicks: 210,
      whatsappClicks: 175,
      routeClicks: 280,
      favorites: 112
    },
    createdAt: '2024-01-20T11:00:00Z',
    claimed: true
  },
  {
    id: 'mayumba-ecolodge',
    name: 'Mayumba Écolodge & Réserve Océanique',
    legalName: 'Mayumba Safaris & Écotourisme',
    slug: 'mayumba-ecolodge-ocean',
    category: 'hotellerie_tourisme',
    subCategory: 'Écolodge de charme & Safari marin',
    description: 'Hébergement écologique d’exception face à l’Océan Atlantique et au parc national marin de Mayumba. Observation des tortues luths géantes (ponte nov-fév), des baleines à bosse et plages sauvages.',
    logo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 2016,
    rating: 4.9,
    reviewsCount: 26,
    location: {
      province: 'Nyanga',
      provinceCode: 'nyanga',
      city: 'Mayumba',
      district: 'Péninsule de Mayumba / Plage Sud',
      address: 'Bande littorale entre lagune Banio et Océan, Mayumba',
      coordinates: { lat: -3.4289, lng: 10.6543 },
    },
    contact: {
      phone: '+241 74 88 90 22',
      email: 'reservation@mayumba-lodge.com',
      website: 'https://www.mayumba-lodge.com',
      whatsapp: '+241 74 88 90 22'
    },
    details: {
      openingHours: {
        'Lundi - Dimanche': '07:00 - 22:00 (Sur réservation)'
      },
      paymentMethods: ['Airtel Money', 'Carte bancaire', 'Espèces'],
      services: ['Bungalows en bois local face mer', 'Excursions guidées avec éco-gardes', 'Sorties pêche sportive', 'Gastronomie aux fruits de mer frais'],
      facilities: ['Énergie solaire 100%', 'Restaurant terrasse panoramique', 'Guides certifiés ANPN']
    },
    stats: {
      views: 2890,
      phoneClicks: 170,
      whatsappClicks: 215,
      routeClicks: 180,
      favorites: 165
    },
    createdAt: '2024-02-01T08:00:00Z',
    claimed: true
  },
  {
    id: 'rougier-gabon-lastoursville',
    name: 'Rougier Gabon - Site de Lastoursville',
    legalName: 'Rougier Afrique International - Filiale Gabon',
    slug: 'rougier-gabon-lastoursville',
    category: 'agroalimentaire_foret',
    subCategory: 'Gestion forestière responsable & Scierie FSC',
    description: 'Leader mondial de l’exploitation forestière durable certifiée FSC. Gestion des concessions de l’Ogooué-Lolo, valorisation des essences locales (Padouk, Béli, Doussié) et scierie moderne.',
    logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 1968,
    rating: 4.6,
    reviewsCount: 18,
    location: {
      province: 'Ogooué-Lolo',
      provinceCode: 'ogooue_lolo',
      city: 'Lastoursville',
      district: 'Quartier Industriel / Gare SETRAG',
      address: 'Route de Koulamoutou, Zone de transformation du bois',
      coordinates: { lat: -0.8178, lng: 12.7089 },
    },
    contact: {
      phone: '+241 11 77 34 50',
      email: 'rougier.gabon@rougier.fr',
      website: 'https://www.rougier.fr',
      linkedin: 'https://linkedin.com/company/rougier-group'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:30 - 16:30'
      },
      paymentMethods: ['Virement bancaire'],
      services: ['Sciage et séchage de bois certifié FSC', 'Export grumes et débités', 'Programmes sociaux et dispensaires villageois', 'Reboisement'],
      facilities: ['Poste de secours médical', 'Embranchement ferroviaire Transgabonais']
    },
    stats: {
      views: 1840,
      phoneClicks: 95,
      whatsappClicks: 40,
      routeClicks: 140,
      favorites: 76
    },
    createdAt: '2024-02-04T10:00:00Z',
    claimed: true
  },
  {
    id: 'makokou-ecotourisme-ivindo',
    name: 'Ivindo Aventures & Écotourisme Makokou',
    legalName: 'Ivindo Aventures SARL',
    slug: 'ivindo-aventures-makokou',
    category: 'hotellerie_tourisme',
    subCategory: 'Expéditions fluviales & Guides des chutes',
    description: 'Organisation d’expéditions écologiques vers les spectaculaires chutes de Kongou et Mingouli dans le Parc National de l’Ivindo (classé Patrimoine Mondial de l’UNESCO).',
    logo: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 2018,
    rating: 4.9,
    reviewsCount: 24,
    location: {
      province: 'Ogooué-Ivindo',
      provinceCode: 'ogooue_ivindo',
      city: 'Makokou',
      district: 'Quartier Epassendje / Bord de l’Ivindo',
      address: 'Descente du débarcadère piroguier, Makokou',
      coordinates: { lat: 0.5694, lng: 12.8611 },
    },
    contact: {
      phone: '+241 74 33 22 11',
      email: 'expeditions@ivindo-aventures.ga',
      whatsapp: '+241 74 33 22 11'
    },
    details: {
      openingHours: {
        'Lundi - Samedi': '08:00 - 18:00'
      },
      paymentMethods: ['Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Pirogue motorisée sur l’Ivindo', 'Bivouac sécurisé aux chutes de Kongou', 'Observation éléphants et gorilles', 'Guides francophones & anglophones'],
      facilities: ['Matériel de sauvetage certifié', 'Gilets de sauvetage aux normes']
    },
    stats: {
      views: 2150,
      phoneClicks: 140,
      whatsappClicks: 190,
      routeClicks: 160,
      favorites: 134
    },
    createdAt: '2024-02-10T14:20:00Z',
    claimed: true
  },
  {
    id: 'socoba-edtp-libreville',
    name: 'SOCOBA-EDTP',
    legalName: 'Société de Construction du Bâtiment - EDTP S.A.',
    slug: 'socoba-edtp-libreville',
    category: 'btp_immobilier',
    subCategory: 'Travaux publics & Ouvrages d’art',
    description: 'Entreprise historique majeure de génie civil et de bâtiment au Gabon. Réalisation de routes nationales bitumées, ponts, immeubles administratifs et infrastructures de prestige.',
    logo: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 1964,
    rating: 4.4,
    reviewsCount: 15,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '4ème Arrondissement',
      district: 'Oloumi Ouest',
      address: 'Route des Usines, Quartier Industriel Oloumi, BP 498',
      coordinates: { lat: 0.3845, lng: 9.4711 },
    },
    contact: {
      phone: '+241 11 72 23 15',
      email: 'contact@socoba-gabon.com',
      website: 'https://www.socoba-gabon.com'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '07:30 - 17:30'
      },
      paymentMethods: ['Virement bancaire'],
      services: ['Terrassement & voiries', 'Construction de ponts & ports', 'Béton prêt à l’emploi', 'Laboratoire d’analyses géotechniques'],
      facilities: ['Centrale à béton', 'Parc engins lourds']
    },
    stats: {
      views: 2010,
      phoneClicks: 110,
      whatsappClicks: 50,
      routeClicks: 180,
      favorites: 65
    },
    createdAt: '2024-02-12T09:15:00Z',
    claimed: true
  },
  {
    id: 'setrag-owendo',
    name: 'SETRAG - Gare Ferroviaire d’Owendo',
    legalName: 'Société d’Exploitation du Transgabonais',
    slug: 'setrag-transgabonais-owendo',
    category: 'transport_logistique',
    subCategory: 'Transport ferroviaire de voyageurs & fret',
    description: 'Opérateur du chemin de fer Transgabonais reliant Owendo à Franceville sur 648 km à travers 5 provinces. Transport de fret lourd (manganèse, bois) et trains de passagers.',
    logo: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: true,
    creationYear: 2005,
    rating: 4.3,
    reviewsCount: 56,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Owendo',
      district: 'Gare Ferroviaire d’Owendo-Viré',
      address: 'Boulevard de la Gare, Owendo',
      coordinates: { lat: 0.3012, lng: 9.5023 },
    },
    contact: {
      phone: '+241 11 70 80 00',
      phoneSecondary: '+241 66 00 13 30',
      email: 'clientele@setrag.ga',
      website: 'https://www.setrag.ga',
      whatsapp: '+241 66 00 13 30',
      facebook: 'https://facebook.com/SetragGabon'
    },
    details: {
      openingHours: {
        'Guichet Billetterie': '06:00 - 20:00',
        'Service Fret': '07:30 - 17:00'
      },
      paymentMethods: ['Airtel Money', 'Moov Money', 'Carte bancaire', 'Espèces'],
      services: ['Trains Express & Omnibus voyageurs', 'Transport de conteneurs & véhicules', 'Acheminement de manganèse et grumes', 'Réservation de billets en ligne'],
      facilities: ['Salle d’attente climatisée', 'Salon VIP', 'Parkings gardés', 'Consigne bagages']
    },
    stats: {
      views: 5890,
      phoneClicks: 620,
      whatsappClicks: 710,
      routeClicks: 820,
      favorites: 390
    },
    createdAt: '2024-02-14T08:00:00Z',
    claimed: true
  },
  {
    id: 'grand-hotel-franceville',
    name: 'Grand Hôtel de Franceville',
    legalName: 'Grand Hôtel du Haut-Ogooué SARL',
    slug: 'grand-hotel-de-franceville',
    category: 'hotellerie_tourisme',
    subCategory: 'Hôtel 4 étoiles & Événements',
    description: 'Établissement hôtelier emblématique de Franceville perché sur les collines verdoyantes du Haut-Ogooué. Piscine, restaurant de spécialités locales et salles de réunions climatisées.',
    logo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 1978,
    rating: 4.5,
    reviewsCount: 27,
    location: {
      province: 'Haut-Ogooué',
      provinceCode: 'haut_ogooue',
      city: 'Franceville',
      district: 'Plateau Poto-Poto / Mission Catholique',
      address: 'Avenue de l’Indépendance, BP 144, Franceville',
      coordinates: { lat: -1.6312, lng: 13.5859 },
    },
    contact: {
      phone: '+241 11 67 11 00',
      email: 'grandhotel.franceville@gmail.com',
      whatsapp: '+241 77 90 40 50'
    },
    details: {
      openingHours: {
        'Lundi - Dimanche': '24h/24'
      },
      paymentMethods: ['Carte bancaire', 'Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Chambres climatisées', 'Bar cocktail panoramique', 'Organisation de séminaires', 'Excursions aux ponts de lianes de Poubara'],
      facilities: ['Piscine extérieure', 'Wi-Fi gratuit', 'Navette aéroport des M’Vengue']
    },
    stats: {
      views: 2210,
      phoneClicks: 160,
      whatsappClicks: 140,
      routeClicks: 210,
      favorites: 110
    },
    createdAt: '2024-02-18T11:00:00Z',
    claimed: true
  },
  {
    id: 'restaurant-le-tamanoir-lbv',
    name: 'Restaurant Le Confidentiel - Libreville',
    legalName: 'Le Confidentiel Gastronomie SARL',
    slug: 'restaurant-le-confidentiel-libreville',
    category: 'restauration_bars',
    subCategory: 'Haute gastronomie & Saveurs gabonaises',
    description: 'Une des meilleures tables gastronomiques de Libreville mariant cuisine française raffinée et produits du terroir gabonais (feuilles de manioc pilées, capitaine de mer frais, crabe farci).',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 2017,
    rating: 4.8,
    reviewsCount: 39,
    location: {
      province: 'Estuaire',
      provinceCode: 'estuaire',
      city: 'Libreville',
      arrondissement: '1er Arrondissement',
      district: 'Quartier Louis',
      address: 'Montée de Louis, face à la pharmacie des Arts',
      coordinates: { lat: 0.4189, lng: 9.4382 },
    },
    contact: {
      phone: '+241 11 73 89 20',
      email: 'reservation@leconfidentiel.ga',
      whatsapp: '+241 74 55 44 33',
      instagram: 'https://instagram.com/leconfidentiel_lbv'
    },
    details: {
      openingHours: {
        'Mardi - Samedi': '12:00 - 15:00 & 19:30 - 23:30',
        'Dimanche': '12:00 - 16:00 (Brunch)',
        'Lundi': 'Fermé'
      },
      paymentMethods: ['Carte bancaire', 'Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Service en terrasse ombragée', 'Cave à vins & spiritueux de choix', 'Repas d’affaires privés', 'Service traiteur haut de gamme'],
      facilities: ['Climatisation', 'Voiturier & parking gardé', 'Wi-Fi haut débit']
    },
    stats: {
      views: 3120,
      phoneClicks: 290,
      whatsappClicks: 340,
      routeClicks: 380,
      favorites: 180
    },
    createdAt: '2024-02-20T16:00:00Z',
    claimed: true
  },
  {
    id: 'tchibanga-agrobusiness',
    name: 'Coopérative Agro-Pastorale de la Nyanga',
    legalName: 'Coopérative Nyanga Terroir',
    slug: 'cooperative-agro-pastorale-nyanga',
    category: 'agroalimentaire_foret',
    subCategory: 'Élevage bovin & Culture maraîchère',
    description: 'Valorisation des savanes fertiles de la Nyanga. Élevage de bovins rustiques adaptés au climat équatorial, boucherie locale de qualité et approvisionnement en manioc et bananes plantains.',
    logo: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=200&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'verified',
    featured: false,
    creationYear: 2015,
    rating: 4.5,
    reviewsCount: 14,
    location: {
      province: 'Nyanga',
      provinceCode: 'nyanga',
      city: 'Tchibanga',
      district: 'Quartier Mavoundi',
      address: 'Route de Moabi, Km 4, Tchibanga',
      coordinates: { lat: -2.8542, lng: 11.0298 },
    },
    contact: {
      phone: '+241 77 65 12 34',
      email: 'terroir.nyanga@gmail.com',
      whatsapp: '+241 77 65 12 34'
    },
    details: {
      openingHours: {
        'Lundi - Vendredi': '08:00 - 16:30',
        'Samedi': '08:00 - 13:00'
      },
      paymentMethods: ['Airtel Money', 'Moov Money', 'Espèces'],
      services: ['Vente directe de viande bovine fraîche', 'Plants sélectionnés', 'Aliments pour bétail'],
      facilities: ['Abattoir agréé', 'Parking camions']
    },
    stats: {
      views: 1420,
      phoneClicks: 85,
      whatsappClicks: 70,
      routeClicks: 110,
      favorites: 42
    },
    createdAt: '2024-02-25T11:00:00Z',
    claimed: true
  }
];

// Synchroniser automatiquement agencies et branches pour garantir l'interopérabilité
INITIAL_BUSINESSES.forEach(b => {
  if (b.branches && !b.agencies) {
    b.agencies = b.branches;
  } else if (b.agencies && !b.branches) {
    b.branches = b.agencies;
  }
  // S'assurer que chaque agence a bien sa galerie photos initialisée
  if (b.agencies) {
    b.agencies.forEach(ag => {
      if (!ag.photos) ag.photos = ag.images || [b.coverImage || b.logo];
      if (!ag.images) ag.images = ag.photos;
    });
  }
});

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    businessId: 'bgfi-bank-gabon',
    authorName: 'Marc-Aurèle Mba',
    authorCity: 'Libreville',
    rating: 5,
    comment: 'Excellente agence siège avec un accueil chaleureux et des conseillers proactifs pour les entreprises. L’application mobile BGFI est très fluide.',
    createdAt: '2024-02-15T14:32:00Z',
    helpfulCount: 12,
    businessResponse: {
      comment: 'Merci Monsieur Mba pour votre confiance renouvelée au service de l’économie gabonaise.',
      date: '2024-02-16T09:10:00Z',
      responderName: 'Service Relation Clientèle BGFIBank'
    }
  },
  {
    id: 'rev-2',
    businessId: 'radisson-blu-okoume',
    authorName: 'Sophie Kombila',
    authorCity: 'Port-Gentil',
    rating: 5,
    comment: 'Un séjour mémorable pour notre séminaire d’entreprise. La vue sur le coucher de soleil au bord de la piscine est à couper le souffle !',
    createdAt: '2024-02-20T10:15:00Z',
    helpfulCount: 18,
    businessResponse: {
      comment: 'Chère Sophie, nous vous remercions sincèrement et serons ravis de vous accueillir à nouveau très prochainement.',
      date: '2024-02-21T08:00:00Z',
      responderName: 'Direction de l’Hébergement'
    }
  },
  {
    id: 'rev-3',
    businessId: 'hopital-albert-schweitzer',
    authorName: 'Dr. Jean-Pierre Nguema',
    authorCity: 'Lambaréné',
    rating: 5,
    comment: 'Un lieu chargé d’histoire et un pôle médical toujours essentiel pour tout le Moyen-Ogooué. Les équipes du CERMEL font un travail remarquable.',
    createdAt: '2024-02-10T11:45:00Z',
    helpfulCount: 25
  },
  {
    id: 'rev-4',
    businessId: 'comilog-moanda',
    authorName: 'Christian Ondo',
    authorCity: 'Franceville',
    rating: 5,
    comment: 'Pilier industriel impressionnant de notre pays. Les efforts récents pour la RSE et les infrastructures de Moanda sont visibles.',
    createdAt: '2024-02-05T16:00:00Z',
    helpfulCount: 9
  },
  {
    id: 'rev-5',
    businessId: 'setrag-owendo',
    authorName: 'Patrick Boukila',
    authorCity: 'Lastoursville',
    rating: 4,
    comment: 'Voyage très agréable en 1ère classe entre Owendo et Lastoursville. Le service de restauration à bord a progressé.',
    createdAt: '2024-02-22T19:20:00Z',
    helpfulCount: 14
  }
];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    businessId: 'radisson-blu-okoume',
    businessName: 'Radisson Blu Okoumé Palace Hotel',
    title: 'Offre Week-End Escapade Océane',
    description: 'Bénéficiez de 25% de remise sur les suites avec vue mer incluant le petit-déjeuner buffet gourmand et accès illimité au centre de bien-être.',
    discountBadge: '-25%',
    validUntil: '2026-12-31',
    category: 'hotellerie_tourisme',
    city: 'Libreville',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80',
    contactPhone: '+241 11 44 80 00'
  },
  {
    id: 'promo-2',
    businessId: 'airtel-gabon',
    businessName: 'Airtel Gabon',
    title: 'Fibre Entreprise Très Haut Débit',
    description: 'Installation offerte et 2 mois gratuits sur l’abonnement Fibre Pro 100 Mbps pour toute nouvelle souscription de PME/PMI gabonaise.',
    discountBadge: 'Frais offerts',
    validUntil: '2026-11-30',
    category: 'telecoms_tech',
    city: 'Libreville',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    contactPhone: '+241 11 79 00 00'
  },
  {
    id: 'promo-3',
    businessId: 'mayumba-ecolodge',
    businessName: 'Mayumba Écolodge & Réserve Océanique',
    title: 'Saison Ponte des Tortues Luths',
    description: 'Séjour 3 jours / 2 nuits en pension complète avec guide certifié ANPN pour l’observation nocturne de la ponte des tortues géantes.',
    discountBadge: 'Pack Éco-Safari',
    validUntil: '2026-12-15',
    category: 'hotellerie_tourisme',
    city: 'Mayumba',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&auto=format&fit=crop&q=80',
    contactPhone: '+241 74 88 90 22'
  }
];

export const MULTI_AGENTS_TEAM: AgentContribution[] = [
  {
    id: 1,
    name: 'Agent 1 : Superviseur & Architecte IA',
    role: 'Chef de projet & Superviseur Technique',
    mission: 'Organiser les phases, définir l’architecture full-stack, coordonner les agents et garantir la conformité aux exigences gabonaises.',
    keyDeliverables: [
      'Cahier des charges & roadmap 3 versions (MVP, Pro, Écosystème)',
      'Découpage multi-agents avec validation des contrats d’interface',
      'Harmonisation technologique React 19 + TypeScript + Leaflet + Express + Gemini 3.8'
    ],
    status: 'completed',
    technologies: ['Architecture logicielle', 'Agile multi-agents', 'Governance'],
    summary: 'A coordonné avec succès l’intégration des 8 agents spécialisés et vérifié le respect du cahier des charges national gabonais.'
  },
  {
    id: 2,
    name: 'Agent 2 : UI/UX Designer',
    role: 'Lead Designer d’Expérience',
    mission: 'Concevoir une interface moderne inspirée des couleurs nationales (vert forêt équatoriale, or/jaune solaire, bleu océan atlantique), responsive et accessible.',
    keyDeliverables: [
      'Charte graphique institutionnelle & responsive',
      'Système de cartes sans fioritures (anti-slop, typographie lisible)',
      'Expérience cartographique tactile et mobile-first'
    ],
    status: 'completed',
    technologies: ['Tailwind CSS v4', 'Design System Gabon', 'Mobile UX'],
    summary: 'A conçu un design raffiné sans pilules statiques, avec un contraste parfait et des micro-animations délicates.'
  },
  {
    id: 3,
    name: 'Agent 3 : Développeur Frontend',
    role: 'Ingénieur Frontend React / TS',
    mission: 'Développer l’application client, les filtres à facettes, les formulaires interactifs, le comparateur et la synchronisation réactive.',
    keyDeliverables: [
      'Composants de recherche instantanée multi-critères',
      'Fiches entreprises complètes avec galeries et horaires en direct',
      'Comparateur côte-à-côte jusqu’à 3 entreprises',
      'Tableaux de bord Pro et Administrateur'
    ],
    status: 'completed',
    technologies: ['React 19', 'TypeScript', 'Lucide React', 'Motion'],
    summary: 'A codé l’ensemble des vues dynamiques avec un état synchronisé et une navigation par onglets intuitive.'
  },
  {
    id: 4,
    name: 'Agent 4 : Développeur Backend',
    role: 'Ingénieur Backend & API',
    mission: 'Concevoir les routes RESTful, la persistance des données, la validation des fiches et l’intégration de l’assistant IA Gemini.',
    keyDeliverables: [
      'Endpoints Express pour entreprises, avis, signalements et stats',
      'Proxy serveur sécurisé pour l’Assistant IA sans exposer de clés API',
      'Système de métriques de conversion (vues, clics tél, WhatsApp, GPS)'
    ],
    status: 'completed',
    technologies: ['Node.js Express', 'REST APIs', 'Server Proxy', '@google/genai'],
    summary: 'A fourni les services applicatifs sécurisés avec persistance locale et support hors-ligne résilient.'
  },
  {
    id: 5,
    name: 'Agent 5 : Expert Cartographie & SIG',
    role: 'Spécialiste Géomatique & Leaflet',
    mission: 'Intégrer la carte interactive des 9 provinces du Gabon avec géolocalisation, calcul de distance et itinéraires.',
    keyDeliverables: [
      'Carte interactive Leaflet centrée sur le Gabon',
      'Pins sectoriels thématisés par couleur et icône',
      'Sélecteur de vol rapide vers les 9 chefs-lieux provinciaux',
      'Module "Autour de moi" avec rayon kilométrique et distance haversine'
    ],
    status: 'completed',
    technologies: ['Leaflet', 'OpenStreetMap', 'Calculs géodésiques haversine'],
    summary: 'A configuré les marqueurs haute précision pour Libreville, Port-Gentil, Franceville et toutes les provinces intérieures.'
  },
  {
    id: 6,
    name: 'Agent 6 : Expert Base de Données',
    role: 'Data Architect',
    mission: 'Modéliser les entités relationnelles, structurer les adresses gabonaises (province, ville, arrondissement, quartier) et alimenter la base initiale.',
    keyDeliverables: [
      'Schémas typés complets pour 14 entités',
      'Base d’entreprises gabonaises authentiques vérifiées dans les 9 provinces',
      'Gestion des horaires, modes de paiement (Airtel/Moov Money) et services'
    ],
    status: 'completed',
    technologies: ['Data Modeling', 'JSON Database Engine', 'Geo-indexing'],
    summary: 'A injecté un jeu de données authentique et vérifié reflétant la réalité économique du Gabon.'
  },
  {
    id: 7,
    name: 'Agent 7 : Expert Sécurité & Qualité',
    role: 'Responsable Cybersécurité & QA',
    mission: 'Valider les entrées utilisateurs, protéger contre les abus et le spam d’avis, sécuriser les rôles (visiteur, pro, admin).',
    keyDeliverables: [
      'Validation stricte des coordonnées GPS et numéros (+241)',
      'Modération des avis avec signalement en un clic',
      'Gestion des rôles sans exposition d’identifiants critiques',
      'Conformité protection des données (APDPVP Gabon)'
    ],
    status: 'completed',
    technologies: ['Input Sanitization', 'Role-Based Access Control', 'Auditing'],
    summary: 'A mis en place des filtres anti-spam, le système de signalement d’erreurs et les règles de validation.'
  },
  {
    id: 8,
    name: 'Agent 8 : Expert SEO & Référencement',
    role: 'Stratège SEO & Découvrabilité',
    mission: 'Optimiser le référencement naturel pour Google, générer des métadonnées enrichies et des balises OpenGraph valorisant les villes et secteurs.',
    keyDeliverables: [
      'Balises méta optimisées pour les 9 provinces et les secteurs clés',
      'URLs sémantiques basées sur les slugs d’entreprises',
      'Structure JSON-LD LocalBusiness pour les fiches d’entreprises',
      'Mots-clés ciblés sur le marché gabonais'
    ],
    status: 'completed',
    technologies: ['SEO sémantique', 'OpenGraph', 'Schema.org LocalBusiness'],
    summary: 'A configuré les données structurées et les descriptions géographiques adaptées aux recherches locales au Gabon.'
  },
  {
    id: 9,
    name: 'Agent 9 : Gestion de Plateforme & Admin',
    role: 'Administrateur Fonctionnel',
    mission: 'Concevoir les outils d’administration, de modération, d’approbation des nouvelles entreprises et d’exportation des données.',
    keyDeliverables: [
      'Tableau de bord d’administration avec KPI en temps réel',
      'Module d’approbation/rejet des nouvelles fiches soumises',
      'Modérateur d’avis et gestionnaire des signalements d’adresses erronées',
      'Export des données d’entreprises au format CSV'
    ],
    status: 'completed',
    technologies: ['Admin Dashboards', 'CSV Exporter', 'Content Moderation'],
    summary: 'A livré un back-office prêt à l’emploi permettant la gestion continue du patrimoine économique de la plateforme.'
  }
];

export const CURRENT_USER: UserAccount = {
  id: 'usr-1',
  name: 'Franck Nguema',
  email: 'nfranyck@gmail.com',
  role: 'admin', // allows full testing of Visitor, Pro, and Admin features
  favorites: ['moov-africa-libertis', 'bgfi-bank-gabon', 'radisson-blu-okoume', 'setrag-owendo'],
  ownedBusinessIds: [] // Strictly empty by default to prevent cross-tenant mock bleeding
};

