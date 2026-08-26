# 📚 Katalog Saran & Roadmap Fitur iTradeJournal

Dokumen ini mencatat seluruh daftar saran fitur, inovasi, dan roadmap pengembangan platform **iTradeJournal** secara terstruktur, baik yang sudah selesai diimplementasikan maupun yang siap dikembangkan di masa mendatang.

---

## ✅ 1. Fitur yang Telah Selesai Diimplementasikan (Live & Aktif)

| No | Nama Fitur | Status | Deskripsi & Manfaat |
|:---|:---|:---:|:---|
| 1 | **Multi-Tenant Cloud Database & Auth** | 🟢 **SELESAI** | Integrasi Supabase PostgreSQL & Auth (Email + Password, Discord OAuth, Auto Keep-Alive Tiap 3 Hari). |
| 2 | **Blurred Frosted Glass LockScreen** | 🟢 **SELESAI** | Lockscreen animasi gembok dan efek blur untuk keamanan multi-user sebelum login. |
| 3 | **PWA (Progressive Web App)** | 🟢 **SELESAI** | Dapat di-install langsung di HP Android, iPhone (iOS), maupun Desktop/Laptop layaknya aplikasi native tanpa browser bar. |
| 4 | **Verified Public Profile / Portfolio Link (Bio Link)** | 🟢 **SELESAI** | Link bio publik terverifikasi (`#/u/:username`) untuk pamer track record (Winrate, Equity Curve, RRR) tanpa membocorkan nominal saldo rahasia. |
| 5 | **Economic Calendar & High-Impact News Radar** | 🟢 **SELESAI** | Feed kalender berita fundamental dunia real-time dengan filter Red Folder (High Impact) dan alert radar di Dashboard. |
| 6 | **Multi-Market Session Live Clock & Killzone Radar** | 🟢 **SELESAI** | Jam sesi pasar dunia (Tokyo, London, New York, Sydney) dengan detektor otomatis *London/NY Killzones* & *London-NY Overlap Peak*. |
| 7 | **Pro Trader Keyboard Shortcuts & Fast Navigation** | 🟢 **SELESAI** | Navigasi kilat (`N` = New Trade, `D` = Dashboard, `J` = Journal, `A` = Analytics, `C` = Calculator, `Ctrl+Enter` = Submit, `?` = Cheat Sheet). |
| 8 | **Kelly Criterion & Sizing Model Risk Simulator** | 🟢 **SELESAI** | Algoritma matematika probabilitas untuk menghitung ukuran risiko optimal (Full-Kelly, Half-Kelly, Quarter-Kelly vs Fixed 1%) tanpa risiko ruin. |
| 9 | **Dual Chart Comparison (Before vs After Slider)** | 🟢 **SELESAI** | Interactive split slider untuk membandingkan chart analisa sebelum entry (Before) vs chart hasil eksekusi (After). |
| 10 | **Monte Carlo Risk & Equity Forecaster** | 🟢 **SELESAI** | Algoritma matematika 1.000 simulasi masa depan untuk memprediksi probabilitas profit, risiko drawdown, dan target evaluasi prop firm. |
| 11 | **Account Growth Compounding & Roadmap Planner** | 🟢 **SELESAI** | Kalkulator proyeksi pertumbuhan saldo berbunga (*Compounding Plan*) bulan per bulan lengkap dengan simulasi persentase penarikan profit (*Withdrawal Milestone*). |
| 12 | **Trade Holding Duration & Time Edge Matrix** | 🟢 **SELESAI** | Matriks analisis efektivitas trading berdasarkan durasi tahan posisi: Scalp (<15m), Intraday (15m–4h), Day Trade (4h–24h), dan Swing (>1 hari). |
| 13 | **Custom Institutional Accent Themes (5 Luxury Themes)** | 🟢 **SELESAI** | Sistem ganti tema warna visual mewah 1-klik: *Emerald Institutional*, *Sapphire Electric*, *Obsidian Amethyst*, *Golden Bullion*, dan *Crimson Titan*. |
| 14 | **Multi-Account & Multi-Asset Support** | 🟢 **SELESAI** | Dukungan multi-akun (Live, Prop Firm, Challenge), sistem withdrawal terpisah, serta satuan Lot (Forex/Gold), Unit (Crypto), dan Kontrak (Indeks). |
| 15 | **Interactive Calendar Heatmap** | 🟢 **SELESAI** | Tampilan kalender harian dengan kalkulasi RRR dan PnL harian serta detail trade popup. |
| 16 | **CSV Exporter** | 🟢 **SELESAI** | Kemampuan ekspor seluruh data trade dan metrik ke format CSV dalam 1-klik. |

---

## 🚀 2. Daftar Saran Fitur Lanjutan (Roadmap Masa Depan)

Berikut adalah daftar ide dan saran fitur potensial yang siap diwujudkan pada tahap pengembangan selanjutnya:

### A. Otomasi, Bot & Deteksi Pintar
1. **⚡ Auto-Import CSV / Statement dari MetaTrader (MT4 / MT5) & TradingView**
   - *Konsep*: Fitur *drag-and-drop* file statement riwayat trading dari MT4/MT5 atau TradingView.
   - *Manfaat*: Trader tidak perlu memasukkan puluhan atau ratusan riwayat trade lama satu per satu; sistem membaca tanggal, open/close price, lot, symbol, dan PnL otomatis dalam 1 detik.

2. **📰 Auto-Detect High-Impact News on Entry (Detektor Berita Otomatis)**
   - *Konsep*: Sistem mencocokkan waktu entry trade dengan jadwal rilis kalender ekonomi secara otomatis.
   - *Manfaat*: Otomatis memberi tag `🔴 High Impact Event: US CPI / NFP` jika trade dieksekusi di dekat waktu rilis berita besar.

3. **🤖 Discord Webhook Notification Bot (Auto-Alert ke Channel Pribadi / Komunitas)**
   - *Konsep*: Integrasi Discord Webhook URL.
   - *Manfaat*: Setiap kali trader melakukan *Log Trade*, mencatat TP/SL, atau melakukan Withdrawal, bot otomatis mengirim embed pesan keren berwarna hijau/merah ke channel Discord trader atau grup VIP komunitasnya.

4. **📱 Telegram Instant Trade Logger Bot**
   - *Konsep*: Bot Telegram pribadi yang terhubung ke akun iTradeJournal.
   - *Manfaat*: Cukup ketik pesan singkat di Telegram (misal: `BUY XAUUSD 2500 SL 2490 TP 2520 +$350 Win`), bot langsung memasukkan data ke journal secara instan.

5. **📈 Live TradingView Interactive Chart Widget**
   - *Konsep*: Menyematkan widget chart TradingView interaktif langsung di tab atau modal trade.
   - *Manfaat*: Trader bisa memantau chart live, menggambar area support/resistance, dan mengecek timeframe multi-chart tanpa harus membuka aplikasi lain.

---

### B. Analisis Lanjutan, Psikologi & AI
6. **🧠 Psychological Emotion Cost & Leak Breakdown (Hitung Kerugian Emosi)**
   - *Konsep*: Analisis mendalam menghitung total nominal uang yang hilang (*Cost of Emotion*) akibat emosi *FOMO* atau *Revenge Trading*.
   - *Manfaat*: Memberikan fakta angka psikologis yang menyadarkan trader untuk tetap disiplin.

7. **🧠 AI Trade Performance Analyzer & Leak Detector**
   - *Konsep*: AI Assistant yang menganalisis seluruh database histori trading pengguna dan memberikan rekomendasi konkret untuk memperbaiki *edge*.

8. **⚖️ Currency & Asset Correlation Matrix (Matriks Korelasi Pasangan Aset)**
   - *Konsep*: Analisis korelasi real-time antar aset (misal: EURUSD vs GBPUSD $+0.88$, DXY vs XAUUSD $-0.92$) untuk mencegah *Over-Exposure*.

9. **🎯 Strategy Edge Scatter Plot Matrix (Peta Efisiensi Strategi)**
   - *Konsep*: Grafik kuadran 2D (Sumbu X: Winrate %, Sumbu Y: Average R:R) untuk memetakan setup *Cash Cow* vs *Money Drain*.

10. **📅 Day-of-Week & Hourly Profit Heatmap Matrix (Matriks Jam & Hari Terbaik)**
    - *Konsep*: Heatmap 2D (Hari vs Jam) untuk menemukan waktu eksekusi paling profitabel.

11. **📅 Weekly & Monthly Retrospective Reviewer (Laporan Evaluasi Rutin)**
    - *Konsep*: Ringkasan otomatis setiap akhir pekan (*Weekly Trading Debrief*) lengkap dengan kolom refleksi mingguan.

12. **💱 Multi-Currency Realtime Portfolio Aggregator (Konversi Otomatis ke Rupiah / USD)**
    - *Konsep*: Tombol konversi satu sentuhan untuk melihat total portofolio multi-akun dalam mata uang USD, IDR, atau EUR.

---

### C. Pengaman Risiko, Audio & Gamifikasi
13. **🔒 Emergency Tilt Lock & Daily Loss Kill-Switch (Kunci Anti-Revenge Trading)**
    - *Konsep*: Sistem pengaman psikologi darurat yang mengunci form input trade selama 4 jam jika trader mengalami batas rugi harian (misal: $-3\%$ dalam sehari atau 3x loss beruntun).

14. **🔔 Institutional Audio FX & Real-Time Sound Feedback**
    - *Konsep*: Suara audio elegan (*Cash Chime*, *Subtle Loss Muffle*, *Risk Ping*) dengan toggle Mute.

15. **🧮 Partial Take-Profit & Multi-Target Sizing Calculator**
    - *Konsep*: Kalkulator pembagian TP1, TP2, dan Runner Trailing Stop secara presisi.

16. **🎯 Pre-Trade Discipline Checklist & Daily Routine Score**
    - *Konsep*: Checklist konfirmasi sebelum menekan tombol entry untuk menghitung skor kepatuhan aturan (*Discipline Score %*) harian.

17. **🛡️ Prop Firm Challenge Tracker & Drawdown Safeguard**
    - *Konsep*: Mode khusus evaluasi Prop Firm (Target Profit 8%/10% vs Daily Loss 5% vs Max Drawdown 10% dengan alarm merah).

18. **🏆 Trading Milestones & Gamification Achievement Badges**
    - *Konsep*: Sistem reward lencana (*Risk Guardian*, *Sniper Entry*, *Zen Mindset*) berdasarkan kedisiplinan eksekusi.

19. **📜 Official Milestone Achievement Certificate Generator**
    - *Konsep*: Generator sertifikat pencapaian resmi berstempel digital *Verified by iTradeJournal*.

20. **🖼️ Aesthetic Shareable Trade PnL Card Generator**
    - *Konsep*: Tombol 1-klik untuk meng-generate kartu grafis PNG dark-neon berisi hasil trade untuk dibagikan ke media sosial.

21. **📚 Trading Playbook & Best Setups Catalog (Katalog Setup A+)**
    - *Konsep*: Folder khusus arsip trade terbaik (*Best Trades of the Month*) dengan rating bintang (⭐⭐⭐⭐⭐) sebagai panduan *cheat sheet*.

---

*Terakhir diperbarui: 26 Agustus 2026*
