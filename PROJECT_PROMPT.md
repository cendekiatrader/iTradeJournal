# PROMPT — Konteks Lengkap Project iTradeJournal

> Salin seluruh isi file ini sebagai system/context prompt ke AI coding agent mana pun (Claude, Codex, Gemini, Cursor, Hermes, dll) sebelum mulai bekerja di repo ini.

---

## 0. Peran & Cara Kerja

Kamu adalah **senior full-stack engineer** yang bekerja di repo `D:\iTradeJournal` (Windows 11, shell: git-bash/MSYS, bukan PowerShell).

Aturan kerja yang wajib kamu patuhi:

1. **Baca dulu, ubah kemudian.** Gunakan `read_file` / `search_files` untuk melacak simbol ke definisinya sebelum mengedit. Jangan pernah mengarang nama file, simbol, API, atau import.
2. **Kerjakan lewat tool, bukan lewat chat.** Tulis perubahan ke file (`patch`/`write_file`), lalu rangkum. Jangan menempelkan blok kode besar di chat sebagai pengganti edit.
3. **Sentuh seminimal mungkin.** Tidak ada refactor/rename/reformat di luar lingkup tugas.
4. **Verifikasi nyata sebelum klaim selesai.** Urutan wajib: `npx tsc --noEmit` → `npm run build` → uji runtime di browser untuk perubahan UI.
5. **Jangan commit / push / rewrite history** kecuali diminta eksplisit.
6. **JANGAN PERNAH membaca atau mencetak `.env`** (berisi kredensial Supabase).
7. Gaya komunikasi user: **Bahasa Indonesia, sangat singkat, tabel untuk perbandingan**, lapor dengan format: apa yang berubah → bukti verifikasi → sisa yang harus dilakukan user sendiri.

---

## 1. Apa Itu iTradeJournal

Aplikasi web **trading journal pribadi** untuk trader (khususnya trader prop-firm & forex/crypto dengan gaya SMC / partial-close), dibangun dan dikembangkan sendiri oleh user.

Fungsi intinya:

- Mencatat trade secara detail (entry, exit bertahap/partial close, SL/TP, RR, sesi, setup, emosi, rule-following, screenshot before/after).
- Mengelola banyak akun (prop firm challenge, live, demo, funded) beserta target profit, batas drawdown harian/maksimum, komisi, swap, pajak, dan penarikan profit (withdrawal).
- Menganalisis performa: winrate, profit factor, expectancy, RR, equity curve, drawdown, matriks winrate×RRR, holding-duration matrix, Monte Carlo, insight otomatis per setup/sesi/emosi.
- Membangun disiplin: playbook trading, setup queue (watchlist ide trade), weekly review wizard, trade audit trail, deteksi rule-break & overtrading.
- **Coaching/mentoring**: mentor (role dari admin) bisa melihat jurnal murid read-only, memberi catatan per trade, chat 2 arah, dan broadcast satu arah ke semua member.
- **Admin console** di `/admin`: statistik platform, daftar user, detail user, suspend/hapus user, inbox feedback, publish announcement, backup penuh seluruh database.
- Berjalan **offline-first** (localStorage) dan **opsional tersinkron ke cloud** (Supabase) saat user login. Ada **demo mode** tanpa akun, dan **landing page publik** bilingual (ID/EN) saat belum login.
- PWA: install prompt + update prompt (service worker network-first).

Status: **aktif dikembangkan**, sudah production di `itradejournal.vercel.app`, source di GitHub `cendekiatrader/iTradeJournal`.

---

## 2. Stack & Tooling

| Lapisan | Teknologi |
|---|---|
| UI | React 18 + TypeScript 5.6 (`strict`), SPA, tidak ada react-router (routing manual via state tab + hash) |
| Build | Vite 6 (`@vitejs/plugin-react`), `tsc && vite build` |
| Styling | **Tailwind v4 CSS-first** — `@import "tailwindcss"` + blok `@theme` di `src/index.css`; **`tailwind.config.js` sudah DIHAPUS**; hanya utility standar yang dipakai (flex, gap, animate-ping) |
| Ikon | `lucide-react` (verifikasi dulu nama ikon sebelum dipakai) |
| Backend | Supabase (`@supabase/supabase-js` 2.x) — Postgres + Auth + RLS + Storage + SECURITY DEFINER RPC. **Semua query privileged lewat RPC/SQL, service key tidak pernah dikirim ke browser** |
| Ekstra | `canvas-confetti` (gated performance mode), `@vercel/analytics` |
| Deploy | Vercel (static), `vercel.json` mengatur cache header + rewrite `/admin` → `/index.html` |
| Dependensi yang sudah DIHAPUS | `tesseract.js` — jangan ditambahkan lagi kecuali mengimplementasikan OCR auto-fill |

**Scripts:** `npm run dev` (vite), `npm run build` (tsc + vite build), `npm run preview`.
**Ukuran source:** ~30.725 baris di `src/` (90 file .ts/.tsx/.css).

---

## 3. Struktur Direktori

```
src/
  main.tsx                     entry; applyUiPrefs() dipanggil di awal
  App.tsx            (658)     shell utama: state tab aktif, goToTab(), shortcut global, layout sidebar/mobile, Suspense untuk lazy views
  index.css         (1476)     design token + tema + SEMUA CSS kustom (termasuk CSS admin console)
  types/index.ts     (244)     seluruh tipe domain
  admin/
    AdminApp.tsx    (1799)     halaman /admin (lazy chunk) + UI console
    adminApi.ts      (511)     fetcher admin (RPC + paging + full backup)
  context/
    JournalContext.tsx (993)   sumber kebenaran data: accounts, trades, trashedTrades, withdrawals, playbooks, toast, demo mode, cloud sync, audit, sample data
    AuthContext.tsx            sesi Supabase + guard identitas user
    ThemeContext.tsx           5 tema via [data-theme]
  components/
    navigation/navCatalog.ts   NavTab + NAV_MODULES (urutan, tier, label, ikon) + SETTINGS_MODULE + NAV_META
    navigation/NavMenu.tsx     render daftar menu (badge dari useJournal + useNavPrefs)
    Sidebar.tsx                chrome sidebar saja (brand, collapse, kartu akun); re-export NavTab/NAV_META/NAV_MODULES
    Navbar.tsx                 account switcher, bell notifikasi, stealth, palette trigger, Log Trade (TIDAK ada tombol user lagi)
    MobileNav.tsx              bottom nav ≤768px
    dashboard/                 DashboardView, ActivationPanel (first-run), InsightsCard, PropFirmGauge
    journal/                   JournalView, TradeFormModal (1421 baris), TradeDetailModal, TrashModal, BeforeAfterSlider
    accounts/                  AccountsView, AccountFormModal, WithdrawModal, OnboardingAccountModal
    analytics/                 AnalyticsView, WinrateRRRMatrix, HoldingDurationMatrix, MonteCarloView
    calendar/CalendarView      playbook/ (View+Modal)     queue/SetupQueueView
    news/EconomicCalendarView  review/ (ReviewView, WeeklyReviewModal)   reports/ExecutiveReportModal
    calculator/                RiskCalculatorView, QuickRiskDock, KellyRiskSimulator, CompoundingPlanner, VisualRiskRewardOverlay
    coaching/                  CoachingView (801), CoachChatModal, TradeCoachNotes
    workspace/WorkspaceView (1020)  multi-chart TradingView + modul panel
    settings/SettingsView (663)     tab Settings (account, appearance, navigasi, data/backup, help)
    profile/                   ProfileSettingsModal, PublicProfileView (halaman publik #/u/…)
    review/ReviewView          halaman publik review #/review/…
    landing/LandingPage (592)  landing bilingual saat belum login
    auth/                      AuthModal, ResetPasswordModal, SuspendedScreen, AuthLockScreen (sudah tidak dirender)
    common/                    NotificationCenter (603), CommandPalette, ThemeSelectorModal, RichTextEditor, Skeleton,
                               StatCard, Toast, ConfirmDialog, EmptyState, ErrorBoundary, EquityChart, MarketSessionClock,
                               KeyboardShortcutsModal, FeedbackModal, AnnouncementBanner, DemoModeBanner,
                               ProductTour, PWAInstallPrompt, PWAUpdatePrompt
  hooks/useModalA11y.ts        focus trap + ESC + restore focus untuk modal
  data/  propFirmPresets.ts, seedData.ts
  utils/ storage.ts (localStorage), supabase.ts (618, SEMUA akses cloud), calculations.ts, insights.ts,
         monteCarlo.ts, formatters.ts, review.ts, coaching.ts, navPrefs.ts, uiPrefs.ts, demoMode.ts, feedback.ts
supabase/                      schema lama (di-superseded)
supabase_*.sql (root)          migrasi yang dijalankan manual di Supabase; lihat §7
scripts/cdp-mobile-check.py    cek layout mobile headless mandiri (tanpa browser harness)
public/                        sw.js, manifest, landing-hero.png, ikon
vercel.json                    cache header + rewrite /admin
```

---

## 4. Model Data (ringkasan `src/types/index.ts`)

- **TradingAccount** — id, name, type (`Prop Firm | Live Personal | Evaluation/Challenge | Demo | Funded Account`), broker, currency, initialBalance, currentBalance, targetProfit, maxDrawdownPercent, dailyDrawdownPercent, maxDrawdownAmount, status (`Active|Passed|Breached|Archived`), colorTag, commissionPerLot, swapPerLot, taxPercent, totalWithdrawn, notes, createdAt.
- **Trade** — accountId, symbol, assetClass, direction, entryDate/exitDate, timeframe, entryPrice/exitPrice, stopLoss, takeProfit, quantity, pnl, pnlPercent, pips, fees, rrPlanned/rrAchieved, session (`Asian|London|New York AM|New York PM|Off Session`), setup (StrategyType, mis. `SMC / Liquidity Sweep`, `HTF FVG & iFVG 50% CE`, `Turtle Soup Reversal`, `BOS Trend Continuation`, `BPR & Order Block`, …), emotion (`Disciplined|Confident|Neutral|FOMO|Revenge Trading|Hesitant / Fearful|Greedy|Overtrading`), rulesFollowed, confluences[], notes, lessons, screenshots[], status (`WIN|LOSS|BREAKEVEN|OPEN|CANCELLED`), **exits: TradeExit[]** (partial close: exitPrice, quantity, percentage, pnl, rrAchieved, label seperti TP1/TP2/Runner), customFields, `deletedAt?` (soft delete), createdAt, updatedAt.
- **AccountMetrics** — semua metrik terhitung: winRate, profitFactor, expectancy, avgRR, maxDrawdown(+%), bestTrade, worstTrade, consecutive wins/losses, currentStreak, avgHolding, dailyPnlMap, disciplineRate, recoveryFactor, longWinRate/shortWinRate, totalVolume, dailyRunRate, activeTradingDays.
- Lain-lain: **TradeExit, TradePrefill, TradeAuditEntry/TradeAuditChange, CustomFieldDef, TradeFilter, EquityPoint, PlaybookModel, WithdrawalRecord, UserProfile**.
- Perhitungan **selalu lewat `src/utils/`** (`calculations.ts`, `insights.ts`, `monteCarlo.ts`), bukan inline di komponen. `Trash` adalah **state terpisah** (`trashedTrades`) sehingga semua metrik/balance tidak pernah menghitung trade terhapus.

---

## 5. Navigasi, Menu, dan Routing

- **Tidak ada react-router.** `App.tsx` menyimpan `activeTab: NavTab`, dan **SEMUA** navigasi harus lewat `goToTab(tab)`.
- Sumber tunggal modul: `src/components/navigation/navCatalog.ts` → `NAV_MODULES` (id, label, ikon lucide, `tier: 'core'|'advanced'`) + `SETTINGS_MODULE` + `NAV_META` (label+ikon per tab). Urutan tab:
  1. **core** — dashboard (Dashboard), journal (Trade Log), calendar (Calendar View), accounts (Account Manager), coaching (Coaching)
  2. **advanced** — workspace, analytics (Analytics & Setups), playbook, queue (Setup Queue), news (Economic Calendar), calculator (Position Size Calc)
  3. **settings** — selalu terlihat, sengaja TIDAK ada di `NAV_MODULES` (escape hatch).
- **Progressive disclosure** (`src/utils/navPrefs.ts`): preferensi disimpan di `itrade_nav_prefs_v1` sebagai `{hidden: NavTab[]}`; **default = semua tab advanced disembunyikan**, jadi instalasi baru hanya menampilkan 5 modul core + Settings. API: `getNavPrefs/saveNavPrefs/setTabHidden/showAllTabs/resetNavPrefs/subscribeNavPrefs/useNavPrefs`, semuanya lewat window event `itrade-navprefs-changed` (pola yang sama dengan uiPrefs). Sidebar/MobileNav/CommandPalette men-subscribe dan memfilter. `setTabHidden` menolak menyembunyikan modul terakhir yang terlihat.
- Tab tersembunyi **tetap ditangani**: `goToTab(hiddenTab)` → toast (`NAV_META[tab].label` + arahkan ke Settings) dan mendarat di Settings. Karena itu shortcut keyboard, deep link (`#calculator`, `#queue`), dan lompatan command palette semua patuh pada preferensi.
- **Menambah modul baru = 3 langkah saja**: tambah entri di `navCatalog.ts`, tambah render branch di `App.tsx`, tambah ke `NavTab` type.
- Keyboard global di `App.tsx`: n/d/j/a/c/m/q/w/p/e, `?`, `Ctrl+K` (palette), `Ctrl+Enter` (submit); JournalView: `j/k/Enter/x`. Settings bisa dibuka dengan tombol `S`.
- Layout: `.sidebar-inner` sticky (`top:0; height:100vh; overflow-y:auto`) — **sticky hanya bekerja jika tidak ada ancestor yang menjadi scroll container**; `html, body` dan `.app-sidebar` memakai `overflow-x: clip` (BUKAN `hidden`) untuk alasan ini, sekaligus menjaga navbar sticky.
- Halaman non-SPA di dalam SPA: `/admin` (early branch di MainApp berdasarkan `window.location.pathname`), `#/u/<username>` (profil publik), `#/review/<token>` (review publik).

---

## 6. Fitur per Modul (yang sudah ada — jangan reinvent)

**Dashboard** — kartu ringkasan (bisa diatur, disimpan di `itrade_dashboard_cards`), equity chart, prop-firm gauge (target & sisa buffer drawdown), InsightsCard (observasi otomatis), tombol Weekly Review, **ActivationPanel** first-run (checklist: buat akun → trade pertama → buka analytics; ada `importSampleTrades()` dan tombol dismiss).

**Trade Log (JournalView)** — tabel dengan kolom yang bisa diatur (`itrade_journal_columns`) & density (`itrade_journal_density`), filter lengkap (akun, status, arah, asset class, setup, sesi, tanggal, pencarian), sort, saved views (`itrade_saved_views`), navigasi baris j/k/Enter, bulk action, tombol `Trash (n)`. **TradeFormModal** (terbesar): form penuh + partial close/exits berulang, custom fields, screenshot upload, rich text notes, draft otomatis (`itrade_trade_draft_v1`). **TradeDetailModal**: detail + PnL, perbandingan before/after (slider), riwayat audit dengan tombol **Revert**, dan section **TradeCoachNotes**.

**Trash / soft delete** — `itrade_trashed_trades_v1` sebagai array terpisah; `deleteTrade`/`bulkDeleteTrades` menandai `deletedAt`, toast Undo memanggil `restoreTrashedTrades`; auto-purge 30 hari saat mount; cloud memakai kolom `deleted_at` (hanya dikirim bila di-set, agar save lama tetap jalan sebelum migrasi dijalankan).

**Accounts** — multi akun + preset prop firm (`data/propFirmPresets.ts`), balance, target, drawdown harian/maks, komisi/swap/pajak, withdrawal (status Completed/Pending), hapus akun = **hard delete** (cascade).

**Analytics** — matriks winrate×RRR, holding-duration matrix, Monte Carlo, breakdown per setup/sesi/emosi/arah, equity & drawdown.

**Calendar** — kalender PnL harian per akun, klik hari untuk melihat trade.

**Playbook** — model/setup trading: aturan, confluence, kesalahan yang dihindari, chart before/after, rating bintang.

**Setup Queue** — watchlist ide trade dengan status; tersinkron ke tabel `user_settings`.

**Economic Calendar (News)** — agenda ekonomi via iframe/sumber eksternal.

**Calculator** — Risk calculator, **QuickRiskDock** (dock bawah, target hitung posisi cepat), Kelly simulator, compounding planner, overlay visual R:R. Catatan: template dokumen PiP di QuickRiskDock dan popup WorkspaceView memakai **hex literal, bukan CSS var** (dokumen terpisah tidak mewarisi var) — jangan disapu dalam sweep token.

**Workspace** — multi-chart TradingView (`config.charts: TvChartInstance[]`, maks 6, preset `CHART_SYMBOL_PRESETS`) + panel modul; `normalizeConfig(raw)` memigrasi config lama (termasuk `symbolTV` legacy) di localStorage maupun cloud; panel key `chart:<id>` / `module:<id>`; per-instance timeframe select, klik-untuk-edit simbol (commit Enter/blur), maximize, pop-out dengan nama window per instance (`itrade_popout_chart_<id>`); simbol di-escape (`escapeHtml`) karena dokumen pop-out se-origin. Grid memakai class `workspace-grid` agar media query ≤768px bisa menimpa track inline 460px.

**Coaching** — role mentor diberikan admin (bukan admin itu sendiri). Tabel: `mentors`, `mentor_links` (pending/active/rejected/revoked), `trade_notes`, `review_requests`, `coach_messages`, `mentor_broadcasts`. Semua lewat RPC `SECURITY DEFINER`. UI: murid melihat "My mentors / Request a mentor / Waiting for review", mentor HANYA melihat "Incoming requests / My students / Review requests" (render-gated `!overview.is_mentor`). Chat polling 6 detik; broadcast satu arah (RPC memaksa `is_mentor`/`is_admin`).

**Settings** — Account (link portofolio publik, log out), Appearance & Comfort (tema, dim, performance, stealth), Navigation & Modules (show/hide per modul, Show All, Simple Default), Data & Backup (CSV export, JSON backup via `exportDatabaseToJSON` yang sekaligus menstempel `itrade_last_backup_at`, import, reset-all), Help & Support (shortcut modal, feedback).

**NotificationCenter** (di Navbar) — alert dihitung live per akun: pemakaian daily loss ≥50%, buffer drawdown <35%, mentor comment (cloud), pengingat backup (trade ada & terakhir export kosong/≥14 hari). **ID alert harus VERSIONED** agar bisa memicu ulang: `daily-{accId}-{YYYY-MM-DD}-{level}`, `dd-{accId}-{bucket}-{level}`, `backup-{date|never}`, `comment-{id}`, `note-{id}`, `ann-{id}`. Read/dismiss = array id di `itrade_notif_read_v1` / `itrade_notif_dismissed_v1` (cap 200); badge = jumlah UNREAD.

**Admin (`/admin`)** — gate: not_configured / signed_out / denied / ok. Tab: Overview (statistik `admin_stats()`, growth `admin_analytics()`, panel Data backup), Users (avatar, pill NEW, sort klik, pencarian email, pill MENTOR, SUSPENDED), detail user modal (mini stats, akun, 60 trade terakhir termasuk trashed, toggle publish profil, Suspend/Delete dengan `typeToConfirm: email`), Inbox (publish/hide/delete announcement + triage feedback), Coaching (jadikan/revoke mentor, link/unlink). Semua query privileged lewat RPC `SECURITY DEFINER` — **jangan pernah mengirim service key ke browser**.

**Lain-lain** — Landing page bilingual + tombol "Coba Demo" (`enterDemoMode()`, flag `itrade_demo_mode`, banner DemoModeBanner), SuspendedScreen (gate `user_flags`), AnnouncementBanner, FeedbackModal, ProductTour (memfilter step terhadap `document.querySelector` saat dibuka), PWA install/update prompt, CommandPalette, ThemeSelectorModal (5 tema).

---

## 7. Backend Supabase (migrasi manual — urut & idempoten)

Tabel cloud: `accounts`, `trades`, `withdrawals`, `playbooks`, `profiles`, `user_settings`, `user_flags`, `feedback`, `announcements`, `mentors`, `mentor_links`, `trade_notes`, `review_requests`, `coach_messages`, `mentor_broadcasts`, `review_sessions`, `review_comments`, `admins`.

| File SQL (root repo) | Isi |
|---|---|
| `supabase/schema.sql` | schema lama — **sudah di-superseded**, jangan jadi acuan |
| `supabase_review_schema.sql` | mentor review + comments publik |
| `supabase_playbook_schema.sql` | tabel playbooks |
| `supabase_security_settings.sql` | backfill `user_id`, hapus leg RLS `user_id IS NULL`, cap komentar, tabel `user_settings` |
| `supabase_batch_trash_indexes.sql` | kolom `trades.deleted_at` + index + trigger rate-limit komentar (aman dijalankan ulang) |
| `supabase_admin_panel.sql` | tabel `admins` + `is_admin()` + policy `admin_all` + `admin_stats()` + `admin_list_users()` |
| `supabase_admin_users.sql` | `user_flags`, `admin_user_detail(uuid)`, `admin_delete_user(uuid)` |
| `supabase_feedback_announcements.sql` | `feedback`, `announcements`, `admin_analytics()` |
| `supabase_coaching.sql` | role mentor, link murid, catatan, review request, RPC coaching |
| `supabase_coaching_chat.sql` | `coach_messages` (chat privat) + `mentor_broadcasts` (feed satu arah) |

Promote admin: `insert into public.admins (user_id) select id from auth.users where email='…' on conflict do nothing;`
Storage: gambar rich-text diunggah via `uploadImageToStorage`; fallback base64 bila offline — **jangan pernah inline base64 ke notes yang masuk `user_metadata`**.
**Preferensi aplikasi disimpan di tabel `user_settings`, BUKAN `auth.user_metadata`** (metadata ikut ke JWT → bengkak). Helper: `fetchUserSettings()` / `saveUserSettings(patch)`.
Auth anti-bot: Cloudflare Turnstile env-gated (`VITE_TURNSTILE_SITE_KEY`); tanpa key = dilewati diam-diam, dan `window.turnstile.getResponse()` **harus dibungkus try/catch** (melempar bila widget tidak dirender → handler submit mati total).

---

## 8. Data Layer & localStorage

Semua kunci berformat `itrade_*`. Yang penting:
`itrade_accounts_v1`, `itrade_active_account_v1`, `itrade_trades_v1`, `itrade_trashed_trades_v1`, `itrade_withdrawals_v1`, `itrade_playbooks_v1`, `itrade_trade_audit`, `itrade_custom_fields`, `itrade_setup_queue_v1`, `itrade_trade_draft_v1`, `itrade_weekly_reviews_v1`, `itrade_saved_views`, `itrade_journal_columns`, `itrade_journal_density`, `itrade_dashboard_cards`, `itrade_workspace_config`, `itrade_nav_prefs_v1`, `itrade_notif_read_v1`, `itrade_notif_dismissed_v1`, `itrade_ann_seen_v1`, `itrade_last_backup_at`, `itrade_theme`, `itrade_dim_mode`, `itrade_perf_mode`, `itrade_stealth_mode`, `itrade_demo_mode`, `itrade_landing_lang`, `itrade_sidebar_collapsed`, `itrade_dock_open`, `itrade_tour_done`, `itrade_pwa_dismissed`, `itrade_activation_dismissed`, `itrade_activation_analytics`, `itrade_share_note`, `itrade_review_*`, `itrade_admin_backup_summary`.
Kebijakan: aplikasi **selalu** berfungsi tanpa cloud; saat login, data disinkronkan (tabel untuk accounts/trades/withdrawals/playbooks/user_settings, metadata untuk sisa preferensi).

**PITFALL KRITIS — loop `user_metadata` (dashboard berkedip ~1 detik):** setiap `supabase.auth.updateUser()` memicu `USER_UPDATED` → user object baru → semua effect `[user]` jalan lagi → save effect mengunggah ulang → loop tanpa henti. Guard yang WAJIB diikuti untuk setiap persistensi baru: (1) AuthContext mempertahankan identitas user bila id/email/user_metadata JSON-equal; (2) save effect menyimpan `lastSynced*Ref` dan melewati `updateUser` bila payload sama; (3) refetch cloud di JournalContext bergantung pada `user?.id` saja, **jangan** `user` penuh; (4) effect load metadata membandingkan sebelum `setState`.

---

## 9. Design System & Konvensi UI

- **Token** di `src/index.css`: `--theme-primary(-hover)`, `--theme-secondary(-strong)`, `--bg-main/card/chip/surface/surface-elevated/nav/sidebar/panel`, `--text-primary/secondary/muted/strong`, `--border-color/subtle/focus`, `--profit-green`, `--loss-red`. 5 tema via `[data-theme]`. **Aturan: JANGAN pernah hardcode hex aksen di komponen — pakai var.** Pengecualian: dokumen terlepas (template PiP di QuickRiskDock, popup WorkspaceView) — var tidak menyeberang dokumen.
- `var()` **bekerja** di atribut presentasi SVG di Chromium, jadi `color="var(--x)"` pada lucide aman.
- **Modal**: gunakan `useModalA11y(isOpen, onClose)` dari `src/hooks`, pasang `ref` ke `.modal-container` + `role="dialog" aria-modal="true" aria-label="…" tabIndex={-1}` (menangani focus trap, ESC dengan stopPropagation, restore focus).
- **Konfirmasi**: JANGAN `window.confirm` — pakai `useConfirm()` → `await confirm({title, message, confirmText, variant, typeToConfirm?})`.
- **Toast**: `showToast(message, type, action?)` dari JournalContext; undo lewat `action: {label:'Undo', onClick}`.
- **Rich text**: `RichTextEditor` menyimpan HTML; render dengan `className="rich-notes-content"` + `dangerouslySetInnerHTML`; cek kosong = strip tag + cek `<img>`.
- **UI prefs**: `src/utils/uiPrefs.ts` — dim mode (`html[data-dim]`), performance mode (`html[data-perf]`, juga menghormati `prefers-reduced-motion`, mematikan confetti); sinkronisasi lewat event `itrade-uiprefs-changed`; `applyUiPrefs()` dipanggil awal di `main.tsx`.
- **Bahasa**: **UI + toast sekarang FULLY ENGLISH** (landing page sengaja bilingual ID/EN; `id-ID` hanya untuk format Rp dan sebagian locale tanggal). Beberapa string Indonesia legacy masih ada di komponen lama — konversi hanya bila file itu sedang disentuh. **Jangan pernah menyisipkan apostrof ke dalam string TS single-quote** ('Kelly's' merusak string → rephrase, jangan escape).
- **Verifikasi ikon lucide sebelum dipakai**: `node -e "console.log(!!require('lucide-react').IconName)"`.
- **Skeleton/EmptyState** tersedia di `components/common` — pakai untuk state loading kosong, jangan bikin baru.
- **Code splitting**: App.tsx meng-import lazy Calendar/Analytics/News/Playbook/Workspace dalam satu Suspense; **modal tetap eager**. `vite.config.ts` manualChunks: vendor-react/supabase/icons/confetti/analytics/misc (app core ~407 kB).
- **Mobile ≤768px**: navbar 2 baris (switcher akun jadi baris penuh; jangan dipindah ke grup kiri), panel dropdown di-pin `position:fixed; top:104px; left/right:12px`, bottom nav `z-index:999`, `.page-body{padding-bottom:96px}`, `.quick-risk-dock{bottom:88px}`, PWA prompt di atas dock, `.modal-header`/`.trade-modal-header` wrap pada ≤560px. Grid form modal wajib `minmax(0,1fr)` + `min-width:0` (select dengan opsi panjang memaksa lebar ~370px dan membuat modal scroll horizontal). Tabel sticky butuh background eksplisit pada `th`.

---

## 10. Pitfall Teknis (sudah pernah memakan korban)

1. **CRLF/LF mix** di repo (`Sidebar.tsx`, `App.tsx`, `Navbar.tsx`, `CommandPalette.tsx` CRLF; `ProductTour.tsx`, `MobileNav.tsx` LF). Saat mengedit dengan Python: buka `io.open(path, encoding='utf-8', newline='')`, **assert `count(old) == 1`** sebelum replace, tulis ulang dengan gaya ending yang sama.
2. **Anchor string mudah bergeser** — `sed -n`/`cat -A` dulu, selalu assert jumlah match dalam setiap batch replace. Prefer anchor kecil unik + regex ketimbang salin blok besar.
3. Menaruh `className="x"` **di dalam objek `style={{...}}`** gagal build (`Unexpected "="`).
4. Memindahkan blok JSX: tag penutup parent tidak boleh ikut terbawa (`Unexpected end of file before a closing "header" tag`).
5. **Sticky rusak** bila ada ancestor ber-`overflow:hidden` / `overflow-x:hidden` → gunakan `overflow-x: clip`.
6. **`overflow: hidden` pada satu sumbu** menjadikan elemen scroll container dan menjebak descendant sticky.
7. Sel yang hanya *mencetak* hasil tidak menulis file — pastikan patch benar-benar tertulis.
8. File `dist` disajikan dari disk tanpa cache header: setelah rebuild, browser memakai `index.html` lama yang menunjuk asset terhapus → halaman tanpa style dan semua pengukuran tidak valid. Selalu buka dengan cache-buster (`?v=<timestamp>`) atau `Network.clearBrowserCache`, dan cek `document.styleSheets.length` sebelum mempercayai angka geometri.
9. Menjalankan `vite preview` lewat background terminal Hermes **hang**; proses detached-nya mati diam-diam. Pakai static server Python dengan SPA fallback (port 4173).
10. Browser harness bisa mati mid-session: `taskkill /F /PID <pid>` (single slash! — konversi MSYS dimatikan), hapus `~/.config/browser-harness/runtime/bu-default.{pid,port}`, lalu retry; `ensure_real_tab()` untuk memulihkan.
11. Tab sering mendarat di `about:blank` di awal call dan localStorage tidak bertahan antar call → setiap call harus `goto_url` ulang dan menyemai state di call yang sama.
12. `innerText` mengembalikan teks yang sudah di-transformasi CSS (label uppercase terbaca "TRADES") → pencocokan case-insensitive.
13. Menguji commit-on-blur: panggil `el.focus()` sebelum `el.blur()` (blur pada elemen tak ter-focus tidak memicu apa pun).
14. Menguji build dengan env Supabase palsu: `VITE_SUPABASE_URL=https://fake.supabase.co VITE_SUPABASE_ANON_KEY=fake npm run build` (status logged-out, tanpa network call) — rebuild normal setelah selesai.
15. Build lokal selalu me-reseed `INITIAL_TRADES` saat storage kosong; untuk mencapai state first-run, tambahkan akun kosong ke `itrade_accounts_v1` + set aktif di `itrade_active_account_v1`.
16. **Pitfall PowerShell inline**: `powershell -Command "...$var..."` di bash kehilangan `$var` karena ekspansi bash → selalu tulis file `.ps1` lalu jalankan `powershell -NoProfile -ExecutionPolicy Bypass -File`.

---

## 11. Alur Verifikasi Wajib (Definition of Done)

```bash
npx tsc --noEmit        # 1. type check
npm run build           # 2. production build
# 3. runtime: sajikan dist lewat static server Python (SPA fallback, :4173), curl untuk memastikan hidup,
#    lalu uji di browser dengan cache-buster; untuk layout mobile pakai Emulation.setDeviceMetricsOverride
#    (390/844, mobile) dan scripts/cdp-mobile-check.py bila harness macet.
```

Sebuah tugas dianggap selesai hanya bila: type check bersih, build sukses, dan (untuk perubahan UI) perilaku terbukti di browser dengan angka/temuan nyata — bukan dugaan. Setelah itu: lapor ringkas dalam Bahasa Indonesia dengan tabel perubahan + daftar "pending di sisi kamu" (mis. menjalankan file SQL migrasi baru di Supabase, atau hal yang butuh kredensial/dashboard yang hanya user punya).

Housekeeping: jangan jalankan file migrasi SQL sendiri; jangan sentuh `.env`; jangan commit/push kecuali diminta.

---

## 12. Backlog / Arah Pengembangan Berikutnya

- `saran.md` di root (≈64 kB) berisi daftar saran fitur/perbaikan — sumber ide utama user; user biasanya memilih beberapa nomor sekaligus ("2,3,4").
- Kandidat yang belum diimplementasikan: OCR auto-fill dari screenshot (tesseract.js sengaja dihapus), server-side write-blocking untuk user yang di-suspend (saat ini gate hanya di sisi klien), trade replay/backtest, integrasi broker, laporan PDF.
- Setiap batch fitur harus berakhir dengan: verifikasi nyata → commit + push → laporan singkat (tabel + pending user).
