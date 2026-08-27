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
    description: 'Ukuran utama inflasi konsumen AS. Sangat mempengaruhi arah suku bunga The Fed dan volatilitas tinggi pada XAUUSD, DXY, EURUSD, & Crypto.'
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
    description: 'Data ketenagakerjaan sektor non-pertanian AS. Memicu ekspansi likuiditas besar (liquidity sweep) pada pair mayor.'
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
    description: 'Kebijakan moneter Bank Sentral Eropa. Berdampak tinggi langsung pada pair EURUSD dan EURGBP.'
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
    description: 'Keputusan suku bunga Bank of England. Memicu volatilitas tajam pada GBPUSD dan GBPJPY.'
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
    description: 'Indeks harga produsen (inflasi grosir). Menjadi indikator awal sebelum data inflasi konsumen CPI.'
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flame size={24} color="#ef4444" />
            <span>Economic Calendar & News Radar</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
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
            Pantau rilis berita fundamental ekonomi global berimpact tinggi secara real-time untuk melindungi risiko trading.
          </p>
        </div>

        {/* Live Clock Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '12px',
          backgroundColor: '#0c1326',
          border: '1px solid #233148'
        }}>
          <Clock size={16} color="#3b82f6" />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Waktu Lokal:</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
            {currentTime} WIB
          </span>
        </div>
      </div>

      {/* High-Impact Alert Radar Banner */}
      <div style={{
        padding: '18px 20px',
        borderRadius: '16px',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldAlert size={22} color="#ef4444" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Protokol Manajemen Risiko Saat Rilis Berita Red Folder (High Impact)</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
            Hindari membuka posisi baru <strong>15 menit sebelum hingga 15 menit setelah</strong> rilis berita bertanda merah (CPI, NFP, FOMC, Suku Bunga) untuk menghindari <em>slippage</em>, pelebaran <em>spread</em>, dan <em>fakeout whipsaw</em>.
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
                backgroundColor: selectedCurrency === curr ? '#1e3a8a' : '#0c1222',
                borderColor: selectedCurrency === curr ? '#3b82f6' : '#233148',
                color: selectedCurrency === curr ? '#93c5fd' : '#94a3b8'
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
              backgroundColor: selectedImpact === 'ALL' ? '#1e293b' : '#0c1222',
              borderColor: selectedImpact === 'ALL' ? '#475569' : '#233148',
              color: selectedImpact === 'ALL' ? '#f8fafc' : '#94a3b8'
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
              backgroundColor: selectedImpact === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : '#0c1222',
              borderColor: selectedImpact === 'HIGH' ? '#ef4444' : '#233148',
              color: selectedImpact === 'HIGH' ? '#f87171' : '#94a3b8',
              gap: '6px'
            }}
          >
            <Flame size={13} color="#ef4444" />
            <span>High Impact Only (Red Folder)</span>
          </button>
        </div>
      </div>

      {/* Grid: Realtime Calendar Widget + Major Events Cheatsheet */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Live Interactive Economic Calendar Widget */}
        <div className="card" style={{ padding: '20px', minHeight: '680px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#3b82f6" />
              <span>Real-Time Economic Releases Feed</span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
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
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={17} color="#f59e0b" />
              <span>Katalog Berita Berdampak Terbesar</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {UPCOMING_MAJOR_NEWS.map((news) => (
                <div 
                  key={news.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#070b16',
                    border: '1px solid #1e293b'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1rem' }}>{news.flag}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {news.currency}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      HIGH
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {news.event}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                    {news.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick News Trading Rules Card */}
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), #090e1c)' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#60a5fa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} />
              <span>3 Aturan Emas Saat News:</span>
            </h4>
            <ul style={{ fontSize: '0.76rem', color: '#cbd5e1', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
              <li><strong>Jangan Pasang Order Blindly:</strong> Tunggu candle 15m/1H pasca-news ditutup untuk melihat arah likuiditas yang sebenarnya (*displacement*).</li>
              <li><strong>Perhatikan Breakeven / Partial:</strong> Jika sudah ada posisi profit sebelum news besar, kunci dengan SL+ (Breakeven) atau TP parsial.</li>
              <li><strong>Manfaatkan FVG Pasca-News:</strong> Seringkali news menciptakan FVG / Imbalance besar yang sangat akurat untuk di-retest sesudahnya.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
