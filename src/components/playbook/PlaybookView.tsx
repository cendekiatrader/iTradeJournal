import React, { useState, useMemo } from 'react';
import { useJournal } from '../../context/JournalContext';
import { PlaybookModel, StrategyType } from '../../types';
import { 
  BookMarked, 
  Plus, 
  Search, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Percent, 
  Scale, 
  Edit, 
  Trash2, 
  ExternalLink,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  X
} from 'lucide-react';
import { PlaybookModal } from './PlaybookModal';

export const PlaybookView: React.FC = () => {
  const { playbooks, deletePlaybook, showToast } = useJournal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<PlaybookModel | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PlaybookModel | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    playbooks.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [playbooks]);

  const filteredPlaybooks = useMemo(() => {
    return playbooks.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.rules.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [playbooks, selectedCategory, searchQuery]);

  const handleEdit = (pb: PlaybookModel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPlaybook(pb);
    setIsModalOpen(true);
  };

  const handleDelete = (pb: PlaybookModel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Hapus playbook "${pb.title}" dari galeri?`)) {
      deletePlaybook(pb.id);
      if (selectedDetail?.id === pb.id) setSelectedDetail(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Action Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '20px 24px',
        backgroundColor: '#0c1222',
        borderRadius: '16px',
        border: '1px solid #1e293b'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)'
            }}>
              <BookMarked size={20} color="#ffffff" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Setup Playbook Gallery
            </h1>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Kumpulan blueprint SOP setup terbaik, aturan konfluensi baku, dan visualisasi chart sebelum eksekusi.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPlaybook(null);
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontWeight: 700, gap: '8px', fontSize: '0.85rem' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Tambah Playbook SOP</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari SOP setup, rules, atau kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-control"
            style={{ paddingLeft: '34px', fontSize: '0.8rem' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: selectedCategory === 'all' ? '#3b82f6' : '#0c1222',
              color: selectedCategory === 'all' ? '#ffffff' : '#94a3b8',
              border: `1px solid ${selectedCategory === 'all' ? '#3b82f6' : '#1e293b'}`,
              cursor: 'pointer'
            }}
          >
            All Categories ({playbooks.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: selectedCategory === cat ? '#3b82f6' : '#0c1222',
                color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                border: `1px solid ${selectedCategory === cat ? '#3b82f6' : '#1e293b'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Playbook Cards Grid */}
      {filteredPlaybooks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#0c1222',
          borderRadius: '16px',
          border: '1px dashed #1e293b'
        }}>
          <BookMarked size={40} color="#475569" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '6px' }}>Belum ada Setup Playbook</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Mulai arsipkan setup trading A+ Anda dengan aturan baku yang terbukti konsisten.
          </p>
          <button
            onClick={() => {
              setEditingPlaybook(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            + Buat Setup Playbook Pertama
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '18px'
        }}>
          {filteredPlaybooks.map(pb => (
            <div
              key={pb.id}
              onClick={() => setSelectedDetail(pb)}
              style={{
                backgroundColor: '#0c1222',
                borderRadius: '14px',
                border: '1px solid #1e293b',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                {/* Header: Category & Stars */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    {pb.category}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star
                        key={st}
                        size={13}
                        fill={st <= (pb.rating || 5) ? '#fbbf24' : 'none'}
                        color={st <= (pb.rating || 5) ? '#fbbf24' : '#334155'}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', lineHeight: 1.4 }}>
                  {pb.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: '14px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {pb.description || 'Tidak ada deskripsi.'}
                </p>

                {/* Key Metrics Chips */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                  padding: '8px 12px',
                  backgroundColor: '#070b17',
                  borderRadius: '8px',
                  border: '1px solid #1a2538'
                }}>
                  <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Timeframe</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>{pb.timeframe || '-'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Winrate Target</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--profit-green)' }}>{pb.winrateTarget ? `${pb.winrateTarget}%` : '-'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Target R:R</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60a5fa' }}>{pb.rrTarget ? `1 : ${pb.rrTarget}` : '-'}</div>
                  </div>
                </div>

                {/* Quick Rules Preview */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    SOP Checklist ({pb.rules.length} Rules)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {pb.rules.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#cbd5e1' }}>
                        <CheckCircle2 size={12} color="#10b981" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</span>
                      </div>
                    ))}
                    {pb.rules.length > 3 && (
                      <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600 }}>
                        +{pb.rules.length - 3} rules lainnya...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #1e293b'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Lihat Blueprint <ChevronRight size={13} />
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={(e) => handleEdit(pb, e)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Edit Playbook"
                    style={{ color: '#94a3b8' }}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(pb, e)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Hapus Playbook"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Playbook Detail Modal Popup */}
      {selectedDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedDetail(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa'
                  }}>
                    {selectedDetail.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star
                        key={st}
                        size={13}
                        fill={st <= (selectedDetail.rating || 5) ? '#fbbf24' : 'none'}
                        color={st <= (selectedDetail.rating || 5) ? '#fbbf24' : '#334155'}
                      />
                    ))}
                  </div>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {selectedDetail.title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    const target = selectedDetail;
                    setSelectedDetail(null);
                    handleEdit(target);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit size={14} /> Edit
                </button>
                <button onClick={() => setSelectedDetail(null)} className="btn btn-ghost btn-icon">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Target Banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#070b17',
                borderRadius: '10px',
                border: '1px solid #1e293b'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Timeframe Eksekusi</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{selectedDetail.timeframe || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Target Winrate</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--profit-green)' }}>
                    {selectedDetail.winrateTarget ? `${selectedDetail.winrateTarget}%` : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Target Risk:Reward</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa' }}>
                    {selectedDetail.rrTarget ? `1 : ${selectedDetail.rrTarget}` : '-'}
                  </div>
                </div>
              </div>

              {/* Narrative */}
              {selectedDetail.description && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Narasi Filosofi & Logika Setup
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, backgroundColor: '#070b17', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1a2538' }}>
                    {selectedDetail.description}
                  </p>
                </div>
              )}

              {/* Rules & Confluences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ backgroundColor: '#070b17', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> Syarat Wajib Masuk Posisi (Rules)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDetail.rules.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#f8fafc' }}>
                        <span style={{ color: '#34d399', fontWeight: 700 }}>{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: '#070b17', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} /> Konfluensi Pendukung (Confluences)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDetail.confluences.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#f8fafc' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>•</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mistakes to avoid */}
              {selectedDetail.mistakesToAvoid && selectedDetail.mistakesToAvoid.length > 0 && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} /> Kesalahan yang Wajib Dihindari (Traps)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDetail.mistakesToAvoid.map((m, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', gap: '6px' }}>
                        <span>⚠️</span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart Blueprints */}
              {(selectedDetail.chartBeforeUrl || selectedDetail.chartAfterUrl) && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Chart Blueprints (Visual Setup)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: selectedDetail.chartBeforeUrl && selectedDetail.chartAfterUrl ? '1fr 1fr' : '1fr', gap: '12px' }}>
                    {selectedDetail.chartBeforeUrl && (
                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Setup Blueprint (Before)
                        </span>
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                          <img src={selectedDetail.chartBeforeUrl} alt="Before blueprint" style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', backgroundColor: '#070b17' }} />
                        </div>
                      </div>
                    )}
                    {selectedDetail.chartAfterUrl && (
                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Outcome Blueprint (After)
                        </span>
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                          <img src={selectedDetail.chartAfterUrl} alt="After blueprint" style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', backgroundColor: '#070b17' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedDetail(null)} className="btn btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <PlaybookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlaybook(null);
        }}
        initialPlaybook={editingPlaybook}
      />
    </div>
  );
};
