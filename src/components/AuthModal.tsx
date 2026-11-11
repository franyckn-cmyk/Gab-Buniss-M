import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  Info,
  RefreshCw,
  Building
} from 'lucide-react';
import { UserAccount } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'business_owner' | 'admin';
  initialMode?: 'login' | 'signup' | 'reset';
  onLoginSuccess: (token: string, user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'business_owner',
  initialMode = 'login',
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [roleIntent, setRoleIntent] = useState<'business_owner' | 'admin'>(initialRole);

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const formatAuthErrorMessage = (rawMessage: string): { message: string; unconfirmed: boolean } => {
    const msg = String(rawMessage || '');
    const lower = msg.toLowerCase();
    if (lower.includes('email not confirmed')) {
      return {
        message: 'Votre adresse e-mail n’est pas encore confirmée. Cliquez sur le lien reçu dans votre boîte de réception (ou demandez un nouvel envoi ci-dessous).',
        unconfirmed: true
      };
    }
    if (lower.includes('invalid login credentials')) {
      return {
        message: 'Adresse e-mail ou mot de passe incorrect.',
        unconfirmed: false
      };
    }
    if (lower.includes('user already registered')) {
      return {
        message: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.',
        unconfirmed: false
      };
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return {
        message: 'Trop de tentatives rapprochées. Veuillez patienter quelques instants avant de réessayer.',
        unconfirmed: false
      };
    }
    return {
      message: msg || 'Identifiants invalides ou compte inexistant.',
      unconfirmed: false
    };
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !supabase || !isSupabaseConfigured) return;

    setIsResendingEmail(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        const formatted = formatAuthErrorMessage(error.message);
        setErrorMsg(formatted.message);
      } else {
        setNeedsEmailConfirmation(false);
        setSuccessMsg(`Un nouvel e-mail de confirmation vient d’être envoyé à ${cleanEmail}.`);
      }
    } catch {
      setErrorMsg('Impossible de renvoyer l’e-mail de confirmation pour le moment.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Handle Login via Supabase Auth or secure server endpoint
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setNeedsEmailConfirmation(false);

    try {
      // 1. Direct Supabase Auth attempt if configured client-side
      if (supabase && isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (authError) {
          const formatted = formatAuthErrorMessage(authError.message);
          setNeedsEmailConfirmation(formatted.unconfirmed);
          setErrorMsg(formatted.message);
          return;
        }

        if (authData.session && authData.user) {
          // Fetch profile and roles from Supabase DB (maybeSingle évite toute erreur 406 si absent)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            setErrorMsg('Votre compte a été suspendu par un administrateur.');
            return;
          }

          const { data: ownedRows } = await supabase
            .from('business_owners')
            .select('business_id')
            .eq('user_id', authData.user.id);

          const ownedIds = ownedRows ? ownedRows.map(r => r.business_id) : [];

          const loggedInUser: UserAccount = {
            id: authData.user.id,
            name: profile?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: profile?.role || 'business_owner',
            adminRole: profile?.admin_role || undefined,
            favorites: profile?.favorites || [],
            ownedBusinessIds: ownedIds,
            emailConfirmed: Boolean(authData.user.email_confirmed_at || authData.user.confirmed_at),
            supabaseUserId: authData.user.id
          };

          onLoginSuccess(authData.session.access_token, loggedInUser);
          onClose();
          return;
        }
      }

      // 2. Fallback to server-side authentication proxy
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass })
      });

      const data = await res.json();

      if (!res.ok) {
        const formatted = formatAuthErrorMessage(data.error || 'Échec de la connexion. Vérifiez vos identifiants.');
        setNeedsEmailConfirmation(formatted.unconfirmed);
        setErrorMsg(formatted.message);
        return;
      }

      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      const formatted = formatAuthErrorMessage(err?.message || '');
      setNeedsEmailConfirmation(formatted.unconfirmed);
      setErrorMsg(formatted.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup (Compte Propriétaire)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanName || !cleanPass) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (cleanPass.length < 8) {
      setErrorMsg('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (!acceptTerms) {
      setErrorMsg('Veuillez accepter les conditions d’utilisation de la plateforme.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setNeedsEmailConfirmation(false);

    try {
      // 1. If Supabase configured client-side
      if (supabase && isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name: cleanName,
              company_name: companyName.trim(),
              role: 'business_owner'
            }
          }
        });

        if (authError) {
          const formatted = formatAuthErrorMessage(authError.message);
          setErrorMsg(formatted.message);
          return;
        }

        if (authData.user) {
          if (authData.session) {
            // Auto signed-in (email confirmation off in Supabase settings)
            const newUser: UserAccount = {
              id: authData.user.id,
              name: cleanName,
              email: cleanEmail,
              role: 'business_owner',
              favorites: [],
              ownedBusinessIds: [],
              emailConfirmed: true,
              supabaseUserId: authData.user.id
            };
            onLoginSuccess(authData.session.access_token, newUser);
            onClose();
            return;
          } else {
            // Confirmation email sent
            setSuccessMsg('Compte propriétaire créé avec succès ! Un lien de confirmation a été envoyé à votre adresse e-mail.');
            setTimeout(() => {
              setMode('login');
              setSuccessMsg('');
            }, 5000);
            return;
          }
        }
      }

      // 2. Server-side registration endpoint
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPass,
          companyName: companyName.trim(),
          role: 'business_owner'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const formatted = formatAuthErrorMessage(data.error || 'Erreur lors de la création du compte.');
        setErrorMsg(formatted.message);
        return;
      }

      if (data.token && data.user) {
        onLoginSuccess(data.token, data.user);
        onClose();
      } else {
        setSuccessMsg(data.message || 'Votre compte a été créé. Vous pouvez maintenant vous connecter.');
        setMode('login');
      }
    } catch (err: any) {
      const formatted = formatAuthErrorMessage(err?.message || 'Impossible de créer le compte.');
      setErrorMsg(formatted.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
      } else {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur réinitialisation');
      }

      setSuccessMsg('Un e-mail de réinitialisation sécurisé vient d’être envoyé à votre adresse.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’envoi de l’e-mail de réinitialisation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Authentification Sécurisée
              </h3>
              <p className="text-xs text-slate-300">
                Portail officiel Supabase Auth • Gabon Business Map
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers: Connexion / Inscription / Reset */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>Se connecter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Créer compte Pro</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {needsEmailConfirmation && supabase && isSupabaseConfigured && email.trim() && (
                <button
                  type="button"
                  disabled={isResendingEmail}
                  onClick={handleResendConfirmation}
                  className="ml-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isResendingEmail ? 'animate-spin' : ''}`} />
                  <span>{isResendingEmail ? 'Envoi en cours...' : 'Renvoyer l’e-mail de confirmation'}</span>
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@votre-entreprise.ga"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mot de passe *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isLoading ? 'Vérification en cours...' : 'Se connecter en toute sécurité'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE 2: SIGNUP (COMPTE PROPRIÉTAIRE) */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom et prénom du responsable *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Jean-Marc Ondo"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de l'entreprise *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Gabon Logistics Services"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail professionnelle *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="directeur@entreprise.ga"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 caractères"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Confirmation *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 text-blue-600 rounded"
                />
                <span>
                  J'atteste être le représentant légal de cette entreprise au Gabon et j'accepte les conditions d'utilisation.
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                <span>Créer mon Compte Propriétaire</span>
              </button>
            </form>
          )}

          {/* MODE 3: RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                Renseignez votre adresse e-mail. Vous recevrez un lien sécurisé généré par Supabase Auth pour réinitialiser votre mot de passe.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse e-mail de votre compte *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre-email@entreprise.ga"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 text-emerald-400" />
                )}
                <span>Envoyer le lien de réinitialisation</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 font-bold py-1 cursor-pointer"
              >
                ← Retour à l'écran de connexion
              </button>
            </form>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Protection Supabase : Mots de passe chiffrés, jetons JWT sécurisés et politiques RLS strictes.</span>
        </div>
      </div>
    </div>
  );
};
