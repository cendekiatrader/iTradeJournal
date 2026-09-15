import React, { useEffect, useState } from 'react';
import { Bug, Lightbulb, MessageSquare, Send, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useJournal } from '../../context/JournalContext';
import { useAuth } from '../../context/AuthContext';
import { submitFeedback } from '../../utils/feedback';
import { isSupabaseConfigured } from '../../utils/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: 'bug' | 'idea' | 'other'; label: string; icon: React.ReactNode }[] = [
  { id: 'bug', label: 'Bug report', icon: <Bug size={13} /> },
  { id: 'idea', label: 'Feature idea', icon: <Lightbulb size={13} /> },
  { id: 'other', label: 'Other', icon: <MessageSquare size={13} /> }
];

/** "Send feedback" form — bug reports and feature ideas go to the admin inbox. */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useJournal();
  const { user } = useAuth();
  const modalRef = useModalA11y(isOpen, onClose);
  const [category, setCategory] = useState<'bug' | 'idea' | 'other'>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(user?.email || '');
      setCategory('bug');
      setMessage('');
    }
  }, [isOpen, user?.email]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please write a short message first.', 'error');
      return;
    }
    if (!isSupabaseConfigured()) {
      showToast('Feedback needs the cloud connection (this build is offline).', 'error');
      return;
    }
    setSending(true);
    const ok = await submitFeedback({
      category,
      message: message.trim(),
      email: email.trim() || undefined,
      userId: user?.id
    });
    setSending(false);
    if (ok) {
      showToast('Thanks! Your feedback was sent. 🙌', 'success');
      setMessage('');
      onClose();
    } else {
      showToast('Could not send feedback — please try again later.', 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <span style={{ fontWeight: 800 }}>Send feedback</span>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm" aria-label="Close feedback form">
              <X size={16} />
            </button>
          </div>

          <div className="modal-body" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Found a bug or have an idea? Send it straight to the developer's inbox.
            </p>

            <div>
              <label className="input-label">What is this about?</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`btn btn-sm ${category === c.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    aria-pressed={category === c.id}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" htmlFor="feedback-message">
                Message
              </label>
              <textarea
                id="feedback-message"
                className="input-control"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the bug (what you did, what happened) or the idea you'd like to see…"
                style={{ width: '100%', resize: 'vertical' }}
                maxLength={2000}
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" htmlFor="feedback-email">
                Email (optional — so you can be reached)
              </label>
              <input
                id="feedback-email"
                type="email"
                className="input-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !message.trim()}>
              <Send size={13} /> {sending ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
