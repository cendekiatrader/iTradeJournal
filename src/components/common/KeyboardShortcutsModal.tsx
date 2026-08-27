import React from 'react';
import { X, Command, Keyboard, Zap, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'General';
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'N', description: 'Buka form Log New Trade (Catat Posisi Baru)', category: 'Actions' },
  { key: 'Ctrl + V', description: 'Paste screenshot chart langsung ke modal OCR', category: 'Actions' },
  { key: 'Ctrl + Enter', description: 'Simpan / Submit form trade langsung', category: 'Actions' },
  { key: 'Esc', description: 'Tutup modal / popup / fullscreen', category: 'General' },
  { key: '?', description: 'Buka panduan Keyboard Shortcuts ini', category: 'General' },
  { key: 'D', description: 'Pindah ke tab Performance Dashboard', category: 'Navigation' },
  { key: 'J', description: 'Pindah ke tab Trade Log (Journal)', category: 'Navigation' },
  { key: 'P', description: 'Pindah ke tab Playbook (A+ SOP)', category: 'Navigation' },
  { key: 'A', description: 'Pindah ke tab Analytics & Setups', category: 'Navigation' },
  { key: 'E', description: 'Pindah ke tab Economic Calendar & News', category: 'Navigation' },
  { key: 'C', description: 'Pindah ke tab Position Size & Calculator', category: 'Navigation' },
  { key: 'M', description: 'Pindah ke tab Account Manager', category: 'Navigation' }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = ['Actions', 'Navigation', 'General'] as const;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '540px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Keyboard size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Pro Trader Keyboard Shortcuts
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Navigasi kilat dan pencatatan trade super cepat tanpa klik mouse
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {categories.map((cat) => {
              const items = SHORTCUTS.filter(s => s.category === cat);
              return (
                <div key={cat}>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px'
                  }}>
                    {cat} Shortcuts
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    backgroundColor: '#070b16',
                    borderRadius: '10px',
                    border: '1px solid #1e293b',
                    padding: '8px 12px'
                  }}>
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: idx === items.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                          {item.description}
                        </span>

                        <kbd style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          boxShadow: '0 2px 0 #0f172a',
                          color: '#38bdf8',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
              Tutup (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
