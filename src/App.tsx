import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalProvider, useJournal } from './context/JournalContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { CalendarView } from './components/calendar/CalendarView';
import { JournalView } from './components/journal/JournalView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AccountsView } from './components/accounts/AccountsView';
import { RiskCalculatorView } from './components/calculator/RiskCalculatorView';
import { TradeFormModal } from './components/journal/TradeFormModal';
import { TradeDetailModal } from './components/journal/TradeDetailModal';
import { AccountFormModal } from './components/accounts/AccountFormModal';
import { OnboardingAccountModal } from './components/accounts/OnboardingAccountModal';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';
import { AuthLockScreen } from './components/auth/AuthLockScreen';
import { AuthModal, AuthMode } from './components/auth/AuthModal';
import { PublicProfileView } from './components/profile/PublicProfileView';
import { EconomicCalendarView } from './components/news/EconomicCalendarView';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { Toast } from './components/common/Toast';
import { Trade, TradingAccount } from './types';

const MainApp: React.FC = () => {
  const { user } = useAuth();
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
  
  // Public Portfolio Route (#/u/username or ?u=username)
  const [publicUsername, setPublicUsername] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/u/')) {
      return hash.replace('#/u/', '').split('?')[0];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('u') || null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/u/')) {
        setPublicUsername(hash.replace('#/u/', '').split('?')[0]);
      } else {
        setPublicUsername(null);
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
        setActiveTab('dashboard');
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setActiveTab('journal');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setActiveTab('analytics');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setActiveTab('news');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setActiveTab('calculator');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setActiveTab('accounts');
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

  const { deleteTrade, accountsMap, accounts, isLoadingCloud } = useJournal();
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

  const handleOpenNewAccount = () => {
    setEditingAccount(null);
    setAccountFormOpen(true);
  };

  const handleEditAccount = (account: TradingAccount) => {
    setEditingAccount(account);
    setAccountFormOpen(true);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          onOpenTradeModal={handleOpenNewTrade}
          onOpenAccountModal={handleOpenNewAccount}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="page-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenTradeModal={handleOpenNewTrade}
              onViewTradeDetail={handleViewTradeDetail}
              onNavigateToJournal={() => setActiveTab('journal')}
              onNavigateToNews={() => setActiveTab('news')}
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
        </main>
      </div>

      {/* Modals & Dialogs */}
      <TradeFormModal
        isOpen={tradeFormOpen}
        onClose={() => {
          setTradeFormOpen(false);
          setEditingTrade(null);
        }}
        initialTrade={editingTrade}
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

      {/* Blurred Auth Lockscreen (Active when Supabase is configured and not logged in) */}
      {!user && import.meta.env.VITE_SUPABASE_URL && (
        <AuthLockScreen 
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthModalOpen(true);
          }} 
        />
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
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
          <MainApp />
        </JournalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
