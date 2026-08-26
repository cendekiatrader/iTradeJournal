import React from 'react';
import { useTheme, THEMES, ThemeId } from '../../context/ThemeContext';
import { X, Palette, Check, Sparkles } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: ThemeId) => {
    setTheme(themeId);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '560px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Palette size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                Institutional Accent Themes
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Pilih tema aksen warna visual mewah yang sesuai dengan selera Anda
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Theme Cards */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {THEMES.map((item) => {
              const isSelected = theme === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectTheme(item.id)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    backgroundColor: isSelected ? `${item.primaryColor}14` : '#070b16',
                    border: isSelected ? `2px solid ${item.primaryColor}` : '1px solid #1e293b',
                    boxShadow: isSelected ? `0 0 20px ${item.glowColor}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Swatch Bubble */}
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${item.primaryColor}, ${item.secondaryColor})`,
                      boxShadow: `0 4px 14px ${item.glowColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255,255,255,0.2)',
                      flexShrink: 0
                    }}>
                      <Sparkles size={20} color="#ffffff" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
                          {item.name}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: `${item.primaryColor}25`,
                          color: item.primaryColor,
                          border: `1px solid ${item.primaryColor}40`
                        }}>
                          {item.badge}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator */}
                  <div>
                    {isSelected ? (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: item.primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: `0 0 10px ${item.primaryColor}`
                      }}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid #334155'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
              Terapkan Tema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
