import React, { useState, useEffect } from 'react';
import { useJournal } from '../../context/JournalContext';
import { TradingAccount, WithdrawalRecord } from '../../types';
import { formatCurrency, formatDate, formatDateTimeDDMMYYYY } from '../../utils/formatters';
import { 
  X, 
  DollarSign, 
  ArrowDownCircle, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Wallet,
  AlertCircle
} from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: TradingAccount | null;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  account
}) => {
  const { withdrawals, addWithdrawal, deleteWithdrawal, showToast } = useJournal();

  const [amount, setAmount] = useState<number>(1000);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (account) {
      const netProfit = Math.max(0, account.currentBalance - account.initialBalance);
      setAmount(netProfit > 0 ? Math.min(netProfit, 2000) : 500);
      setNotes(`${account.name} Payout`);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const accountWithdrawals = withdrawals.filter(w => w.accountId === account.id);
  const totalAccountWithdrawn = accountWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const maxAvailable = account.currentBalance;
  const netProfit = account.currentBalance - account.initialBalance;

  const handleQuickPercent = (pct: number) => {
    if (netProfit > 0) {
      setAmount(Math.round((netProfit * pct) / 100));
    } else {
      setAmount(Math.round((maxAvailable * pct) / 100));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      showToast('Please enter a valid withdrawal amount', 'error');
      return;
    }

    if (amount > maxAvailable) {
      showToast(`Amount exceeds available account balance (${formatCurrency(maxAvailable, account.currency)})`, 'error');
      return;
    }

    addWithdrawal({
      accountId: account.id,
      amount: Number(amount),
      date,
      notes: notes.trim() || `${account.name} Payout`,
      status: 'Completed'
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), #0c101e)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <ArrowDownCircle size={20} color="var(--profit-green)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                Account Withdrawal / Payout
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {account.name} ({account.broker})
              </span>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Account Balance Banner */}
          <div style={{ backgroundColor: '#060913', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1c273a', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Available Account Balance</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {formatCurrency(account.currentBalance, account.currency)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Withdrawn So Far</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                {formatCurrency(totalAccountWithdrawn, account.currency)}
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>Withdrawal Amount ({account.currency}) *</label>
              {netProfit > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--profit-green)', fontWeight: 600 }}>
                  Net Profit: +{formatCurrency(netProfit, account.currency)}
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="input-control font-mono"
              style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--profit-green)' }}
              required
            />
          </div>

          {/* Quick Percentage Chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600 }}
              >
                {pct === 100 ? '100% Profit' : `${pct}%`}
              </button>
            ))}
          </div>

          {/* Date & Time */}
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" style={{ margin: 0 }}>Payout Date (DD/MM/YYYY, hh:mm) *</label>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                {formatDateTimeDDMMYYYY(date)}
              </span>
            </div>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-control font-mono"
              required
            />
          </div>

          {/* Notes / Method */}
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label className="input-label">Payout Reference / Destination Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. FTMO Bi-Weekly Split 80%, Bank Wire, Binance to Cold Wallet"
              className="input-control"
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '11px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '20px' }}>
            <ArrowDownCircle size={18} /> Confirm & Log Withdrawal
          </button>

          {/* Withdrawal History Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account Withdrawal History ({accountWithdrawals.length})
              </span>
            </div>

            {accountWithdrawals.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#070a16', borderRadius: '8px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No past withdrawals recorded for this account.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                {accountWithdrawals.map((wd) => (
                  <div
                    key={wd.id}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#070a16',
                      border: '1px solid #192538',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--profit-green)' }}>
                        -{formatCurrency(wd.amount, account.currency)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatDateTimeDDMMYYYY(wd.date)} • {wd.notes}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete withdrawal record of ${formatCurrency(wd.amount, account.currency)}?`)) {
                          deleteWithdrawal(wd.id);
                        }
                      }}
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: '#ef4444' }}
                      title="Delete Withdrawal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
