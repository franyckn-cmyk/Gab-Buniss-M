// Ce code va dans votre fichier serveur Express (ex: server.ts ou routes/businesses.ts)
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getSupabaseUrl, getSupabaseSecretKey, verifySupabaseToken } from '../supabaseServer.ts';
import { dbCreateBusiness, getUserOwnedBusinessIds } from '../db.ts';

dotenv.config();

const router = Router();

// Récupération de l'URL et de la clé Service Role pour le client Supabase serveur
const SUPABASE_URL = getSupabaseUrl() || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = getSupabaseSecretKey() || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

router.post('/api/businesses', async (req: Request, res: Response) => {
  try {
    // 1. Détection éventuelle de session utilisateur
    let authenticatedUser: any = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const sbUser = await verifySupabaseToken(token).catch(() => null);
      if (sbUser) {
        const ownedIds = await getUserOwnedBusinessIds(sbUser.id, sbUser.email).catch(() => []);
        authenticatedUser = {
          id: sbUser.id,
          name: sbUser.name,
          email: sbUser.email,
          role: sbUser.role,
          adminRole: sbUser.adminRole,
          ownedBusinessIds: ownedIds
        };
      }
    }

    // Si les données proviennent du formulaire frontend ou d'un utilisateur authentifié
    if (authenticatedUser || req.body?.location || req.body?.contact || req.body?.details) {
      const effectiveUser = authenticatedUser || {
        id: 'usr-service-api',
        name: 'Service API',
        email: req.body?.email || req.body?.contact?.email || 'admin@gabonbusinessmap.ga',
        role: 'admin',
        ownedBusinessIds: []
      };

      const newBusiness = await dbCreateBusiness(req.body, effectiveUser);
      console.log(`[Notification] Nouvelle entreprise créée : ${newBusiness.name} (ID: ${newBusiness.id})`);
      return res.status(201).json(newBusiness);
    }

    // 2. Insertion directe de l'entreprise via Supabase SDK (format plat SQL)
    const { data: newBusiness, error } = await supabase
      .from('businesses')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    // 3. Log ou notification interne
    console.log(`[Notification] Nouvelle entreprise créée : ${newBusiness.name} (ID: ${newBusiness.id})`);

    return res.status(201).json(newBusiness);
  } catch (err: any) {
    console.error('Erreur création entreprise :', err?.message || err);
    return res.status(500).json({ error: err.message || 'Erreur interne lors de la création de l’entreprise' });
  }
});

export default router;
