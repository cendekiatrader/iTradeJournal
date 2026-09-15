import React from 'react';
import { ShieldOff, LogOut } from 'lucide-react';

interface SuspendedScreenProps {
  email?: string | null;
  onSignOut: () => void;
}

/** Full-screen notice shown to users suspended from the admin console. */
export const SuspendedScreen: React.FC<SuspendedScreenProps> = ({ email, onSignOut }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-main)'
    }}
  >
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        padding: '30px 26px'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          margin: '0 auto 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--loss-red) 14%, transparent)',
          color: 'var(--loss-red)'
        }}
      >
        <ShieldOff size={21} />
      </div>
      <h1 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>Account suspended</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '6px' }}>
        This account has been suspended by an administrator. If you believe this is a mistake, contact the site owner.
      </p>
      {email && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '18px' }}>
          {email}
        </p>
      )}
      <button className="btn btn-secondary btn-sm" onClick={onSignOut} style={{ marginTop: '10px' }}>
        <LogOut size={13} /> Sign out
      </button>
    </div>
  </div>
);
