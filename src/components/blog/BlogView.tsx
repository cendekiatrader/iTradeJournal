import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  Link2,
  LogIn,
  Search,
  Tag as TagIcon,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import {
  BlogPost,
  fetchPublishedPostBySlug,
  fetchPublishedPosts,
  incrementBlogViews,
  plainText,
  readingMinutes,
  sanitizeBlogHtml
} from '../../utils/blog';

interface BlogViewProps {
  /** null = article index, otherwise the article slug. */
  slug: string | null;
  onNavigate: (slug: string | null) => void;
  onBackToApp: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  signedIn: boolean;
}

const formatBlogDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

const tagList = (post: BlogPost): string[] => (Array.isArray(post.tags) ? post.tags.filter(Boolean) : []);

const CoverArt: React.FC<{ post: BlogPost; height: number; radius?: string }> = ({ post, height, radius = '14px' }) => {
  if (post.coverImageUrl) {
    return (
      <img
        src={post.coverImageUrl}
        alt={post.title}
        loading="lazy"
        style={{ width: '100%', height, objectFit: 'cover', borderRadius: radius, display: 'block' }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--theme-secondary-strong) 22%, transparent), color-mix(in srgb, var(--theme-primary) 18%, transparent))',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <BookOpen size={Math.min(34, height / 3)} color="var(--theme-secondary)" />
    </div>
  );
};

export const BlogView: React.FC<BlogViewProps> = ({ slug, onNavigate, onBackToApp, onOpenAuth, signedIn }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const countedRef = useRef<string | null>(null);

  // Feed
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await fetchPublishedPosts();
      if (!alive) return;
      setPosts(list);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Single article
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!slug) {
      setPost(null);
      setMissing(false);
      return;
    }
    let alive = true;
    setPostLoading(true);
    setMissing(false);
    (async () => {
      let found: BlogPost | null = null;
      if (posts.length > 0) found = posts.find((p) => p.slug === slug) || null;
      if (!found) found = await fetchPublishedPostBySlug(slug);
      if (!alive) return;
      setPost(found);
      setMissing(!found);
      setPostLoading(false);
      if (found && countedRef.current !== found.slug) {
        countedRef.current = found.slug;
        const views = await incrementBlogViews(found.slug);
        if (alive && views > 0) setPost((prev) => (prev ? { ...prev, views } : prev));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, posts.length]);

  // Per-page metadata
  useEffect(() => {
    const prevTitle = document.title;
    const descMeta = document.querySelector('meta[name="description"]');
    const prevDesc = descMeta?.getAttribute('content') || '';
    if (slug && post) {
      document.title = `${post.title} — Blog iTradeJournal`;
      const desc = post.excerpt || plainText(post.content, 155);
      if (descMeta && desc) descMeta.setAttribute('content', desc);
    } else {
      document.title = 'Blog — iTradeJournal';
    }
    return () => {
      document.title = prevTitle;
      if (descMeta) descMeta.setAttribute('content', prevDesc);
    };
  }, [slug, post]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => tagList(p).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchTag = !activeTag || tagList(p).includes(activeTag);
      if (!matchTag) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        plainText(p.content, 400).toLowerCase().includes(q) ||
        tagList(p).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeTag]);

  const copyLink = async (target: BlogPost) => {
    const url = `${window.location.origin}/blog/${target.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const related = useMemo(() => {
    if (!post) return [];
    const tags = tagList(post);
    return posts.filter((p) => p.slug !== post.slug && tagList(p).some((t) => tags.includes(t))).slice(0, 3);
  }, [posts, post]);

  return (
    <div className="blog-page">
      <header className="blog-topbar">
        <button type="button" className="blog-brand" onClick={() => onNavigate(null)} aria-label="iTradeJournal Blog">
          <span className="blog-brand-mark">
            <TrendingUp size={16} color="#fff" />
          </span>
          <span style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>iTradeJournal</span>
          <span className="blog-brand-chip">Blog</span>
        </button>

        <div className="blog-topbar-actions">
          {(post || slug) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate(null)}>
              <ArrowLeft size={14} /> Semua artikel
            </button>
          )}
          {signedIn ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToApp}>
              Buka Jurnal <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenAuth('signin')}>
                <LogIn size={14} /> Masuk
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenAuth('signup')}>
                <UserPlus size={14} /> Daftar Gratis
              </button>
            </>
          )}
        </div>
      </header>

      {slug ? (
        <main className="blog-shell">
          {postLoading && !post && <p className="blog-muted">Memuat artikel…</p>}

          {!postLoading && missing && (
            <div className="blog-empty">
              <h1 className="blog-empty-title">Artikel tidak ditemukan</h1>
              <p className="blog-muted">Tautan mungkin salah, atau artikel sudah tidak dipublikasikan.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate(null)}>
                <ArrowLeft size={14} /> Kembali ke daftar artikel
              </button>
            </div>
          )}

          {post && (
            <article className="blog-article">
              <button type="button" className="blog-back" onClick={() => onNavigate(null)}>
                <ArrowLeft size={14} /> Blog
              </button>

              <h1 className="blog-article-title">{post.title}</h1>
              {post.excerpt && <p className="blog-article-lead">{post.excerpt}</p>}

              <div className="blog-meta">
                {post.authorName && <span>{post.authorName}</span>}
                <span>
                  <Calendar size={13} /> {formatBlogDate(post.publishedAt || post.createdAt)}
                </span>
                <span>
                  <Clock size={13} /> {readingMinutes(post.content)} menit baca
                </span>
                <span>
                  <Eye size={13} /> {post.views} kali dibaca
                </span>
              </div>

              {post.coverImageUrl && (
                <img src={post.coverImageUrl} alt={post.title} className="blog-article-cover" />
              )}

              <div
                className="blog-article-body rich-notes-content"
                dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
              />

              {tagList(post).length > 0 && (
                <div className="blog-tags">
                  {tagList(post).map((t) => (
                    <span key={t} className="blog-tag">
                      <TagIcon size={11} /> {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="blog-article-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyLink(post)}>
                  <Link2 size={14} /> {copied ? 'Link disalin!' : 'Salin link artikel'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate(null)}>
                  <ArrowLeft size={14} /> Artikel lainnya
                </button>
              </div>

              {related.length > 0 && (
                <section className="blog-related">
                  <h2 className="blog-section-title">Artikel terkait</h2>
                  <div className="blog-grid">
                    {related.map((r) => (
                      <button key={r.id} type="button" className="blog-card" onClick={() => onNavigate(r.slug)}>
                        <CoverArt post={r} height={132} radius="12px" />
                        <h3 className="blog-card-title">{r.title}</h3>
                        <p className="blog-card-excerpt">{r.excerpt || plainText(r.content, 110)}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!signedIn && (
                <div className="blog-cta">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>Catat & ukur trading kamu</div>
                    <p className="blog-muted" style={{ marginTop: '4px' }}>
                      Jurnal multi-akun, statistik performa, dan alat risiko prop firm. Gratis untuk mulai.
                    </p>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenAuth('signup')}>
                    <UserPlus size={14} /> Mulai gratis
                  </button>
                </div>
              )}
            </article>
          )}
        </main>
      ) : (
        <main className="blog-shell">
          <section className="blog-hero">
            <span className="blog-hero-chip">
              <BookOpen size={13} /> Blog iTradeJournal
            </span>
            <h1 className="blog-hero-title">Catatan, riset, dan pelajaran dari meja trading</h1>
            <p className="blog-hero-sub">
              Artikel tentang manajemen risiko, psikologi, jurnal trading, dan cara membaca performa secara objektif.
            </p>
          </section>

          {!loading && posts.length > 0 && (
            <div className="blog-filters">
              <div className="blog-search">
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari artikel…"
                  aria-label="Cari artikel blog"
                />
              </div>
              <div className="blog-tagbar">
                <button
                  type="button"
                  className={`blog-tag-btn${activeTag === null ? ' active' : ''}`}
                  onClick={() => setActiveTag(null)}
                >
                  Semua
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`blog-tag-btn${activeTag === t ? ' active' : ''}`}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="blog-muted" style={{ padding: '20px 0' }}>
              Memuat artikel…
            </p>
          ) : posts.length === 0 ? (
            <div className="blog-empty">
              <h2 className="blog-empty-title">Belum ada artikel</h2>
              <p className="blog-muted">
                Artikel pertama akan muncul di sini setelah admin mempublikasikannya dari Admin Console → Blog.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="blog-empty">
              <h2 className="blog-empty-title">Tidak ada hasil</h2>
              <p className="blog-muted">Coba kata kunci lain atau pilih kategori yang berbeda.</p>
            </div>
          ) : (
            <div className="blog-grid">
              {filtered.map((p) => (
                <button key={p.id} type="button" className="blog-card" onClick={() => onNavigate(p.slug)}>
                  <CoverArt post={p} height={158} />
                  <div className="blog-card-tags">
                    {tagList(p)
                      .slice(0, 2)
                      .map((t) => (
                        <span key={t} className="blog-tag">
                          {t}
                        </span>
                      ))}
                  </div>
                  <h2 className="blog-card-title">{p.title}</h2>
                  <p className="blog-card-excerpt">{p.excerpt || plainText(p.content, 140)}</p>
                  <div className="blog-card-meta">
                    <span>{formatBlogDate(p.publishedAt || p.createdAt)}</span>
                    <span>
                      <Clock size={12} /> {readingMinutes(p.content)} menit
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      <footer className="blog-footer">
        <span>© {new Date().getFullYear()} iTradeJournal</span>
        <button type="button" className="blog-footer-link" onClick={onBackToApp}>
          Buka aplikasi jurnal
        </button>
      </footer>
    </div>
  );
};
