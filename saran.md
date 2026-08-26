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
| 5 | **Economic Calendar & High-Impact News Radar** | 🟢 **SELESAI** | Feed kalender berita ekonomi dunia real-time dengan filter Red Folder (High Impact) dan alert radar di Dashboard. |
| 6 | **Dual Chart Comparison (Before vs After Slider)** | 🟢 **SELESAI** | Interactive split slider untuk membandingkan chart analisa sebelum entry (Before) vs chart hasil eksekusi (After). |
| 7 | **Monte Carlo Risk & Equity Forecaster** | 🟢 **SELESAI** | Algoritma matematika 1.000 simulasi masa depan untuk memprediksi probabilitas profit, risiko drawdown, dan target evaluasi prop firm. |
| 8 | **Multi-Account & Multi-Asset Support** | 🟢 **SELESAI** | Dukungan multi-akun (Live, Prop Firm, Challenge), sistem withdrawal terpisah, serta satuan Lot (Forex/Gold), Unit (Crypto), dan Kontrak (Indeks). |
| 9 | **Interactive Calendar Heatmap** | 🟢 **SELESAI** | Tampilan kalender harian dengan kalkulasi RRR dan PnL harian serta detail trade popup. |
| 10 | **CSV Export** | 🟢 **SELESAI** | Kemampuan ekspor seluruh data trade dan metrik ke format CSV dalam 1-klik. |

---

## 🚀 2. Daftar Saran Fitur Lanjutan (Roadmap Masa Depan)

Berikut adalah daftar ide dan saran fitur potensial yang siap diwujudkan pada tahap pengembangan selanjutnya:

### A. Otomasi & Integrasi Data
1. **⚡ Auto-Import CSV / Statement dari MetaTrader (MT4 / MT5) & TradingView**
   - *Konsep*: Fitur *drag-and-drop* file statement riwayat trading dari MT4/MT5 atau TradingView.
   - *Manfaat*: Trader tidak perlu memasukkan puluhan atau ratusan riwayat trade lama satu per satu; sistem membaca tanggal, open/close price, lot, symbol, dan PnL otomatis dalam 1 detik.

2. **🤖 Discord Webhook Notification Bot (Auto-Alert ke Channel Pribadi / Komunitas)**
   - *Konsep*: Integrasi Discord Webhook URL.
   - *Manfaat*: Setiap kali trader melakukan *Log Trade*, mencatat TP/SL, atau melakukan Withdrawal, bot otomatis mengirim embed pesan keren berwarna hijau/merah ke channel Discord trader atau grup VIP komunitasnya.

3. **📈 Live TradingView Interactive Chart Widget**
   - *Konsep*: Menyematkan widget chart TradingView interaktif langsung di tab atau modal trade.
   - *Manfaat*: Trader bisa memantau chart live, menggambar area support/resistance, dan mengecek timeframe multi-chart tanpa harus membuka aplikasi lain.

---

### B. Analisis & Kecerdasan Buatan (AI)
4. **🧠 AI Trade Performance Analyzer & Leak Detector**
   - *Konsep*: AI Assistant yang menganalisis seluruh database histori trading pengguna.
   - *Manfaat*: Mendeteksi kebocoran psikologi & SOP secara otomatis (misal: *"Winrate Anda 85% di sesi London pada XAUUSD, namun Anda kehilangan 60% profit di sesi New York pada hari Jumat akibat emosi FOMO"*), lalu memberikan rekomendasi perbaikan.

5. **🎙️ Voice Note / Audio Memo Journaling (Rekam Catatan Suara)**
   - *Konsep*: Tombol rekam suara 30–60 detik langsung di form trade.
   - *Manfaat*: Solusi cepat bagi trader yang malas mengetik saat emosi sedang meluap atau setelah sesi trading panjang; rekaman tersimpan di cloud dan dapat didengarkan kembali saat evaluasi mingguan.

---

### C. Psikologi, Disiplin & Gamifikasi
6. **🎯 Pre-Trade Discipline Checklist & Daily Routine Score**
   - *Konsep*: Checklist konfirmasi sebelum menekan tombol entry (misal: *Risk $\le 1\%$? HTF Trend searah? Tidak ada High-Impact News?*).
   - *Manfaat*: Menghitung skor kepatuhan aturan (*Discipline Score %*) harian untuk mencegah *impulse trading*.

7. **🛡️ Prop Firm Challenge Tracker & Drawdown Safeguard**
   - *Konsep*: Mode khusus bagi trader yang sedang mengikuti evaluasi Prop Firm (FTMO, FundedNext, Topstep, MFF).
   - *Manfaat*: Visual meter Target Profit (8%/10%) vs Daily Loss Limit (5%) vs Max Drawdown (10%) real-time dengan sistem alarm peringatan merah jika mendekati batas pelanggaran (*breached limit*).

8. **🏆 Trading Milestones & Gamification Achievement Badges (Sistem Lencana Disiplin)**
   - *Konsep*: Sistem reward lencana (badges) dan level trader berdasarkan kedisiplinan eksekusi.
   - *Contoh Lencana*:
     - 🛡️ *Risk Guardian* (20 trade berturut-turut menjaga risiko $\le 1\%$).
     - 🎯 *Sniper Entry* (Mengeksekusi trade dengan $RRR \ge 1:4$).
     - 🧘 *Zen Mindset* (10 trade berturut-turut tanpa emosi *FOMO / Revenge*).

9. **🖼️ Aesthetic Shareable Trade PnL Card Generator (Social Share Flyer)**
   - *Konsep*: Tombol 1-klik untuk meng-generate gambar kartu grafis estetik dark-neon (format PNG) berisi Symbol, Direction (BUY/SELL), PnL %, R-Multiple (`+3.5R`), dan Setup.
   - *Manfaat*: Siap di-download dan dibagikan ke Instagram Story, Twitter/X, Telegram, atau Discord.

10. **📚 Trading Playbook & Best Setups Catalog (Katalog Setup A+)**
    - *Konsep*: Folder khusus untuk mengarsipkan trade-trade terbaik (*Best Trades of the Month*).
    - *Manfaat*: Berfungsi sebagai buku panduan (*Cheat Sheet*) pribadi dengan rating bintang (⭐⭐⭐⭐⭐) yang bisa dibuka kembali sebelum memulai sesi trading.

---

*Terakhir diperbarui: 26 Agustus 2026*
