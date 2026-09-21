import React from 'react';
import { X, Command, Keyboard, Zap, Sparkles } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

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
  { key: 'Ctrl + K', description: 'Open the command palette (pages, trades, actions)', category: 'General' },
  { key: 'N', description: 'Log a new trade', category: 'Actions' },
  { key: 'Ctrl + Enter', description: 'Submit the active form instantly', category: 'Actions' },
  { key: 'J / K', description: 'Move between rows in the Trade Log table', category: 'Actions' },
  { key: 'Enter', description: 'Open the focused trade row', category: 'Actions' },
  { key: 'X', description: 'Select / deselect the focused trade row', category: 'Actions' },
  { key: 'Esc', description: 'Close modal / popup / command palette', category: 'General' },
  { key: '?', description: 'Open this keyboard shortcuts guide', category: 'General' },
  { key: 'D', description: 'Go to the Performance Dashboard', category: 'Navigation' },
  { key: 'W', description: 'Go to the Multi-Screen Workspace', category: 'Navigation' },
  { key: 'J', description: 'Go to the Trade Log (Journal)', category: 'Navigation' },
  { key: 'P', description: 'Go to the Playbook', category: 'Navigation' },
  { key: 'Q', description: 'Go to the Setup Queue', category: 'Navigation' },
  { key: 'A', description: 'Go to Analytics & Setups', category: 'Navigation' },
  { key: 'E', description: 'Go to the Economic Calendar & News', category: 'Navigation' },
  { key: 'C', description: 'Go to the Position Size Calculator', category: 'Navigation' },
  { key: 'M', description: 'Go to the Account Manager', category: 'Navigation' },
  { key: 'S', description: 'Go to Settings (profile, appearance, modules, data)', category: 'Navigation' }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const categories = ['Actions', 'Navigation', 'General'] as const;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} 
        className="modal-container" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts" tabIndex={-1} 
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
              background: 'linear-gradient(135deg, var(--theme-secondary-strong), #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Keyboard size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Pro Trader Keyboard Shortcuts
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Jump between pages and log trades without touching the mouse. Shortcuts only work for modules that are currently shown in the navigation.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close dialog">
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
                    border: '1px solid var(--bg-chip)',
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
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-strong)' }}>
                          {item.description}
                        </span>

                        <kbd style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-chip)',
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
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
