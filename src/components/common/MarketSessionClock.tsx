import React, { useState, useEffect } from 'react';
import { Clock, Globe, Zap, Sun, Moon, Flame } from 'lucide-react';

interface SessionInfo {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  openUtc: number; // UTC hour (0-23)
  closeUtc: number; // UTC hour (0-23)
  killzoneUtc?: { start: number; end: number; name: string };
}

const SESSIONS: SessionInfo[] = [
  {
    id: 'sydney',
    name: 'Sydney Session',
    city: 'Sydney',
    country: 'Australia',
    flag: '🇦🇺',
    openUtc: 21,
    closeUtc: 5
  },
  {
    id: 'tokyo',
    name: 'Tokyo / Asian',
    city: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    openUtc: 0,
    closeUtc: 8
  },
  {
    id: 'london',
    name: 'London Session',
    city: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    openUtc: 7,
    closeUtc: 15,
    killzoneUtc: { start: 7, end: 9, name: 'London Open Killzone' }
  },
  {
    id: 'newyork',
    name: 'New York Session',
    city: 'New York',
    country: 'United States',
    flag: '🇺🇸',
    openUtc: 12,
    closeUtc: 20,
    killzoneUtc: { start: 12, end: 14, name: 'NY Open Killzone' }
  }
];

export const MarketSessionClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const currentUtcDec = utcHour + utcMinute / 60;

  // Check if a session is currently open
  const isSessionOpen = (session: SessionInfo) => {
    if (session.openUtc < session.closeUtc) {
      return currentUtcDec >= session.openUtc && currentUtcDec < session.closeUtc;
    } else {
      // Overnight span (e.g. 21:00 to 05:00)
      return currentUtcDec >= session.openUtc || currentUtcDec < session.closeUtc;
    }
  };

  // Check if killzone is active
  const isKillzoneActive = (session: SessionInfo) => {
    if (!session.killzoneUtc) return false;
    return currentUtcDec >= session.killzoneUtc.start && currentUtcDec < session.killzoneUtc.end;
  };

  // London-NY Overlap (12:00 - 15:00 UTC / 19:00 - 22:00 WIB)
  const isOverlapActive = currentUtcDec >= 12 && currentUtcDec < 15;

  const localTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const utcTimeStr = `${String(utcHour).padStart(2, '0')}:${String(utcMinute).padStart(2, '0')} UTC`;

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Globe size={18} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Multi-Market Session & Killzone Live Radar</span>
              {isOverlapActive && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Flame size={12} color="#ef4444" /> OVERLAP PEAK 🔥
                </span>
              )}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Status likuiditas sesi pasar dunia & waktu emas (Killzones) secara real-time
            </span>
          </div>
        </div>

        {/* Live Clock Digital Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: '#070b16',
            border: '1px solid #1e293b',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#38bdf8',
            fontWeight: 700
          }}>
            {localTimeStr} WIB
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: '#070b16',
            border: '1px solid #1e293b',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            {utcTimeStr}
          </div>
        </div>
      </div>

      {/* 4 Sessions Status Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {SESSIONS.map((session) => {
          const open = isSessionOpen(session);
          const killzone = isKillzoneActive(session);

          return (
            <div
              key={session.id}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: open ? (killzone ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)') : '#070b16',
                border: open ? (killzone ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.35)') : '1px solid #1a2538',
                transition: '0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{session.flag}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                    {session.city}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: open ? (killzone ? '#ef4444' : '#10b981') : '#1e293b',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {killzone ? (
                    <>
                      <Zap size={10} /> KILLZONE
                    </>
                  ) : open ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span> OPEN
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> CLOSED
                    </>
                  )}
                </span>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {session.name}
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {String((session.openUtc + 7) % 24).padStart(2, '0')}:00 - {String((session.closeUtc + 7) % 24).padStart(2, '0')}:00 WIB
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
