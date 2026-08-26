import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Currency } from '../../types';
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  Percent, 
  Calendar, 
  Layers, 
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';

interface CompoundingPlannerProps {
  initialBalance?: number;
  currency?: Currency;
}

export const CompoundingPlanner: React.FC<CompoundingPlannerProps> = ({
  initialBalance = 10000,
  currency = 'USD'
}) => {
  const [startingPrincipal, setStartingPrincipal] = useState<number>(initialBalance);
  const [returnRate, setReturnRate] = useState<number>(5.0); // % per period
  const [periodsCount, setPeriodsCount] = useState<number>(12); // 12 months
  const [withdrawalRate, setWithdrawalRate] = useState<number>(20); // 20% of profit withdrawn

  const tableData = useMemo(() => {
    let balance = startingPrincipal;
    let totalWithdrawn = 0;
    let totalProfit = 0;
    const rows = [];

    for (let p = 1; p <= periodsCount; p++) {
      const startBal = balance;
      const grossProfit = (startBal * returnRate) / 100;
      const withdrawal = (grossProfit * withdrawalRate) / 100;
      const netGain = grossProfit - withdrawal;
      balance += netGain;
      totalProfit += grossProfit;
      totalWithdrawn += withdrawal;

      rows.push({
        period: p,
        startBalance: startBal,
        grossProfit,
        withdrawal,
        endBalance: balance,
        cumulativeWithdrawn: totalWithdrawn,
        growthMultiplier: balance / startingPrincipal
      });
    }

    return {
      rows,
      finalBalance: balance,
      totalProfit,
      totalWithdrawn,
      multiplier: balance / startingPrincipal
    };
  }, [startingPrincipal, returnRate, periodsCount, withdrawalRate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Parameter Sliders */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#3b82f6" />
          <span>Pengaturan Target Compounding & Withdrawal</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Starting Principal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Modal Awal (Starting Capital):</span>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(startingPrincipal, currency)}
              </span>
            </div>
            <input
              type="range"
              min={500}
              max={100000}
              step={500}
              value={startingPrincipal}
              onChange={(e) => setStartingPrincipal(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>

          {/* Return Rate % per Period */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Target Profit per Bulan (%):</span>
              <span style={{ fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                +{returnRate}% / bln
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={25.0}
              step={0.5}
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          {/* Duration in Months */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Durasi Periode (Bulan):</span>
              <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {periodsCount} Bulan
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={36}
              step={1}
              value={periodsCount}
              onChange={(e) => setPeriodsCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>

          {/* Profit Withdrawal % */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Rencana Tarik Profit (% WD):</span>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {withdrawalRate}% WD
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={70}
              step={5}
              value={withdrawalRate}
              onChange={(e) => setWithdrawalRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), #090e1c)' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Saldo Akhir Portofolio</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {formatCurrency(tableData.finalBalance, currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '2px' }}>
            +{formatPercent(((tableData.finalBalance - startingPrincipal) / startingPrincipal) * 100)} Pertumbuhan
          </div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), #090e1c)' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Uang Masuk Bank</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {formatCurrency(tableData.totalWithdrawn, currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Total Cash Withdrawal
          </div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), #090e1c)' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Profit Tercipta</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {formatCurrency(tableData.totalProfit, currency)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Gross Profit Generated
          </div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), #090e1c)' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Multiple Factor</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
            {tableData.multiplier.toFixed(2)}x
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Lipat Ganda Modal Awal
          </div>
        </div>
      </div>

      {/* Period-by-Period Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              Roadmap Pertumbuhan Saldo Bulan per Bulan
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Simulasi compounding otomatis dengan target +{returnRate}% per bulan
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Bulan</th>
                <th style={{ padding: '10px 8px' }}>Saldo Awal</th>
                <th style={{ padding: '10px 8px', color: '#34d399' }}>Profit (+{returnRate}%)</th>
                <th style={{ padding: '10px 8px', color: '#f59e0b' }}>Tarik Tunai ({withdrawalRate}%)</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Saldo Akhir</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Akumulasi WD</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr key={row.period} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700, color: '#38bdf8' }}>
                    Bulan ke-{row.period}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {formatCurrency(row.startBalance, currency)}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                    +{formatCurrency(row.grossProfit, currency)}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: row.withdrawal > 0 ? '#fbbf24' : '#64748b' }}>
                    {row.withdrawal > 0 ? formatCurrency(row.withdrawal, currency) : '-'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc' }}>
                    {formatCurrency(row.endBalance, currency)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                    {formatCurrency(row.cumulativeWithdrawn, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
