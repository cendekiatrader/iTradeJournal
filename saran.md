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
| 7 | **Dual Chart Comparison (Before vs After Slider)** | 🟢 **SELESAI** | Interactive split slider untuk membandingkan chart analisa sebelum entry (Before) vs chart hasil eksekusi (After). |
| 8 | **Monte Carlo Risk & Equity Forecaster** | 🟢 **SELESAI** | Algoritma matematika 1.000 simulasi masa depan untuk memprediksi probabilitas profit, risiko drawdown, dan target evaluasi prop firm. |
| 9 | **Account Growth Compounding & Roadmap Planner** | 🟢 **SELESAI** | Kalkulator proyeksi pertumbuhan saldo berbunga (*Compounding Plan*) bulan per bulan lengkap dengan simulasi persentase penarikan profit (*Withdrawal Milestone*). |
| 10 | **Trade Holding Duration & Time Edge Matrix** | 🟢 **SELESAI** | Matriks analisis efektivitas trading berdasarkan durasi tahan posisi: Scalp (<15m), Intraday (15m–4h), Day Trade (4h–24h), dan Swing (>1 hari). |
| 11 | **Custom Institutional Accent Themes (5 Luxury Themes)** | 🟢 **SELESAI** | Sistem ganti tema warna visual mewah 1-klik: *Emerald Institutional*, *Sapphire Electric*, *Obsidian Amethyst*, *Golden Bullion*, dan *Crimson Titan*. |
| 12 | **Multi-Account & Multi-Asset Support** | 🟢 **SELESAI** | Dukungan multi-akun (Live, Prop Firm, Challenge), sistem withdrawal terpisah, serta satuan Lot (Forex/Gold), Unit (Crypto), dan Kontrak (Indeks). |
| 13 | **Interactive Calendar Heatmap** | 🟢 **SELESAI** | Tampilan kalender harian dengan kalkulasi RRR dan PnL harian serta detail trade popup. |
| 14 | **CSV Exporter** | 🟢 **SELESAI** | Kemampuan ekspor seluruh data trade dan metrik ke format CSV dalam 1-klik. |

---

## 🚀 2. Daftar Saran Fitur Lanjutan (Roadmap Masa Depan)

Berikut adalah daftar ide dan saran fitur potensial yang siap diwujudkan pada tahap pengembangan selanjutnya:

### A. Otomasi, Bot & Integrasi
1. **⚡ Auto-Import CSV / Statement dari MetaTrader (MT4 / MT5) & TradingView**
   - *Konsep*: Fitur *drag-and-drop* file statement riwayat trading dari MT4/MT5 atau TradingView.
   - *Manfaat*: Trader tidak perlu memasukkan puluhan atau ratusan riwayat trade lama satu per satu; sistem membaca tanggal, open/close price, lot, symbol, dan PnL otomatis dalam 1 detik.

2. **🤖 Discord Webhook Notification Bot (Auto-Alert ke Channel Pribadi / Komunitas)**
   - *Konsep*: Integrasi Discord Webhook URL.
   - *Manfaat*: Setiap kali trader melakukan *Log Trade*, mencatat TP/SL, atau melakukan Withdrawal, bot otomatis mengirim embed pesan keren berwarna hijau/merah ke channel Discord trader atau grup VIP komunitasnya.

3. **📱 Telegram Instant Trade Logger Bot**
   - *Konsep*: Bot Telegram pribadi yang terhubung ke akun iTradeJournal.
   - *Manfaat*: Cukup ketik pesan singkat di Telegram (misal: `BUY XAUUSD 2500 SL 2490 TP 2520 +$350 Win`), bot langsung memasukkan data ke journal secara instan.

4. **📈 Live TradingView Interactive Chart Widget**
   - *Konsep*: Menyematkan widget chart TradingView interaktif langsung di tab atau modal trade.
   - *Manfaat*: Trader bisa memantau chart live, menggambar area support/resistance, dan mengecek timeframe multi-chart tanpa harus membuka aplikasi lain.

---

### B. Analisis Lanjutan & AI
5. **🧠 AI Trade Performance Analyzer & Leak Detector**
   - *Konsep*: AI Assistant yang menganalisis seluruh database histori trading pengguna.
   - *Manfaat*: Mendeteksi kebocoran psikologi & SOP secara otomatis (misal: *"Winrate Anda 85% di sesi London pada XAUUSD, namun Anda kehilangan 60% profit di sesi New York pada hari Jumat akibat emosi FOMO"*), lalu memberikan rekomendasi perbaikan.

6. **⚖️ Currency & Asset Correlation Matrix (Matriks Korelasi Pasangan Aset)**
   - *Konsep*: Analisis korelasi real-time antar aset (misal: EURUSD vs GBPUSD $+0.88$, DXY vs XAUUSD $-0.92$).
   - *Manfaat*: Memperingatkan trader jika membuka 2 posisi bersamaan pada pair berkorelasi 90%+ (*Over-Exposure Risk Warning*).

7. **🎯 Strategy Edge Scatter Plot Matrix (Peta Efisiensi Strategi)**
   - *Konsep*: Grafik kuadran 2D (Sumbu X: Winrate %, Sumbu Y: Average R:R) untuk memetakan setup mana yang merupakan *Cash Cow* (paling profit) vs *Money Drain* (membuang modal).

8. **🎙️ Voice Note / Audio Memo Journaling (Rekam Catatan Suara)**
   - *Konsep*: Tombol rekam suara 30–60 detik langsung di form trade untuk trader yang malas mengetik saat emosi sedang meluap.

9. **📅 Weekly & Monthly Retrospective Reviewer (Laporan Evaluasi Rutin)**
   - *Konsep*: Ringkasan otomatis setiap akhir pekan (*Weekly Trading Debrief*) lengkap dengan kolom refleksi mingguan layaknya trader di hedge fund profesional.

10. **💱 Live Multi-Currency Converter & FX Rate Calculator**
    - *Konsep*: Konverter mata uang instan terintegrasi dengan kurs live dunia (USD, IDR, EUR, GBP, JPY, AUD) untuk menghitung nominal rupiah hasil penarikan atau margin akun.

---

### C. Psikologi, Pengaman Risiko & Gamifikasi
11. **🔒 Emergency Tilt Lock & Daily Loss Kill-Switch (Kunci Anti-Revenge Trading)**
    - *Konsep*: Sistem pengaman psikologi darurat yang mengunci form input trade selama 4 jam jika trader mengalami batas rugi harian (misal: $-3\%$ dalam sehari atau 3x loss beruntun).

12. **🎯 Pre-Trade Discipline Checklist & Daily Routine Score**
    - *Konsep*: Checklist konfirmasi sebelum menekan tombol entry untuk menghitung skor kepatuhan aturan (*Discipline Score %*) harian.

13. **🛡️ Prop Firm Challenge Tracker & Drawdown Safeguard**
    - *Konsep*: Mode khusus evaluasi Prop Firm (Target Profit 8%/10% vs Daily Loss 5% vs Max Drawdown 10% dengan alarm merah).

14. **🏆 Trading Milestones & Gamification Achievement Badges (Sistem Lencana Disiplin)**
    - *Konsep*: Sistem reward lencana (*Risk Guardian*, *Sniper Entry*, *Zen Mindset*) berdasarkan kedisiplinan eksekusi.

15. **🖼️ Aesthetic Shareable Trade PnL Card Generator (Social Share Flyer)**
    - *Konsep*: Tombol 1-klik untuk meng-generate kartu grafis PNG dark-neon berisi hasil trade untuk dibagikan ke media sosial.

16. **📚 Trading Playbook & Best Setups Catalog (Katalog Setup A+)**
    - *Konsep*: Folder khusus arsip trade terbaik (*Best Trades of the Month*) dengan rating bintang (⭐⭐⭐⭐⭐) sebagai panduan *cheat sheet*.

---

*Terakhir diperbarui: 26 Agustus 2026*
