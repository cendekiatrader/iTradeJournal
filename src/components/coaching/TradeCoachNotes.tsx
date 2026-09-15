import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { fetchTradeNotes, markNotesRead, StudentNote } from '../../utils/coaching';
import { isSupabaseConfigured } from '../../utils/supabase';

interface TradeCoachNotesProps {
  tradeId: string;
}

/** Coach notes left by a mentor/admin on this trade (visible to the student). */
export const TradeCoachNotes: React.FC<TradeCoachNotesProps> = ({ tradeId }) => {
  const [notes, setNotes] = useState<StudentNote[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !tradeId) return;
    let alive = true;
    (async () => {
      const list = await fetchTradeNotes(tradeId);
      if (!alive) return;
      setNotes(list);
      if (list.length > 0) {
        // Mark as read for the trade owner (no-op for mentors/admins).
        await markNotesRead();
      }
    })();
    return () => {
      alive = false;
    };
  }, [tradeId]);

  if (notes.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 8%, var(--bg-surface))',
        border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 30%, transparent)',
        borderRadius: '10px',
        padding: '14px 16px'
      }}
    >
      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--theme-secondary)',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <GraduationCap size={14} /> Coach notes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notes.map((n) => (
          <div key={n.id}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-strong)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.body}</div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              {n.author_role} · {new Date(n.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
