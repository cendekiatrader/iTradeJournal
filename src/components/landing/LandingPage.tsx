import React, { useState } from 'react';
import {
  TrendingUp,
  LogIn,
  UserPlus,
  Play,
  BarChart3,
  ShieldCheck,
  Crosshair,
  Sparkles,
  MessageSquare,
  WifiOff,
  CheckCircle2,
  Globe,
  Newspaper
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenDemo: () => void;
}

type Lang = 'id' | 'en';

interface FeatureCopy {
  title: string;
  desc: string;
}

interface StepCopy {
  title: string;
  desc: string;
}

interface FaqCopy {
  q: string;
  a: string;
}

interface LandingCopy {
  navSignIn: string;
  navSignUp: string;
  navBlog: string;
  badge: string;
  title: string;
  sub: string;
  ctaPrimary: string;
  ctaDemo: string;
  demoNote: string;
  imageCaption: string;
  featuresTitle: string;
  featuresSub: string;
  features: FeatureCopy[];
  howTitle: string;
  steps: StepCopy[];
  faqTitle: string;
  faq: FaqCopy[];
  finalTitle: string;
  finalSub: string;
  footerNote: string;
}

const COPY: Record<Lang, LandingCopy> = {
  id: {
    navSignIn: 'Masuk',
    navSignUp: 'Daftar Gratis',
    navBlog: 'Blog',
    badge: 'Jurnal trading + analytics untuk trader serius',
    title: 'Ubah catatan trading jadi edge yang nyata',
    sub: 'Satu tempat untuk jurnal multi-akun, statistik performa, alat risiko prop firm, dan review mentor — supaya kamu tahu persis dari mana profit (dan loss) datang.',
    ctaPrimary: 'Mulai Gratis',
    ctaDemo: 'Coba Demo — tanpa daftar',
    demoNote: 'Demo langsung dengan data contoh. Tanpa akun, tanpa kartu kredit.',
    imageCaption: 'Dashboard iTradeJournal dengan statistik trading',
    featuresTitle: 'Bukan sekadar catatan — ini alat keputusan',
    featuresSub: 'Semua yang kamu butuhkan untuk trading yang konsisten.',
    features: [
      {
        title: 'Analytics Multi-Akun',
        desc: 'Win rate, profit factor, expectancy, R:R per akun, sesi, dan setup. Equity curve dan kalender PnL.'
      },
      {
        title: 'Prop Firm Ready',
        desc: 'Tracker drawdown harian & maks, preset aturan ala FTMO, buffer challenge terlihat real-time.'
      },
      {
        title: 'Toolkit SMC',
        desc: 'Sesi & killzone, setup queue dengan checklist, playbook pribadi, catatan rich-text + gambar.'
      },
      {
        title: 'Insight Otomatis',
        desc: 'Sistem menyorot pola dari datamu sendiri: jam terbaik, kesalahan berulang, kualitas eksekusi.'
      },
      {
        title: 'Review Mentor',
        desc: 'Bagikan link read-only; mentor berkomentar langsung di trade pilihanmu.'
      },
      {
        title: 'PWA & Offline',
        desc: 'Install di HP atau desktop, tetap jalan offline, sinkron otomatis saat online lagi.'
      }
    ],
    howTitle: 'Mulai dalam 3 langkah',
    steps: [
      { title: 'Catat', desc: 'Input trade 20 detik, lampirkan chart, atau impor CSV broker.' },
      { title: 'Analisis', desc: 'Dashboard, equity curve, dan insight otomatis terbentuk sendiri.' },
      { title: 'Perbaiki', desc: 'Review mingguan dengan statistik, jaga aturan risiko, ulangi yang bekerja.' }
    ],
    faqTitle: 'Pertanyaan umum',
    faq: [
      {
        q: 'Apakah benar-benar gratis?',
        a: 'Ya — daftar gratis dan langsung mulai journaling. Fitur inti jurnal & analytics tidak berbayar.'
      },
      {
        q: 'Data saya aman?',
        a: 'Data dienkripsi di cloud dan terisolasi per akun (row-level security). Mode lokal/offline juga tersedia.'
      },
      {
        q: 'Bisa impor dari broker?',
        a: 'Bisa. Impor CSV dari MT4/MT5 dan platform populer, atau input manual dengan quick form.'
      },
      {
        q: 'Bisa dipakai di HP?',
        a: 'Bisa — install sebagai aplikasi (PWA) di Android, iOS, atau desktop dan tetap jalan offline.'
      }
    ],
    finalTitle: 'Siap lihat di mana edge-mu sebenarnya?',
    finalSub: 'Gratis untuk mulai. Coba demo dulu kalau masih ragu.',
    footerNote: 'Dibuat untuk trader yang serius mengukur performa.'
  },
  en: {
    navSignIn: 'Sign In',
    navSignUp: 'Sign Up Free',
    navBlog: 'Blog',
    badge: 'Trading journal + analytics for serious traders',
    title: 'Turn your trading notes into a real edge',
    sub: 'One place for a multi-account journal, performance stats, prop-firm risk tools, and mentor review — so you know exactly where your money comes from.',
    ctaPrimary: 'Start Free',
    ctaDemo: 'Try the Demo — no signup',
    demoNote: 'Instant demo with sample data. No account, no credit card.',
    imageCaption: 'iTradeJournal dashboard with trading statistics',
    featuresTitle: 'More than notes — a decision tool',
    featuresSub: 'Everything you need to trade consistently.',
    features: [
      {
        title: 'Multi-Account Analytics',
        desc: 'Win rate, profit factor, expectancy, R:R across accounts, sessions, and setups. Equity curve and PnL calendar.'
      },
      {
        title: 'Prop-Firm Ready',
        desc: 'Daily & max drawdown tracking, FTMO-style rule presets, live buffer visibility for your challenge.'
      },
      {
        title: 'SMC Toolkit',
        desc: 'Sessions & killzones, setup queue with checklists, personal playbooks, rich-text notes with images.'
      },
      {
        title: 'Automatic Insights',
        desc: 'The system surfaces patterns from your own data: best hours, repeated mistakes, execution quality.'
      },
      {
        title: 'Mentor Review',
        desc: 'Share a read-only link; your mentor comments directly on selected trades.'
      },
      {
        title: 'PWA & Offline',
        desc: 'Install on phone or desktop, keep working offline, sync automatically when back online.'
      }
    ],
    howTitle: 'Get started in 3 steps',
    steps: [
      { title: 'Record', desc: 'Log a trade in 20 seconds, attach charts, or import a broker CSV.' },
      { title: 'Analyze', desc: 'Dashboard, equity curve, and automatic insights build themselves.' },
      { title: 'Improve', desc: 'Weekly review with stats, follow your risk rules, repeat what works.' }
    ],
    faqTitle: 'Frequently asked',
    faq: [
      {
        q: 'Is it really free?',
        a: 'Yes — sign up free and start journaling. Core journal & analytics features are free.'
      },
      {
        q: 'Is my data safe?',
        a: 'Data is encrypted in the cloud and isolated per account (row-level security). A local/offline mode is also available.'
      },
      {
        q: 'Can I import from my broker?',
        a: 'Yes. Import CSV from MT4/MT5 and popular platforms, or add trades manually.'
      },
      {
        q: 'Does it work on mobile?',
        a: 'Yes — install it as an app (PWA) on Android, iOS, or desktop and keep working offline.'
      }
    ],
    finalTitle: 'Ready to see where your edge really is?',
    finalSub: 'Free to start. Try the demo first if you are not sure.',
    footerNote: 'Built for traders who measure seriously.'
  }
};

const FEATURE_ICONS = [BarChart3, ShieldCheck, Crosshair, Sparkles, MessageSquare, WifiOff];

const LANDING_CSS = `
  .landing-lang-btn {
    border: none;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    cursor: pointer;
    font-family: var(--font-mono);
    background: transparent;
    color: var(--text-secondary);
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .landing-lang-btn.is-active {
    background: var(--theme-secondary-strong);
    color: #ffffff;
  }
  .landing-feature-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 22px;
    text-align: left;
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }
  .landing-feature-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--theme-secondary-strong) 45%, var(--border-subtle));
    box-shadow: 0 16px 36px -20px rgba(0, 0, 0, 0.85);
  }
  .landing-faq summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .landing-faq summary::-webkit-details-marker { display: none; }
  .landing-faq summary::after {
    content: '+';
    font-weight: 800;
    color: var(--theme-secondary);
    font-size: 1.05rem;
    line-height: 1;
  }
  .landing-faq[open] summary::after { content: '\\2212'; }
  @media (max-width: 640px) {
    .landing-hero-pad { padding: 44px 18px 22px !important; }
  }
`;

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onOpenDemo }) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem('itrade_landing_lang') === 'en' ? 'en' : 'id';
    } catch {
      return 'id';
    }
  });

  const t = COPY[lang];

  const changeLang = (next: Lang) => {
    setLang(next);
    try {
      localStorage.setItem('itrade_landing_lang', next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="landing-root"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      <style>{LANDING_CSS}</style>

      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-180px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '480px',
          background:
            'radial-gradient(ellipse at center, color-mix(in srgb, var(--theme-secondary-strong) 18%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '420px',
          right: '-220px',
          width: '520px',
          height: '520px',
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 12%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Public nav */}
      <header
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.01em' }}>
          <span
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--theme-secondary-strong) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 35%, transparent)'
            }}
          >
            <TrendingUp size={16} color="var(--theme-secondary)" />
          </span>
          iTradeJournal
        </span>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '3px',
              borderRadius: '999px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Globe size={13} color="var(--text-muted)" style={{ margin: '0 4px' }} />
            {(['id', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => changeLang(l)}
                className={`landing-lang-btn${lang === l ? ' is-active' : ''}`}
                aria-pressed={lang === l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <a
            href="/blog"
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
          >
            <Newspaper size={14} /> {t.navBlog}
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenAuth('signin')}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <LogIn size={14} /> {t.navSignIn}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onOpenAuth('signup')}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <UserPlus size={14} /> {t.navSignUp}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section
        className="landing-hero-pad"
        style={{ position: 'relative', zIndex: 2, maxWidth: '860px', margin: '0 auto', padding: '64px 24px 30px', textAlign: 'center' }}
      >
        <h1
          style={{
            marginTop: '22px',
            fontSize: 'clamp(2rem, 5.2vw, 3.35rem)',
            lineHeight: 1.08,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--theme-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {t.title}
        </h1>
        <p
          style={{
            marginTop: '18px',
            fontSize: 'clamp(0.95rem, 1.6vw, 1.08rem)',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          {t.sub}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '30px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenAuth('signup')}
            style={{ padding: '13px 26px', fontSize: '0.95rem', fontWeight: 800 }}
          >
            <UserPlus size={16} /> {t.ctaPrimary}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenDemo}
            style={{ padding: '13px 24px', fontSize: '0.95rem', fontWeight: 700 }}
          >
            <Play size={15} /> {t.ctaDemo}
          </button>
        </div>

        <p style={{ marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          <CheckCircle2 size={13} color="var(--theme-secondary)" /> {t.demoNote}
        </p>
      </section>

      {/* Hero screenshot */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '1080px', margin: '22px auto 0', padding: '0 24px' }}>
        <div
          style={{
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow:
              '0 30px 80px -30px rgba(0, 0, 0, 0.9), 0 0 60px color-mix(in srgb, var(--theme-secondary-strong) 10%, transparent)',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <img src="./landing-hero.png" alt={t.imageCaption} fetchPriority="high" style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1120px', margin: '0 auto', padding: '78px 24px 10px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.45rem, 3vw, 2.1rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.featuresTitle}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px' }}>{t.featuresSub}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '36px' }}>
          {t.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] || BarChart3;
            return (
              <div key={f.title} className="landing-feature-card">
                <span
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 26%, transparent)'
                  }}
                >
                  <Icon size={18} color="var(--theme-secondary)" />
                </span>
                <h3 style={{ marginTop: '14px', fontSize: '0.98rem', fontWeight: 800 }}>{f.title}</h3>
                <p style={{ marginTop: '7px', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Steps */}
      <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '70px 24px 10px', position: 'relative', zIndex: 2 }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.45rem, 3vw, 2.1rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.howTitle}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '36px' }}>
          {t.steps.map((s, i) => (
            <div key={s.title} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '22px', textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: 'var(--theme-secondary)',
                  border: '2px solid color-mix(in srgb, var(--theme-secondary-strong) 45%, transparent)'
                }}
              >
                {i + 1}
              </span>
              <h3 style={{ marginTop: '13px', fontSize: '1rem', fontWeight: 800 }}>{s.title}</h3>
              <p style={{ marginTop: '7px', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: '780px', margin: '0 auto', padding: '70px 24px 10px', position: 'relative', zIndex: 2 }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.45rem, 3vw, 2.1rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>{t.faqTitle}</h2>
        <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {t.faq.map((f) => (
            <details key={f.q} className="landing-faq" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px 18px' }}>
              <summary style={{ fontSize: '0.9rem', fontWeight: 700 }}>{f.q}</summary>
              <p style={{ marginTop: '10px', fontSize: '0.84rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '760px', margin: '0 auto', padding: '80px 24px 90px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>{t.finalTitle}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '12px' }}>{t.finalSub}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '26px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenAuth('signup')}
            style={{ padding: '12px 24px', fontSize: '0.92rem', fontWeight: 800 }}
          >
            <UserPlus size={15} /> {t.ctaPrimary}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenDemo}
            style={{ padding: '12px 22px', fontSize: '0.92rem', fontWeight: 700 }}
          >
            <Play size={14} /> {t.ctaDemo}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '24px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} iTradeJournal · {t.footerNote}
        </span>
      </footer>
    </div>
  );
};
