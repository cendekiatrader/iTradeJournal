import React, { useState, useEffect, useRef } from 'react';
import { useJournal } from '../../context/JournalContext';
import { 
  Calculator, 
  X, 
  Minimize2, 
  Maximize2, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  ShieldAlert,
  Zap
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const QuickRiskDock: React.FC = () => {
  const { accounts, activeAccount, showToast } = useJournal();

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('itrade_dock_open') === 'true';
    } catch {
      return false;
    }
  });

  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [instrument, setInstrument] = useState<'Gold' | 'Forex' | 'Crypto' | 'Indices'>('Gold');
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<string>('2500');
  const [stopLossPrice, setStopLossPrice] = useState<string>('2490');
  const [copied, setCopied] = useState<boolean>(false);

  const pipWindowRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('itrade_dock_open', String(isOpen));
    } catch {}
  }, [isOpen]);

  const currentBalance = activeAccount?.currentBalance || accounts[0]?.currentBalance || 10000;
  const currentCurrency = activeAccount?.currency || 'USD';
  const riskAmount = (currentBalance * riskPercent) / 100;
  const entryNum = parseFloat(entryPrice) || 0;
  const slNum = parseFloat(stopLossPrice) || 0;
  const stopDistance = Math.abs(entryNum - slNum);

  let calculatedLot = 0;
  if (stopDistance > 0) {
    if (instrument === 'Gold') {
      calculatedLot = riskAmount / (stopDistance * 100);
    } else if (instrument === 'Forex') {
      const pipSize = 0.0001;
      const pipsCount = stopDistance / pipSize;
      calculatedLot = riskAmount / (pipsCount * 10);
    } else if (instrument === 'Crypto') {
      calculatedLot = riskAmount / stopDistance;
    } else if (instrument === 'Indices') {
      calculatedLot = riskAmount / (stopDistance * 5);
    }
  }

  const formattedLot = calculatedLot > 0
    ? (instrument === 'Crypto'
        ? (calculatedLot >= 10 ? calculatedLot.toFixed(2) : calculatedLot.toFixed(4))
        : calculatedLot.toFixed(2))
    : '0.00';

  const copyLot = () => {
    navigator.clipboard.writeText(formattedLot);
    setCopied(true);
    showToast(`Disalin ke clipboard: ${formattedLot} Lot!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Launch Always-on-Top Document Picture-in-Picture
  const launchAlwaysOnTopPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      showToast('Browser Anda belum mendukung Window Always-On-Top PiP (Gunakan Chrome / Edge terbaru)', 'error');
      return;
    }

    try {
      // Close previous pip if open
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }

      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 380
      });

      pipWindowRef.current = pipWindow;
      setIsPipActive(true);

      // Copy document styles to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media.toString();
          link.href = styleSheet.href || '';
          pipWindow.document.head.appendChild(link);
        }
      });

      // Basic Dark Style for PiP Window Body
      pipWindow.document.body.style.backgroundColor = '#080c1b';
      pipWindow.document.body.style.color = '#f8fafc';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.padding = '12px';
      pipWindow.document.body.style.fontFamily = 'Inter, -apple-system, sans-serif';

      // Render content
      const renderPiPContent = () => {
        const dist = Math.abs(entryNum - slNum);
        let lot = 0;
        if (dist > 0) {
          if (instrument === 'Gold') lot = riskAmount / (dist * 100);
          else if (instrument === 'Forex') lot = riskAmount / ((dist / 0.0001) * 10);
          else if (instrument === 'Crypto') lot = riskAmount / dist;
          else if (instrument === 'Indices') lot = riskAmount / (dist * 5);
        }
        const lotText = lot > 0 ? (instrument === 'Crypto' ? (lot >= 10 ? lot.toFixed(2) : lot.toFixed(4)) : lot.toFixed(2)) : '0.00';

        pipWindow.document.body.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px; height:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:8px;">
              <span style="font-weight:800; font-size:13px; color:#60a5fa; display:flex; align-items:center; gap:4px;">
                ⚡ iTrade Quick-Risk Dock
              </span>
              <span style="font-size:11px; background:#1e293b; padding:2px 6px; border-radius:4px; color:#94a3b8;">
                Always on Top
              </span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8;">
              <span>Balance: <strong>$${currentBalance.toLocaleString()}</strong></span>
              <span>Risk: <strong style="color:#f87171;">${riskPercent}% ($${riskAmount.toFixed(0)})</strong></span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:2px;">Entry Price</label>
                <input id="pip-entry" type="number" step="any" value="${entryPrice}" style="width:100%; background:#0c1222; border:1px solid #1e293b; color:#fff; padding:6px 8px; border-radius:6px; font-family:monospace; font-size:12px; box-sizing:border-box;" />
              </div>
              <div>
                <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:2px;">Stop Loss</label>
                <input id="pip-sl" type="number" step="any" value="${stopLossPrice}" style="width:100%; background:#0c1222; border:1px solid #1e293b; color:#fff; padding:6px 8px; border-radius:6px; font-family:monospace; font-size:12px; box-sizing:border-box;" />
              </div>
            </div>

            <div style="background:#0c1222; border:1px solid #2563eb; padding:12px; border-radius:8px; text-align:center; margin-top:4px;">
              <div style="font-size:11px; color:#93c5fd; font-weight:600; text-transform:uppercase;">Ukuran Lot Direkomendasikan</div>
              <div style="font-size:24px; font-weight:800; font-family:monospace; color:#34d399; margin:4px 0;">
                ${lotText}
              </div>
              <div style="font-size:11px; color:#64748b;">${instrument} • SL: ${dist.toFixed(2)} pts</div>
            </div>

            <button id="pip-copy-btn" style="background:#2563eb; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer; width:100%; margin-top:auto;">
              📋 Salin Lot ke Clipboard
            </button>
          </div>
        `;

        const entryInput = pipWindow.document.getElementById('pip-entry');
        const slInput = pipWindow.document.getElementById('pip-sl');
        const copyBtn = pipWindow.document.getElementById('pip-copy-btn');

        if (entryInput) {
          entryInput.addEventListener('input', (e: any) => {
            setEntryPrice(e.target.value);
          });
        }
        if (slInput) {
          slInput.addEventListener('input', (e: any) => {
            setStopLossPrice(e.target.value);
          });
        }
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            pipWindow.navigator.clipboard.writeText(lotText);
            copyBtn.innerText = '✅ Tersalin!';
            setTimeout(() => {
              if (copyBtn) copyBtn.innerText = '📋 Salin Lot ke Clipboard';
            }, 1500);
          });
        }
      };

      renderPiPContent();

      pipWindow.addEventListener('pagehide', () => {
        setIsPipActive(false);
        pipWindowRef.current = null;
      });

      showToast('🖥️ Always-on-Top Floating Dock aktif di desktop!', 'success');
    } catch (err) {
      console.error('Failed to launch Picture-in-Picture window:', err);
      showToast('Gagal membuka Always-on-Top PiP window.', 'error');
      setIsPipActive(false);
    }
  };

  return (
    <>
      {/* Floating Mini Dock Trigger Bar (Fixed Bottom Right) */}
      <div 
        ref={containerRef}
        style={{
          position: 'fixed',
          bottom: '18px',
          right: '24px',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}
      >
        {/* Expanded Panel */}
        {isOpen && (
          <div style={{
            width: '320px',
            backgroundColor: '#0c1222',
            border: '1px solid #233148',
            borderRadius: '14px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            padding: '14px',
            animation: 'fadeIn 0.15s ease'
          }}>
            {/* Dock Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={16} color="#3b82f6" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                  Quick-Risk Sizer
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Popout Always-on-Top Desktop Window Button */}
                <button
                  type="button"
                  onClick={launchAlwaysOnTopPiP}
                  className="btn btn-ghost btn-icon btn-sm"
                  title="Buka Window Always-on-Top di Desktop (Di atas MT5 / TradingView)"
                  style={{ color: isPipActive ? '#34d399' : '#60a5fa', padding: '4px' }}
                >
                  <ExternalLink size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: '#94a3b8', padding: '4px' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Account & Risk % Pill */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              backgroundColor: '#070b17',
              borderRadius: '8px',
              border: '1px solid #1a2538',
              marginBottom: '10px',
              fontSize: '0.74rem'
            }}>
              <span style={{ color: '#94a3b8' }}>
                Bal: <strong style={{ color: '#f8fafc' }}>{formatCurrency(currentBalance, currentCurrency, true)}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.5, 1.0, 2.0].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskPercent(r)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: riskPercent === r ? '#3b82f6' : '#1e293b',
                      color: riskPercent === r ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Selector */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
              {(['Gold', 'Forex', 'Crypto', 'Indices'] as const).map(ast => (
                <button
                  key={ast}
                  type="button"
                  onClick={() => {
                    setInstrument(ast);
                    if (ast === 'Gold') { setEntryPrice('2500'); setStopLossPrice('2490'); }
                    else if (ast === 'Forex') { setEntryPrice('1.0850'); setStopLossPrice('1.0820'); }
                    else if (ast === 'Crypto') { setEntryPrice('60000'); setStopLossPrice('59000'); }
                    else if (ast === 'Indices') { setEntryPrice('40000'); setStopLossPrice('39800'); }
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: instrument === ast ? '#1e293b' : 'transparent',
                    color: instrument === ast ? '#60a5fa' : '#64748b',
                    border: `1px solid ${instrument === ast ? '#3b82f6' : '#1e293b'}`,
                    cursor: 'pointer'
                  }}
                >
                  {ast}
                </button>
              ))}
            </div>

            {/* Entry & SL Input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div style={{ minWidth: 0 }}>
                <label className="input-label" style={{ fontSize: '0.7rem', marginBottom: '2px', display: 'block' }}>Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="input-control font-mono"
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 8px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    display: 'block'
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <label className="input-label" style={{ fontSize: '0.7rem', marginBottom: '2px', display: 'block' }}>Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="input-control font-mono"
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 8px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    display: 'block'
                  }}
                />
              </div>
            </div>

            {/* Result Box */}
            <div style={{
              padding: '10px',
              backgroundColor: '#070b17',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#93c5fd', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                  Recommended Lot
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--profit-green)', fontFamily: 'var(--font-mono)' }}>
                  {formattedLot}
                </span>
              </div>

              <button
                type="button"
                onClick={copyLot}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }}
              >
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copied ? 'Tersalin' : 'Salin Lot'}</span>
              </button>
            </div>

            {/* Always on top tip */}
            <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
              Klik ikon <ExternalLink size={10} style={{ display: 'inline' }} /> untuk window melayang di atas chart Desktop (Always-On-Top)
            </div>
          </div>
        )}

        {/* Collapsed Pill Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: '#0c1222',
            border: '1px solid #233148',
            borderRadius: '24px',
            color: '#f8fafc',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.8rem',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#233148'; }}
        >
          <Zap size={14} color="#3b82f6" />
          <span>Quick Risk ({formattedLot} Lot)</span>
          {isOpen ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronUp size={14} color="#94a3b8" />}
        </button>
      </div>
    </>
  );
};
