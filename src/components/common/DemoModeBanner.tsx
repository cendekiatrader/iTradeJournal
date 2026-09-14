import React from 'react';
import { FlaskConical, UserPlus, LogOut } from 'lucide-react';

interface DemoModeBannerProps {
  onSignUp: () => void;
  onExit: () => void;
}

/** Slim top bar shown while exploring the app in no-login demo mode. */
export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onSignUp, onExit }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      flexWrap: 'wrap',
      padding: '8px 16px',
      fontSize: '0.78rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
      backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 12%, var(--bg-surface))',
      borderBottom: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 32%, transparent)'
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
      <FlaskConical size={14} color="var(--theme-secondary)" />
      Demo Mode — you are exploring with sample data. Nothing is saved to the cloud.
    </span>
    <span style={{ display: 'inline-flex', gap: '8px' }}>
      <button
        type="button"
        onClick={onSignUp}
        className="btn btn-primary btn-sm"
        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
      >
        <UserPlus size={12} /> Sign Up Free
      </button>
      <button
        type="button"
        onClick={onExit}
        className="btn btn-secondary btn-sm"
        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
      >
        <LogOut size={12} /> Exit Demo
      </button>
    </span>
  </div>
);
