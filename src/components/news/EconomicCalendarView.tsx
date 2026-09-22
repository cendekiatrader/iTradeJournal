import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Globe, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Filter, 
  TrendingUp, 
  ShieldAlert, 
  Info,
  RefreshCw,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface HighImpactItem {
  id: string;
  time: string;
  currency: string;
  country: string;
  flag: string;
  event: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  forecast?: string;
  previous?: string;
  description: string;
}

const UPCOMING_MAJOR_NEWS: HighImpactItem[] = [
  {
    id: 'cpi-usd',
    time: '19:30 WIB / 12:30 UTC',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    event: 'Core CPI m/m & YoY (Consumer Price Index)',
    impact: 'HIGH',
    forecast: '0.3%',
    previous: '0.3%',
    description: 'The key US consumer inflation gauge. Strongly influences Fed rate direction and drives high volatility in XAUUSD, DXY, EURUSD, & Crypto.'
  },
  {
    id: 'nfp-usd',
    time: '19:30 WIB / 12:30 UTC',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    event: 'Non-Farm Payrolls & Unemployment Rate',
    impact: 'HIGH',
    forecast: '185K',
    previous: '206K',
    description: 'US non-farm payrolls data. Triggers large liquidity expansions (liquidity sweeps) on major pairs.'
  },
  {
    id: 'fomc-usd',
    time: '01:00 WIB / 18:00 UTC',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    event: 'FOMC Statement & Fed Interest Rate Decision',
    impact: 'HIGH',
    forecast: '5.25%',
    previous: '5.50%',
    description: 'Keputusan suku bunga acuan bank sentral AS (Federal Reserve). Pergerakan range harian terbesar di pasar keuangan global.'
  },
  {
    id: 'ecb-eur',
    time: '19:15 WIB / 12:15 UTC',
    currency: 'EUR',
    country: 'Eurozone',
    flag: '🇪🇺',
    event: 'ECB Main Refinancing Rate & Monetary Policy Statement',
    impact: 'HIGH',
    forecast: '3.75%',
    previous: '4.25%',
    description: 'European Central Bank monetary policy. High direct impact on EURUSD and EURGBP.'
  },
  {
    id: 'boe-gbp',
    time: '18:00 WIB / 11:00 UTC',
    currency: 'GBP',
    country: 'United Kingdom',
    flag: '🇬🇧',
    event: 'BOE Official Bank Rate & Monetary Policy Summary',
    impact: 'HIGH',
    forecast: '5.00%',
    previous: '5.25%',
    description: 'Bank of England rate decision. Triggers sharp volatility in GBPUSD and GBPJPY.'
  },
  {
    id: 'ppi-usd',
    time: '19:30 WIB / 12:30 UTC',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    event: 'Core PPI m/m (Producer Price Index)',
    impact: 'HIGH',
    forecast: '0.2%',
    previous: '0.4%',
    description: 'Producer price index (wholesale inflation). A leading indicator ahead of the CPI consumer inflation data.'
  }
];

export const EconomicCalendarView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<'ALL' | 'HIGH'>('ALL');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Embed TradingView Realtime Economic Calendar Widget
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget iframe/scripts
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '650',
      locale: 'en',
      importanceFilter: selectedImpact === 'HIGH' ? '0,1' : '-1,0,1',
      currencyFilter: selectedCurrency === 'ALL' ? undefined : selectedCurrency
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [selectedCurrency, selectedImpact]);

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flame size={24} color="var(--loss-red)" />
            <span>Economic Calendar & News Radar</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--loss-red)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              LIVE
            </span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Track high-impact global economic news releases in real time to protect your trading risk.
          </p>
        </div>

        {/* Live Clock Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border-color)'
        }}>
          <Clock size={16} color="var(--theme-secondary-strong)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Local Time:</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {currentTime} WIB
          </span>
        </div>
      </div>

      {/* High-Impact Alert Radar Banner */}
      <div style={{
        padding: '18px 20px',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-main)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldAlert size={22} color="var(--loss-red)" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--loss-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Risk Management Protocol Around Red-Folder (High Impact) News</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-strong)', marginTop: '4px', lineHeight: 1.5 }}>
            Avoid opening new positions <strong>15 minutes before to 15 minutes after</strong> red-flagged news releases (CPI, NFP, FOMC, interest rates) to avoid <em>slippage</em>, <em>spread</em> widening, and <em>fakeout whipsaw</em>.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Currency Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {currencies.map(curr => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className="btn btn-sm"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: selectedCurrency === curr ? '#1e3a8a' : 'var(--bg-panel)',
                borderColor: selectedCurrency === curr ? 'var(--theme-secondary-strong)' : 'var(--border-color)',
                color: selectedCurrency === curr ? '#93c5fd' : 'var(--text-secondary)'
              }}
            >
              {curr === 'ALL' ? '🌐 All Currencies' : curr}
            </button>
          ))}
        </div>

        {/* Impact Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSelectedImpact('ALL')}
            className="btn btn-sm"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              backgroundColor: selectedImpact === 'ALL' ? 'var(--bg-chip)' : 'var(--bg-panel)',
              borderColor: selectedImpact === 'ALL' ? '#475569' : 'var(--border-color)',
              color: selectedImpact === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            Semua Tingkat Dampak
          </button>
          <button
            onClick={() => setSelectedImpact('HIGH')}
            className="btn btn-sm"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: selectedImpact === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-panel)',
              borderColor: selectedImpact === 'HIGH' ? '#ef4444' : 'var(--border-color)',
              color: selectedImpact === 'HIGH' ? '#f87171' : 'var(--text-secondary)',
              gap: '6px'
            }}
          >
            <Flame size={13} color="var(--loss-red)" />
            <span>High Impact Only (Red Folder)</span>
          </button>
        </div>
      </div>

      {/* Grid: Realtime Calendar Widget + Major Events Cheatsheet */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Live Interactive Economic Calendar Widget */}
        <div className="card" style={{ padding: '20px', minHeight: '680px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="var(--theme-secondary-strong)" />
              <span>Real-Time Economic Releases Feed</span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Powered by Live Global Market Feeds
            </span>
          </div>

          <div ref={containerRef} style={{ width: '100%', minHeight: '620px' }}>
            {/* Widget auto-mounted here */}
          </div>
        </div>

        {/* Major Key Events Cheat Sheet Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={17} color="var(--accent-amber)" />
              <span>Katalog Berita Berdampak Terbesar</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {UPCOMING_MAJOR_NEWS.map((news) => (
                <div 
                  key={news.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--bg-chip)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1rem' }}>{news.flag}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--theme-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {news.currency}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--loss-red)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      HIGH
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {news.event}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    {news.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick News Trading Rules Card */}
          <div className="card" style={{ padding: '20px', background: 'var(--bg-main)' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--theme-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} />
              <span>3 Golden Rules Around News:</span>
            </h4>
            <ul style={{ fontSize: '0.76rem', color: 'var(--text-strong)', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
              <li><strong>Don't Place Orders Blindly:</strong> Wait for the post-news 15m/1H candle to close before reading the real liquidity direction (*displacement*).</li>
              <li><strong>Mind Breakeven / Partial:</strong> If a position is already in profit before major news, protect it with SL+ (breakeven) or a partial TP.</li>
              <li><strong>Use Post-News FVGs:</strong> News often creates large FVG / imbalance zones that are precise to retest afterwards.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
