import React, { useState, useEffect, useRef } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { MarketSessionClock } from '../common/MarketSessionClock';
import { EquityChart } from '../common/EquityChart';
import { EconomicCalendarView } from '../news/EconomicCalendarView';
import { RiskCalculatorView } from '../calculator/RiskCalculatorView';
import { MonteCarloView } from '../analytics/MonteCarloView';
import { CompoundingPlanner } from '../calculator/CompoundingPlanner';
import { KellyRiskSimulator } from '../calculator/KellyRiskSimulator';
import { 
  Layout, 
  Columns, 
  Maximize2, 
  ExternalLink, 
  SlidersHorizontal, 
  RotateCcw, 
  Check, 
  Plus, 
  X, 
  Flame, 
  BarChart3, 
  Calculator, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export type WorkspacePreset = 'split-2' | 'split-3' | 'quad-4' | 'custom';

export type WorkspaceModuleId = 
  | 'market-clock'
  | 'equity-curve'
  | 'recent-trades'
  | 'economic-calendar'
  | 'quick-sizer'
  | 'tradingview-chart'
  | 'monte-carlo'
  | 'compounding-planner'
  | 'kelly-simulator';

export interface WorkspaceConfig {
  layout: WorkspacePreset;
  activeModules: WorkspaceModuleId[];
  symbolTV?: string;
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  layout: 'split-2',
  activeModules: ['tradingview-chart', 'market-clock', 'recent-trades', 'economic-calendar'],
  symbolTV: 'OANDA:XAUUSD'
};

const AVAILABLE_MODULES: { id: WorkspaceModuleId; title: string; desc: string; icon: any }[] = [
  { id: 'tradingview-chart', title: 'Live TradingView Chart', desc: 'Realtime candlestick chart & drawing tools', icon: TrendingUp },
  { id: 'market-clock', title: 'Market Session & Killzones', desc: 'Tokyo, London, NY, Sydney clocks & overlap alerts', icon: Clock },
  { id: 'recent-trades', title: 'Recent Executed Trades', desc: 'Live feed of latest logged positions & PnL', icon: Layers },
  { id: 'economic-calendar', title: 'Economic Calendar & News', desc: 'Red folder high-impact fundamental events', icon: Flame },
  { id: 'quick-sizer', title: 'Position Size Calculator', desc: 'Instant lot sizer with Stop Loss & Risk %', icon: Calculator },
  { id: 'equity-curve', title: 'Equity Growth Curve', desc: 'Realtime balance & PnL trajectory chart', icon: BarChart3 },
  { id: 'monte-carlo', title: 'Monte Carlo Forecaster', desc: '1,000 future simulation runs & ruin risk', icon: Sparkles },
  { id: 'compounding-planner', title: 'Compounding & Roadmaps', desc: 'Monthly milestone & withdrawal simulator', icon: ShieldCheck },
  { id: 'kelly-simulator', title: 'Kelly Criterion Sizer', desc: 'Mathematical edge & payoff ratio sizing', icon: Layout }
];

interface WorkspaceViewProps {
  onOpenTradeModal: () => void;
  onViewTradeDetail: (trade: Trade) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  onOpenTradeModal,
  onViewTradeDetail
}) => {
  const { filteredTrades, equityCurve, activeAccount, metrics } = useJournal();
  const { user } = useAuth();
  const currentCurrency = activeAccount?.currency || 'USD';
  const isInitialCloudSyncDone = useRef(false);

  const [config, setConfig] = useState<WorkspaceConfig>(() => {
    try {
      const saved = localStorage.getItem('itrade_workspace_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_WORKSPACE;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customTvSymbol, setCustomTvSymbol] = useState(config.symbolTV || 'OANDA:XAUUSD');

  // 1. Fetch user-isolated workspace configuration from Supabase on login
  useEffect(() => {
    if (!user || !supabase) return;

    const cloudWorkspace = user.user_metadata?.workspace_config;
    if (cloudWorkspace && typeof cloudWorkspace === 'object') {
      setConfig(cloudWorkspace);
      if (cloudWorkspace.symbolTV) setCustomTvSymbol(cloudWorkspace.symbolTV);
      localStorage.setItem('itrade_workspace_config', JSON.stringify(cloudWorkspace));
    }
    isInitialCloudSyncDone.current = true;
  }, [user]);

  // 2. Persist locally and sync to database for current user
  useEffect(() => {
    try {
      localStorage.setItem('itrade_workspace_config', JSON.stringify(config));
    } catch (e) {}

    // Debounce save to database
    if (user && supabase && isInitialCloudSyncDone.current) {
      const client = supabase;
      const timer = setTimeout(async () => {
        try {
          await client.auth.updateUser({
            data: { workspace_config: config }
          });
        } catch (err) {
          console.error('Failed to sync workspace configuration to database:', err);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [config, user]);

  const toggleModule = (id: WorkspaceModuleId) => {
    setConfig(prev => {
      const exists = prev.activeModules.includes(id);
      const nextModules = exists
        ? prev.activeModules.filter(m => m !== id)
        : [...prev.activeModules, id];
      return { ...prev, activeModules: nextModules };
    });
  };

  const handleResetDefault = () => {
    setConfig(DEFAULT_WORKSPACE);
    setCustomTvSymbol('OANDA:XAUUSD');
  };

  const setLayoutPreset = (layout: WorkspacePreset) => {
    setConfig(prev => ({ ...prev, layout }));
  };

  // Pop-out current view to dedicated detached window for Multi-Monitor setup
  const popOutMultiMonitorWindow = (moduleId: WorkspaceModuleId, title: string) => {
    const w = 1100;
    const h = 750;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;

    const win = window.open(
      '',
      `_blank_${moduleId}`,
      `width=${w},height=${h},left=${left},top=${top},menubar=no,status=no,toolbar=no`
    );

    if (!win) {
      alert('Popup diblokir browser. Izinkan popup untuk menggunakan fitur Multi-Monitor.');
      return;
    }

    win.document.title = `iTrade Multi-Monitor — ${title}`;
    win.document.body.style.backgroundColor = '#080c1b';
    win.document.body.style.color = '#f8fafc';
    win.document.body.style.margin = '0';
    win.document.body.style.padding = '16px';
    win.document.body.style.fontFamily = 'Inter, -apple-system, sans-serif';

    // Copy styles
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = win.document.createElement('style');
        style.textContent = cssRules;
        win.document.head.appendChild(style);
      } catch (e) {
        const link = win.document.createElement('link');
        link.rel = 'stylesheet';
        link.type = styleSheet.type;
        link.href = styleSheet.href || '';
        win.document.head.appendChild(link);
      }
    });

    // Content container
    const container = win.document.createElement('div');
    container.id = 'popout-container';
    container.style.height = '100%';
    win.document.body.appendChild(container);

    if (moduleId === 'tradingview-chart') {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:98vh;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #1e293b;">
            <span style="font-weight:800; font-size:14px; color:#38bdf8;">📈 iTrade Live Chart Monitor</span>
            <span style="font-size:11px; color:#94a3b8;">Detached Screen</span>
          </div>
          <iframe 
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(customTvSymbol)}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=itradejournal"
            style="width:100%; height:100%; border:none; border-radius:8px;"
          ></iframe>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#94a3b8;">
          <h3>${title}</h3>
          <p>Multi-monitor display active.</p>
        </div>
      `;
    }
  };

  const renderModuleContent = (id: WorkspaceModuleId) => {
    switch (id) {
      case 'tradingview-chart':
        return (
          <div style={{ height: '100%', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            <iframe
              title="TradingView Realtime Chart"
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(customTvSymbol)}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=itradejournal`}
              style={{ width: '100%', height: '100%', minHeight: '380px', border: 'none', borderRadius: '8px' }}
            />
          </div>
        );

      case 'market-clock':
        return (
          <div style={{ padding: '4px 0' }}>
            <MarketSessionClock />
          </div>
        );

      case 'recent-trades':
        const recent = [...filteredTrades]
          .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
          .slice(0, 5);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.82rem' }}>
                Belum ada trade yang dicatat.
              </div>
            ) : (
              recent.map(t => (
                <div
                  key={t.id}
                  onClick={() => onViewTradeDetail(t)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#070b17',
                    borderRadius: '8px',
                    border: '1px solid #1a2538',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a2538'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: t.direction === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: t.direction === 'LONG' ? 'var(--profit-green)' : 'var(--loss-red)'
                    }}>
                      {t.direction}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{t.symbol}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.timeframe}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: t.pnl >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                    }}>
                      {formatCurrency(t.pnl, currentCurrency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'economic-calendar':
        return (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <EconomicCalendarView />
          </div>
        );

      case 'quick-sizer':
        return (
          <div style={{ padding: '8px' }}>
            <RiskCalculatorView />
          </div>
        );

      case 'equity-curve':
        return (
          <div style={{ minHeight: '260px' }}>
            <EquityChart data={equityCurve} currency={currentCurrency} />
          </div>
        );

      case 'monte-carlo':
        return (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <MonteCarloView />
          </div>
        );

      case 'compounding-planner':
        return (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <CompoundingPlanner />
          </div>
        );

      case 'kelly-simulator':
        return (
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <KellyRiskSimulator 
              initialBalance={activeAccount?.currentBalance || 10000}
              initialWinRate={metrics.winRate}
              initialRR={metrics.avgRR}
              currency={currentCurrency}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getGridStyle = () => {
    switch (config.layout) {
      case 'split-2':
        return { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '16px' };
      case 'split-3':
        return { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' };
      case 'quad-4':
        return { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' };
      default:
        return { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' };
    }
  };

  return (
    <div>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              Multi-Screen Workspace Hub
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              Cloud Synced
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Pilih dan susun modul live trading, chart, dan kalkulator untuk multi-monitor secara fleksibel
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Preset Layout Switcher */}
          <div style={{ display: 'flex', backgroundColor: '#070b17', padding: '3px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            {[
              { id: 'split-2', label: 'Dual Split' },
              { id: 'split-3', label: 'Triple Screen' },
              { id: 'quad-4', label: 'Quad Grid' }
            ].map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayoutPreset(l.id as WorkspacePreset)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: config.layout === l.id ? '#3b82f6' : 'transparent',
                  color: config.layout === l.id ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.8rem' }}
          >
            <SlidersHorizontal size={14} />
            <span>Customize Workspace ({config.activeModules.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenTradeModal}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            + Log New Trade
          </button>
        </div>
      </div>

      {/* Grid of Active Modular Panels */}
      {config.activeModules.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#0c1222',
          borderRadius: '14px',
          border: '1px dashed #233148'
        }}>
          <Layout size={40} color="#60a5fa" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
            Workspace Belum Memiliki Modul Aktif
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '460px', margin: '0 auto 16px' }}>
            Klik tombol customize di atas untuk memilih modul yang ingin Anda tampilkan pada layar workspace ini.
          </p>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="btn btn-primary btn-sm"
          >
            + Buka Pengaturan Modul
          </button>
        </div>
      ) : (
        <div style={getGridStyle()}>
          {config.activeModules.map(modId => {
            const modInfo = AVAILABLE_MODULES.find(m => m.id === modId);
            if (!modInfo) return null;
            const Icon = modInfo.icon;

            return (
              <div
                key={modId}
                style={{
                  backgroundColor: '#0c1222',
                  borderRadius: '14px',
                  border: '1px solid #233148',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '260px'
                }}
              >
                {/* Module Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #1a2538' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa'
                    }}>
                      <Icon size={15} />
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                      {modInfo.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => popOutMultiMonitorWindow(modId, modInfo.title)}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Buka modul ini di Jendela Terpisah untuk Layar / Monitor 2 atau 3"
                      style={{ color: '#94a3b8', padding: '4px' }}
                    >
                      <ExternalLink size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleModule(modId)}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Sembunyikan modul ini"
                      style={{ color: '#94a3b8', padding: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Module Body Content */}
                <div style={{ flex: 1 }}>
                  {renderModuleContent(modId)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customize Workspace Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Customize Workspace Modules & Presets
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Pilih modul yang ingin diaktifkan. Pengaturan tersimpan permanen per akun di cloud.
                </span>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TradingView Symbol Input */}
              <div style={{ padding: '12px', backgroundColor: '#070b17', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <label className="input-label" style={{ fontSize: '0.78rem', marginBottom: '6px', display: 'block' }}>
                  Default TradingView Symbol / Pair
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customTvSymbol}
                    onChange={(e) => setCustomTvSymbol(e.target.value)}
                    placeholder="Contoh: OANDA:XAUUSD, FX:EURUSD, BINANCE:BTCUSDT"
                    className="input-control font-mono"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, symbolTV: customTvSymbol.trim() || 'OANDA:XAUUSD' }))}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Simpan Symbol
                  </button>
                </div>
              </div>

              {/* Module Checklist Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' }}>
                  Daftar Modul Workspace
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                  {AVAILABLE_MODULES.map(m => {
                    const isActive = config.activeModules.includes(m.id);
                    const Icon = m.icon;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${isActive ? '#3b82f6' : '#1e293b'}`,
                          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : '#070b17',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={16} color={isActive ? '#60a5fa' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#f8fafc' : '#94a3b8' }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {m.desc}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1px solid ${isActive ? '#3b82f6' : '#334155'}`,
                          backgroundColor: isActive ? '#3b82f6' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isActive && <Check size={12} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleResetDefault}
                className="btn btn-ghost btn-sm"
                style={{ color: '#94a3b8', gap: '6px' }}
              >
                <RotateCcw size={14} />
                <span>Reset Default</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="btn btn-primary btn-sm"
              >
                Selesai & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
