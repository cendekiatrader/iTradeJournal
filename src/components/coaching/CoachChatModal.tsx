import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, MessageCircle, Send, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useJournal } from '../../context/JournalContext';
import { CoachMessage, fetchCoachMessages, markCoachMessagesRead, sendCoachMessage } from '../../utils/coaching';

interface CoachChatModalProps {
  linkId: string;
  counterpart: string;
  selfId: string;
  onClose: () => void;
  onActivity?: () => void;
}

const bubbleTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Private 1-to-1 chat between a mentor and their student.
 * Only the two linked accounts (and admins) can read the thread.
 */
export const CoachChatModal: React.FC<CoachChatModalProps> = ({ linkId, counterpart, selfId, onClose, onActivity }) => {
  const { showToast } = useJournal();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const ref = useModalA11y(true, onClose);
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const msgs = await fetchCoachMessages(linkId);
    setMessages(msgs);
    setLoading(false);
    const unread = msgs.filter((m) => m.sender_id !== selfId && !m.read_at).length;
    if (unread > 0) {
      await markCoachMessagesRead(linkId);
      onActivity?.();
    }
  }, [linkId, selfId, onActivity]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll so new messages appear while the chat is open.
  useEffect(() => {
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || busy) return;
    setBusy(true);
    const ok = await sendCoachMessage(linkId, body);
    setBusy(false);
    if (!ok) {
      showToast('Could not send the message.', 'error');
      return;
    }
    setInput('');
    load();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Chat with ${counterpart}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 94vw)',
          height: 'min(640px, 84vh)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden'
        }}
      >
        <div className="modal-header" style={{ alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: '999px',
              background: 'color-mix(in srgb, var(--theme-secondary) 16%, transparent)',
              color: 'var(--theme-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.82rem',
              flexShrink: 0
            }}
          >
            {counterpart.slice(0, 1).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{counterpart}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={11} /> Private — only the two of you can see this
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Close chat" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '18px' }}>Loading messages…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '26px' }}>
              <MessageCircle size={22} style={{ opacity: 0.6 }} />
              <div style={{ fontSize: '0.82rem', marginTop: '8px' }}>No messages yet — say hello.</div>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === selfId;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: mine ? 'color-mix(in srgb, var(--theme-secondary) 22%, transparent)' : 'var(--bg-chip)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {m.body}
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: mine ? 'right' : 'left' }}>{bubbleTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
          <input
            className="input-control"
            value={input}
            placeholder="Write a message…"
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" disabled={busy || !input.trim()} onClick={handleSend}>
            <Send size={13} /> {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
