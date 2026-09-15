import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../utils/supabase';
import { fetchAnnouncements, Announcement } from '../../utils/feedback';

const SEEN_KEY = 'itrade_ann_seen_v1';

const loadSeen = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Slim banner showing the newest unseen announcement from the admin. */
export const AnnouncementBanner: React.FC = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [seen, setSeen] = useState<string[]>(() => loadSeen());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    (async () => {
      const list = await fetchAnnouncements();
      if (alive) setItems(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = items.find((a) => !seen.includes(a.id));
  if (!current) return null;

  const dismiss = () => {
    const next = [...seen, current.id].slice(-50);
    setSeen(next);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '8px 16px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--bg-surface))',
        borderBottom: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)'
      }}
      role="status"
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 700 }}>
        <Megaphone size={14} color="var(--theme-secondary)" />
        {current.title}
      </span>
      <span style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>{current.body}</span>
      <button
        type="button"
        onClick={dismiss}
        className="btn btn-ghost btn-icon btn-sm"
        aria-label="Dismiss announcement"
        title="Dismiss"
        style={{ padding: '3px' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
