import React, { useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { AccountType, Currency } from '../../types';
import { Sparkles, Wallet, ArrowRight, Eye } from 'lucide-react';

interface OnboardingAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingAccountModal: React.FC<OnboardingAccountModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addAccount, setActiveAccountId } = useJournal();

  const [name, setName] = useState('Main Account');
  const [broker, setBroker] = useState('Exness / MetaTrader');
  const [type, setType] = useState<AccountType>('Live Personal');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [initialBalance, setInitialBalance] = useState<number>(10000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccount({
      name: name.trim() || 'Main Trading Account',
      type,
      broker: broker.trim() || 'Broker',
      currency,
      initialBalance: Number(initialBalance) || 10000,
      currentBalance: Number(initialBalance) || 10000,
      status: 'Active',
      colorTag: '#3b82f6',
      notes: 'Initial trading account'
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '28px', borderRadius: '18px', border: '1px solid #25334d', backgroundColor: '#0b1222' }}>
        
        {/* Header with Icon */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa',
            marginBottom: '12px'
          }}>
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Selamat Datang di iTradeJournal!
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Mari siapkan Akun Trading Utama Anda untuk mulai mencatat riwayat trade, mengukur winrate, dan melacak pertumbuhan modal.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Account Name */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.78rem' }}>Nama Akun Trading</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Akun Utama Personal / FTMO Challenge"
                className="input-control"
                required
              />
            </div>

            {/* Broker & Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Broker / Prop Firm</label>
                <input
                  type="text"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  placeholder="Exness, FTMO, dll"
                  className="input-control"
                  required
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Tipe Akun</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="input-control"
                >
                  <option value="Live Personal">Live Personal</option>
                  <option value="Prop Firm">Prop Firm</option>
                  <option value="Evaluation/Challenge">Evaluation / Challenge</option>
                  <option value="Funded Account">Funded Account</option>
                  <option value="Demo">Demo</option>
                </select>
              </div>
            </div>

            {/* Balance & Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Saldo Awal (Initial Balance)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={initialBalance || ''}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  placeholder="10000"
                  className="input-control font-mono"
                  required
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Mata Uang</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="input-control"
                >
                  <option value="USD">USD ($)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px'
              }}
            >
              <Wallet size={16} /> Buat Akun & Mulai Mencatat <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{
                width: '100%',
                fontSize: '0.8rem',
                color: '#94a3b8',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Eye size={14} /> Lewati & Lihat Fitur Dahulu (Explore)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
