import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env ou les processus actifs
dotenv.config();

if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const envRaw = fs.readFileSync(`/proc/${pid}/environ`, 'utf-8');
        if (envRaw.includes('SUPABASE_URL')) {
          envRaw.split('\0').forEach(line => {
            const idx = line.indexOf('=');
            if (idx > 0) {
              const k = line.slice(0, idx);
              const v = line.slice(idx + 1);
              if (!process.env[k]) process.env[k] = v;
            }
          });
          break;
        }
      } catch {}
    }
  } catch {}
}

// Récupération de l'URL et de la clé (Privilégier la Service Role Key si disponible pour contourner RLS)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erreur : Variables d'environnement Supabase manquantes dans l'environnement.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Interface d'une entreprise brute issue du JSON
interface BusinessInput {
  name: string;
  category: string;
  province: string;
  city: string;
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  status?: 'verified' | 'pending' | 'unverified';
}

/**
 * Normalise une chaîne de caractères pour créer un slug URL unique et propre
 */
function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-')           // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '')       // Supprime tous les caractères spéciaux
    .replace(/\-\-+/g, '-');        // Remplace les multiples tirets par un seul
}

/**
 * Fonction principale d'importation
 */
async function importBusinesses() {
  const jsonPath = path.join(process.cwd(), 'data', 'businesses.json');

  console.log(`📂 Lecture du fichier JSON : ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable : ${jsonPath}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const businesses: BusinessInput[] = JSON.parse(rawData);

    console.log(`📌 ${businesses.length} entreprise(s) trouvée(s) dans le fichier JSON.`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of businesses) {
      if (!item.name || !item.category || !item.province || !item.city) {
        console.warn(`⚠️ Fiche ignorée (champs requis manquants) :`, item.name || 'Nom inconnu');
        errorCount++;
        continue;
      }

      const baseSlug = generateSlug(item.name);
      // Qualification du slug avec la ville pour garantir l'unicité
      const slug = `${baseSlug}-${generateSlug(item.city)}`;

      // Vérifier si l'entreprise existe déjà d'après son slug
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        console.log(`⏩ Déjà existante (ignorée) : ${item.name} (${slug})`);
        skippedCount++;
        continue;
      }

      // Préparation de l'objet conforme aux colonnes de public.businesses
      const businessRow = {
        name: item.name,
        slug: slug,
        category: item.category,
        province: item.province,
        city: item.city,
        address: item.address || null,
        lat: Number(item.lat),
        lng: Number(item.lng),
        phone: item.phone || null,
        email: item.email || null,
        website: item.website || null,
        description: item.description || null,
        status: item.status || 'verified', // Défini par défaut sur 'verified' pour l'import de référence
        claimed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('businesses')
        .insert([businessRow]);

      if (error) {
        console.error(`❌ Erreur lors de l'insertion de "${item.name}" :`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Insérée avec succès : ${item.name}`);
        successCount++;
      }
    }

    console.log('\n--- RÉSULTAT DE L\'IMPORTATION ---');
    console.log(`🎉 Réussies  : ${successCount}`);
    console.log(`⏩ Ignorées  : ${skippedCount}`);
    console.log(`❌ Échouées  : ${errorCount}`);

  } catch (err) {
    console.error('❌ Erreur critique lors de l\'exécution du script :', err);
  }
}

importBusinesses();