import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useJournal } from '../../context/JournalContext';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound, 
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'signin' 
}) => {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    resetPasswordEmail, 
    isConfigured 
  } = useAuth();
  const { showToast } = useJournal();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const resetState = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isConfigured) {
      setErrorMessage('Supabase URL & Anon Key belum terpasang di .env / Vercel.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password minimal harus 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Konfirmasi password tidak cocok.');
        return;
      }

      setLoading(true);
      const { error, user } = await signUpWithEmail(email, password, fullName);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Gagal mendaftar. Silakan coba lagi.');
      } else {
        setSuccessMessage('Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi (atau login langsung).');
        showToast('Pendaftaran akun berhasil! 🎉', 'success');
        setTimeout(() => {
          onClose();
          resetState();
        }, 2000);
      }
    } else if (mode === 'signin') {
      setLoading(true);
      const { error } = await signInWithEmail(email, password);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Email atau password salah.');
      } else {
        showToast('Berhasil login! Selamat datang kembali. 🚀', 'success');
        onClose();
        resetState();
      }
    } else if (mode === 'forgot') {
      if (!email) {
        setErrorMessage('Masukkan email Anda.');
        return;
      }

      setLoading(true);
      const { error } = await resetPasswordEmail(email);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Gagal mengirim email reset password.');
      } else {
        setSuccessMessage('Link reset password telah dikirim ke email Anda! Silakan periksa inbox/spam.');
        showToast('Email reset password berhasil dikirim! 📩', 'info');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Gagal login via Google.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px 28px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #0f172a, #0c101e)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)'
            }}>
              <TrendingUp size={20} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {mode === 'signin' && 'Sign in to access your cloud journal'}
                {mode === 'signup' && 'Create your free institutional trading journal'}
                {mode === 'forgot' && 'Reset your account password'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector (Sign In vs Sign Up) */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '4px',
            backgroundColor: '#070a16',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: mode === 'signin' ? '#1e293b' : 'transparent',
                color: mode === 'signin' ? '#60a5fa' : '#94a3b8',
                fontWeight: mode === 'signin' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('signup')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: mode === 'signup' ? '#1e293b' : 'transparent',
                color: mode === 'signup' ? '#60a5fa' : '#94a3b8',
                fontWeight: mode === 'signup' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Sign Up / Register
            </button>
          </div>
        )}

        {/* Modal Body / Form */}
        <div className="modal-body" style={{ padding: '24px 28px' }}>
          {/* Alerts */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name for Sign Up */}
            {mode === 'signup' && (
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Full Name / Trader Handle</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="e.g. Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-control"
                    style={{ width: '100%', paddingLeft: '38px' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-control"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            {/* Password Field (for sign in and sign up) */}
            {mode !== 'forgot' && (
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Lupa Password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-control"
                    style={{ width: '100%', paddingLeft: '38px', paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (for Sign Up) */}
            {mode === 'signup' && (
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-control"
                    style={{ width: '100%', paddingLeft: '38px' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginTop: '6px'
              }}
            >
              {loading ? (
                <span>Memproses...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Buat Akun Gratis</span>
                  <Sparkles size={16} />
                </>
              ) : (
                <>
                  <span>Kirim Link Reset Password</span>
                  <Mail size={16} />
                </>
              )}
            </button>
          </form>

          {/* Back to Sign In Link for Forgot Password */}
          {mode === 'forgot' && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                ← Kembali ke Halaman Login
              </button>
            </div>
          )}

          {/* Divider */}
          {mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Atau</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
              </div>

              {/* Google 1-Click Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  backgroundColor: '#070c18',
                  borderColor: '#24344d',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: '#080c18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '0.72rem'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Institutional 256-Bit Encrypted Database</span>
        </div>
      </div>
    </div>
  );
};
