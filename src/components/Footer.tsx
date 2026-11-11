import React from 'react';
import { MapPin, ShieldCheck, Heart, Sparkles, Building, Layers } from 'lucide-react';
import { PROVINCES } from '../data/gabonData';

interface FooterProps {
  onSelectProvince: (provId: string) => void;
  onOpenRegisterModal: () => void;
  onOpenAiAssistant: () => void;
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectProvince,
  onOpenRegisterModal,
  onOpenAiAssistant,
  setActiveTab
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Top flag bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#009e60]"></div>
        <div className="h-full w-1/3 bg-[#fcd116]"></div>
        <div className="h-full w-1/3 bg-[#3a75c4]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <MapPin className="w-5 h-5 text-amber-300" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">
                GABON<span className="text-emerald-500 ml-1">BUSINESS MAP</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plateforme nationale de géolocalisation, référencement et mise en relation avec les entreprises au Gabon. Couvrant l'ensemble des 9 provinces, de Libreville à Port-Gentil, en passant par Franceville et Lambaréné.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onOpenAiAssistant}
                className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-400/40 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Consulter l'Assistant IA</span>
              </button>

              <button
                onClick={onOpenRegisterModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                + Inscrire mon entreprise
              </button>
            </div>
          </div>

          {/* 9 Provinces Navigation */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              Les 9 Provinces
            </h4>
            <ul className="space-y-1.5 text-xs">
              {PROVINCES.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelectProvince(p.id)}
                    className="hover:text-emerald-400 transition-colors text-slate-400 hover:underline"
                  >
                    {p.name} ({p.capital})
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Plateforme & Navigation */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-3">
              Découverte
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => setActiveTab('map')} className="hover:text-white transition-colors">
                  Carte interactive du Gabon
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('directory')} className="hover:text-white transition-colors">
                  Annuaire des entreprises
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('promotions')} className="hover:text-white transition-colors">
                  Offres & Actualités
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('comparator')} className="hover:text-white transition-colors">
                  Comparateur de services
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('agents')} className="hover:text-white transition-colors">
                  Équipe Multi-Agents IA
                </button>
              </li>
            </ul>
          </div>

          {/* Légal & Conformité APDPVP Gabon */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Cadre Réglementaire
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Conformité APDPVP Gabon (Protection des données)</li>
              <li>Charte de modération des avis clients</li>
              <li>Vérification des numéros NIF officiels</li>
              <li>Conditions Générales d'Utilisation</li>
              <li>Mentions Légales & Propriété Intellectuelle</li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} GABON BUSINESS MAP. Tous droits réservés. République Gabonaise.
          </div>
          <div className="flex items-center gap-1">
            <span>Conçu avec fierté pour l'essor économique du Gabon</span>
            <span>🇬🇦</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
