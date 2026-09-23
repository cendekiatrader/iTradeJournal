# Saran Fitur Baru — iTradeJournal

Status repo saat daftar ini dibuat: `main` @ `3cfd298` (blog publik + admin publish, toggle Quick Risk, toggle bottom nav desktop, fix dialog mobile, fix Monte Carlo mobile).

Cara pakai: pilih nomornya (contoh `2,3,4,11`) dan aku kerjakan sebagai satu batch. Setiap item ada label usaha: **S** = cepat (≤1 sesi), **M** = sedang, **L** = besar (butuh rancangan/SQL baru).

---

## A. Blog & SEO (fitur ini baru dibangun, paling banyak celah cepat)

1. **RSS feed + sitemap.xml + robots.txt** — **S**
   Sekarang `public/` cuma berisi `sw.js`, `manifest.json`, `icon.svg`, dan 2 gambar hero: tidak ada `sitemap.xml` maupun `robots.txt`, jadi Google tidak punya peta artikel. Sitemap bisa digenerate saat build dari daftar slug, dan `/blog/rss.xml` ditulis sebagai route statis. Dampak: artikel benar-benar terindeks.

2. **JSON-LD `Article` + Open Graph per artikel** — **S**
   Halaman blog sudah set `document.title`/description dinamis, tapi belum ada `og:image` (pakai `cover_image_url`) dan schema.org Article. Efeknya link yang di-share ke WhatsApp/X tampil polos, dan peluang muncul di Google News/Discover hilang.

3. **Kategori blog sebagai halaman** — **S**
   Tag sekarang hanya filter di klien. Tambah `/blog/kategori/<tag>` (dan/atau kolom `category` di `blog_posts`) supaya 1 topik bisa dijadikan halaman yang bisa di-bookmark & di-share, plus breadcrumb.

4. **Penjadwalan publikasi (scheduled publish)** — **S**
   `blog_posts.published_at` cuma diisi "sekarang" saat status diubah ke published. Tambah input tanggal/waktu di editor admin dan RLS read sudah benar (`published_at <= now()`), jadi tinggal UI + kolom `scheduled`. Cocok buat trader yang nulis malam, tayang pagi.

5. **Komentar artikel + moderasi admin** — **M**
   Tabel `blog_comments` (post_id, user_id/nama, body, status pending/approved/spam) + RLS: publik hanya baca `approved`, insert butuh login (rate limit seperti `review_comments`: maks 10/menit), dan tab moderasi di Admin Console. Ini pendorong retensi paling murah untuk blog.

6. **Preview link untuk draft** — **S**
   Admin hanya bisa "Open on the blog" untuk artikel published. Tambah token preview (`?preview=<token>`) supaya draft bisa dilihat di HP tanpa dipublikasikan — penting karena menulis di HP sambil cek tampilan.

7. **Newsletter / langganan email** — **M**
   Tabel `subscribers` + form di `/blog` + kirim manual dari admin (broadcast) atau otomatis per artikel baru. Butuh keputusan: pakai Supabase Edge Function + provider email (Resend/Postmark) — kredensial harus kamu siapkan.

8. **Statistik blog di admin (grafik views per hari)** — **S**
   `views` sekarang cuma angka total. Simpan per-hari (`blog_post_views` harian atau log ringan) lalu tampilkan sparkline di tab Blog: artikel mana yang benar-benar dibaca, bukan cuma dikunjungi.

9. **Nama penulis (bukan email) untuk blog** — **S**
   Sudah di-hide di UI, tapi belum ada cara mengisi nama tampilan. Tambah kolom "Author name" di editor artikel + simpan ke `blog_posts.author_name` (sudah ada kolomnya) agar artikel bisa ditulis atas nama "Tim Riset".

---

## B. Jurnal & trading (nilai inti aplikasi)

10. **Import CSV broker (MT4/MT5/FTMO/cTrader)** — **M**
    Entry manual adalah friksi terbesar. Parser per-broker + pemetaan kolom + dry-run preview (tampilkan N trade yang akan masuk, deteksi duplikat via ticket id) sebelum commit. Sekali jadi, ini fitur yang paling sering dipakai.

11. **Prop-firm rule tracker + alert** — **M**
    Data daily loss & max drawdown sudah ada di akun. Tambah aturan firm (mis. FTMO: daily 5%, total 10%, konsistensi), progress bar "sisa buffer hari ini", dan alert bell saat pemakaian >50% (pola alert sudah ada di NotificationCenter, tinggal ditambah sumber baru).

12. **Risk guard saat log trade** — **S**
    Di TradeFormModal, hitung dampak trade ke daily loss/drawdown akun aktif lalu tampilkan peringatan (atau wajib konfirmasi) kalau melanggar batas. Mendukung disiplin tanpa perlu fitur baru di database.

13. **MAE/MFE + ekspektasi (expectancy, SQN)** — **M**
    Metrik sekarang belum masuk kelas "sistem". Tambah kolom MAE/MFE (opsional per trade), lalu kartu expectancy, SQN, dan distribusi R-multiple di Analytics. Ini yang biasanya bikin trader mau bayar.

14. **Tags bebas untuk trade (selain setup/session)** — **S**
    Tipe `Trade` sudah punya `customFields`, tapi tag cepat (mis. "news-day", "revenge") lebih praktis untuk insight psikologi. Filter + breakdown tag di Analytics.

15. **Auto-tag kondisi market dari Economic Calendar** — **M**
    Kalender ekonomi sudah ada di app. Simpan event high-impact saat trade dibuka (`entry_date` ± 30 menit) → insight "winrate saat NFP" otomatis. Tidak perlu API baru.

16. **Goal bulanan + streak** — **S**
    Target profit per akun sudah ada, tapi tidak ada target periode. Tambah goal bulanan (P&L %, jumlah trade disiplin, rules followed %) + progress ring di Dashboard, plus streak "N hari tanpa pelanggaran aturan".

17. **Weekly review otomatis (generate + reminder)** — **S**
    `WeeklyReviewModal` sudah ada dan tersimpan lokal. Tambah reminder otomatis (Sabtu/Minggu) + ringkasan terkirim ke email (butuh provider email) atau minimal banner Dashboard "review minggu ini belum diisi".

18. **Playbook adherence scoring** — **S**
    `rulesFollowed` sudah dicatat per trade. Tampilkan skor kepatuhan per playbook (X% trade yang semua rulesnya dipakai + PnL saat patuh vs tidak patuh) — pembeda "saya punya sistem" vs "saya asal entry".

19. **Chart TradingView tersimpan per trade (snapshot)** — **M**
    Screenshot sudah bisa di-upload, tapi snapshot chart live (simbol+timeframe saat entry) memudahkan review ulang. Simpan `symbol`+`interval`+timestamp lalu render ulang di TradeDetailModal (workspace sudah punya integrasi TradingView).

20. **Mode stealth lanjutan / hide P&L di screenshot** — **S**
    Stealth mode menyembunyikan balance. Tambah "export-safe view" (sembunyikan nominal saat screenshot/screen-share) supaya aman saat share hasil ke media sosial.

---

## C. Coaching

21. **Notifikasi chat tanpa polling** — **M**
    `CoachChatModal` polling 6 detik: boros kuota dan lambat. Ganti ke Supabase Realtime (channel per link) — hemat baterai, pesan masuk instan.

22. **Push notification untuk coach notes & risk alert** — **M**
    Bell sekarang hanya aktif saat app terbuka. Web Push (VAPID) lewat service worker yang sudah ada (`public/sw.js`) membuat user tahu ada catatan mentor tanpa membuka app. Butuh generate VAPID keys + tabel `push_subscriptions`.

23. **Progress per student (dashboard mentor)** — **M**
    Mentor punya daftar student, tapi belum ada ringkasan: curang? jumlah trade, winrate 7/30 hari, kepatuhan playbook, catatan terakhir. Satu halaman ringkas per student menghemat waktu mentor.

24. **Assignment / PR trading + deadline** — **L**
    Mentor memberi tugas (mis. "10 trade sesuai playbook A, deadline Jumat"), student centang, status terlihat di kedua sisi. Tabel `assignments` + penilaian. Fitur yang membedakan dari jurnal biasa.

25. **Kelas/broadcast berjadwal** — **S**
    `mentor_broadcasts` sudah ada. Tambah jadwal tayang + arsip yang bisa dicari, plus lampiran (file/playbook) agar makin banyak dipakai.

---

## D. Mobile & PWA

26. **Tabel → kartu di HP (Analytics, Journal)** — **S**
    Temuan dari sesi terakhir: tabel `Setup & Strategy Performance Matrix`, Holding Duration, dan Winrate vs RRR melebar sampai ~640px di layar 390px dan terpotong. Ubah jadi daftar kartu (atau scroller + kolom sticky) — bukan fitur baru, tapi satu-satunya sisa regresi mobile yang kelihatan.

27. **Plugin bottom nav: pilih modul sendiri** — **S**
    Bottom nav sekarang hardcode 4 modul (`dashboard, journal, accounts, calendar`). Biarkan user memilih 4 modul favorit dari daftar (pola sama seperti navPrefs) — relevan karena bottom nav desktop baru saja ditambahkan.

28. **Install prompt + shortcut "Log Trade" & "Quick Risk"** — **S**
    `manifest.json` sudah punya shortcut `#new-trade`/`#calculator`/`#queue`. Tambah shortcut Quick Risk (modal baru) dan pastikan deep link-nya tetap benar setelah refactor route.

29. **Mode offline read-only** — **L**
    Service worker network-first. Tambah cache data terakhir (trades + dashboard) supaya bisa dibuka saat sinyal jelek di kafe/kereta — read-only, edit tetap butuh online.

30. **Swipe gesture di Trade Log** — **S**
    Di HP, swipe kiri/kanan pada baris trade untuk Edit/Hapus (dengan konfirmasi). Mengurangi tap-tap kecil yang menyiksa di layar sentuh.

---

## E. Admin & operasional

31. **Audit log aksi admin** — **M**
    Sekarang tidak ada jejak siapa suspend/hapus/ubah apa. Tabel `admin_audit` (actor, aksi, target, payload, waktu) + tampilan di Admin Console. Penting begitu ada lebih dari satu admin.

32. **Backup otomatis terjadwal** — **M**
    `fetchFullBackup` masih manual lewat klik. Tambah Supabase cron/Edge Function: dump JSON ke storage bucket + kirim ringkasan (email/Telegram). Mengingat data trading ini bernilai, ini prioritas tinggi.

33. **Email/announcement broadcast ke segmen** — **M**
    Announcement sekarang hanya banner in-app. Tambah kirim email ke semua user atau segmen (mis. semua user yang dormant >30 hari) — `admin_analytics()` sudah menyediakan datanya.

34. **Feature flag per user/role** — **S**
    Untuk merilis fitur baru ke sebagian user (mis. MAE/MFE dulu ke 10 trader aktif). Tabel `feature_flags` + helper `hasFlag()` di klien.

35. **Export data user (privacy) + tombol "hapus akun saya"** — **S**
    Admin sudah bisa hapus user; user sendiri belum bisa minta datanya (JSON/CSV) atau hapus akunnya. Standar privasi (UU PDP/GDPR) dan mengurangi beban admin.

36. **Changelog publik yang terhubung ke feedback** — **S**
    Feedback punya status `resolved`. Balik arah: tampilkan changelog "apa yang baru" di blog/dashboard dan tandai request mana yang sudah dikerjakan. Loop umpan balik jadi terlihat.

---

## F. Kualitas, testing & infra

37. **Test suite (vitest + React Testing Library)** — **L**
    Repo ini **belum punya satu pun test** (tidak ada `*.test.*`, tidak ada vitest/jest config). Mulai dari yang paling murah: `utils/blog.ts` (slugify, sanitizer, readingMinutes), `utils/navPrefs`, `utils/monteCarlo` (deterministik!), lalu alur kritis (form trade, RLS error handling). Ini yang mencegah regresi seperti bug mobile terakhir terulang.

38. **CI GitHub Actions (tsc + build + test)** — **S**
    Sekarang verifikasi hanya manual. Workflow sederhana: `tsc --noEmit`, `npm run build`, dan nanti test. Cegah push yang bikin build Vercel merah.

39. **Error monitoring (Sentry)** — **M**
    Sampeyan tahu error user hanya kalau mereka kirim feedback. Sentry free tier cukup untuk baca stack trace produksi (butuh DSN dari kamu).

40. **Migration Supabase versioned** — **S**
    SQL sekarang 11 file (`supabase_*.sql` di root + `supabase/schema.sql`) dan dijalankan manual di SQL editor: gampang lupa urutannya (mis. `supabase_blog.sql` bergantung pada `is_admin()` dari `supabase_admin_panel.sql`). Rapikan jadi `supabase/migrations/YYYYMMDD_nama.sql` + catatan urutan di README.

41. **Core Web Vitals & code splitting lanjutan** — **M**
    Chunk utama masih ~473 kB (113 kB gzip). Analytics/Monte Carlo, chart kalender, dan editor rich-text bisa dipecah lebih agresif; tambah budget Lighthouse di CI agar tidak diam-diam membesar.

42. **i18n penuh (ID/EN)** — **M**
    Landing page sudah bilingual, UI aplikasi full English, sebagian string legacy Indonesia masih nyisa, dan fitur baru (blog) full Indonesia. Perlu satu sumber copy + toggle bahasa supaya konsisten.

43. **Aksesibilitas (a11y) audit** — **M**
    Sudah lumayan (aria-label, `useModalA11y`, focus trap). Sisa: kontras di mode terang, urutan fokus di tabel, dan `aria-live` untuk angka yang berubah cepat. Bisa sekaligus bikin app terasa lebih rapi.

---

## Rekomendasi batch berikutnya (kalau mau cepat kelihatan hasilnya)

| Prioritas | Item | Alasan |
|---|---|---|
| 1 | **1, 2, 3** | Blog baru jadi; tanpa sitemap/OG/kategori, kerjaannya tidak jadi trafik. Semua S. |
| 2 | **26, 27** | Menutup sisa masalah mobile + bottom nav desktop yang baru dibuat jadi lebih berguna. |
| 3 | **10, 11, 12** | Friksi entry & disiplin risiko = nilai inti; import CSV paling sering diminta trader. |
| 4 | **32, 31** | Data trading bernilai; backup manual + tanpa audit log itu risiko, bukan fitur. |
| 5 | **37, 38** | Mahal di awal, tapi bikin semua batch berikutnya lebih cepat & aman. |

Butuh keputusan/kredensial dari kamu: item **7** dan **33** (provider email), **22** (VAPID keys), **39** (DSN Sentry), **29/32** (batas kuota Supabase/Edge Function).
