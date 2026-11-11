#!/usr/bin/env tsx
/**
 * GABON BUSINESS MAP — SCRIPT SERVEUR D'INITIALISATION DU PREMIER SUPER ADMINISTRATEUR
 * 
 * Utilisation :
 *   GBM_BOOTSTRAP_SECRET="VotreSecretTemporaire" npm run bootstrap:admin -- --email="moncompte@example.com"
 * 
 * Règles de sécurité :
 * 1. Utilisable uniquement côté serveur avec SUPABASE_SECRET_KEY
 * 2. Lit le secret EXCLUSIVEMENT depuis la variable d'environnement serveur GBM_BOOTSTRAP_SECRET
 *    (l'argument CLI --secret est strictement interdit)
 * 3. Nécessite que le compte utilisateur existe déjà dans Supabase
 * 4. Ne crée aucun compte automatiquement
 * 5. Désactivé définitivement dès qu'un Super Administrateur actif existe déjà
 * 6. N'affiche jamais le secret dans les journaux ou la console
 */

import dotenv from 'dotenv';
dotenv.config();

import { executeSuperAdminBootstrap, isBootstrapActive } from '../src/server/bootstrapAdmin.ts';

// Parser uniquement l'argument CLI autorisé (--email=...)
function getCliEmailArg(): string | null {
  const args = process.argv.slice(2);

  // Interdire formellement le passage du secret en argument CLI
  for (const arg of args) {
    const normalized = arg.toLowerCase().trim();
    if (normalized === '--secret' || normalized.startsWith('--secret=')) {
      console.error('❌ ERREUR DE SÉCURITÉ : L\'option CLI --secret est strictement interdite.');
      console.error('   Pour protéger le secret contre l\'exposition dans l\'historique shell ou la table des processus,');
      console.error('   configurez EXCLUSIVEMENT la variable d\'environnement serveur GBM_BOOTSTRAP_SECRET.');
      process.exit(1);
    }
  }

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      return arg.substring('--email='.length).trim();
    }
  }

  return null;
}

async function main() {
  console.log('\n🇬🇦 ====================================================================');
  console.log('   GABON BUSINESS MAP — INITIALISATION DU PREMIER SUPER ADMINISTRATEUR');
  console.log('====================================================================\n');

  const email = getCliEmailArg() || (process.env.GBM_BOOTSTRAP_EMAIL || '').trim();
  // Lecture EXCLUSIVE depuis la variable d'environnement serveur GBM_BOOTSTRAP_SECRET
  const secret = (process.env.GBM_BOOTSTRAP_SECRET || '').trim();

  if (!email) {
    console.error('❌ ERREUR : L\'adresse e-mail du compte à promouvoir est obligatoire.');
    console.error('   Exemple : npm run bootstrap:admin -- --email="mon-email@domaine.ga"');
    process.exit(1);
  }

  if (!secret) {
    console.error('❌ ERREUR : La variable d\'environnement serveur GBM_BOOTSTRAP_SECRET est absente ou vide.');
    console.error('   Définissez GBM_BOOTSTRAP_SECRET dans l\'environnement du serveur avant d\'exécuter ce script.');
    process.exit(1);
  }

  // Vérification fail-closed de l'état du bootstrap
  const check = await isBootstrapActive();
  if (!check.active) {
    console.error(`❌ ERREUR : ${check.reason || 'Le mécanisme d\'initialisation est indisponible.'}`);
    process.exit(1);
  }

  console.log(`⏳ Traitement sécurisé de la promotion pour le compte : ${email}...`);

  try {
    const result = await executeSuperAdminBootstrap({
      targetEmail: email,
      bootstrapSecret: secret,
      clientIp: '127.0.0.1 (CLI)'
    });

    console.log('\n✅ SUCCÈS ABSOLU !');
    console.log(`   ${result.message}`);
    console.log(`   ID Utilisateur : ${result.user?.id}`);
    console.log(`   Rôle accordé   : ${result.user?.role} (${result.user?.adminRole})`);
    console.log('\n🔒 Le mécanisme d’initialisation est maintenant DÉFINITIVEMENT DÉSACTIVÉ.');
    console.log('   Vous pouvez désormais vous connecter sur la plateforme avec ce compte pour administrer Gabon Business Map.\n');
  } catch (err: any) {
    console.error(`\n❌ ÉCHEC DE L'INITIALISATION : ${err.message}\n`);
    process.exit(1);
  }
}

main().catch((err: any) => {
  console.error('Erreur fatale lors de l\'initialisation :', err?.message || 'Erreur inconnue');
  process.exit(1);
});
