import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Currency } from '../../types';
import { 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Layers, 
  Sliders, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Flame
} from 'lucide-react';

interface KellyRiskSimulatorProps {
  initialBalance?: number;
  initialWinRate?: number;
  initialRR?: number;
  currency?: Currency;
}

export const KellyRiskSimulator: React.FC<KellyRiskSimulatorProps> = ({
  initialBalance = 10000,
  initialWinRate = 55,
  initialRR = 2.0,
  currency = 'USD'
}) => {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [winRate, setWinRate] = useState<number>(initialWinRate > 0 ? initialWinRate : 55);
  const [payoffRatio, setPayoffRatio] = useState<number>(initialRR > 0 ? initialRR : 2.0); // Reward to Risk

  // Kelly Calculation Formula: K% = (b*p - q) / b
  const { fullKelly, halfKelly, quarterKelly, hasPositiveEdge } = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = Math.max(0.1, payoffRatio);

    const rawKelly = ((b * p - q) / b) * 100;
    const hasEdge = rawKelly > 0;

    const fullK = Math.max(0, Math.min(50, rawKelly));
    const halfK = fullK / 2;
    const quarterK = fullK / 4;

    return {
      fullKelly: fullK,
      halfKelly: halfK,
      quarterKelly: quarterK,
      hasPositiveEdge: hasEdge
    };
  }, [winRate, payoffRatio]);

  // Sizing Comparison Models
  const models = [
    {
      id: 'quarter',
      name: 'Quarter-Kelly (Institutional Safe)',
      riskPercent: quarterKelly,
      color: '#10b981',
      badge: 'RECOMMENDED',
      description: 'Pertumbuhan optimal dengan volatilitas sangat rendah & drawdown minimal.',
      drawdownRisk: 'Sangat Rendah (< 8%)',
      growthSpeed: 'Stabil & Konsisten'
    },
    {
      id: 'half',
      name: 'Half-Kelly (Aggressive Growth)',
      riskPercent: halfKelly,
      color: '#3b82f6',
      badge: 'PRO GROWTH',
      description: 'Menangkap 75% dari laju puncak Kelly dengan pengurangan risiko drawdown hingga 50%.',
      drawdownRisk: 'Sedang (~ 15-20%)',
      growthSpeed: 'Cepat'
    },
    {
      id: 'fixed1',
      name: 'Fixed 1.0% Risk (Standard)',
      riskPercent: 1.0,
      color: '#38bdf8',
      badge: 'CONSERVATIVE',
      description: 'Standar aturan emas prop firm untuk melindungi akun dari drawdown breach.',
      drawdownRisk: 'Rendah (< 10%)',
      growthSpeed: 'Standar'
    },
    {
      id: 'full',
      name: 'Full Kelly (Theoretical Peak)',
      riskPercent: fullKelly,
      color: '#ef4444',
      badge: 'HIGH VOLATILITY',
      description: 'Maksimum teoritis matematika. Tidak disarankan untuk live account karena ayunan drawdown tajam.',
      drawdownRisk: 'Tinggi (Bisa > 40%)',
      growthSpeed: 'Ekstrem'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Parameter Sliders */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#3b82f6" />
          <span>Pengaturan Parameter Kelly Criterion</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Starting Balance */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Saldo Akun (Balance):</span>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(balance, currency)}
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={200000}
              step={1000}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>

          {/* Win Rate % */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Win Rate (%):</span>
              <span style={{ fontWeight: 700, color: winRate >= 50 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                {winRate}%
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={85}
              step={1}
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          {/* Payoff Ratio / Reward-to-Risk */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Payoff Ratio (Average R:R):</span>
              <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                1 : {payoffRatio.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={5.0}
              step={0.1}
              value={payoffRatio}
              onChange={(e) => setPayoffRatio(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>
        </div>
      </div>

      {/* Edge Verdict Status Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '14px',
        backgroundColor: hasPositiveEdge ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
        border: hasPositiveEdge ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          backgroundColor: hasPositiveEdge ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {hasPositiveEdge ? <CheckCircle2 size={20} color="#10b981" /> : <AlertTriangle size={20} color="#ef4444" />}
        </div>

        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: hasPositiveEdge ? '#34d399' : '#f87171' }}>
            {hasPositiveEdge 
              ? `Mathematical Positive Edge Terdeteksi (Optimal Risk: ${quarterKelly.toFixed(2)}% – ${halfKelly.toFixed(2)}%)` 
              : 'Negative Mathematical Edge! Jangan Buka Posisi.'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
            {hasPositiveEdge 
              ? 'Berdasarkan teori probabilitas Kelly Criterion, gunakan model Quarter-Kelly atau Half-Kelly untuk memaksimalkan pelipatgandaan saldo tanpa risiko drawdown yang berlebihan.'
              : 'Kombinasi Winrate dan R:R saat ini menghasilkan ekspektasi matematika negatif. Tingkatkan Winrate atau perlebar target R:R Anda.'}
          </div>
        </div>
      </div>

      {/* 4 Sizing Model Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {models.map((m) => {
          const dollarRisk = (balance * m.riskPercent) / 100;

          return (
            <div
              key={m.id}
              className="card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: `1px solid ${m.color}40`,
                background: `linear-gradient(135deg, ${m.color}0a, #070b16)`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${m.color}25`,
                    color: m.color,
                    border: `1px solid ${m.color}40`
                  }}>
                    {m.badge}
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  {m.name}
                </div>

                {/* Risk % & $ */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: m.color, fontFamily: 'var(--font-mono)' }}>
                    {m.riskPercent.toFixed(2)}% <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Risk</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    = {formatCurrency(dollarRisk, currency)} per trade
                  </div>
                </div>

                <p style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  {m.description}
                </p>
              </div>

              {/* Drawdown & Speed Stats */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block' }}>Estimasi Drawdown</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#cbd5e1' }}>{m.drawdownRisk}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block' }}>Laju Pertumbuhan</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: m.color }}>{m.growthSpeed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kelly Formula Guide Card */}
      <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), #090e1c)' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} />
          <span>Mengapa Trader Institusional Menggunakan Half-Kelly atau Quarter-Kelly?</span>
        </h4>
        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
          <strong>Kelly Criterion</strong> pertama kali dirumuskan oleh ilmuwan matematika John L. Kelly Jr. di Bell Labs. Formula Full Kelly memberikan laju pertumbuhan modal tercepat secara matematis, namun memiliki ayunan volatilitas (*volatility drag*) yang terlalu ekstrem bagi psikologi manusia. Oleh karena itu, fund manager dan trader profesional selalu menerapkan <strong>Fractional Kelly (Half-Kelly atau Quarter-Kelly)</strong> untuk mendapatkan kurva pertumbuhan mulus tanpa risiko *Drawdown Breach* pada akun prop firm atau akun live!
        </p>
      </div>
    </div>
  );
};
