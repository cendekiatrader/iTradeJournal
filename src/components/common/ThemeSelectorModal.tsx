import React from 'react';
import { useTheme, THEMES, ThemeId } from '../../context/ThemeContext';
import { X, Sun, Moon, Check } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Neumorphic theme picker — exactly two modes: Dark & Light.
 * Every option card shares the page background colour and is separated only by
 * dual shadows (outset = unselected, inset = selected).
 */
export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleSelect = (themeId: ThemeId) => {
    setTheme(themeId);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef}
        className="modal-container" role="dialog" aria-modal="true" aria-label="Mode Terang / Gelap" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="neo-outset" style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'var(--bg-main)',
              color: 'var(--theme-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {theme === 'light' ? <Sun size={19} /> : <Moon size={19} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Mode Tampilan
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Dua mode saja: Dark &amp; Light. Semua permukaan satu warna, kedalaman dari bayangan.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Body: two mode cards */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {THEMES.map((item) => {
              const isSelected = theme === item.id;
              const Icon = item.id === 'light' ? Sun : Moon;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(item.id)}
                  className={isSelected ? 'neo-inset' : 'neo-outset'}
                  style={{
                    padding: '18px 16px',
                    borderRadius: '18px',
                    backgroundColor: 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease'
                  }}
                >
                  <span style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'var(--bg-main)',
                    boxShadow: isSelected
                      ? 'inset 3px 3px 6px var(--neo-dark), inset -3px -3px 6px var(--neo-light)'
                      : 'inset -3px -3px 6px var(--neo-dark), inset 3px 3px 6px var(--neo-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--theme-primary)'
                  }}>
                    <Icon size={22} />
                  </span>

                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
                    {item.subtitle}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    padding: '3px 9px',
                    borderRadius: '20px',
                    color: isSelected ? 'var(--theme-primary)' : 'var(--text-muted)'
                  }}>
                    {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                    {isSelected ? 'AKTIF' : item.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
