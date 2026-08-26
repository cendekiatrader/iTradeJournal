import React, { useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { TradingAccount } from '../../types';
import { 
  WalletCards, 
  Plus, 
  Check, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Award,
  Layers,
  ArrowRight,
  ArrowDownCircle,
  DollarSign
} from 'lucide-react';
import { WithdrawModal } from './WithdrawModal';

interface AccountsViewProps {
  onOpenAccountModal: () => void;
  onEditAccount: (account: TradingAccount) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onOpenAccountModal,
  onEditAccount
}) => {
  const { 
    accounts, 
    activeAccountId, 
    setActiveAccountId, 
    deleteAccount, 
    trades,
    withdrawals 
  } = useJournal();

  const [withdrawAccount, setWithdrawAccount] = useState<TradingAccount | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const totalPortfolioEquity = accounts.reduce((acc, a) => acc + a.currentBalance, 0);
  const totalPortfolioInitial = accounts.reduce((acc, a) => acc + a.initialBalance, 0);
  const totalPortfolioWithdrawn = withdrawals.reduce((acc, w) => acc + w.amount, 0);
  const totalPortfolioProfit = totalPortfolioEquity + totalPortfolioWithdrawn - totalPortfolioInitial;
  const totalPortfolioProfitPct = totalPortfolioInitial > 0 ? (totalPortfolioProfit / totalPortfolioInitial) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WalletCards size={24} color="#3b82f6" />
            <span>Multi-Account Portfolio Manager</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage multiple prop firm challenges, personal brokers, and funded accounts
          </p>
        </div>

        <button onClick={onOpenAccountModal} className="btn btn-primary">
          <Plus size={16} strokeWidth={2.5} /> Add New Account
        </button>
      </div>

      {/* Portfolio Aggregated Summary Card */}
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0f172a, #060913)', borderColor: '#23334d' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Combined Portfolio Total Equity
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc', marginTop: '4px' }}>
              {formatCurrency(totalPortfolioEquity, 'USD')}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                color: totalPortfolioProfit >= 0 ? 'var(--profit-green)' : 'var(--loss-red)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                {totalPortfolioProfit >= 0 ? '+' : ''}{formatCurrency(totalPortfolioProfit, 'USD')} ({formatPercent(totalPortfolioProfitPct)})
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                from {formatCurrency(totalPortfolioInitial, 'USD')} initial
              </span>
              {totalPortfolioWithdrawn > 0 && (
                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--profit-green)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  💰 Total Paid Out: {formatCurrency(totalPortfolioWithdrawn, 'USD')}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setActiveAccountId('all')}
              className={`btn ${activeAccountId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '10px 18px' }}
            >
              <Layers size={16} />
              {activeAccountId === 'all' ? 'Currently Viewing All Accounts' : 'View Combined Portfolio'}
            </button>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {accounts.map((acc) => {
          const accTrades = trades.filter(t => t.accountId === acc.id);
          const closedTrades = accTrades.filter(t => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN');
          const wins = closedTrades.filter(t => t.status === 'WIN').length;
          const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
          const accWithdrawals = withdrawals.filter(w => w.accountId === acc.id);
          const accTotalWithdrawn = accWithdrawals.reduce((sum, w) => sum + w.amount, 0);
          const netPnL = acc.currentBalance + accTotalWithdrawn - acc.initialBalance;
          const pnlPct = (netPnL / acc.initialBalance) * 100;
          const isActive = activeAccountId === acc.id;

          return (
            <div
              key={acc.id}
              className="card"
              style={{
                borderColor: isActive ? '#3b82f6' : 'var(--border-color)',
                boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.2)' : 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Card Top: Color, Title, Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: acc.colorTag,
                      boxShadow: `0 0 10px ${acc.colorTag}`
                    }} />
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                        {acc.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {acc.broker} • {acc.currency}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className="badge" style={{ backgroundColor: '#131e33', color: '#93c5fd', fontSize: '0.7rem' }}>
                      {acc.type}
                    </span>
                    {accTotalWithdrawn > 0 && (
                      <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--profit-green)', fontSize: '0.68rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        Paid: {formatCurrency(accTotalWithdrawn, acc.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance & Profit */}
                <div style={{ backgroundColor: '#060913', padding: '14px', borderRadius: '10px', border: '1px solid #1a2538', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Current Balance</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        {formatCurrency(acc.currentBalance, acc.currency)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Net Profit</span>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: netPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)'
                      }}>
                        {netPnL >= 0 ? '+' : ''}{formatCurrency(netPnL, acc.currency)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: netPnL >= 0 ? 'var(--profit-green)' : 'var(--loss-red)', fontWeight: 600 }}>
                        {formatPercent(pnlPct)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Stats Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', backgroundColor: '#070a16', borderRadius: '8px', border: '1px solid #141e2e' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Trades</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                      {accTrades.length}
                    </div>
                  </div>

                  <div style={{ padding: '8px', backgroundColor: '#070a16', borderRadius: '8px', border: '1px solid #141e2e' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Win Rate</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: winRate >= 50 ? 'var(--profit-green)' : '#94a3b8' }}>
                      {winRate.toFixed(0)}%
                    </div>
                  </div>

                  <div style={{ padding: '8px', backgroundColor: '#070a16', borderRadius: '8px', border: '1px solid #141e2e' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Initial</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                      {formatCurrency(acc.initialBalance, acc.currency, true)}
                    </div>
                  </div>
                </div>

                {/* Notes if any */}
                {acc.notes && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                    {acc.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveAccountId(acc.id)}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, minWidth: '110px' }}
                >
                  {isActive ? <Check size={14} /> : <ArrowRight size={14} />}
                  {isActive ? 'Active' : 'Select'}
                </button>

                <button
                  onClick={() => {
                    setWithdrawAccount(acc);
                    setIsWithdrawOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    color: 'var(--profit-green)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)'
                  }}
                  title="Withdraw / Log Payout"
                >
                  <ArrowDownCircle size={14} color="var(--profit-green)" />
                  Withdraw
                </button>

                <button
                  onClick={() => onEditAccount(acc)}
                  className="btn btn-secondary btn-icon btn-sm"
                  title="Edit Account"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Delete account "${acc.name}" and all its logged trades?`)) {
                      deleteAccount(acc.id);
                    }
                  }}
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: '#ef4444' }}
                  title="Delete Account"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          setWithdrawAccount(null);
        }}
        account={withdrawAccount}
      />
    </div>
  );
};
