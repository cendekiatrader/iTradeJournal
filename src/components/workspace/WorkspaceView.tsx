import React, { useState, useEffect, useRef } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { fetchUserSettings, saveUserSettings } from '../../utils/supabase';
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
  Minimize2, 
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
  Trash2,
  Eye
} from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { useModalA11y } from '../../hooks/useModalA11y';

export type WorkspacePreset = 'split-2' | 'split-3' | 'quad-4' | 'custom';

export type WorkspaceModuleId = 
  | 'market-clock'
  | 'equity-curve'
  | 'recent-trades'
  | 'economic-calendar'
  | 'quick-sizer'
  | 'monte-carlo'
  | 'compounding-planner'
  | 'kelly-simulator';

/** One live TradingView chart instance. A workspace can hold several, each with its own symbol + timeframe. */
export interface TvChartInstance {
  id: string;
  symbol: string;
  interval: string;
}

export interface WorkspaceConfig {
  layout: WorkspacePreset;
  activeModules: WorkspaceModuleId[];
  charts: TvChartInstance[];
  /** @deprecated legacy single-chart field - only read once, to migrate old saved configs */
  symbolTV?: string;
}

/** Hard cap: every chart is a full TradingView iframe, so more than this wrecks browser memory. */
export const MAX_TV_CHARTS = 6;

export const TV_INTERVALS: { value: string; label: string }[] = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' }
];

const DEFAULT_CHART_SYMBOL = 'OANDA:XAUUSD';
const DEFAULT_TV_INTERVAL = '15';

/** Symbols offered in rotation when the user adds a second/third/fourth chart. */
const CHART_SYMBOL_PRESETS = [
  'OANDA:XAUUSD',
  'FX:EURUSD',
  'FX:GBPUSD',
  'BINANCE:BTCUSDT',
  'OANDA:US30USD',
  'NASDAQ:NDX'
];

const LEGACY_CHART_MODULE_ID = 'tradingview-chart';

const newChartId = () => `tv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const makeChart = (symbol: string = DEFAULT_CHART_SYMBOL, interval: string = DEFAULT_TV_INTERVAL): TvChartInstance => ({
  id: newChartId(),
  symbol,
  interval
});

const defaultWorkspace = (): WorkspaceConfig => ({
  layout: 'split-2',
  activeModules: ['market-clock', 'recent-trades', 'economic-calendar'],
  charts: [makeChart()]
});

const nextPresetSymbol = (charts: TvChartInstance[]) =>
  CHART_SYMBOL_PRESETS.find(p => !charts.some(c => c.symbol === p)) ||
  charts[charts.length - 1]?.symbol ||
  DEFAULT_CHART_SYMBOL;

const intervalLabel = (value: string) => TV_INTERVALS.find(i => i.value === value)?.label || value;

const tvWidgetUrl = (symbol: string, interval: string, frameId: string) =>
  `https://s.tradingview.com/widgetembed/?frameElementId=${encodeURIComponent(frameId)}&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=itradejournal`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Upgrades any saved workspace shape (localStorage or cloud) to the current one:
 * legacy configs kept a single chart as the module 'tradingview-chart' + `symbolTV`,
 * current configs keep a `charts` array. Unknown keys are dropped, never trusted.
 */
const normalizeConfig = (raw: any): WorkspaceConfig => {
  if (!raw || typeof raw !== 'object') return defaultWorkspace();

  const rawModules: string[] = Array.isArray(raw.activeModules) ? raw.activeModules : defaultWorkspace().activeModules;
  const hadLegacyChart = rawModules.includes(LEGACY_CHART_MODULE_ID);
  const activeModules = rawModules.filter(
    (m: string) => m !== LEGACY_CHART_MODULE_ID && AVAILABLE_MODULES.some(a => a.id === m)
  ) as WorkspaceModuleId[];

  const charts: TvChartInstance[] = (Array.isArray(raw.charts) ? raw.charts : [])
    .filter((c: any) => c && typeof c === 'object')
    .slice(0, MAX_TV_CHARTS)
    .map((c: any) => ({
      id: typeof c.id === 'string' && c.id ? c.id : newChartId(),
      symbol: typeof c.symbol === 'string' && c.symbol.trim() ? c.symbol.trim() : DEFAULT_CHART_SYMBOL,
      interval: TV_INTERVALS.some(i => i.value === String(c.interval)) ? String(c.interval) : DEFAULT_TV_INTERVAL
    }));

  if (charts.length === 0) {
    if (hadLegacyChart) {
      const legacySymbol = typeof raw.symbolTV === 'string' && raw.symbolTV.trim() ? raw.symbolTV.trim() : DEFAULT_CHART_SYMBOL;
      charts.push(makeChart(legacySymbol));
    } else if (!Array.isArray(raw.charts)) {
      // Unrecognised / corrupt payload - fall back to a clean default rather than a broken workspace.
      return defaultWorkspace();
    }
  }

  const layout: WorkspacePreset = ['split-2', 'split-3', 'quad-4', 'custom'].includes(raw.layout)
    ? raw.layout
    : 'split-2';

  return { layout, activeModules, charts };
};

const AVAILABLE_MODULES: { id: WorkspaceModuleId; title: string; desc: string; icon: any }[] = [
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
  const { filteredTrades, equityCurve, activeAccount, metrics, showToast } = useJournal();
  const { user } = useAuth();
  const currentCurrency = activeAccount?.currency || 'USD';
  const isInitialCloudSyncDone = useRef(false);
  const lastSyncedWorkspaceRef = useRef('');

  const [config, setConfig] = useState<WorkspaceConfig>(() => {
    try {
      const saved = localStorage.getItem('itrade_workspace_config');
      if (saved) return normalizeConfig(JSON.parse(saved));
    } catch (e) {}
    return defaultWorkspace();
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const modalRef = useModalA11y(showConfigModal, () => setShowConfigModal(false));
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [symbolDraft, setSymbolDraft] = useState('');

  // 1. Fetch user-isolated workspace configuration from the settings table
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const settings = await fetchUserSettings();
      if (!alive) return;
      const cloudWorkspace = (settings && typeof settings.workspace_config === 'object'
        ? settings.workspace_config
        : typeof user.user_metadata?.workspace_config === 'object'
          ? user.user_metadata.workspace_config
          : null) as any;
      if (cloudWorkspace) {
        const normalized = normalizeConfig(cloudWorkspace);
        setConfig(prev => (JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized));
        lastSyncedWorkspaceRef.current = JSON.stringify(normalized);
        localStorage.setItem('itrade_workspace_config', JSON.stringify(normalized));
        if (!settings || settings.workspace_config == null) {
          saveUserSettings({ workspace_config: normalized });
        }
      }
      isInitialCloudSyncDone.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // 2. Persist locally and sync to the settings table
  useEffect(() => {
    try {
      localStorage.setItem('itrade_workspace_config', JSON.stringify(config));
    } catch (e) {}

    if (user && isInitialCloudSyncDone.current) {
      const payload = JSON.stringify(config);
      if (payload !== lastSyncedWorkspaceRef.current) {
        const timer = setTimeout(async () => {
          try {
            await saveUserSettings({ workspace_config: config });
            lastSyncedWorkspaceRef.current = payload;
          } catch (err) {
            console.error('Failed to sync workspace configuration to database:', err);
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
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

  // --- Live chart instances -------------------------------------------------

  const updateChart = (id: string, patch: Partial<TvChartInstance>) => {
    setConfig(prev => ({ ...prev, charts: prev.charts.map(c => (c.id === id ? { ...c, ...patch } : c)) }));
  };

  const addChart = () => {
    if (config.charts.length >= MAX_TV_CHARTS) {
      showToast(`Maximum of ${MAX_TV_CHARTS} live charts in one workspace — remove one first.`, 'error');
      return;
    }
    setConfig(prev => {
      const last = prev.charts[prev.charts.length - 1];
      return {
        ...prev,
        charts: [...prev.charts, makeChart(nextPresetSymbol(prev.charts), last?.interval || DEFAULT_TV_INTERVAL)]
      };
    });
    showToast('Live chart added to the workspace.', 'success');
  };

  const removeChart = (id: string) => {
    setConfig(prev => ({ ...prev, charts: prev.charts.filter(c => c.id !== id) }));
    if (editingChartId === id) setEditingChartId(null);
  };

  const commitChartSymbol = (id: string, raw: string, current: string) => {
    const symbol = raw.trim();
    if (!symbol || symbol === current) return false;
    updateChart(id, { symbol });
    return true;
  };

  const handleResetDefault = () => {
    setConfig(defaultWorkspace());
    setMaximizedPanel(null);
    setEditingChartId(null);
  };

  const setLayoutPreset = (layout: WorkspacePreset) => {
    setConfig(prev => ({ ...prev, layout }));
  };

  // --- Detached multi-monitor windows --------------------------------------

  const openDetachedWindow = (windowName: string, title: string, build: (container: HTMLElement) => void) => {
    const w = 1100;
    const h = 750;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;

    const win = window.open(
      '',
      `itrade_popout_${windowName}`,
      `width=${w},height=${h},left=${left},top=${top},menubar=no,status=no,toolbar=no`
    );

    if (!win) {
      showToast('Popup blocked by your browser. Please allow popups to use the Multi-Monitor feature.', 'error');
      return;
    }

    win.document.title = `iTrade Multi-Monitor — ${title}`;
    win.document.body.style.backgroundColor = 'var(--bg-nav)';
    win.document.body.style.color = 'var(--text-primary)';
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

    build(container);
  };

  // Pop-out a single chart instance to a dedicated detached window for Multi-Monitor setup.
  // NOTE: detached documents do not inherit CSS variables, so this HTML keeps literal hex.
  const popOutChartWindow = (chart: TvChartInstance) => {
    const safeSymbol = escapeHtml(chart.symbol);
    openDetachedWindow(`chart_${chart.id}`, `${chart.symbol} ${intervalLabel(chart.interval)}`, (container) => {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:98vh;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #1e293b;">
            <span style="font-weight:800; font-size:14px; color:#38bdf8;">📈 iTrade Live Chart Monitor — ${safeSymbol} · ${intervalLabel(chart.interval)}</span>
            <span style="font-size:11px; color:#94a3b8;">Detached Screen</span>
          </div>
          <iframe 
            src="${tvWidgetUrl(chart.symbol, chart.interval, `tv_popout_${chart.id}`)}"
            style="width:100%; height:100%; border:none; border-radius:8px;"
          ></iframe>
        </div>
      `;
    });
  };

  // Pop-out current view to dedicated detached window for Multi-Monitor setup
  const popOutMultiMonitorWindow = (moduleId: WorkspaceModuleId, title: string) => {
    openDetachedWindow(moduleId, title, (container) => {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#94a3b8;">
          <h3>${escapeHtml(title)}</h3>
          <p>Multi-monitor display active.</p>
        </div>
      `;
    });
  };

  const renderModuleContent = (id: WorkspaceModuleId) => {
    switch (id) {
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
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No trades recorded yet.
              </div>
            ) : (
              recent.map(t => (
                <div
                  key={t.id}
                  onClick={() => onViewTradeDetail(t)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRadius: '8px',
                    border: '1px solid #1a2538',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--theme-secondary-strong)'; }}
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
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.symbol}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.timeframe}</span>
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

  const renderChartContent = (chart: TvChartInstance, isMaximized: boolean) => (
    <div style={{ height: '100%', minHeight: isMaximized ? '520px' : '380px', display: 'flex', flexDirection: 'column' }}>
      <iframe
        title={`TradingView Realtime Chart ${chart.symbol} ${intervalLabel(chart.interval)}`}
        src={tvWidgetUrl(chart.symbol, chart.interval, `tv_${chart.id}`)}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          minHeight: isMaximized ? '520px' : '380px',
          border: 'none',
          borderRadius: '8px'
        }}
      />
    </div>
  );

  const getGridStyle = (): React.CSSProperties => {
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

  type Panel =
    | { kind: 'chart'; key: string; chart: TvChartInstance }
    | { kind: 'module'; key: string; id: WorkspaceModuleId };

  const panels: Panel[] = [
    ...config.charts.map(c => ({ kind: 'chart' as const, key: `chart:${c.id}`, chart: c })),
    ...config.activeModules.map(id => ({ kind: 'module' as const, key: `module:${id}`, id }))
  ];

  const panelShellStyle = (key: string): React.CSSProperties => ({
    backgroundColor: 'var(--bg-panel)',
    borderRadius: '14px',
    border: '1px solid var(--border-color)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '260px',
    ...(maximizedPanel === key ? { gridColumn: '1 / -1', minHeight: '580px' } : {})
  });

  const panelButtonStyle: React.CSSProperties = { color: 'var(--text-secondary)', padding: '4px' };

  const renderPanelHeader = (panel: Panel) => {
    const isMax = maximizedPanel === panel.key;
    const title = panel.kind === 'chart'
      ? `${panel.chart.symbol} · ${intervalLabel(panel.chart.interval)}`
      : AVAILABLE_MODULES.find(m => m.id === panel.id)?.title || '';
    const Icon = panel.kind === 'chart'
      ? TrendingUp
      : (AVAILABLE_MODULES.find(m => m.id === panel.id)?.icon || Layout);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #1a2538' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '28px',
            height: '28px',
            flexShrink: 0,
            borderRadius: '6px',
            backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-secondary)'
          }}>
            <Icon size={15} />
          </div>

          {panel.kind === 'chart' && editingChartId === panel.chart.id ? (
            <input
              type="text"
              autoFocus
              value={symbolDraft}
              onChange={(e) => setSymbolDraft(e.target.value)}
              onBlur={() => {
                if (commitChartSymbol(panel.chart.id, symbolDraft, panel.chart.symbol)) {
                  showToast(`Chart symbol set to ${symbolDraft.trim()}.`, 'success');
                }
                setEditingChartId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                if (e.key === 'Escape') { setSymbolDraft(panel.chart.symbol); setEditingChartId(null); }
              }}
              placeholder="EXCHANGE:SYMBOL"
              aria-label="Chart symbol"
              className="input-control font-mono"
              style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', padding: '3px 8px' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (panel.kind !== 'chart') return;
                setEditingChartId(panel.chart.id);
                setSymbolDraft(panel.chart.symbol);
              }}
              title={panel.kind === 'chart' ? 'Click to change the symbol' : title}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: panel.kind === 'chart' ? 'pointer' : 'default',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'left'
              }}
            >
              {panel.kind === 'chart' ? panel.chart.symbol : title}
            </button>
          )}

          {panel.kind === 'chart' && (
            <select
              value={panel.chart.interval}
              onChange={(e) => updateChart(panel.chart.id, { interval: e.target.value })}
              className="input-control"
              aria-label={`Timeframe for ${panel.chart.symbol}`}
              title="Chart timeframe"
              style={{ width: 'auto', flexShrink: 0, fontSize: '0.72rem', padding: '2px 4px' }}
            >
              {TV_INTERVALS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMaximizedPanel(isMax ? null : panel.key)}
            className="btn btn-ghost btn-icon btn-sm"
            title={isMax ? 'Restore this panel' : 'Expand this panel to the full row'}
            aria-label={isMax ? `Restore ${title}` : `Expand ${title} to the full row`}
            style={panelButtonStyle}
          >
            {isMax ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={() => (panel.kind === 'chart' ? popOutChartWindow(panel.chart) : popOutMultiMonitorWindow(panel.id, title))}
            className="btn btn-ghost btn-icon btn-sm"
            title="Open this module in a separate window for monitor 2 or 3"
            aria-label="Open this module in a separate window for monitor 2 or 3"
            style={panelButtonStyle}
          >
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            onClick={() => (panel.kind === 'chart' ? removeChart(panel.chart.id) : toggleModule(panel.id))}
            className="btn btn-ghost btn-icon btn-sm"
            title={panel.kind === 'chart' ? 'Remove this chart' : 'Hide this module'}
            aria-label={panel.kind === 'chart' ? `Remove chart ${panel.chart.symbol}` : 'Hide this module'}
            style={panelButtonStyle}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Multi-Screen Workspace Hub
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              backgroundColor: 'var(--bg-main)',
              color: 'var(--theme-secondary)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              Cloud Synced
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Arrange live trading modules, charts, and calculators freely across multi-monitor setups — run up to {MAX_TV_CHARTS} live charts at once
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Preset Layout Switcher */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-sidebar)', padding: '3px', borderRadius: '8px', border: '1px solid var(--bg-chip)' }}>
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
                  backgroundColor: config.layout === l.id ? 'var(--theme-secondary-strong)' : 'transparent',
                  color: config.layout === l.id ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={addChart}
            disabled={config.charts.length >= MAX_TV_CHARTS}
            className="btn btn-secondary btn-sm"
            title={config.charts.length >= MAX_TV_CHARTS ? `Maximum ${MAX_TV_CHARTS} live charts reached` : 'Add another live TradingView chart'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.8rem', opacity: config.charts.length >= MAX_TV_CHARTS ? 0.5 : 1 }}
          >
            <Plus size={14} />
            <span>Add Chart ({config.charts.length}/{MAX_TV_CHARTS})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.8rem' }}
          >
            <SlidersHorizontal size={14} />
            <span>Customize Workspace ({panels.length})</span>
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
      {panels.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '14px',
          border: '1px dashed var(--border-color)'
        }}>
          <Layout size={40} color="var(--theme-secondary)" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            This Workspace Has No Active Modules
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 16px' }}>
            Add live charts or open the customize panel to choose which modules show up here.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={addChart} className="btn btn-secondary btn-sm">
              + Add Live Chart
            </button>
            <button type="button" onClick={() => setShowConfigModal(true)} className="btn btn-primary btn-sm">
              + Open Module Settings
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-grid" style={getGridStyle()}>
          {panels.map(panel => (
            <div key={panel.key} style={panelShellStyle(panel.key)}>
              {renderPanelHeader(panel)}

              {/* Module Body Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {panel.kind === 'chart'
                  ? renderChartContent(panel.chart, maximizedPanel === panel.key)
                  : renderModuleContent(panel.id)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customize Workspace Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div ref={modalRef} className="modal-container" role="dialog" aria-modal="true" aria-label="Customize Workspace" tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Customize Workspace Modules & Presets
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Pick the modules you want enabled. Settings are saved per account in the cloud.
                </span>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="btn btn-ghost btn-icon" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Live TradingView Charts */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sidebar)', borderRadius: '10px', border: '1px solid var(--bg-chip)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--theme-secondary)', textTransform: 'uppercase' }}>
                      Live TradingView Charts
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {config.charts.length} of {MAX_TV_CHARTS} used · each chart keeps its own symbol and timeframe
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addChart}
                    disabled={config.charts.length >= MAX_TV_CHARTS}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', opacity: config.charts.length >= MAX_TV_CHARTS ? 0.5 : 1 }}
                  >
                    <Plus size={14} />
                    <span>Add Chart</span>
                  </button>
                </div>

                {config.charts.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '10px 0' }}>
                    No live chart in this workspace yet — add one to see realtime price action.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {config.charts.map((c, index) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-panel)',
                          border: '1px solid var(--bg-chip)'
                        }}
                      >
                        <span style={{
                          flexShrink: 0,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                          minWidth: '14px'
                        }}>
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          defaultValue={c.symbol}
                          onBlur={(e) => {
                            const symbol = e.target.value.trim();
                            if (!symbol) {
                              e.target.value = c.symbol;
                              return;
                            }
                            if (symbol !== c.symbol) updateChart(c.id, { symbol });
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          placeholder="EXCHANGE:SYMBOL"
                          aria-label={`Symbol for live chart ${index + 1}`}
                          className="input-control font-mono"
                          style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', padding: '5px 8px' }}
                        />
                        <select
                          value={c.interval}
                          onChange={(e) => updateChart(c.id, { interval: e.target.value })}
                          aria-label={`Timeframe for live chart ${index + 1}`}
                          className="input-control"
                          style={{ width: 'auto', flexShrink: 0, fontSize: '0.75rem', padding: '4px 6px' }}
                        >
                          {TV_INTERVALS.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeChart(c.id)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Remove this chart"
                          aria-label={`Remove live chart ${index + 1}`}
                          style={{ color: 'var(--text-secondary)', padding: '4px', flexShrink: 0 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Tip: click a chart symbol directly on its panel to rename it, or use the expand icon to give it the full row.
                </div>
              </div>

              {/* Module Checklist Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--theme-secondary)', textTransform: 'uppercase' }}>
                  Workspace Modules
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
                          border: `1px solid ${isActive ? 'var(--theme-secondary-strong)' : 'var(--bg-chip)'}`,
                          backgroundColor: isActive ? 'color-mix(in srgb, var(--theme-secondary-strong) 10%, transparent)' : 'var(--bg-sidebar)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={16} color={isActive ? 'var(--theme-secondary)' : 'var(--text-muted)'} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {m.desc}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1px solid ${isActive ? 'var(--theme-secondary-strong)' : '#334155'}`,
                          backgroundColor: isActive ? 'var(--theme-secondary-strong)' : 'transparent',
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
                style={{ color: 'var(--text-secondary)', gap: '6px' }}
              >
                <RotateCcw size={14} />
                <span>Reset Default</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="btn btn-primary btn-sm"
              >
                Done & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
