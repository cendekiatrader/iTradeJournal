import { supabase } from './supabase';

/**
 * Blog data layer.
 *
 * Reading is public (RLS lets anon select published posts only); writing is
 * restricted to Supabase admins by the `blog_posts_admin_write` policy, so a
 * normal member cannot post an article even if they call the API directly.
 */

export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  tags: string[];
  status: BlogStatus;
  authorName: string | null;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  tags: string[];
  status: BlogStatus;
  authorName?: string | null;
}

const COLUMNS =
  'id, slug, title, excerpt, content, cover_image_url, tags, status, author_name, views, published_at, created_at, updated_at';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Author label that is safe to render on the public blog.
 *
 * Admin accounts sign in with an email, so the raw column can hold one — the
 * public page must never print it. Non-email display names pass through.
 */
export const publicAuthorName = (name?: string | null): string | null => {
  const trimmed = (name ?? '').trim();
  if (!trimmed || EMAIL_RE.test(trimmed)) return null;
  return trimmed;
};

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  status: string;
  author_name: string | null;
  views: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapRow = (row: BlogRow): BlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt || '',
  content: row.content || '',
  coverImageUrl: row.cover_image_url || null,
  tags: Array.isArray(row.tags) ? row.tags : [],
  status: row.status === 'published' ? 'published' : 'draft',
  authorName: publicAuthorName(row.author_name),
  views: Number(row.views || 0),
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

/** URL-safe slug: lowercase, accents stripped, non-alphanumerics collapsed to '-'. */
export const slugify = (input: string): string =>
  (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const readingMinutes = (html: string): number => {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export const plainText = (html: string, max = 180): string => {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

/**
 * Minimal allow-list sanitizer for post HTML.
 *
 * Only admins can write posts, but the article body is still rendered with
 * dangerouslySetInnerHTML on a public page, so scripts/iframes/event handlers
 * are stripped as defence in depth.
 */
export const sanitizeBlogHtml = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return '';

  const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta', 'base', 'svg'];
  FORBIDDEN_TAGS.forEach((tag) => {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  });

  root.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      const isEvent = name.startsWith('on');
      const isJsUrl = (name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:');
      const isDataHtml = name === 'src' && value.startsWith('data:text/html');
      if (isEvent || isJsUrl || isDataHtml) el.removeAttribute(attr.name);
    });
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }
  });

  return root.innerHTML;
};

/* ------------------------------------------------------------------ *
 * Public reads
 * ------------------------------------------------------------------ */

export const fetchPublishedPosts = async (): Promise<BlogPost[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(COLUMNS)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(120);
    if (error) throw error;
    return (data || []).map((r) => mapRow(r as BlogRow));
  } catch {
    return [];
  }
};

export const fetchPublishedPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  if (!supabase || !slug) return null;
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as BlogRow) : null;
  } catch {
    return null;
  }
};

/** Best-effort public view counter (RPC is security definer, published only). */
export const incrementBlogViews = async (slug: string): Promise<number> => {
  if (!supabase || !slug) return 0;
  try {
    const { data, error } = await supabase.rpc('blog_increment_views', { p_slug: slug });
    if (error) throw error;
    return Number(data || 0);
  } catch {
    return 0;
  }
};

/* ------------------------------------------------------------------ *
 * Admin media upload (bucket `blog-media`)
 * ------------------------------------------------------------------ */

export const uploadBlogImage = async (file: File | Blob, filename: string): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const safe = (filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `blog/${Date.now()}_${safe}`;
    const { data, error } = await supabase.storage.from('blog-media').upload(filePath, file, {
      cacheControl: '31536000',
      upsert: true
    });
    if (error) throw error;
    if (!data) return null;
    const { data: publicData } = supabase.storage.from('blog-media').getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  } catch (err) {
    console.error('Error uploading blog image:', err);
    return null;
  }
};

/* ------------------------------------------------------------------ *
 * Admin writes (RLS: is_admin() only)
 * ------------------------------------------------------------------ */

export const fetchBlogPostsForAdmin = async (): Promise<BlogPost[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data || []).map((r) => mapRow(r as BlogRow));
  } catch {
    return [];
  }
};

/** True when the slug is free (or already owned by `exceptId`). */
export const isSlugAvailable = async (slug: string, exceptId?: string): Promise<boolean> => {
  if (!supabase || !slug) return false;
  try {
    const { data, error } = await supabase.from('blog_posts').select('id').eq('slug', slug).limit(1);
    if (error) throw error;
    const hit = (data || [])[0];
    return !hit || hit.id === exceptId;
  } catch {
    return false;
  }
};

export const createBlogPost = async (
  input: BlogPostInput
): Promise<{ ok: boolean; error?: string; post?: BlogPost }> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data: auth } = await supabase.auth.getUser();
    const publishedAt = input.status === 'published' ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        cover_image_url: input.coverImageUrl,
        tags: input.tags,
        status: input.status,
        author_id: auth?.user?.id ?? null,
        author_name: input.authorName || null,
        published_at: publishedAt
      })
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    return { ok: true, post: data ? mapRow(data as BlogRow) : undefined };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Insert failed' };
  }
};

export const updateBlogPost = async (
  id: string,
  input: BlogPostInput,
  currentPublishedAt: string | null
): Promise<{ ok: boolean; error?: string; post?: BlogPost }> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const publishedAt =
      input.status === 'published' ? currentPublishedAt || new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        cover_image_url: input.coverImageUrl,
        tags: input.tags,
        status: input.status,
        published_at: publishedAt
      })
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    return { ok: true, post: data ? mapRow(data as BlogRow) : undefined };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Update failed' };
  }
};

export const setBlogPostStatus = async (
  id: string,
  status: BlogStatus,
  currentPublishedAt: string | null
): Promise<{ ok: boolean; error?: string; publishedAt?: string | null }> => {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const publishedAt = status === 'published' ? currentPublishedAt || new Date().toISOString() : null;
    const { error } = await supabase
      .from('blog_posts')
      .update({ status, published_at: publishedAt })
      .eq('id', id);
    if (error) throw error;
    return { ok: true, publishedAt };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Update failed' };
  }
};

export const deleteBlogPost = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
};
