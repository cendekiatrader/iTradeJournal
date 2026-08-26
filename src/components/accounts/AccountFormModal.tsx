import React, { useState, useEffect } from 'react';
import { useJournal } from '../../context/JournalContext';
import { TradingAccount, AccountType, Currency, AccountStatus } from '../../types';
import { X, Plus, Wallet, ShieldAlert, Target, Palette } from 'lucide-react';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccount?: TradingAccount | null;
}

const COLOR_TAGS = [
  '#3b82f6', // Electric Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#e11d48'  // Rose
];

const ACCOUNT_TYPES: AccountType[] = [
  'Evaluation/Challenge',
  'Funded Account',
  'Live Personal',
  'Prop Firm',
  'Demo'
];

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'IDR', 'JPY', 'AUD'];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  initialAccount
}) => {
  const { addAccount, updateAccount } = useJournal();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Evaluation/Challenge');
  const [broker, setBroker] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [initialBalance, setInitialBalance] = useState<number>(100000);
  const [targetProfit, setTargetProfit] = useState<number | undefined>(10000);
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState<number | undefined>(10);
  const [dailyDrawdownPercent, setDailyDrawdownPercent] = useState<number | undefined>(5);
  const [status, setStatus] = useState<AccountStatus>('Active');
  const [colorTag, setColorTag] = useState<string>('#3b82f6');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialAccount) {
      setName(initialAccount.name);
      setType(initialAccount.type);
      setBroker(initialAccount.broker);
      setCurrency(initialAccount.currency);
      setInitialBalance(initialAccount.initialBalance);
      setTargetProfit(initialAccount.targetProfit);
      setMaxDrawdownPercent(initialAccount.maxDrawdownPercent);
      setDailyDrawdownPercent(initialAccount.dailyDrawdownPercent);
      setStatus(initialAccount.status);
      setColorTag(initialAccount.colorTag);
      setNotes(initialAccount.notes || '');
    } else {
      setName('');
      setType('Evaluation/Challenge');
      setBroker('FTMO');
      setCurrency('USD');
      setInitialBalance(100000);
      setTargetProfit(10000);
      setMaxDrawdownPercent(10);
      setDailyDrawdownPercent(5);
      setStatus('Active');
      setColorTag('#3b82f6');
      setNotes('');
    }
  }, [initialAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const accountData = {
      name: name.trim(),
      type,
      broker: broker.trim() || 'Broker',
      currency,
      initialBalance: Number(initialBalance),
      currentBalance: Number(initialBalance),
      targetProfit: targetProfit ? Number(targetProfit) : undefined,
      maxDrawdownPercent: maxDrawdownPercent ? Number(maxDrawdownPercent) : undefined,
      dailyDrawdownPercent: dailyDrawdownPercent ? Number(dailyDrawdownPercent) : undefined,
      status,
      colorTag,
      notes: notes.trim()
    };

    if (initialAccount) {
      updateAccount(initialAccount.id, accountData);
    } else {
      addAccount(accountData);
    }

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              {initialAccount ? 'Edit Trading Account' : 'Add New Trading Account'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Configure broker, starting equity, and prop firm limits
            </span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Account Name & Color Tag */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Account Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FTMO $100K Phase 1"
                className="input-control"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Color Tag</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                {COLOR_TAGS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColorTag(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: colorTag === c ? '2px solid #ffffff' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Type & Broker & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Account Category *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="input-control"
              >
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Broker / Prop Firm</label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder="e.g. FTMO, Apex, Binance"
                className="input-control"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="input-control"
              >
                {CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
              </select>
            </div>
          </div>

          {/* Initial Balance */}
          <div className="input-group">
            <label className="input-label">Starting Initial Balance *</label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              className="input-control font-mono"
              placeholder="100000"
              required
            />
          </div>

          {/* Prop Firm Limits Section */}
          <div style={{ backgroundColor: '#060913', padding: '14px', borderRadius: '10px', border: '1px solid #1c273a', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={14} /> Optional: Prop Challenge & Risk Targets
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Profit Target ($)</label>
                <input
                  type="number"
                  value={targetProfit || ''}
                  onChange={(e) => setTargetProfit(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="10000"
                  className="input-control font-mono"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Max Drawdown (%)</label>
                <input
                  type="number"
                  value={maxDrawdownPercent || ''}
                  onChange={(e) => setMaxDrawdownPercent(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="10"
                  className="input-control font-mono"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Daily Loss Limit (%)</label>
                <input
                  type="number"
                  value={dailyDrawdownPercent || ''}
                  onChange={(e) => setDailyDrawdownPercent(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="5"
                  className="input-control font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Account Notes / Rules</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Risk max 1% per trade, no holding over major CPI news."
              className="input-control"
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
