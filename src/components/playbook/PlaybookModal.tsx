import React, { useState } from 'react';
import { PlaybookModel, StrategyType } from '../../types';
import { X, Check, Image as ImageIcon, Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { useJournal } from '../../context/JournalContext';

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlaybook?: PlaybookModel | null;
}

const STRATEGIES: StrategyType[] = [
  'SMC / Liquidity Sweep',
  'HTF FVG & iFVG 50% CE',
  'Turtle Soup Reversal',
  'BOS Trend Continuation',
  'BPR & Order Block',
  'Supply & Demand Bounce',
  'Breakout & Retest',
  'Mean Reversion',
  'Scalping',
  'Other'
];

export const PlaybookModal: React.FC<PlaybookModalProps> = ({
  isOpen,
  onClose,
  initialPlaybook
}) => {
  const { addPlaybook, updatePlaybook, showToast } = useJournal();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('SMC / Liquidity Sweep');
  const [timeframe, setTimeframe] = useState('15m / 1H');
  const [winrateTarget, setWinrateTarget] = useState<number>(70);
  const [rrTarget, setRrTarget] = useState<number>(2.5);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [confluences, setConfluences] = useState<string[]>(['']);
  const [mistakesToAvoid, setMistakesToAvoid] = useState<string[]>(['']);
  const [chartBeforeUrl, setChartBeforeUrl] = useState('');
  const [chartAfterUrl, setChartAfterUrl] = useState('');
  const [rating, setRating] = useState<number>(5);

  React.useEffect(() => {
    if (initialPlaybook) {
      setTitle(initialPlaybook.title);
      setCategory(initialPlaybook.category);
      setTimeframe(initialPlaybook.timeframe);
      setWinrateTarget(initialPlaybook.winrateTarget || 70);
      setRrTarget(initialPlaybook.rrTarget || 2.5);
      setDescription(initialPlaybook.description);
      setRules(initialPlaybook.rules.length > 0 ? initialPlaybook.rules : ['']);
      setConfluences(initialPlaybook.confluences.length > 0 ? initialPlaybook.confluences : ['']);
      setMistakesToAvoid(initialPlaybook.mistakesToAvoid?.length ? initialPlaybook.mistakesToAvoid : ['']);
      setChartBeforeUrl(initialPlaybook.chartBeforeUrl || '');
      setChartAfterUrl(initialPlaybook.chartAfterUrl || '');
      setRating(initialPlaybook.rating || 5);
    } else {
      setTitle('');
      setCategory('SMC / Liquidity Sweep');
      setTimeframe('15m / 1H');
      setWinrateTarget(70);
      setRrTarget(2.5);
      setDescription('');
      setRules(['']);
      setConfluences(['']);
      setMistakesToAvoid(['']);
      setChartBeforeUrl('');
      setChartAfterUrl('');
      setRating(5);
    }
  }, [initialPlaybook, isOpen]);

  if (!isOpen) return null;

  const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const handleRemoveItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handlePasteImage = (setter: (url: string) => void) => (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const base64 = uploadEvent.target?.result as string;
            if (base64) setter(base64);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Judul setup playbook wajib diisi!', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      timeframe,
      winrateTarget: Number(winrateTarget),
      rrTarget: Number(rrTarget),
      description: description.trim(),
      rules: rules.filter(r => r.trim().length > 0),
      confluences: confluences.filter(c => c.trim().length > 0),
      mistakesToAvoid: mistakesToAvoid.filter(m => m.trim().length > 0),
      chartBeforeUrl: chartBeforeUrl.trim() || undefined,
      chartAfterUrl: chartAfterUrl.trim() || undefined,
      rating
    };

    if (initialPlaybook) {
      updatePlaybook(initialPlaybook.id, payload);
    } else {
      addPlaybook(payload);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {initialPlaybook ? 'Edit Playbook Model SOP' : 'Buat Setup Playbook Baru (A+ Model)'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Katalog aturan baku SOP dan blueprint eksekusi strategi
            </span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Title & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Setup Title / Model Name *</label>
              <input
                type="text"
                placeholder="Contoh: ICT London Silver Bullet & FVG 50% CE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-control"
                required
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Setup Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-control"
              >
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Timeframe, Target Winrate, Target RR & Rating */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Timeframe</label>
              <input
                type="text"
                placeholder="1m / 5m / 15m"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="input-control"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Target Winrate %</label>
              <input
                type="number"
                value={winrateTarget}
                onChange={(e) => setWinrateTarget(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Target R:R</label>
              <input
                type="number"
                step="0.1"
                value={rrTarget}
                onChange={(e) => setRrTarget(parseFloat(e.target.value) || 0)}
                className="input-control font-mono"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Setup Quality</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '38px', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= rating ? '#fbbf24' : '#334155',
                      padding: 0
                    }}
                  >
                    <Star size={18} fill={star <= rating ? '#fbbf24' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="input-group" style={{ marginBottom: '14px' }}>
            <label className="input-label">SOP Core Narrative & Philosophy</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan alasan logis mengapa strategi ini bekerja, narasi likuiditas, dan waktu eksekusi ideal..."
              className="input-control"
              style={{ minHeight: '65px' }}
            />
          </div>

          {/* Rules Checklist */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Syarat Wajib Masuk Posisi (Entry Rules)
              </label>
              <button
                type="button"
                onClick={() => handleAddItem(setRules)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', color: '#60a5fa' }}
              >
                + Tambah Rule
              </button>
            </div>
            {rules.map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={rule}
                  onChange={(e) => handleArrayChange(setRules, idx, e.target.value)}
                  placeholder={`Rule ${idx + 1}...`}
                  className="input-control"
                  style={{ fontSize: '0.8rem' }}
                />
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(setRules, idx)}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Confluences Checklist */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Konfluensi Pendukung (Confluences)
              </label>
              <button
                type="button"
                onClick={() => handleAddItem(setConfluences)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', color: '#34d399' }}
              >
                + Tambah Konfluensi
              </button>
            </div>
            {confluences.map((conf, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={conf}
                  onChange={(e) => handleArrayChange(setConfluences, idx, e.target.value)}
                  placeholder={`Konfluensi ${idx + 1}...`}
                  className="input-control"
                  style={{ fontSize: '0.8rem' }}
                />
                {confluences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(setConfluences, idx)}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mistakes to Avoid */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0, color: '#f87171' }}>
                Kesalahan yang Harus Dihindari (Anti-Pattern / Trap)
              </label>
              <button
                type="button"
                onClick={() => handleAddItem(setMistakesToAvoid)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', color: '#f87171' }}
              >
                + Tambah Larangan
              </button>
            </div>
            {mistakesToAvoid.map((mistake, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={mistake}
                  onChange={(e) => handleArrayChange(setMistakesToAvoid, idx, e.target.value)}
                  placeholder={`Larangan ${idx + 1}...`}
                  className="input-control"
                  style={{ fontSize: '0.8rem' }}
                />
                {mistakesToAvoid.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(setMistakesToAvoid, idx)}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Chart Blueprint Screenshots (Before vs After) */}
          <div style={{ padding: '12px', backgroundColor: '#070b17', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '16px' }}>
            <label className="input-label" style={{ marginBottom: '8px' }}>
              Chart Blueprint Contoh (Dukung Link URL atau Paste Gambar Langsung)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#93c5fd', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  1. Setup Model (Before)
                </span>
                <input
                  type="text"
                  value={chartBeforeUrl}
                  onChange={(e) => setChartBeforeUrl(e.target.value)}
                  onPaste={handlePasteImage(setChartBeforeUrl)}
                  placeholder="Paste gambar atau ketik URL..."
                  className="input-control font-mono"
                  style={{ fontSize: '0.78rem' }}
                />
                {chartBeforeUrl && (
                  <div style={{ marginTop: '6px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                    <img src={chartBeforeUrl} alt="Before preview" style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#34d399', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  2. Outcome Eksekusi (After)
                </span>
                <input
                  type="text"
                  value={chartAfterUrl}
                  onChange={(e) => setChartAfterUrl(e.target.value)}
                  onPaste={handlePasteImage(setChartAfterUrl)}
                  placeholder="Paste gambar atau ketik URL..."
                  className="input-control font-mono"
                  style={{ fontSize: '0.78rem' }}
                />
                {chartAfterUrl && (
                  <div style={{ marginTop: '6px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                    <img src={chartAfterUrl} alt="After preview" style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '16px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              {initialPlaybook ? 'Simpan Perubahan' : 'Simpan ke Playbook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
