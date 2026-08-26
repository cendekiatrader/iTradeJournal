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
| 5 | **Executive PDF Audit Report Generator** | 🟢 **SELESAI** | Generator laporan audit portofolio resmi siap cetak / simpan sebagai dokumen PDF beresolusi tinggi untuk investor, mentor, atau prop firm partner. |
| 6 | **Interactive Visual Risk-to-Reward Scale & Slider** | 🟢 **SELESAI** | Visualisasi interaktif proporsi area resiko (merah) vs target reward (hijau) lengkap dengan kalkulasi batas winrate impas (Break-Even Win Rate %). |
| 7 | **Economic Calendar & High-Impact News Radar** | 🟢 **SELESAI** | Feed kalender berita fundamental dunia real-time dengan filter Red Folder (High Impact) dan alert radar di Dashboard. |
| 8 | **Multi-Market Session Live Clock & Killzone Radar** | 🟢 **SELESAI** | Jam sesi pasar dunia (Tokyo, London, New York, Sydney) dengan detektor otomatis *London/NY Killzones* & *London-NY Overlap Peak*. |
| 9 | **Pro Trader Keyboard Shortcuts & Fast Navigation** | 🟢 **SELESAI** | Navigasi kilat (`N` = New Trade, `D` = Dashboard, `J` = Journal, `A` = Analytics, `C` = Calculator, `Ctrl+Enter` = Submit, `?` = Cheat Sheet). |
| 10 | **Kelly Criterion & Sizing Model Risk Simulator** | 🟢 **SELESAI** | Algoritma matematika probabilitas untuk menghitung ukuran risiko optimal (Full-Kelly, Half-Kelly, Quarter-Kelly vs Fixed 1%) tanpa risiko ruin. |
| 11 | **Dual Chart Comparison (Before vs After Slider)** | 🟢 **SELESAI** | Interactive split slider untuk membandingkan chart analisa sebelum entry (Before) vs chart hasil eksekusi (After). |
| 12 | **Monte Carlo Risk & Equity Forecaster** | 🟢 **SELESAI** | Algoritma matematika 1.000 simulasi masa depan untuk memprediksi probabilitas profit, risiko drawdown, dan target evaluasi prop firm. |
| 13 | **Account Growth Compounding & Roadmap Planner** | 🟢 **SELESAI** | Kalkulator proyeksi pertumbuhan saldo berbunga (*Compounding Plan*) bulan per bulan lengkap dengan simulasi persentase penarikan profit (*Withdrawal Milestone*). |
| 14 | **Trade Holding Duration & Time Edge Matrix** | 🟢 **SELESAI** | Matriks analisis efektivitas trading berdasarkan durasi tahan posisi: Scalp (<15m), Intraday (15m–4h), Day Trade (4h–24h), dan Swing (>1 hari). |
| 15 | **Custom Institutional Accent Themes (5 Luxury Themes)** | 🟢 **SELESAI** | Sistem ganti tema warna visual mewah 1-klik: *Emerald Institutional*, *Sapphire Electric*, *Obsidian Amethyst*, *Golden Bullion*, dan *Crimson Titan*. |
| 16 | **Multi-Account & Multi-Asset Support** | 🟢 **SELESAI** | Dukungan multi-akun (Live, Prop Firm, Challenge), sistem withdrawal terpisah, serta satuan Lot (Forex/Gold), Unit (Crypto), dan Kontrak (Indeks). |
| 17 | **Interactive Calendar Heatmap** | 🟢 **SELESAI** | Tampilan kalender harian dengan kalkulasi RRR dan PnL harian serta detail trade popup. |
| 18 | **CSV Exporter** | 🟢 **SELESAI** | Kemampuan ekspor seluruh data trade dan metrik ke format CSV dalam 1-klik. |

---

## 🚀 2. Daftar Saran Fitur Lanjutan (Roadmap Masa Depan)

Berikut adalah daftar ide dan saran fitur potensial yang siap diwujudkan pada tahap pengembangan selanjutnya:

### A. Privasi, Otomasi & Bot Pintar
1. **👁️ Stealth Mode & Quick PIN Privacy Lock (Mode Sensor Saldo Instan)**
   - *Konsep*: 1-klik menyensor seluruh nominal saldo (\$) dan lot menjadi tanda `***` atau `••••` saat membuka laptop di tempat umum/kafe, serta kunci PIN 4-digit kilat.

2. **⚡ Auto-Import CSV / Statement dari MetaTrader (MT4 / MT5) & TradingView**
   - *Konsep*: Fitur *drag-and-drop* file statement riwayat trading dari MT4/MT5 atau TradingView dalam 1 detik.

3. **📰 Auto-Detect High-Impact News on Entry (Detektor Berita Otomatis)**
   - *Konsep*: Sistem mencocokkan waktu entry trade dengan jadwal rilis kalender ekonomi secara otomatis.

4. **🤖 Discord Webhook Notification Bot (Auto-Alert ke Komunitas)**
   - *Konsep*: Mengirim embed pesan trade berwarna hijau/merah ke channel Discord trader atau grup VIP komunitasnya.

5. **📱 Telegram Instant Trade Logger Bot**
   - *Konsep*: Cukup ketik pesan singkat di Telegram (misal: `BUY XAUUSD 2500 SL 2490 TP 2520 +$350 Win`), bot langsung memasukkan data ke journal.

6. **⚡ Batch Multi-Trade Editor & Bulk Tagger (Edit Massal & Pemberian Tag Cepat)**
   - *Konsep*: Centang puluhan trade di tabel jurnal untuk mengganti Setup, memindahkan Akun, atau memberi tag massal dalam 1-klik.

7. **📈 Live TradingView Interactive Chart Widget**
   - *Konsep*: Menyematkan widget chart TradingView interaktif langsung di tab atau modal trade.

---

### B. Analisis Lanjutan, Pemulihan & Psikologi
8. **🛡️ Distance-to-Peak & Drawdown Recovery Calculator (Kalkulator Pemulihan Drawdown)**
   - *Konsep*: Menghitung exact % profit yang dibutuhkan untuk kembali ke modal semula / ATH dan estimasi jumlah trade pemulihan (*Recovery Velocity*).

9. **⚖️ Head-to-Head Account & Period Comparison (Perbandingan 2 Akun Berdampingan)**
   - *Konsep*: Membandingkan Akun Live vs Prop Firm, atau Bulan Ini vs Bulan Lalu secara berdampingan dalam satu layar.

10. **🧘 Physical & Mental State Correlation Tracker (Korelasi Kualitas Tidur, Fokus & Profit)**
    - *Konsep*: Mencatat kualitas tidur, energi, dan level stres untuk menemukan korelasi fisik terhadap performa profit.

11. **🛡️ Break-Even & Trailing Stop Efficiency Tracker (Analisis Efektivitas Geser SL ke BE)**
    - *Konsep*: Menghitung statistik berapa modal yang terselamatkan oleh BE vs berapa trade yang tersentuh BE lalu terbang ke TP.

12. **🎲 Streak Probability & Expectancy Simulator (Simulasi Rentetan Loss Beruntun)**
    - *Konsep*: Teori probabilitas matematika menghitung peluang mengalami rentetan loss beruntun dalam 50–100 trade ke depan.

13. **📅 Annual Seasonality & Month-by-Month Matrix (Matriks Musiman Pasar)**
    - *Konsep*: Memetakan performa dari Januari hingga Desember untuk mengetahui kuartal/bulan yang paling profitabel (*Seasonal Edge*).

14. **💸 Multi-Broker Commission & Overnight Swap Fee Analyzer**
    - *Konsep*: Menganalisis berapa persen keuntungan kotor yang terpotong untuk komisi dan biaya inap (*Swap*) broker.

15. **📉 Slippage & Broker Hidden Cost Tracker (Pelacak Biaya Tersembunyi Broker)**
    - *Konsep*: Membandingkan *Planned Entry Price* vs *Actual Filled Price* untuk menghitung nominal uang yang hilang akibat slippage/spread broker.

16. **🧠 Psychological Emotion Cost & Leak Breakdown (Hitung Kerugian Emosi)**
    - *Konsep*: Analisis mendalam menghitung total nominal uang yang hilang (*Cost of Emotion*) akibat emosi *FOMO* atau *Revenge Trading*.

17. **🧠 AI Trade Performance Analyzer & Leak Detector**
    - *Konsep*: AI Assistant yang mendeteksi kebocoran psikologi dan memberikan rekomendasi konkret untuk memperbaiki *edge*.

18. **⚖️ Currency & Asset Correlation Matrix (Matriks Korelasi Pasangan Aset)**
    - *Konsep*: Analisis korelasi real-time antar aset (misal: EURUSD vs GBPUSD $+0.88$, DXY vs XAUUSD $-0.92$) untuk mencegah *Over-Exposure*.

19. **🎯 Strategy Edge Scatter Plot Matrix (Peta Efisiensi Strategi)**
    - *Konsep*: Grafik kuadran 2D (Sumbu X: Winrate %, Sumbu Y: Average R:R) untuk memetakan setup *Cash Cow* vs *Money Drain*.

20. **📅 Day-of-Week & Hourly Profit Heatmap Matrix (Matriks Jam & Hari Terbaik)**
    - *Konsep*: Heatmap 2D (Hari vs Jam) untuk menemukan jam dan hari eksekusi paling profitabel.

21. **📅 Weekly & Monthly Retrospective Reviewer (Laporan Evaluasi Rutin)**
    - *Konsep*: Ringkasan otomatis setiap akhir pekan (*Weekly Trading Debrief*) lengkap dengan kolom refleksi mingguan.

22. **💱 Multi-Currency Realtime Portfolio Aggregator (Konversi Otomatis ke Rupiah / USD)**
    - *Konsep*: Tombol konversi satu sentuhan untuk melihat total portofolio multi-akun dalam mata uang USD, IDR, atau EUR.

---

### C. Pengaman Risiko, Mobile & Gamifikasi
23. **📋 Dynamic SOP Setup Checklist & Confluence Score (Validator Syarat SOP Dinamis)**
    - *Konsep*: Checklist syarat wajib otomatis saat memilih setup strategi untuk menghitung Skor Konfluensi SOP (0%–100%).

24. **🖼️ Trade Chart Magnifier & High-Res Zoom Inspector (Kaca Pembesar Chart)**
    - *Konsep*: Lensa pembesar dan zoom detail tinggi untuk memeriksa candlestick dan area FVG tanpa pecah.

25. **🔒 Emergency Tilt Lock & Daily Loss Kill-Switch (Kunci Anti-Revenge Trading)**
    - *Konsep*: Sistem pengaman psikologi darurat yang mengunci form input trade selama 4 jam jika trader mengalami batas rugi harian.

26. **📱 Mobile Swipe Review Mode (Mode Review Geser di HP)**
    - *Konsep*: Mode review cepat ala kartu di smartphone: Geser Kanan (Trade A+), Geser Kiri (Pelanggaran Disiplin).

27. **🔔 Institutional Audio FX & Real-Time Sound Feedback**
    - *Konsep*: Suara audio elegan (*Cash Chime*, *Subtle Loss Muffle*, *Risk Ping*) dengan toggle Mute.

28. **🧮 Partial Take-Profit & Multi-Target Sizing Calculator**
    - *Konsep*: Kalkulator pembagian TP1, TP2, dan Runner Trailing Stop secara presisi.

29. **🎯 Pre-Trade Discipline Checklist & Daily Routine Score**
    - *Konsep*: Checklist konfirmasi sebelum menekan tombol entry untuk menghitung skor kepatuhan aturan (*Discipline Score %*) harian.

30. **🛡️ Prop Firm Challenge Tracker & Drawdown Safeguard**
    - *Konsep*: Mode khusus evaluasi Prop Firm (Target Profit vs Daily Loss vs Max Drawdown dengan alarm merah).

31. **🏆 Trading Milestones & Gamification Achievement Badges**
    - *Konsep*: Sistem reward lencana (*Risk Guardian*, *Sniper Entry*, *Zen Mindset*) berdasarkan kedisiplinan eksekusi.

32. **🖼️ Aesthetic Shareable Trade PnL Card Generator**
    - *Konsep*: Tombol 1-klik untuk meng-generate kartu grafis PNG dark-neon berisi hasil trade untuk dibagikan ke media sosial.

33. **📚 Trading Playbook & Best Setups Catalog (Katalog Setup A+)**
    - *Konsep*: Folder khusus arsip trade terbaik (*Best Trades of the Month*) dengan rating bintang (⭐⭐⭐⭐⭐) sebagai panduan *cheat sheet*.

---

*Terakhir diperbarui: 27 Agustus 2026*
