import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tag as TagIcon,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { RichTextEditor } from '../components/common/RichTextEditor';
import { EmptyState } from '../components/common/EmptyState';
import { TableRowSkeleton } from '../components/common/Skeleton';
import { useConfirm } from '../components/common/ConfirmDialog';
import { useJournal } from '../context/JournalContext';
import {
  BlogPost,
  BlogStatus,
  createBlogPost,
  deleteBlogPost,
  fetchBlogPostsForAdmin,
  isSlugAvailable,
  plainText,
  readingMinutes,
  setBlogPostStatus,
  slugify,
  updateBlogPost,
  uploadBlogImage
} from '../utils/blog';

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden'
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  flexWrap: 'wrap',
  padding: '15px 18px',
  borderBottom: '1px solid var(--border-subtle)'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

const fmtDay = (x?: string | null): string => (x ? new Date(x).toLocaleDateString() : '—');

interface Draft {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  tags: string;
  status: BlogStatus;
  publishedAt: string | null;
  slugTouched: boolean;
}

const emptyDraft = (): Draft => ({
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  tags: '',
  status: 'draft',
  publishedAt: null,
  slugTouched: false
});

const draftFromPost = (p: BlogPost): Draft => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  content: p.content,
  coverImageUrl: p.coverImageUrl || '',
  tags: p.tags.join(', '),
  status: p.status,
  publishedAt: p.publishedAt,
  slugTouched: true
});

const parseTags = (raw: string): string[] =>
  Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8)
    )
  );

const blogUrl = (slug: string): string => `${window.location.origin}/blog/${slug}`;

/**
 * Blog management for the admin console.
 *
 * Every write goes through the `blog_posts_admin_write` RLS policy, so even if a
 * non-admin reached this panel the database would reject the insert/update.
 */
export const BlogAdminPanel: React.FC = () => {
  const { showToast } = useJournal();
  const { confirm } = useConfirm();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BlogStatus>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchBlogPostsForAdmin();
    setPosts(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.status === 'published').length,
      drafts: posts.filter((p) => p.status === 'draft').length,
      views: posts.reduce((sum, p) => sum + p.views, 0)
    }),
    [posts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, search, statusFilter]);

  const updateDraft = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const handleTitleChange = (value: string) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        title: value,
        slug: d.slugTouched ? d.slug : slugify(value)
      };
    });
  };

  const handleCoverUpload = async (file: File) => {
    setCoverBusy(true);
    const url = await uploadBlogImage(file, file.name);
    setCoverBusy(false);
    if (!url) {
      showToast('Upload gagal — pastikan bucket blog-media sudah dibuat (jalankan supabase_blog.sql).', 'error');
      return;
    }
    updateDraft({ coverImageUrl: url });
    showToast('Cover image uploaded.', 'success');
  };

  const handleSave = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    const slug = slugify(draft.slug || title);
    if (!title) {
      showToast('Judul artikel wajib diisi.', 'error');
      return;
    }
    if (!slug) {
      showToast('Slug tidak valid — gunakan huruf/angka.', 'error');
      return;
    }
    if (!draft.content.replace(/<[^>]*>/g, '').trim()) {
      showToast('Isi artikel masih kosong.', 'error');
      return;
    }

    setBusy(true);
    const available = await isSlugAvailable(slug, draft.id || undefined);
    if (!available) {
      setBusy(false);
      showToast(`Slug "${slug}" sudah dipakai artikel lain.`, 'error');
      return;
    }

    const payload = {
      title,
      slug,
      excerpt: draft.excerpt.trim() || plainText(draft.content, 180),
      content: draft.content,
      coverImageUrl: draft.coverImageUrl.trim() || null,
      tags: parseTags(draft.tags),
      status: draft.status
    };

    const res = draft.id
      ? await updateBlogPost(draft.id, payload, draft.publishedAt)
      : await createBlogPost(payload);
    setBusy(false);

    if (!res.ok) {
      showToast(
        res.error?.toLowerCase().includes('policy') || res.error?.toLowerCase().includes('permission')
          ? 'Ditolak database — akun ini bukan admin, atau supabase_blog.sql belum dijalankan.'
          : `Gagal menyimpan: ${res.error || 'unknown error'}`,
        'error'
      );
      return;
    }

    showToast(draft.id ? 'Artikel diperbarui.' : draft.status === 'published' ? 'Artikel dipublikasikan.' : 'Draft disimpan.', 'success');
    setDraft(null);
    load();
  };

  const handleToggleStatus = async (p: BlogPost) => {
    const next: BlogStatus = p.status === 'published' ? 'draft' : 'published';
    if (next === 'draft') {
      const ok = await confirm({
        title: `Tarik artikel dari publik?`,
        message: `"${p.title}" tidak akan bisa diakses pengunjung sampai dipublikasikan lagi.`,
        confirmText: 'Jadikan draft',
        variant: 'danger'
      });
      if (!ok) return;
    }
    const res = await setBlogPostStatus(p.id, next, p.publishedAt);
    if (!res.ok) {
      showToast('Update gagal — jalankan supabase_blog.sql kalau belum.', 'error');
      return;
    }
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: next, publishedAt: res.publishedAt ?? null } : x))
    );
    showToast(next === 'published' ? 'Artikel dipublikasikan.' : 'Artikel dijadikan draft.', 'success');
  };

  const handleDelete = async (p: BlogPost) => {
    const ok = await confirm({
      title: 'Hapus artikel ini permanen?',
      message: `"${p.title}" beserta isinya akan dihapus dan tidak bisa dikembalikan.`,
      confirmText: 'Hapus artikel',
      variant: 'danger',
      typeToConfirm: p.slug
    });
    if (!ok) return;
    const done = await deleteBlogPost(p.id);
    if (!done) {
      showToast('Delete gagal — jalankan supabase_blog.sql kalau belum.', 'error');
      return;
    }
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (draft?.id === p.id) setDraft(null);
    showToast('Artikel dihapus.', 'info');
  };

  const handleCopyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(blogUrl(slug));
      showToast('Link artikel disalin.', 'success');
    } catch {
      showToast(blogUrl(slug), 'info');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="admin-grid">
        {[
          { label: 'Articles', value: stats.total },
          { label: 'Published', value: stats.published },
          { label: 'Drafts', value: stats.drafts },
          { label: 'Total views', value: stats.views }
        ].map((s) => (
          <div key={s.label} className="admin-stat">
            <span className="admin-stat-icon">
              <FileText size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="admin-stat-value">{s.value}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {draft ? (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                {draft.id ? 'Edit article' : 'New article'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Published articles are public on <code>/blog</code>. Only admins can write here.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)} disabled={busy}>
                <X size={13} /> Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={busy}>
                <Save size={13} /> {busy ? 'Saving…' : draft.status === 'published' ? 'Save & publish' : 'Save draft'}
              </button>
            </div>
          </div>

          <div style={{ padding: '16px 18px', display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle} htmlFor="blog-title">
                Title *
              </label>
              <input
                id="blog-title"
                className="input-control"
                value={draft.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Cara review jurnal trading tiap minggu"
                maxLength={160}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle} htmlFor="blog-slug">
                  Slug (URL)
                </label>
                <input
                  id="blog-slug"
                  className="input-control"
                  value={draft.slug}
                  onChange={(e) => updateDraft({ slug: e.target.value, slugTouched: true })}
                  placeholder="cara-review-jurnal-trading"
                />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  /blog/{slugify(draft.slug || draft.title) || '…'}
                </div>
              </div>
              <div>
                <label style={labelStyle} htmlFor="blog-tags">
                  Tags (comma separated)
                </label>
                <input
                  id="blog-tags"
                  className="input-control"
                  value={draft.tags}
                  onChange={(e) => updateDraft({ tags: e.target.value })}
                  placeholder="Risiko, Psikologi, Jurnal"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle} htmlFor="blog-status">
                  Status
                </label>
                <select
                  id="blog-status"
                  className="input-control"
                  value={draft.status}
                  onChange={(e) => updateDraft({ status: e.target.value as BlogStatus })}
                >
                  <option value="draft">Draft (private)</option>
                  <option value="published">Published (public)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="blog-excerpt">
                  Excerpt (ringkasan)
                </label>
                <input
                  id="blog-excerpt"
                  className="input-control"
                  value={draft.excerpt}
                  onChange={(e) => updateDraft({ excerpt: e.target.value })}
                  placeholder="Ditampilkan di kartu artikel & hasil pencarian Google"
                  maxLength={240}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Cover image</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input-control"
                  value={draft.coverImageUrl}
                  onChange={(e) => updateDraft({ coverImageUrl: e.target.value })}
                  placeholder="https://… atau upload file"
                  style={{ flex: '1 1 280px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverBusy}
                >
                  <UploadCloud size={13} /> {coverBusy ? 'Uploading…' : 'Upload'}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                    e.target.value = '';
                  }}
                />
                {draft.coverImageUrl && (
                  <img
                    src={draft.coverImageUrl}
                    alt="Cover preview"
                    style={{ width: '84px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                  />
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Content *</label>
              <RichTextEditor
                value={draft.content}
                onChange={(html) => updateDraft({ content: html })}
                placeholder="Tulis artikel di sini. Paste gambar chart langsung dari clipboard (Ctrl + V) juga bisa."
                minHeight="320px"
              />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                {readingMinutes(draft.content)} min read · {plainText(draft.content, 60) || 'no text yet'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="input-control"
                placeholder="Search title, slug or tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '30px', width: '100%' }}
                aria-label="Search articles"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="admin-seg" role="tablist" aria-label="Filter articles">
                {(['all', 'published', 'draft'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === s}
                    className={statusFilter === s ? 'active' : ''}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'all' ? 'All' : s === 'published' ? 'Published' : 'Drafts'}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading} title="Refresh">
                <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setDraft(emptyDraft())}
                title="Write a new article"
              >
                <Plus size={14} /> New article
              </button>
            </div>
          </div>

          {loading && posts.length === 0 ? (
            <div style={{ padding: '10px 14px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<BookOpen size={20} />}
              title={posts.length === 0 ? 'No articles yet' : 'No matches'}
              description={
                posts.length === 0
                  ? 'Write the first post — run supabase_blog.sql first if the table does not exist yet.'
                  : 'Try a different search or filter.'
              }
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '18px' }}>Article</th>
                    <th>Status</th>
                    <th className="admin-hide-sm">Tags</th>
                    <th style={{ textAlign: 'right' }} className="admin-hide-sm">
                      Views
                    </th>
                    <th className="admin-hide-sm">Updated</th>
                    <th style={{ width: '210px', paddingRight: '14px', textAlign: 'right' }} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: '18px', maxWidth: '420px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          {p.coverImageUrl ? (
                            <img
                              src={p.coverImageUrl}
                              alt=""
                              style={{ width: '42px', height: '30px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                            />
                          ) : (
                            <span
                              style={{
                                width: '42px',
                                height: '30px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
                                flexShrink: 0
                              }}
                            >
                              <ImageIcon size={13} color="var(--text-muted)" />
                            </span>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {p.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.66rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              /blog/{p.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="admin-pill"
                          style={
                            p.status === 'published'
                              ? { color: 'var(--profit-green)', background: 'color-mix(in srgb, var(--profit-green) 14%, transparent)' }
                              : { color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }
                          }
                        >
                          {p.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        {p.status === 'published' && p.publishedAt && (
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            {fmtDay(p.publishedAt)}
                          </div>
                        )}
                      </td>
                      <td className="admin-hide-sm">
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="admin-pill" style={{ color: 'var(--text-secondary)' }}>
                              <TagIcon size={9} /> {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="admin-hide-sm" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {p.views}
                      </td>
                      <td className="admin-hide-sm" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <span title={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''}>
                          {fmtDay(p.updatedAt)}
                        </span>
                      </td>
                      <td style={{ paddingRight: '14px' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDraft(draftFromPost(p))}
                            title="Edit article"
                            aria-label={`Edit ${p.title}`}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => window.open(blogUrl(p.slug), '_blank', 'noopener')}
                            title="Open on the blog"
                            aria-label={`Open ${p.title} on the blog`}
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCopyLink(p.slug)}
                            title="Copy public link"
                            aria-label={`Copy link for ${p.title}`}
                          >
                            <Link2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleStatus(p)}
                            title={p.status === 'published' ? 'Unpublish (back to draft)' : 'Publish now'}
                          >
                            {p.status === 'published' ? <EyeOff size={12} /> : <Eye size={12} />}
                            {p.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(p)}
                            style={{ color: 'var(--loss-red)' }}
                            title="Delete article"
                            aria-label={`Delete ${p.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div style={{ ...panelStyle, padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <ShieldCheck size={16} color="var(--theme-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong>Only administrators can publish.</strong> Articles live in <code>public.blog_posts</code> with RLS:
          anonymous visitors can read published posts, everyone else is blocked from writing. Run{' '}
          <code>supabase_blog.sql</code> once in the Supabase SQL editor.
          <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>
              <CalendarClock size={11} /> Public page: <code>/blog</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
