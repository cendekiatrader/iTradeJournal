import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { RichTextEditor } from '../common/RichTextEditor';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { TradePrefill } from '../../types';
import {
  Target,
  Plus,
  Trash2,
  Play,
  XCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export interface QueueItem {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  setup: string;
  priority: 'High' | 'Medium' | 'Low';
  entryLevel?: number;
  stopLevel?: number;
  targetLevel?: number;
  notes?: string;
  status: 'WAITING' | 'EXECUTED' | 'EXPIRED' | 'INVALIDATED';
  createdAt: string;
}

const QUEUE_KEY = 'itrade_setup_queue_v1';

const loadQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
};

const saveQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

/** True when the rich-text HTML actually contains text or an image. */
const hasRichContent = (html?: string): boolean => {
  if (!html) return false;
  if (html.includes('<img')) return true;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
};

interface SetupQueueViewProps {
  onExecute: (prefill: TradePrefill) => void;
}

export const SetupQueueView: React.FC<SetupQueueViewProps> = ({ onExecute }) => {
  const { showToast } = useJournal();
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [items, setItems] = useState<QueueItem[]>(() => loadQueue());
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [showForm, setShowForm] = useState(false);
  const cloudSynced = useRef(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [setup, setSetup] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [entryLevel, setEntryLevel] = useState('');
  const [stopLevel, setStopLevel] = useState('');
  const [targetLevel, setTargetLevel] = useState('');
  const [notes, setNotes] = useState('');

  // Load from cloud once when signed in (cloud wins if local empty)
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const cloudQueue = user.user_metadata?.setup_queue;
    if (Array.isArray(cloudQueue) && cloudQueue.length > 0 && items.length === 0) {
      setItems(cloudQueue as QueueItem[]);
      saveQueue(cloudQueue as QueueItem[]);
    }
    cloudSynced.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist locally + sync to cloud (debounced)
  useEffect(() => {
    saveQueue(items);
    const sb = user && isSupabaseConfigured() ? supabase : null;
    if (sb && cloudSynced.current) {
      const timer = setTimeout(() => {
        sb.auth.updateUser({ data: { setup_queue: items } }).catch(() => {
          /* non-blocking */
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [items, user]);

  const visibleItems = useMemo(() => {
    const list = filter === 'ACTIVE' ? items.filter((i) => i.status === 'WAITING') : items;
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'WAITING' ? -1 : 1;
      return priorityRank[a.priority] - priorityRank[b.priority];
    });
  }, [items, filter]);

  const resetForm = () => {
    setSymbol('');
    setDirection('LONG');
    setSetup('');
    setPriority('Medium');
    setEntryLevel('');
    setStopLevel('');
    setTargetLevel('');
    setNotes('');
  };

  const handleAdd = () => {
    if (!symbol.trim()) {
      showToast('Symbol is required.', 'error');
      return;
    }
    const item: QueueItem = {
      id: `q-${Date.now()}`,
      symbol: symbol.trim().toUpperCase(),
      direction,
      setup: setup.trim() || 'Setup',
      priority,
      entryLevel: entryLevel ? parseFloat(entryLevel) : undefined,
      stopLevel: stopLevel ? parseFloat(stopLevel) : undefined,
      targetLevel: targetLevel ? parseFloat(targetLevel) : undefined,
      notes: hasRichContent(notes) ? notes : undefined,
      status: 'WAITING',
      createdAt: new Date().toISOString()
    };
    setItems((prev) => [item, ...prev]);
    resetForm();
    setShowForm(false);
    showToast(`Setup ${item.symbol} added to the queue.`, 'success');
  };

  const updateStatus = (id: string, status: QueueItem['status']) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleDelete = async (item: QueueItem) => {
    const ok = await confirm({
      title: `Delete ${item.symbol} setup?`,
      message: 'The setup idea will be removed from your queue.',
      confirmText: 'Delete setup',
      variant: 'danger'
    });
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Setup removed from the queue.', 'info');
    }
  };

  const handleExecute = (item: QueueItem) => {
    onExecute({
      symbol: item.symbol,
      direction: item.direction,
      setup: item.setup,
      entryPrice: item.entryLevel,
      stopLoss: item.stopLevel,
      takeProfit: item.targetLevel,
      notes: hasRichContent(item.notes) ? item.notes : undefined
    });
    updateStatus(item.id, 'EXECUTED');
  };

  const statusBadge = (item: QueueItem) => {
    switch (item.status) {
      case 'WAITING':
        return <span className="badge badge-session" style={{ fontSize: '0.68rem' }}><Clock size={11} /> WAITING</span>;
      case 'EXECUTED':
        return <span className="badge badge-win" style={{ fontSize: '0.68rem' }}><CheckCircle2 size={11} /> EXECUTED</span>;
      case 'INVALIDATED':
        return <span className="badge badge-loss" style={{ fontSize: '0.68rem' }}><XCircle size={11} /> INVALID</span>;
      default:
        return <span className="badge badge-be" style={{ fontSize: '0.68rem' }}>EXPIRED</span>;
    }
  };

  const priorityColor = { High: 'var(--loss-red)', Medium: '#f59e0b', Low: 'var(--text-secondary)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Setup Queue
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Planned setups and trade ideas — convert to a trade entry in one click
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: '#0c152a', border: '1px solid #1c273e', borderRadius: '9px', padding: '3px' }}>
            {(['ACTIVE', 'ALL'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: filter === f ? 'var(--theme-secondary-strong)' : 'transparent',
                  color: filter === f ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {f === 'ACTIVE' ? 'Active' : 'All'}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => setShowForm((s) => !s)}>
            <Plus size={15} /> Add Setup Idea
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <div className="card-title"><Target size={17} color="var(--theme-secondary)" /> New Setup Idea</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Symbol *</label>
              <input className="input-control font-mono" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="XAUUSD" />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Direction</label>
              <select className="input-control" value={direction} onChange={(e) => setDirection(e.target.value as 'LONG' | 'SHORT')}>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Setup / Strategy</label>
              <input className="input-control" value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="FVG Mitigation" />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Priority</label>
              <select className="input-control" value={priority} onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Entry Level</label>
              <input type="number" inputMode="decimal" step="any" className="input-control font-mono" value={entryLevel} onChange={(e) => setEntryLevel(e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Stop Level</label>
              <input type="number" inputMode="decimal" step="any" className="input-control font-mono" value={stopLevel} onChange={(e) => setStopLevel(e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Target Level</label>
              <input type="number" inputMode="decimal" step="any" className="input-control font-mono" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label className="input-label">Notes</label>
            <RichTextEditor
              value={notes}
              onChange={setNotes}
              placeholder="Why is this setup valid? What are you waiting for? Paste a chart screenshot directly here (Ctrl + V)..."
              minHeight="130px"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd}><Plus size={14} /> Add to Queue</button>
          </div>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Target size={22} />}
            title={filter === 'ACTIVE' ? 'No active setups in the queue' : 'Your setup queue is empty'}
            description="Park your watchlist ideas here — planned levels, bias and notes. When price reaches your zone, convert it to a trade entry in one click."
            actionLabel="Add your first setup idea"
            onAction={() => setShowForm(true)}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {visibleItems.map((item) => (
            <div key={item.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {item.direction === 'LONG' ? (
                    <ArrowUpRight size={17} color="var(--profit-green)" />
                  ) : (
                    <ArrowDownRight size={17} color="var(--loss-red)" />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {item.symbol} <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>{item.direction}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{item.setup}</div>
                  </div>
                </div>
                {statusBadge(item)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: 'Entry', value: item.entryLevel },
                  { label: 'Stop', value: item.stopLevel },
                  { label: 'Target', value: item.targetLevel }
                ].map((lv) => (
                  <div key={lv.label} style={{ backgroundColor: '#060913', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{lv.label}</div>
                    <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: lv.value !== undefined ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {lv.value !== undefined && !isNaN(lv.value) ? lv.value : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {item.entryLevel !== undefined && item.stopLevel !== undefined && item.targetLevel !== undefined &&
                !isNaN(item.entryLevel) && !isNaN(item.stopLevel) && !isNaN(item.targetLevel) &&
                item.stopLevel !== item.entryLevel && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Planned R:R ≈{' '}
                    <strong style={{ color: 'var(--theme-secondary)', fontFamily: 'var(--font-mono)' }}>
                      1 : {(Math.abs(item.targetLevel - item.entryLevel) / Math.abs(item.entryLevel - item.stopLevel)).toFixed(2)}
                    </strong>{' '}
                    · <span style={{ color: priorityColor[item.priority], fontWeight: 700 }}>{item.priority} priority</span>
                  </div>
                )}

              {hasRichContent(item.notes) && (
                <div
                  className="rich-notes-content"
                  style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px' }}
                  dangerouslySetInnerHTML={{ __html: item.notes || '' }}
                />
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                {item.status === 'WAITING' && (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleExecute(item)}>
                      <Play size={13} /> Execute
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateStatus(item.id, 'INVALIDATED')}>
                      <XCircle size={13} /> Invalidate
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  aria-label="Delete setup"
                  onClick={() => handleDelete(item)}
                  style={{ color: 'var(--loss-red)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
