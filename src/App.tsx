import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { InteractiveMap } from './components/InteractiveMap';
import { DirectoryView } from './components/DirectoryView';
import { ProvincesView } from './components/ProvincesView';
import { PromotionsView } from './components/PromotionsView';
import { MultiAgentsView } from './components/MultiAgentsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProDashboard } from './components/ProDashboard';
import { BusinessComparisonDrawer } from './components/BusinessComparisonDrawer';
import { BusinessDetailsModal } from './components/BusinessDetailsModal';
import { RegisterBusinessModal } from './components/RegisterBusinessModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { ShieldCheck, Building, Lock } from 'lucide-react';

import { Business, Review, Promotion, UserAccount, BusinessCategory, BusinessReport } from './types';
import { 
  INITIAL_BUSINESSES, 
  INITIAL_REVIEWS, 
  INITIAL_PROMOTIONS 
} from './data/gabonData';
import { useDynamicSEO } from './utils/seo';
import { supabase, isSupabaseConfigured, fetchSupabaseProfile } from './lib/supabase';

const DEFAULT_GUEST_USER: UserAccount = {
  id: 'usr-guest',
  name: 'Visiteur',
  email: '',
  role: 'visitor',
  favorites: [],
  ownedBusinessIds: []
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [mapTargetProvince, setMapTargetProvince] = useState<string>('all');

  // Application Data
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [promotions, setPromotions] = useState<Promotion[]>(INITIAL_PROMOTIONS);
  const [reports, setReports] = useState<BusinessReport[]>([]);

  // Authentication & Security (RBAC) - Strictly requires valid authenticated session
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('gbm_auth_token');
  });
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEFAULT_GUEST_USER);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<'business_owner' | 'admin'>('business_owner');

  const [favorites, setFavorites] = useState<string[]>([]);
  const [comparedBusinesses, setComparedBusinesses] = useState<Business[]>([]);

  // Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modals
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [pendingRegisterAfterAuth, setPendingRegisterAfterAuth] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [adminManagingBiz, setAdminManagingBiz] = useState<Business | null>(null);

  // Dynamic SEO Synchronization
  useDynamicSEO(activeTab, selectedBusiness);

  const getAuthHeaders = (tokenOverride?: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const effectiveToken = tokenOverride || authToken;
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    return headers;
  };

  const handleLoginSuccess = (token: string, user: UserAccount) => {
    setAuthToken(token);
    localStorage.setItem('gbm_auth_token', token);
    setCurrentUser(user);
    if (pendingRegisterAfterAuth) {
      setPendingRegisterAfterAuth(false);
      setIsAuthModalOpen(false);
      setIsRegisterModalOpen(true);
      return;
    }
    if (user.role === 'admin') {
      setActiveTab('admin_dashboard');
    } else if (user.role === 'business_owner') {
      setActiveTab('pro_dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('gbm_auth_token');
    setAuthToken(null);
    setPendingRegisterAfterAuth(false);
    setCurrentUser(DEFAULT_GUEST_USER);
    setActiveTab('home');
  };

  // Supabase Auth listener on mount
  useEffect(() => {
    if (supabase && isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          setAuthToken(session.access_token);
          localStorage.setItem('gbm_auth_token', session.access_token);
          fetchSupabaseProfile(session.user.id, session.user).then(profile => {
            if (profile) setCurrentUser(profile);
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          setAuthToken(session.access_token);
          localStorage.setItem('gbm_auth_token', session.access_token);
          const profile = await fetchSupabaseProfile(session.user.id, session.user);
          if (profile) setCurrentUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setAuthToken(null);
          localStorage.removeItem('gbm_auth_token');
          setCurrentUser(DEFAULT_GUEST_USER);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch from API on mount with fallback and token validation
  useEffect(() => {
    async function loadData() {
      let isResolvedAdmin = currentUser.role === 'admin';
      let activeBearer = authToken;

      // Validate session token with server
      if (authToken) {
        try {
          const resMe = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (resMe.ok) {
            const meUser = await resMe.json();
            setCurrentUser(meUser);
            isResolvedAdmin = meUser?.role === 'admin';
          } else {
            // Token expired or invalid
            localStorage.removeItem('gbm_auth_token');
            setAuthToken(null);
            activeBearer = null;
            setCurrentUser(DEFAULT_GUEST_USER);
            isResolvedAdmin = false;
          }
        } catch (e) {
          // ignore
        }
      }

      try {
        const resBiz = await fetch('/api/businesses', {
          headers: activeBearer ? { Authorization: `Bearer ${activeBearer}` } : {}
        });
        if (resBiz.ok) {
          const dataBiz = await resBiz.json();
          if (Array.isArray(dataBiz) && dataBiz.length > 0) {
            setBusinesses(dataBiz);
          }
        }
      } catch (err) {
        console.warn('API running with initial client seed.');
      }

      try {
        const resPromo = await fetch('/api/promotions');
        if (resPromo.ok) {
          const dataPromo = await resPromo.json();
          if (Array.isArray(dataPromo) && dataPromo.length > 0) {
            setPromotions(dataPromo);
          }
        }
      } catch (e) {
        // fallback
      }

      try {
        const resReviews = await fetch('/api/reviews');
        if (resReviews.ok) {
          const dataReviews = await resReviews.json();
          if (Array.isArray(dataReviews) && dataReviews.length > 0) {
            setReviews(dataReviews);
          }
        }
      } catch (e) {
        // fallback
      }

      // Reports require admin authorization
      if (authToken && isResolvedAdmin) {
        try {
          const resReports = await fetch('/api/reports', {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (resReports.ok) {
            const dataReports = await resReports.json();
            if (Array.isArray(dataReports)) {
              setReports(dataReports);
            }
          }
        } catch (e) {
          // fallback
        }
      }
    }

    loadData();
  }, [authToken]);

  // Toggle Favorite
  const handleToggleFavorite = (bizId: string) => {
    setFavorites(prev => {
      const next = prev.includes(bizId) ? prev.filter(id => id !== bizId) : [...prev, bizId];
      setCurrentUser(u => ({ ...u, favorites: next }));
      return next;
    });
  };

  // Toggle Compare
  const handleToggleCompare = (business: Business) => {
    setComparedBusinesses(prev => {
      if (prev.some(b => b.id === business.id)) {
        return prev.filter(b => b.id !== business.id);
      }
      if (prev.length >= 3) {
        alert('Vous pouvez comparer jusqu’à 3 entreprises simultanément.');
        return prev;
      }
      return [...prev, business];
    });
  };

  // Record action stat (phone call, whatsapp, route)
  const handleRecordAction = async (businessId: string, action: 'phone' | 'whatsapp' | 'route') => {
    // Update local state immediately
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== businessId) return b;
        const stats = { ...b.stats };
        if (action === 'phone') stats.phoneClicks += 1;
        if (action === 'whatsapp') stats.whatsappClicks += 1;
        if (action === 'route') stats.routeClicks += 1;
        return { ...b, stats };
      })
    );

    // Call API
    try {
      await fetch(`/api/businesses/${businessId}/action-stat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      // ignore
    }
  };

  // Add review
  const handleAddReview = async (
    businessId: string,
    newRev: { authorName: string; authorCity: string; rating: number; comment: string }
  ) => {
    const createdReview: Review = {
      id: `rev-${Date.now()}`,
      businessId,
      authorName: newRev.authorName,
      authorCity: newRev.authorCity,
      rating: newRev.rating,
      comment: newRev.comment,
      createdAt: new Date().toISOString(),
      helpfulCount: 0
    };

    setReviews(prev => [createdReview, ...prev]);

    // Recalculate business rating
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== businessId) return b;
        const allReviews = [createdReview, ...reviews.filter(r => r.businessId === businessId)];
        const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const updatedRating = Math.round(avg * 10) / 10;
        return {
          ...b,
          rating: updatedRating,
          reviewsCount: allReviews.length
        };
      })
    );

    // Call API
    try {
      await fetch(`/api/businesses/${businessId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRev)
      });
    } catch (e) {
      // local update is already active
    }
  };

  // Report Business
  const handleReportBusiness = async (
    businessId: string,
    report: { reason: string; details: string; reporterEmail: string }
  ) => {
    const biz = businesses.find(b => b.id === businessId);
    const newRep: BusinessReport = {
      id: `rep-${Date.now()}`,
      businessId,
      businessName: biz ? biz.name : 'Entreprise',
      reason: report.reason as any,
      details: report.details,
      reporterEmail: report.reporterEmail,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    setReports(prev => [newRep, ...prev]);

    try {
      await fetch(`/api/businesses/${businessId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (e) {
      // ignore
    }
  };

  // Update Business (from Pro Dashboard or Admin)
  const handleUpdateBusiness = async (
    bizId: string,
    updatedFields: Partial<Business>
  ): Promise<Business | null> => {
    const res = await fetch(`/api/businesses/${bizId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedFields)
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        payload.error || "Erreur lors de la mise à jour de l'entreprise."
      );
    }

    const savedBiz = payload as Business;
    setBusinesses(prev => prev.map(b => (b.id === bizId ? savedBiz : b)));
    setComparedBusinesses(prev => prev.map(b => (b.id === bizId ? savedBiz : b)));

    if (selectedBusiness && selectedBusiness.id === bizId) {
      setSelectedBusiness(savedBiz);
    }
    if (adminManagingBiz && adminManagingBiz.id === bizId) {
      setAdminManagingBiz(savedBiz);
    }

    return savedBiz;
  };

  // Update Status (Admin)
  const handleUpdateStatus = async (id: string, status: Business['status'], reason?: string) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
    if (adminManagingBiz && adminManagingBiz.id === id) {
      setAdminManagingBiz(prev => prev ? { ...prev, status } : null);
    }
    if (selectedBusiness && selectedBusiness.id === id) {
      setSelectedBusiness(prev => prev ? { ...prev, status } : null);
    }

    try {
      const res = await fetch(`/api/businesses/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, reason })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.business) {
          const savedBiz = data.business as Business;
          setBusinesses(prev => prev.map(b => (b.id === id ? savedBiz : b)));
          if (adminManagingBiz && adminManagingBiz.id === id) setAdminManagingBiz(savedBiz);
          if (selectedBusiness && selectedBusiness.id === id) setSelectedBusiness(savedBiz);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Review (Admin)
  const handleDeleteReview = async (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    try {
      await fetch(`/api/reviews/${reviewId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // ignore
    }
  };

  // Resolve Report (Admin)
  const handleResolveReport = async (reportId: string) => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: 'resolved' as const } : r))
    );
    try {
      await fetch(`/api/reports/${reportId}/resolve`, { 
        method: 'PUT',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // ignore
    }
  };

  // Add Business (from Registration modal) -> Persistence réelle Supabase PostgreSQL
  const handleBusinessAdded = async (newBizPartial: Partial<Business>): Promise<Business> => {
    if (!authToken) {
      throw new Error('Veuillez vous connecter avant de créer une entreprise.');
    }

    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newBizPartial)
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        payload.error || "Erreur lors de l'enregistrement de l'entreprise sur le serveur."
      );
    }

    const createdBiz = payload as Business;

    setBusinesses(prev => [createdBiz, ...prev.filter(b => b.id !== createdBiz.id)]);

    if (currentUser.id && currentUser.id !== 'usr-guest') {
      setCurrentUser(prev => ({
        ...prev,
        role: prev.role === 'admin' ? 'admin' : 'business_owner',
        ownedBusinessIds: Array.from(new Set([...(prev.ownedBusinessIds || []), createdBiz.id]))
      }));
    }

    return createdBiz;
  };

  // Toggle Verify (Admin)
  const handleToggleVerifyBusiness = async (id: string) => {
    const currentBiz = businesses.find(b => b.id === id);
    const nextStatus: 'verified' | 'unverified' =
      currentBiz?.status === 'verified' ? 'unverified' : 'verified';

    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, status: nextStatus } : b))
    );

    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const savedBiz = (await res.json()) as Business;
        setBusinesses(prev => prev.map(b => (b.id === id ? savedBiz : b)));
      }
    } catch (e) {
      // ignore
    }
  };

  // Delete Business (Admin)
  const handleDeleteBusiness = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement cette entreprise de la base de données ?')) {
      return;
    }
    setBusinesses(prev => prev.filter(b => b.id !== id));
    try {
      await fetch(`/api/businesses/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // ignore
    }
  };

  // Reply Review (Pro Dashboard)
  const handleReplyReview = async (reviewId: string, replyText: string) => {
    setReviews(prev =>
      prev.map(r => {
        if (r.id !== reviewId) return r;
        return {
          ...r,
          businessResponse: {
            comment: replyText,
            date: new Date().toISOString(),
            responderName: currentUser.name || 'Direction de l’établissement'
          }
        };
      })
    );
    try {
      await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ comment: replyText })
      });
    } catch (e) {
      // ignore
    }
  };

  // Add Promotion (Pro Dashboard)
  const handleAddPromotion = async (promoData: Partial<Promotion>) => {
    const newP: Promotion = {
      id: `promo-${Date.now()}`,
      businessId: promoData.businessId || 'bgfi-bank-gabon',
      businessName: promoData.businessName || 'Entreprise Gabonaise',
      title: promoData.title || 'Offre spéciale',
      description: promoData.description || '',
      discountBadge: promoData.discountBadge || '-15%',
      validUntil: promoData.validUntil || '2026-12-31',
      category: promoData.category || 'commerce_distribution',
      city: promoData.city || 'Libreville',
      contactPhone: promoData.contactPhone || '+241 11 00 00 00'
    };

    setPromotions(prev => [newP, ...prev]);

    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(promoData)
      });
      if (res.ok) {
        const savedPromo = await res.json();
        if (savedPromo?.id) {
          setPromotions(prev => prev.map(p => (p.id === newP.id ? savedPromo : p)));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  // Search handler from Home
  const handleSearchSubmit = (params: { query: string; province: string; category: string }) => {
    setActiveTab('directory');
  };

  // Select Province handler
  const handleSelectProvince = (provId: string) => {
    setActiveTab('directory');
  };

  // Open Map with specific Province
  const handleOpenMapWithProvince = (provId: string) => {
    setMapTargetProvince(provId);
    setActiveTab('map');
  };

  // Select Category handler
  const handleSelectCategory = (catId: BusinessCategory) => {
    setActiveTab('directory');
  };

  // Geolocate user
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setActiveTab('map');
      },
      err => {
        console.warn('Geolocation error:', err);
      }
    );
  };

  // Locate business on map from AI Assistant
  const handleLocateBusinessOnMap = (business: Business) => {
    setSelectedBusiness(business);
    setActiveTab('map');
  };

  // Business owned by current user (for Pro dashboard) - Strictly resolved without fallback to other businesses
  const ownedBiz = businesses.find(b => 
    (currentUser.ownedBusinessIds && currentUser.ownedBusinessIds.includes(b.id)) ||
    (currentUser.email && b.claimedByEmail && b.claimedByEmail.toLowerCase() === currentUser.email.toLowerCase())
  ) || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* 1. TOP GLOBAL NAVBAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        onOpenAuthModal={role => {
          setAuthModalInitialRole(role || 'business_owner');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        comparisonCount={comparedBusinesses.length}
      />

      {/* 2. DYNAMIC PAGE VIEW */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            businesses={businesses}
            onSelectBusiness={setSelectedBusiness}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            comparedBusinesses={comparedBusinesses}
            onToggleCompare={handleToggleCompare}
            onRecordAction={handleRecordAction}
            onOpenMap={() => setActiveTab('map')}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            onSearchSubmit={handleSearchSubmit}
            onSelectProvince={handleSelectProvince}
            onSelectCategory={handleSelectCategory}
            onLocateMe={handleLocateMe}
            userCoords={userCoords}
          />
        )}

        {activeTab === 'map' && (
          <InteractiveMap
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={setSelectedBusiness}
            userCoords={userCoords}
            setUserCoords={setUserCoords}
            initialProvinceId={mapTargetProvince}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            businesses={businesses}
            onSelectBusiness={setSelectedBusiness}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            comparedBusinesses={comparedBusinesses}
            onToggleCompare={handleToggleCompare}
            onRecordAction={handleRecordAction}
            userCoords={userCoords}
            onOpenMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'provinces' && (
          <ProvincesView
            businesses={businesses}
            onSelectProvince={handleSelectProvince}
            onOpenMapWithProvince={handleOpenMapWithProvince}
          />
        )}

        {activeTab === 'promotions' && (
          <PromotionsView
            promotions={promotions}
            businesses={businesses}
            onSelectBusiness={setSelectedBusiness}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}

        {activeTab === 'agents' && (
          <MultiAgentsView />
        )}

        {activeTab === 'comparator' && (
          <BusinessComparisonDrawer
            comparedBusinesses={comparedBusinesses}
            onRemoveFromComparison={id => setComparedBusinesses(prev => prev.filter(b => b.id !== id))}
            onClearComparison={() => setComparedBusinesses([])}
            onSelectBusiness={setSelectedBusiness}
          />
        )}

        {/* Protection de l'espace Administrateur */}
        {activeTab === 'admin_dashboard' && (
          currentUser.role === 'admin' ? (
            <AdminDashboard
              businesses={businesses}
              onToggleVerifyBusiness={handleToggleVerifyBusiness}
              onDeleteBusiness={handleDeleteBusiness}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
              onSelectBusiness={setSelectedBusiness}
              reviews={reviews}
              onDeleteReview={handleDeleteReview}
              reports={reports}
              onResolveReport={handleResolveReport}
              onUpdateBusiness={handleUpdateBusiness}
              onUpdateStatus={handleUpdateStatus}
              onManageAsOwner={(biz) => {
                setAdminManagingBiz(biz);
                setActiveTab('pro_dashboard');
              }}
              currentUser={currentUser}
              authToken={authToken}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Accès Administrateur Restreint</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cet espace est strictement réservé à la direction générale et aux modérateurs de la plateforme Gabon Business Map.
              </p>
              <button
                onClick={() => {
                  setAuthModalInitialRole('admin');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Se connecter en tant qu'Administrateur
              </button>
            </div>
          )
        )}

        {/* Protection de l'espace Entreprise */}
        {activeTab === 'pro_dashboard' && (
          (currentUser.role === 'business_owner' || currentUser.role === 'admin') ? (
            (adminManagingBiz || ownedBiz) ? (
              <ProDashboard
                ownedBusiness={(adminManagingBiz || ownedBiz)!}
                onUpdateBusiness={upd => handleUpdateBusiness(adminManagingBiz ? adminManagingBiz.id : ownedBiz!.id, upd)}
                reviews={reviews}
                onReplyReview={handleReplyReview}
                promotions={promotions}
                onAddPromotion={handleAddPromotion}
                onSelectBusiness={setSelectedBusiness}
                isAdminMode={Boolean(adminManagingBiz && currentUser.role === 'admin')}
                adminName={currentUser.name}
                authToken={authToken}
                onExitAdminMode={() => {
                  setAdminManagingBiz(null);
                  setActiveTab('admin_dashboard');
                }}
              />
            ) : (
              <div className="max-w-lg mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Building className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Bienvenue dans votre Espace Propriétaire</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Aucune entreprise n'est actuellement rattachée à votre compte ({currentUser.email || 'connecté'}).
                  Inscrivez votre premier établissement pour configurer son siège, ses agences secondaires, sa galerie photo et ses coordonnées GPS certifiées.
                </p>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  + Référencer mon Entreprise au Gabon
                </button>
              </div>
            )
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Building className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Espace Entreprise Réservé</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connectez-vous avec votre compte propriétaire pour gérer votre réseau d'agences, vos coordonnées GPS et vos statistiques.
              </p>
              <button
                onClick={() => {
                  setAuthModalInitialRole('business_owner');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Se connecter ou créer un compte Propriétaire
              </button>
            </div>
          )
        )}
      </main>

      {/* 3. MODALS */}

      {/* A. Business Detailed Sheet */}
      {selectedBusiness && (
        <BusinessDetailsModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          isFavorite={favorites.includes(selectedBusiness.id)}
          onToggleFavorite={handleToggleFavorite}
          onAddReview={handleAddReview}
          onReportBusiness={handleReportBusiness}
          onRecordAction={handleRecordAction}
          reviews={reviews}
        />
      )}

      {/* B. Register Business Modal */}
      {isRegisterModalOpen && (
        <RegisterBusinessModal
          onClose={() => setIsRegisterModalOpen(false)}
          onBusinessAdded={handleBusinessAdded}
          currentUser={currentUser}
          authToken={authToken}
          onRequestAuth={() => {
            setPendingRegisterAfterAuth(true);
            setIsRegisterModalOpen(false);
            setAuthModalInitialRole('business_owner');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* C. Conversational AI Assistant */}
      {isAiAssistantOpen && (
        <AiAssistantModal
          onClose={() => setIsAiAssistantOpen(false)}
          onSelectBusiness={setSelectedBusiness}
          onLocateBusinessOnMap={handleLocateBusinessOnMap}
        />
      )}

      {/* D. Secure Auth Modal (RBAC Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingRegisterAfterAuth(false);
        }}
        initialRole={authModalInitialRole}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 4. FOOTER (except when in full-screen map mode) */}
      {activeTab !== 'map' && (
        <Footer
          onSelectProvince={handleSelectProvince}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
          setActiveTab={setActiveTab}
        />
      )}

    </div>
  );
}
