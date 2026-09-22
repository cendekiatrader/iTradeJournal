import React, { useState, useEffect, useMemo } from 'react';
import { fetchPublicTraderData } from '../../utils/supabase';
import { UserProfile, TradingAccount, Trade } from '../../types';
import { calculateAccountMetrics, generateEquityCurve } from '../../utils/calculations';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { EquityChart } from '../common/EquityChart';
import { 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  ExternalLink, 
  Share2, 
  Copy, 
  Check, 
  ArrowLeft,
  Lock,
  Sparkles,
  Layers
} from 'lucide-react';

interface PublicProfileViewProps {
  username: string;
  onBackToApp: () => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ username, onBackToApp }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicTraderData(username)
      .then((data) => {
        if (data) {
          setProfile(data.profile);
          setAccounts(data.accounts);
          setTrades(data.trades);
        } else {
          setError(`Trader profile "@${username}" was not found or is private.`);
        }
      })
      .catch((err) => {
        console.error('Error loading public profile:', err);
        setError('Gagal memuat data portofolio publik.');
      })
      .finally(() => setLoading(false));
  }, [username]);

  // Filtered trades by asset
  const filteredTrades = useMemo(() => {
    if (selectedAsset === 'all') return trades;
    return trades.filter(t => t.assetClass === selectedAsset);
  }, [trades, selectedAsset]);

  // Metrics
  const startingBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.initialBalance, 10000);
  }, [accounts]);

  const metrics = useMemo(() => {
    return calculateAccountMetrics(filteredTrades, startingBalance);
  }, [filteredTrades, startingBalance]);

  const equityData = useMemo(() => {
    return generateEquityCurve(filteredTrades, startingBalance);
  }, [filteredTrades, startingBalance]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-secondary)'
      }}>
        <div className="loading-ring" style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid color-mix(in srgb, var(--theme-secondary-strong) 20%, transparent)',
          borderTopColor: 'var(--theme-secondary-strong)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontSize: '0.9rem' }}>Memuat profil terverifikasi @{username}...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Lock size={28} color="var(--loss-red)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Profil Tidak Ditemukan / Privat
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '24px' }}>
          {error || 'This trader has not enabled their public profile yet.'}
        </p>
        <button onClick={onBackToApp} className="btn btn-primary">
          <ArrowLeft size={16} />
          <span>Kembali ke iTradeJournal</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '60px' }}>
      {/* Top Navbar */}
      <header style={{
        borderBottom: '1px solid #1a2333',
        backgroundColor: 'var(--bg-main)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary-strong))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={18} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            iTrade<span style={{ color: 'var(--profit-green)' }}>Journal</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            {copied ? <Check size={14} color="var(--profit-green)" /> : <Share2 size={14} />}
            <span>{copied ? 'Link Copied' : 'Share Profile'}</span>
          </button>
          <button onClick={onBackToApp} className="btn btn-primary btn-sm">
            <span>Open My Journal</span>
          </button>
        </div>
      </header>

      {/* Profile Banner */}
      <div style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '32px 20px 20px 20px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Glow */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in srgb, var(--theme-secondary-strong) 15%, transparent) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {/* Avatar Bubble */}
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                border: '2px solid rgba(255, 255, 255, 0.15)'
              }}>
                {profile.displayName ? profile.displayName[0].toUpperCase() : 'T'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {profile.displayName}
                  </h1>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: 'var(--profit-green-light)',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    <ShieldCheck size={13} color="var(--profit-green)" />
                    <span>Verified Trader</span>
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', color: 'var(--theme-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  @{profile.username}
                </div>

                {profile.bio && (
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '560px', lineHeight: 1.5 }}>
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {profile.twitterHandle && (
                <a
                  href={`https://twitter.com/${profile.twitterHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <span>@{profile.twitterHandle}</span>
                  <ExternalLink size={13} />
                </a>
              )}
              {profile.discordHandle && (
                <div className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                  <span>Discord: {profile.discordHandle}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: metrics.winRate >= 50 ? '#10b981' : '#f87171', marginTop: '4px' }}>
              {metrics.winRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {metrics.winningTrades}W / {metrics.losingTrades}L
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Profit Factor</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: metrics.profitFactor >= 1.5 ? '#10b981' : 'var(--theme-secondary)', marginTop: '4px' }}>
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Gross Edge
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Return</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: metrics.totalPnL >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
              {profile.hideDollarAmounts 
                ? `${metrics.totalPnlPercent >= 0 ? '+' : ''}${metrics.totalPnlPercent.toFixed(2)}%`
                : formatCurrency(metrics.totalPnL, 'USD')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {filteredTrades.length} Total Trades
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg RR Ratio</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--theme-secondary)', marginTop: '4px' }}>
              1 : {metrics.avgRR.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Risk:Reward
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Best Trade</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--profit-green)', marginTop: '4px' }}>
              {profile.hideDollarAmounts 
                ? `+${Math.max(...filteredTrades.map(t => t.pnlPercent), 0).toFixed(2)}%` 
                : formatCurrency(metrics.bestTrade, 'USD')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Peak Win
            </div>
          </div>
        </div>

        {/* Equity Curve Chart */}
        {profile.showEquityCurve && equityData.length > 1 && (
          <div className="card" style={{ marginTop: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Verified Performance & Equity Growth
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Track record pertumbuhan portofolio secara berurutan
                </p>
              </div>
            </div>

            <EquityChart data={equityData} height={280} />
          </div>
        )}

        {/* Verified Trades List */}
        {profile.showTradesHistory && filteredTrades.length > 0 && (
          <div className="card" style={{ marginTop: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Verified Trade Records ({filteredTrades.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Verified position execution notes in iTradeJournal
                </p>
              </div>

              {/* Asset Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'Crypto', 'Forex', 'Indices', 'Commodities'].map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-main)',
                      boxShadow: selectedAsset === asset ? 'var(--neo-outset-sm)' : 'none',
                      border: 'none',
                      color: selectedAsset === asset ? 'var(--theme-secondary)' : 'var(--text-secondary)'
                    }}
                  >
                    {asset === 'all' ? 'All Assets' : asset}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-chip)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px' }}>Symbol</th>
                    <th style={{ padding: '10px 8px' }}>Side</th>
                    <th style={{ padding: '10px 8px' }}>Setup</th>
                    <th style={{ padding: '10px 8px' }}>Result</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>R:R</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gain / PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((t) => {
                    const isWin = t.status === 'WIN';
                    const isLoss = t.status === 'LOSS';
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div>{t.symbol}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {new Date(t.entryDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: t.direction === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: t.direction === 'LONG' ? '#34d399' : '#f87171'
                          }}>
                            {t.direction}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', color: 'var(--text-strong)' }}>
                          <div>{t.setup}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.session} Session</div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: isWin ? 'rgba(16, 185, 129, 0.15)' : isLoss ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            color: isWin ? '#34d399' : isLoss ? '#f87171' : 'var(--text-secondary)'
                          }}>
                            {t.status}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--theme-secondary)' }}>
                          {t.rrAchieved ? `${t.rrAchieved.toFixed(1)}R` : '-'}
                        </td>

                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isWin ? '#10b981' : isLoss ? '#ef4444' : 'var(--text-secondary)'
                        }}>
                          {profile.hideDollarAmounts ? (
                            <span>{t.pnlPercent >= 0 ? `+${t.pnlPercent.toFixed(2)}%` : `${t.pnlPercent.toFixed(2)}%`}</span>
                          ) : (
                            <span>{t.pnl >= 0 ? `+${formatCurrency(t.pnl, 'USD')}` : formatCurrency(t.pnl, 'USD')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div style={{
          marginTop: '36px',
          padding: '28px',
          borderRadius: '20px',
          background: 'var(--bg-main)',
          border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)',
          textAlign: 'center'
        }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Ingin Memiliki Trading Journal & Link Portofolio Seperti Ini?
          </h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 16px auto' }}>
            Journal your trades, track multi-account analytics, and share a verified track record — free.
          </p>
          <button onClick={onBackToApp} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
            <span>Start Your Trading Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
