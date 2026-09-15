import React, { useState, useEffect, useRef } from 'react';
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
import { useModalA11y } from '../../hooks/useModalA11y';

export type AuthMode = 'signin' | 'signup' | 'forgot';

// Cloudflare Turnstile SITE key is PUBLIC — safe to embed in the repo.
// VITE_TURNSTILE_SITE_KEY (if set) overrides it.
const TURNSTILE_SITE_KEY = '0x4AAAAAAE01cY6ALTmihFFM';

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
    signInWithDiscord,
    resetPasswordEmail, 
    isConfigured 
  } = useAuth();
  const { showToast } = useJournal();
  const turnstileSiteKey = ((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY as string) || TURNSTILE_SITE_KEY;
  const turnstileBoxRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const modalRef = useModalA11y(isOpen, onClose);

  // Load the Cloudflare Turnstile script once (anti-bot on sign up / sign in)
  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (document.getElementById('cf-turnstile-script')) return;
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [turnstileSiteKey]);

  // Explicitly render the Turnstile widget when the modal opens. More reliable
  // than implicit rendering, and the error callback logs widget failures
  // (e.g. hostname not allowed) for diagnostics.
  useEffect(() => {
    if (!isOpen || !turnstileSiteKey) return;
    let interval: number | undefined;

    const tryRender = (): boolean => {
      if (turnstileWidgetRef.current != null) return true;
      const ts = (window as any).turnstile;
      if (!ts || !turnstileBoxRef.current) return false;
      try {
        turnstileWidgetRef.current = ts.render(turnstileBoxRef.current, {
          sitekey: turnstileSiteKey,
          theme: 'dark',
          'error-callback': (code: unknown) => {
            console.warn('[turnstile] widget error code:', code);
          }
        });
      } catch (err) {
        console.warn('[turnstile] render failed:', err);
      }
      return true;
    };

    if (!tryRender()) {
      interval = window.setInterval(() => {
        if (tryRender() && interval !== undefined) {
          window.clearInterval(interval);
          interval = undefined;
        }
      }, 400);
    }

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      const ts = (window as any).turnstile;
      if (ts && turnstileWidgetRef.current != null) {
        try {
          ts.remove(turnstileWidgetRef.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetRef.current = null;
      }
    };
  }, [isOpen, turnstileSiteKey]);

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
    // Turnstile can THROW when the script loaded but no widget was rendered
    // (blocked network / misconfigured widget). Never let that kill the submit
    // handler — captcha tokens are optional for the request to proceed.
    let captchaToken: string | undefined;
    try {
      const ts = (window as any).turnstile;
      const widgetId = turnstileWidgetRef.current;
      captchaToken = (widgetId != null ? ts?.getResponse?.(widgetId) : ts?.getResponse?.()) || undefined;
    } catch {
      captchaToken = undefined;
    }

    if (!isConfigured) {
      setErrorMessage('Supabase URL & Anon Key are not configured in .env / Vercel.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      const { error, user } = await signUpWithEmail(email, password, fullName, captchaToken);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Sign up failed. Please try again.');
      } else {
        setSuccessMessage('Sign up successful! Check your email to confirm (or sign in directly).');
        showToast('Account created successfully! 🎉', 'success');
        setTimeout(() => {
          onClose();
          resetState();
        }, 2000);
      }
    } else if (mode === 'signin') {
      setLoading(true);
      const { error } = await signInWithEmail(email, password, captchaToken);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else {
        showToast('Berhasil login! Selamat datang kembali. 🚀', 'success');
        onClose();
        resetState();
      }
    } else if (mode === 'forgot') {
      if (!email) {
        setErrorMessage('Enter your email.');
        return;
      }

      setLoading(true);
      const { error } = await resetPasswordEmail(email);
      setLoading(false);

      if (error) {
        setErrorMessage(error.message || 'Gagal mengirim email reset password.');
      } else {
        setSuccessMessage('Password reset link sent! Check your inbox/spam folder.');
        showToast('Email reset password berhasil dikirim! 📩', 'info');
      }
    }
  };

  const handleDiscordLogin = async () => {
    setLoading(true);
    const { error } = await signInWithDiscord();
    setLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Gagal login via Discord.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} 
        className="modal-container" role="dialog" aria-modal="true" aria-label="Account Authentication" tabIndex={-1} 
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
          background: 'linear-gradient(180deg, #0f172a, var(--bg-card))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary-strong))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)'
            }}>
              <TrendingUp size={20} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {mode === 'signin' && 'Sign in to access your cloud journal'}
                {mode === 'signup' && 'Create your free trading journal'}
                {mode === 'forgot' && 'Reset your account password'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--text-secondary)' }} aria-label="Close dialog">
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
                backgroundColor: mode === 'signin' ? 'var(--bg-chip)' : 'transparent',
                color: mode === 'signin' ? 'var(--theme-secondary)' : 'var(--text-secondary)',
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
                backgroundColor: mode === 'signup' ? 'var(--bg-chip)' : 'transparent',
                color: mode === 'signup' ? 'var(--theme-secondary)' : 'var(--text-secondary)',
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
                  <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                        color: 'var(--theme-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                      color: 'var(--text-muted)',
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
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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

            {/* Cloudflare Turnstile (anti-bot) — explicitly rendered on modal open */}
            {turnstileSiteKey && (
              <div
                ref={turnstileBoxRef}
                style={{
                  display: mode === 'forgot' ? 'none' : 'flex',
                  justifyContent: 'center',
                  minHeight: '1px'
                }}
              />
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
                  <span>Create Free Account</span>
                  <Sparkles size={16} />
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
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
                  color: 'var(--text-secondary)',
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
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--bg-chip)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Atau</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--bg-chip)' }} />
              </div>

              {/* Discord 1-Click Login Button */}
              <button
                type="button"
                onClick={handleDiscordLogin}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(88, 101, 242, 0.12)',
                  borderColor: 'rgba(88, 101, 242, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Continue with Discord</span>
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-sidebar)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '0.72rem'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>256-Bit Encrypted Database</span>
        </div>
      </div>
    </div>
  );
};
