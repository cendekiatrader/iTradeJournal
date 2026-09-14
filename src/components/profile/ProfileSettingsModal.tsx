import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useJournal } from '../../context/JournalContext';
import { fetchUserProfile, saveUserProfile } from '../../utils/supabase';
import { UserProfile, CustomFieldDef } from '../../types';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  ShieldCheck, 
  User, 
  AtSign, 
  Eye, 
  EyeOff, 
  Sparkles,
  TrendingUp,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast, customFieldDefs, setCustomFieldDefs } = useJournal();

  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    username: user?.email?.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') || 'trader',
    displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader',
    bio: 'Multi-Asset Trader specializing in SMC & Price Action Analysis.',
    avatarUrl: '',
    twitterHandle: '',
    discordHandle: '',
    isPublic: true,
    hideDollarAmounts: true,
    showEquityCurve: true,
    showTradesHistory: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFieldDefs(customFieldDefs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addFieldDef = () =>
    setFieldDefs((prev) => [...prev, { id: `cf-${Date.now()}`, label: '', type: 'text' }]);

  const updateFieldDef = (idx: number, updates: Partial<CustomFieldDef>) =>
    setFieldDefs((prev) => prev.map((d, i) => (i === idx ? { ...d, ...updates } : d)));

  const removeFieldDef = (idx: number) => setFieldDefs((prev) => prev.filter((_, i) => i !== idx));

  const saveFieldDefs = () => {
    const cleaned = fieldDefs.filter((d) => d.label.trim()).map((d) => ({ ...d, label: d.label.trim() }));
    setCustomFieldDefs(cleaned);
    showToast('Custom trade fields saved.', 'success');
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      fetchUserProfile(user.id)
        .then((existingProfile) => {
          if (existingProfile) {
            setProfile(existingProfile);
          } else {
            // Default initial profile
            setProfile(prev => ({
              ...prev,
              id: user.id,
              username: user.email?.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') || 'trader',
              displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trader'
            }));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, user]);

  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen || !user) return null;

  const publicUrl = `${window.location.origin}/#/u/${profile.username.toLowerCase().trim()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast('Link profil publik berhasil disalin ke clipboard! 📋', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.username.trim()) {
      showToast('Username tidak boleh kosong.', 'error');
      return;
    }

    setSaving(true);
    const success = await saveUserProfile({
      ...profile,
      id: user.id,
      username: profile.username.toLowerCase().trim()
    });
    setSaving(false);

    if (success) {
      showToast('Pengaturan profil publik berhasil disimpan! 🚀', 'success');
      onClose();
    } else {
      showToast('Gagal menyimpan profil. Pastikan username belum dipakai.', 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} 
        className="modal-container" role="dialog" aria-modal="true" aria-label="Profile Settings" tabIndex={-1} 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(180deg, #0f172a, var(--bg-card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--theme-secondary-strong), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px color-mix(in srgb, var(--theme-secondary-strong) 35%, transparent)'
            }}>
              <Globe size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Verified Public Portfolio Link
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Bagikan track record & portofolio trading terverifikasi Anda ke publik
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              Memuat data profil...
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Public Enable/Disable Switch Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: profile.isPublic ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                border: profile.isPublic ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color={profile.isPublic ? '#10b981' : 'var(--text-secondary)'} />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: profile.isPublic ? '#34d399' : 'var(--text-strong)' }}>
                      {profile.isPublic ? 'Profil Publik Aktif' : 'Profil Publik Nonaktif (Privat)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {profile.isPublic ? 'Orang lain bisa melihat link portofolio Anda' : 'Hanya Anda yang bisa melihat journal Anda'}
                    </div>
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={profile.isPublic}
                    onChange={(e) => setProfile(prev => ({ ...prev, isPublic: e.target.checked }))}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: profile.isPublic ? '#10b981' : '#334155',
                    borderRadius: '24px',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: profile.isPublic ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Shareable Link Box */}
              {profile.isPublic && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#070a16',
                  border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--theme-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Your Public Bio Link:
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {publicUrl}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '6px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                  >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Buka Halaman Publik"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              )}

              {/* Username Handle */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Custom Username / URL Handle *</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') }))}
                    placeholder="e.g. alex_trader"
                    className="input-control"
                    style={{ width: '100%', paddingLeft: '38px', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Hanya huruf, angka, tanda minus (-), dan underscore (_).
                </span>
              </div>

              {/* Display Name */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Nama Tampilan (Display Name) *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. Alex Rivera"
                    className="input-control"
                    style={{ width: '100%', paddingLeft: '38px' }}
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Bio / Trading Motto</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Ceritakan gaya trading Anda, instrumen favorit, atau pengalaman trading..."
                  rows={2}
                  className="input-control"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              {/* Social Handles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Twitter / X Handle</label>
                  <input
                    type="text"
                    value={profile.twitterHandle}
                    onChange={(e) => setProfile(prev => ({ ...prev, twitterHandle: e.target.value.replace('@', '') }))}
                    placeholder="username"
                    className="input-control"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Discord Handle</label>
                  <input
                    type="text"
                    value={profile.discordHandle}
                    onChange={(e) => setProfile(prev => ({ ...prev, discordHandle: e.target.value }))}
                    placeholder="trader#1234"
                    className="input-control"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Privacy Controls */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: '#090e1c',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Pengaturan Privasi Publik:
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-strong)' }}>
                  <input
                    type="checkbox"
                    checked={profile.hideDollarAmounts}
                    onChange={(e) => setProfile(prev => ({ ...prev, hideDollarAmounts: e.target.checked }))}
                    style={{ accentColor: 'var(--theme-secondary-strong)' }}
                  />
                  <span>Sembunyikan nominal saldo $ / Rp (Hanya tampilkan % gain & RRR) 🔒</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-strong)' }}>
                  <input
                    type="checkbox"
                    checked={profile.showEquityCurve}
                    onChange={(e) => setProfile(prev => ({ ...prev, showEquityCurve: e.target.checked }))}
                    style={{ accentColor: 'var(--theme-secondary-strong)' }}
                  />
                  <span>Tampilkan Grafik Equity Curve</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-strong)' }}>
                  <input
                    type="checkbox"
                    checked={profile.showTradesHistory}
                    onChange={(e) => setProfile(prev => ({ ...prev, showTradesHistory: e.target.checked }))}
                    style={{ accentColor: 'var(--theme-secondary-strong)' }}
                  />
                  <span>Tampilkan Daftar Riwayat Trade</span>
                </label>
              </div>

              {/* Custom Trade Fields (B6) */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="input-label" style={{ fontWeight: 700 }}>Custom Trade Fields</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addFieldDef}>
                    <Plus size={13} /> Add Field
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                  Define extra fields to track on every trade (e.g. Grade, Setup Quality, Broker). They appear in the trade form (Full mode) and in CSV exports.
                </p>
                {fieldDefs.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '10px 12px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                    No custom fields yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fieldDefs.map((def, idx) => (
                      <div key={def.id} style={{ padding: '10px', borderRadius: '9px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="input-control"
                            style={{ flex: 1.4 }}
                            value={def.label}
                            placeholder="Field label (e.g. Grade)"
                            onChange={(e) => updateFieldDef(idx, { label: e.target.value })}
                          />
                          <select
                            className="input-control"
                            style={{ flex: 0.8 }}
                            value={def.type}
                            onChange={(e) => updateFieldDef(idx, { type: e.target.value as CustomFieldDef['type'] })}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Select</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            aria-label="Remove custom field"
                            onClick={() => removeFieldDef(idx)}
                            style={{ color: 'var(--loss-red)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {def.type === 'select' && (
                          <input
                            className="input-control"
                            value={(def.options || []).join(', ')}
                            placeholder="Options (comma separated): A+, B, C"
                            onChange={(e) =>
                              updateFieldDef(idx, {
                                options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                              })
                            }
                          />
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-primary btn-sm" onClick={saveFieldDefs}>
                        <Save size={13} /> Save Custom Fields
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ gap: '6px' }}>
                  <Save size={15} />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Profil'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
