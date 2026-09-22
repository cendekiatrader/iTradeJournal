import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalProvider, useJournal } from './context/JournalContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NAV_META, type NavTab } from './components/navigation/navCatalog';
import { DashboardView } from './components/dashboard/DashboardView';
import { WeeklyReviewModal } from './components/review/WeeklyReviewModal';
import { JournalView } from './components/journal/JournalView';
import { AccountsView } from './components/accounts/AccountsView';
import { RiskCalculatorView } from './components/calculator/RiskCalculatorView';
import { TradeFormModal } from './components/journal/TradeFormModal';
import { TradeDetailModal } from './components/journal/TradeDetailModal';
import { AccountFormModal } from './components/accounts/AccountFormModal';
import { OnboardingAccountModal } from './components/accounts/OnboardingAccountModal';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';
import { LandingPage } from './components/landing/LandingPage';
import { SuspendedScreen } from './components/auth/SuspendedScreen';
import { DemoModeBanner } from './components/common/DemoModeBanner';
import { AnnouncementBanner } from './components/common/AnnouncementBanner';
import { FeedbackModal } from './components/common/FeedbackModal';
import { isSupabaseConfigured, fetchMyUserFlags } from './utils/supabase';
import { AuthModal, AuthMode } from './components/auth/AuthModal';
import { PublicProfileView } from './components/profile/PublicProfileView';
import { QuickRiskDock } from './components/calculator/QuickRiskDock';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { CommandPalette } from './components/common/CommandPalette';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { ProductTour } from './components/common/ProductTour';
import { PWAUpdatePrompt } from './components/common/PWAUpdatePrompt';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ThemeSelectorModal } from './components/common/ThemeSelectorModal';
import { MobileNav } from './components/MobileNav';
import { SetupQueueView } from './components/queue/SetupQueueView';
import { ReviewView } from './components/review/ReviewView';
import { SettingsView } from './components/settings/SettingsView';
import { TradePrefill } from './types';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { Toast } from './components/common/Toast';
import { Trade, TradingAccount } from './types';
import { getNavPrefs, isTabVisible } from './utils/navPrefs';

const CalendarView = lazy(() => import('./components/calendar/CalendarView').then((m) => ({ default: m.CalendarView })));
const AnalyticsView = lazy(() => import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const EconomicCalendarView = lazy(() => import('./components/news/EconomicCalendarView').then((m) => ({ default: m.EconomicCalendarView })));
const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })));
const CoachingView = lazy(() => import('./components/coaching/CoachingView').then((m) => ({ default: m.CoachingView })));
const PlaybookView = lazy(() => import('./components/playbook/PlaybookView').then((m) => ({ default: m.PlaybookView })));
const WorkspaceView = lazy(() => import('./components/workspace/WorkspaceView').then((m) => ({ default: m.WorkspaceView })));

const ViewLoading: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '90px 20px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
    <div className="loading-ring" style={{
      width: '18px',
      height: '18px',
      border: '2px solid var(--border-color)',
      borderTopColor: 'var(--theme-primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    Loading view…
  </div>
);

const MainApp: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('itrade_sidebar_collapsed') === 'true';
  });
  const [tradeFormOpen, setTradeFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [queuePrefill, setQueuePrefill] = useState<TradePrefill | null>(null);
  
  // Public Portfolio Route (#/u/username or ?u=username)
  const [publicUsername, setPublicUsername] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/u/')) {
      return hash.replace('#/u/', '').split('?')[0];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('u') || null;
  });

  // Mentor Review Route (#/review/token)
  const [reviewToken, setReviewToken] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/review/')) {
      return hash.replace('#/review/', '').split('?')[0];
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/review/')) {
        setReviewToken(hash.replace('#/review/', '').split('?')[0]);
        setPublicUsername(null);
      } else if (hash.startsWith('#/u/')) {
        setPublicUsername(hash.replace('#/u/', '').split('?')[0]);
        setReviewToken(null);
      } else {
        setPublicUsername(null);
        setReviewToken(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        (activeEl as HTMLElement).isContentEditable
      );

      // Ctrl + Enter or Cmd + Enter to submit active form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const submitBtn = document.querySelector('.modal-container button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.click();
        }
        return;
      }

      // Ctrl/Cmd + K opens the command palette (works even while typing)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
        return;
      }

      // If user is currently typing in input field, don't trigger navigation shortcuts
      if (isInput) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenNewTrade();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        goToTab('dashboard');
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        goToTab('workspace');
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        goToTab('journal');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        goToTab('playbook');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        goToTab('analytics');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        goToTab('news');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        goToTab('calculator');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        goToTab('accounts');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        goToTab('settings');
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        goToTab('queue');
      } else if (e.key === 'Escape') {
        setTradeFormOpen(false);
        setDetailTrade(null);
        setAccountFormOpen(false);
        setAuthModalOpen(false);
        setShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { deleteTrade, accountsMap, accounts, isLoadingCloud, showToast, trades, isDemoMode, enterDemoMode, exitDemoMode } = useJournal();
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    return localStorage.getItem('itrade_onboarding_dismissed') === 'true';
  });

  const showOnboarding = Boolean(user && !isLoadingCloud && accounts.length === 0 && !onboardingDismissed);

  const handleDismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem('itrade_onboarding_dismissed', 'true');
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('itrade_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleOpenNewTrade = () => {
    if (accounts.length === 0) {
      setEditingAccount(null);
      setAccountFormOpen(true);
      return;
    }
    setQueuePrefill(null);
    setEditingTrade(null);
    setTradeFormOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setTradeFormOpen(true);
  };

  const handleViewTradeDetail = (trade: Trade) => {
    setDetailTrade(trade);
  };

  // Keep the open trade-detail modal in sync when the trade object changes (e.g. revert)
  useEffect(() => {
    if (!detailTrade) return;
    const fresh = trades.find((t) => t.id === detailTrade.id);
    if (fresh && fresh !== detailTrade) {
      setDetailTrade(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  const handleOpenNewAccount = () => {
    setEditingAccount(null);
    setAccountFormOpen(true);
  };

  const handleEditAccount = (account: TradingAccount) => {
    setEditingAccount(account);
    setAccountFormOpen(true);
  };

  // PWA shortcut & share-target deep links (#new-trade, #calculator, #queue, share text)
  useEffect(() => {
    const applyDeepLink = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);

      if (hash === '#new-trade' || params.get('action') === 'new-trade') {
        handleOpenNewTrade();
        window.history.replaceState(null, '', window.location.pathname);
      } else if (hash === '#calculator') {
        goToTab('calculator');
        window.history.replaceState(null, '', window.location.pathname);
      } else if (hash === '#queue') {
        goToTab('queue');
        window.history.replaceState(null, '', window.location.pathname);
      }

      const sharedParts = [params.get('share_title'), params.get('share_text'), params.get('share_url')].filter(Boolean);
      if (sharedParts.length > 0) {
        localStorage.setItem('itrade_share_note', sharedParts.join('\n'));
        showToast('Shared content saved — it will attach to your next trade note.', 'info');
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    applyDeepLink();
    window.addEventListener('hashchange', applyDeepLink);
    return () => window.removeEventListener('hashchange', applyDeepLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  // First-run product tour (after onboarding is done)
  useEffect(() => {
    if (!user || accounts.length === 0 || isLoadingCloud) return;
    if (localStorage.getItem('itrade_tour_done') === 'true') return;
    const timer = setTimeout(() => setTourOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [user, accounts.length, isLoadingCloud]);

  const handleCloseTour = () => {
    setTourOpen(false);
    localStorage.setItem('itrade_tour_done', 'true');
  };

  // First-run checklist: remember once Analytics has been explored
  useEffect(() => {
    if (activeTab === 'analytics') {
      try {
        localStorage.setItem('itrade_activation_analytics', 'true');
      } catch {
        /* ignore */
      }
    }
  }, [activeTab]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Single navigation entry point: refuses to jump to a module the user has hidden
   * (progressive disclosure) and points them at Settings instead.
   */
  const goToTab = (tab: NavTab) => {
    if (tab !== 'settings' && !isTabVisible(tab, getNavPrefs())) {
      const label = NAV_META[tab]?.label || tab;
      showToast(`${label} is hidden. Turn it back on in Settings → Navigation & Modules.`, 'info');
      setActiveTab('settings');
      return;
    }
    setActiveTab(tab);
  };

  // Account suspension (managed from the admin console)
  const [suspended, setSuspended] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured() || !user?.id) {
      setSuspended(false);
      return;
    }
    let alive = true;
    (async () => {
      const flags = await fetchMyUserFlags(user.id);
      if (alive) setSuspended(Boolean(flags?.suspended));
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Dedicated admin panel route: /admin (separate page from the journal app)
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<ViewLoading />}>
        <AdminApp />
      </Suspense>
    );
  }

  if (reviewToken) {
    return (
      <ReviewView
        token={reviewToken}
        onBack={() => {
          window.location.hash = '';
          setReviewToken(null);
        }}
      />
    );
  }

  if (publicUsername) {
    return (
      <PublicProfileView
        username={publicUsername}
        onBackToApp={() => {
          window.location.hash = '';
          setPublicUsername(null);
        }}
      />
    );
  }

  // Public landing page for signed-out visitors (Supabase-configured builds)
  if (isSupabaseConfigured() && !user && !isDemoMode) {
    if (authLoading) {
      return null; // wait for auth to settle so signed-in users never see the landing flash
    }
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthModalOpen(true);
          }}
          onOpenDemo={enterDemoMode}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authMode}
        />
      </>
    );
  }

  // Suspended accounts see a notice instead of the journal
  if (suspended) {
    return (
      <SuspendedScreen
        email={user?.email}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={goToTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        showCoaching={isSupabaseConfigured() && !isDemoMode && Boolean(user)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Admin announcement banner (if any is live) */}
        <AnnouncementBanner />

        {isDemoMode && (
          <DemoModeBanner
            onSignUp={() => {
              setAuthMode('signup');
              setAuthModalOpen(true);
            }}
            onExit={exitDemoMode}
          />
        )}

        <Navbar
          onOpenTradeModal={handleOpenNewTrade}
          onOpenAccountModal={handleOpenNewAccount}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />

        <main className="page-body">
          <Suspense fallback={<ViewLoading />}>
            <ErrorBoundary key={activeTab} label={activeTab}>
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenTradeModal={handleOpenNewTrade}
              onViewTradeDetail={handleViewTradeDetail}
              onNavigateToJournal={() => goToTab('journal')}
              onNavigateToNews={() => goToTab('news')}
              onOpenWeeklyReview={() => setWeeklyReviewOpen(true)}
            />
          )}

          {activeTab === 'workspace' && (
            <WorkspaceView
              onOpenTradeModal={handleOpenNewTrade}
              onViewTradeDetail={handleViewTradeDetail}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onViewTradeDetail={handleViewTradeDetail}
            />
          )}

          {activeTab === 'journal' && (
            <JournalView
              onOpenTradeModal={handleOpenNewTrade}
              onEditTrade={handleEditTrade}
              onViewTradeDetail={handleViewTradeDetail}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {activeTab === 'playbook' && (
            <PlaybookView />
          )}

          {activeTab === 'news' && (
            <EconomicCalendarView />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              onOpenAccountModal={handleOpenNewAccount}
              onEditAccount={handleEditAccount}
            />
          )}

          {activeTab === 'calculator' && (
            <RiskCalculatorView />
          )}

          {activeTab === 'coaching' && (
            <CoachingView />
          )}

          {activeTab === 'queue' && (
            <SetupQueueView
              onExecute={(prefill) => {
                setQueuePrefill(prefill);
                setEditingTrade(null);
                setTradeFormOpen(true);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onOpenFeedback={() => setFeedbackOpen(true)}
              onSelectTab={goToTab}
            />
          )}
            </ErrorBoundary>
          </Suspense>
        </main>
      </div>

      {/* Modals & Dialogs */}
      <TradeFormModal
        isOpen={tradeFormOpen}
        onClose={() => {
          setTradeFormOpen(false);
          setEditingTrade(null);
          setQueuePrefill(null);
        }}
        initialTrade={editingTrade}
        prefill={queuePrefill}
      />

      <TradeDetailModal
        trade={detailTrade}
        onClose={() => setDetailTrade(null)}
        onEdit={(trade) => {
          setDetailTrade(null);
          handleEditTrade(trade);
        }}
        onDelete={(id) => {
          deleteTrade(id);
          setDetailTrade(null);
        }}
        account={detailTrade ? accountsMap[detailTrade.accountId] : undefined}
      />

      <AccountFormModal
        isOpen={accountFormOpen}
        onClose={() => {
          setAccountFormOpen(false);
          setEditingAccount(null);
        }}
        initialAccount={editingAccount}
      />

      {/* First-Time User Onboarding Modal */}
      <OnboardingAccountModal
        isOpen={showOnboarding}
        onClose={handleDismissOnboarding}
      />

      {/* Reset Password Modal (Triggered by Email Link) */}
      <ResetPasswordModal />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Sticky Quick-Risk Mini Dock Bar (Always on Top Capable) */}
      <QuickRiskDock />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* PWA Update Detector (new build available) */}
      <PWAUpdatePrompt />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        activeTab={activeTab}
        onNavigate={goToTab}
        onOpenTradeModal={handleOpenNewTrade}
        onOpenAccountModal={handleOpenNewAccount}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onViewTradeDetail={handleViewTradeDetail}
        onStartTour={() => setTourOpen(true)}
        onOpenWeeklyReview={() => setWeeklyReviewOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      {/* First-run Product Tour */}
      <ProductTour isOpen={tourOpen} onClose={handleCloseTour} />

      {/* Guided Weekly Review wizard */}
      <WeeklyReviewModal isOpen={weeklyReviewOpen} onClose={() => setWeeklyReviewOpen(false)} />

      {/* Theme selector (hosted in App so the command palette can open it) */}
      <ThemeSelectorModal isOpen={themeModalOpen} onClose={() => setThemeModalOpen(false)} />

      {/* Send feedback (bug reports / feature ideas -> admin inbox) */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Mobile bottom navigation + quick Log Trade FAB */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={goToTab}
        onOpenTradeModal={handleOpenNewTrade}
      />

      {/* Global Toast */}
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <JournalProvider>
          <ConfirmProvider>
            <MainApp />
            <Analytics />
          </ConfirmProvider>
        </JournalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
