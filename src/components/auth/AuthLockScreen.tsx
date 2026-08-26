import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, 
  KeyRound, 
  Sparkles, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  TrendingUp,
  BarChart3,
  Flame
} from 'lucide-react';

interface AuthLockScreenProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ onOpenAuth }) => {
  const { signInWithDiscord, loading } = useAuth();

  if (loading) return null;

  const handleDiscordClick = async () => {
    await signInWithDiscord();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 8, 16, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '20px',
        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0b1120',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(59, 130, 246, 0.12)',
          padding: '36px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Top Glow */}
        <div 
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '100px',
            background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.35) 0%, rgba(16, 185, 129, 0.1) 60%, transparent 80%)',
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }}
        />

        {/* Animated Lock Icon with Pulsing Rings */}
        <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
          {/* Outer Pulsing Glow Ring */}
          <div 
            style={{
              position: 'absolute',
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              animation: 'pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          {/* Inner Glowing Badge */}
          <div 
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              boxShadow: '0 0 25px rgba(59, 130, 246, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'floatLock 3.2s ease-in-out infinite'
            }}
          >
            <Lock size={30} color="#60a5fa" strokeWidth={2.2} />
          </div>
        </div>

        {/* App Title Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.74rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '14px'
        }}>
          <span>🔒 Akses Terkunci</span>
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color: '#f8fafc',
          marginBottom: '10px',
          letterSpacing: '-0.02em',
          lineHeight: 1.3
        }}>
          Silakan Login Terlebih Dahulu
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: '0.84rem',
          color: '#94a3b8',
          lineHeight: 1.55,
          marginBottom: '26px',
          padding: '0 8px'
        }}>
          Masuk ke akun Anda untuk mengakses <strong>Trading Journal</strong>, analitik performa multi-akun, dan kalkulator risiko secara aman.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Sign In Primary */}
          <button
            onClick={() => onOpenAuth('signin')}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '13px 20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
            }}
          >
            <LogIn size={17} strokeWidth={2.5} />
            <span>Sign In ke Akun Anda</span>
          </button>

          {/* Discord 1-Click Fast Auth */}
          <button
            onClick={handleDiscordClick}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: 'rgba(88, 101, 242, 0.16)',
              borderColor: 'rgba(88, 101, 242, 0.45)',
              color: '#ffffff'
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Masuk Cepat via Discord</span>
          </button>

          {/* Register Secondary */}
          <button
            onClick={() => onOpenAuth('signup')}
            className="btn btn-ghost"
            style={{
              width: '100%',
              padding: '11px 20px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#94a3b8'
            }}
          >
            <UserPlus size={15} />
            <span>Belum punya akun? Daftar Gratis</span>
          </button>
        </div>

        {/* Security Footer Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Cloud Encrypted Multi-Tenant Journal</span>
        </div>
      </div>
    </div>
  );
};
