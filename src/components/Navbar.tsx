import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Sparkles, 
  PlusCircle, 
  Layers, 
  Tag, 
  Map as MapIcon, 
  Building, 
  ShieldCheck, 
  User, 
  Menu, 
  X, 
  Scale, 
  Cpu, 
  ChevronDown,
  Lock,
  LogOut,
  UserCheck
} from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserAccount;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount>>;
  onOpenAiAssistant: () => void;
  onOpenRegisterModal: () => void;
  onOpenAuthModal: (role?: 'business_owner' | 'admin') => void;
  onLogout: () => void;
  comparisonCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  onOpenAiAssistant,
  onOpenRegisterModal,
  onOpenAuthModal,
  onLogout,
  comparisonCount
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Accueil', icon: Building },
    { id: 'map', label: 'Carte du Gabon', icon: MapIcon },
    { id: 'directory', label: 'Annuaire', icon: Search },
    { id: 'provinces', label: '9 Provinces', icon: Layers },
    { id: 'promotions', label: 'Offres & Actus', icon: Tag },
    { id: 'agents', label: 'Équipe Multi-Agents', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Gabon Flag Ribbon */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#009e60]" title="Vert - Forêts du Gabon"></div>
        <div className="h-full w-1/3 bg-[#fcd116]" title="Jaune - Soleil et dynamisme"></div>
        <div className="h-full w-1/3 bg-[#3a75c4]" title="Bleu - Océan Atlantique"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Platform Name */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  GABON<span className="text-emerald-600 ml-1">BUSINESS MAP</span>
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase">
                  Officiel
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Annuaire & Cartographie des Entreprises au Gabon
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {link.label}
                </button>
              );
            })}

            {/* Comparateur badge */}
            {comparisonCount > 0 && (
              <button
                onClick={() => setActiveTab('comparator')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'comparator'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Comparer</span>
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {comparisonCount}
                </span>
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Assistant IA CTA */}
            <button
              onClick={onOpenAiAssistant}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 rounded-lg border border-amber-300 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Poser une question à l'Assistant IA du Gabon"
            >
              <Sparkles className="w-4 h-4 text-amber-700 animate-pulse" />
              <span className="hidden sm:inline">Assistant IA</span>
              <span className="sm:hidden">IA</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>

            {/* Register Business CTA */}
            <button
              onClick={onOpenRegisterModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Référencer mon entreprise</span>
            </button>

            {/* Authentication & Role State */}
            {currentUser.role === 'visitor' ? (
              <button
                onClick={() => onOpenAuthModal('business_owner')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                title="Connexion Espace Pro"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Espace Pro</span>
                <span className="md:hidden">Connexion</span>
              </button>
            ) : currentUser.role === 'admin' ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('admin_dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin_dashboard'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                  title="Accéder au panneau d'administration"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Se déconnecter de la session Administrateur"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('pro_dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'pro_dashboard'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                  title="Accéder au tableau de bord professionnel"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Espace Pro</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Se déconnecter du compte Entreprise"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {link.label}
                </button>
              );
            })}

            {comparisonCount > 0 && (
              <button
                onClick={() => {
                  setActiveTab('comparator');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg text-blue-700 bg-blue-50"
              >
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4" />
                  <span>Comparateur d'entreprises</span>
                </div>
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {comparisonCount}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenRegisterModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Référencer mon entreprise (+ GPS)</span>
            </button>

            {currentUser.role === 'visitor' ? (
              <button
                onClick={() => {
                  onOpenAuthModal('business_owner');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <Lock className="w-4 h-4 text-slate-600" />
                <span>Connexion Espace Pro</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Se déconnecter ({currentUser.name})</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
