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
| 19 | **Quick Lot & Risk Auto-Sizer Terintegrasi di Form Input** | 🟢 **SELESAI** | Auto-kalkulator lot size instan langsung di dalam modal input trade berdasarkan jarak Entry/SL, saldo akun, dan persentase risiko (0.5%, 1%, 2%). |


---

## 🚀 2. Daftar Saran Fitur Lanjutan (Roadmap Masa Depan)

Berikut adalah daftar ide dan saran fitur potensial yang siap diwujudkan pada tahap pengembangan selanjutnya:

### A. Privasi, Otomasi & Bot Pintar
1. **👁️ Stealth Mode & Quick PIN Privacy Lock (Mode Sensor Saldo Instan)**
   - *Konsep*: 1-klik menyensor seluruh nominal saldo (\$) dan lot menjadi tanda `***` atau `••••` saat membuka laptop di tempat umum/kafe, serta kunci PIN 4-digit kilat.

2. **⚡ Auto-Import CSV / Statement dari MetaTrader (MT4 / MT5) & TradingView**
   - *Konsep*: Fitur *drag-and-drop* file statement riwayat trading dari MT4/MT5 atau TradingView dalam 1 detik.

3. **📡 1-Click Discord & Telegram Signal Broadcaster (Kirim Sinyal / Setup ke Grup)**
   - *Konsep*: Tombol 1-klik untuk membagikan setup trade lengkap (chart Before/After, Direction, Entry, SL, TP, RRR) dalam format Rich Embed ke channel Discord / Telegram.

4. **📰 Auto-Detect High-Impact News on Entry (Detektor Berita Otomatis)**
   - *Konsep*: Sistem mencocokkan waktu entry trade dengan jadwal rilis kalender ekonomi secara otomatis.

5. **🤖 Discord Webhook Notification Bot (Auto-Alert ke Komunitas)**
   - *Konsep*: Mengirim embed pesan trade berwarna hijau/merah ke channel Discord trader atau grup VIP komunitasnya.

6. **📱 Telegram Instant Trade Logger Bot**
   - *Konsep*: Cukup ketik pesan singkat di Telegram (misal: `BUY XAUUSD 2500 SL 2490 TP 2520 +$350 Win`), bot langsung memasukkan data ke journal.

7. **⚡ Batch Multi-Trade Editor & Bulk Tagger (Edit Massal & Pemberian Tag Cepat)**
   - *Konsep*: Centang puluhan trade di tabel jurnal untuk mengganti Setup, memindahkan Akun, atau memberi tag massal dalam 1-klik.

8. **📈 Live TradingView Interactive Chart Widget**
   - *Konsep*: Menyematkan widget chart TradingView interaktif langsung di tab atau modal trade.

---

### B. Analisis Lanjutan, Psikologi & Pemulihan
9. **🧘 60-Second Cooldown & Box Breathing Relaxer (Pereda Emosi Pasca Loss)**
   - *Konsep*: Modal animasi visual *Box Breathing (4-4-4-4)* pasca trade loss untuk menurunkan detak jantung dan hormon kortisol stres sebelum menyentuh chart berikutnya.

10. **🕸️ Multi-Setup Spider Web / Radar Chart (Grafik Jaring Laba-Laba SOP)**
    - *Konsep*: Radar visual 5 dimensi (*Winrate, RRR, Profit Factor, Frekuensi, Stabilitas*) membandingkan seluruh strategi SOP secara holistik.

11. **⏳ Holding Duration Decay & Peak Profit Curve (Kurva Puncak Keuntungan Trade)**
    - *Konsep*: Menghitung kurva laba terhadap waktu tahan posisi untuk mengetahui menit optimal melakukan *Take Profit* sebelum harga berbalik arah.

12. **🛡️ Distance-to-Peak & Drawdown Recovery Calculator (Kalkulator Pemulihan Drawdown)**
    - *Konsep*: Menghitung exact % profit yang dibutuhkan untuk kembali ke modal semula / ATH dan estimasi jumlah trade pemulihan (*Recovery Velocity*).

13. **⚖️ Head-to-Head Account & Period Comparison (Perbandingan 2 Akun Berdampingan)**
    - *Konsep*: Membandingkan Akun Live vs Prop Firm, atau Bulan Ini vs Bulan Lalu secara berdampingan dalam satu layar.

14. **🧘 Physical & Mental State Correlation Tracker (Korelasi Kualitas Tidur, Fokus & Profit)**
    - *Konsep*: Mencatat kualitas tidur, energi, dan level stres untuk menemukan korelasi fisik terhadap performa profit.

15. **🛡️ Break-Even & Trailing Stop Efficiency Tracker (Analisis Efektivitas Geser SL ke BE)**
    - *Konsep*: Menghitung statistik berapa modal yang terselamatkan oleh BE vs berapa trade yang tersentuh BE lalu terbang ke TP.

16. **🎲 Streak Probability & Expectancy Simulator (Simulasi Rentetan Loss Beruntun)**
    - *Konsep*: Teori probabilitas matematika menghitung peluang mengalami rentetan loss beruntun dalam 50–100 trade ke depan.

17. **📅 Annual Seasonality & Month-by-Month Matrix (Matriks Musiman Pasar)**
    - *Konsep*: Memetakan performa dari Januari hingga Desember untuk mengetahui kuartal/bulan yang paling profitabel (*Seasonal Edge*).

18. **💸 Multi-Broker Commission & Overnight Swap Fee Analyzer**
    - *Konsep*: Menganalisis berapa persen keuntungan kotor yang terpotong untuk komisi dan biaya inap (*Swap*) broker.

19. **📉 Slippage & Broker Hidden Cost Tracker (Pelacak Biaya Tersembunyi Broker)**
    - *Konsep*: Membandingkan *Planned Entry Price* vs *Actual Filled Price* untuk menghitung nominal uang yang hilang akibat slippage/spread broker.

20. **🧠 Psychological Emotion Cost & Leak Breakdown (Hitung Kerugian Emosi)**
    - *Konsep*: Analisis mendalam menghitung total nominal uang yang hilang (*Cost of Emotion*) akibat emosi *FOMO* atau *Revenge Trading*.

21. **🧠 AI Trade Performance Analyzer & Leak Detector**
    - *Konsep*: AI Assistant yang mendeteksi kebocoran psikologi dan memberikan rekomendasi konkret untuk memperbaiki *edge*.

22. **⚖️ Currency & Asset Correlation Matrix (Matriks Korelasi Pasangan Aset)**
    - *Konsep*: Analisis korelasi real-time antar aset (misal: EURUSD vs GBPUSD $+0.88$, DXY vs XAUUSD $-0.92$) untuk mencegah *Over-Exposure*.

23. **🎯 Strategy Edge Scatter Plot Matrix (Peta Efisiensi Strategi)**
    - *Konsep*: Grafik kuadran 2D (Sumbu X: Winrate %, Sumbu Y: Average R:R) untuk memetakan setup *Cash Cow* vs *Money Drain*.

24. **📅 Day-of-Week & Hourly Profit Heatmap Matrix (Matriks Jam & Hari Terbaik)**
    - *Konsep*: Heatmap 2D (Hari vs Jam) untuk menemukan jam dan hari eksekusi paling profitabel.

25. **📅 Weekly & Monthly Retrospective Reviewer (Laporan Evaluasi Rutin)**
    - *Konsep*: Ringkasan otomatis setiap akhir pekan (*Weekly Trading Debrief*) lengkap dengan kolom refleksi mingguan.

26. **💱 Multi-Currency Realtime Portfolio Aggregator (Konversi Otomatis ke Rupiah / USD)**
    - *Konsep*: Tombol konversi satu sentuhan untuk melihat total portofolio multi-akun dalam mata uang USD, IDR, atau EUR.

---

### C. Laporan Keuangan, Pengaman Risiko & Gamifikasi
27. **📑 Formal Monthly Income & Tax Statement (Laporan Penghasilan Bersih Bulanan)**
    - *Konsep*: Dokumen formal rincian *Gross Profit, Biaya Broker, Net Withdrawn Profit* untuk arsip pembukuan keuangan pribadi atau laporan pajak.

28. **📋 Dynamic SOP Setup Checklist & Confluence Score (Validator Syarat SOP Dinamis)**
    - *Konsep*: Checklist syarat wajib otomatis saat memilih setup strategi untuk menghitung Skor Konfluensi SOP (0%–100%).

29. **🖼️ Trade Chart Magnifier & High-Res Zoom Inspector (Kaca Pembesar Chart)**
    - *Konsep*: Lensa pembesar dan zoom detail tinggi untuk memeriksa candlestick dan area FVG tanpa pecah.

30. **🔒 Emergency Tilt Lock & Daily Loss Kill-Switch (Kunci Anti-Revenge Trading)**
    - *Konsep*: Sistem pengaman psikologi darurat yang mengunci form input trade selama 4 jam jika trader mengalami batas rugi harian.

31. **📱 Mobile Swipe Review Mode (Mode Review Geser di HP)**
    - *Konsep*: Mode review cepat ala kartu di smartphone: Geser Kanan (Trade A+), Geser Kiri (Pelanggaran Disiplin).

32. **🔔 Institutional Audio FX & Real-Time Sound Feedback**
    - *Konsep*: Suara audio elegan (*Cash Chime*, *Subtle Loss Muffle*, *Risk Ping*) dengan toggle Mute.

33. **🧮 Partial Take-Profit & Multi-Target Sizing Calculator**
    - *Konsep*: Kalkulator pembagian TP1, TP2, dan Runner Trailing Stop secara presisi.

34. **🎯 Pre-Trade Discipline Checklist & Daily Routine Score**
    - *Konsep*: Checklist konfirmasi sebelum menekan tombol entry untuk menghitung skor kepatuhan aturan (*Discipline Score %*) harian.

35. **🛡️ Prop Firm Challenge Tracker & Drawdown Safeguard**
    - *Konsep*: Mode khusus evaluasi Prop Firm (Target Profit vs Daily Loss vs Max Drawdown dengan alarm merah).

36. **🏆 Trading Milestones & Gamification Achievement Badges**
    - *Konsep*: Sistem reward lencana (*Risk Guardian*, *Sniper Entry*, *Zen Mindset*) berdasarkan kedisiplinan eksekusi.

37. **🖼️ Aesthetic Shareable Trade PnL Card Generator**
    - *Konsep*: Tombol 1-klik untuk meng-generate kartu grafis PNG dark-neon berisi hasil trade untuk dibagikan ke media sosial.

38. **📚 Trading Playbook & Best Setups Catalog (Katalog Setup A+)**
    - *Konsep*: Folder khusus arsip trade terbaik (*Best Trades of the Month*) dengan rating bintang (⭐⭐⭐⭐⭐) sebagai panduan *cheat sheet*.

### D. Fitur Baru Inovatif & Advanced Pro (Next Level)
39. **🎙️ Voice Memo & Audio Post-Trade Review (Catatan Suara Kilat)**
    - *Konsep*: Fitur rekam suara (audio memo) langsung di browser saat review trade tanpa perlu repot mengetik panjang setelah sesi trading yang melelahkan.

40. **📊 3-Stage Multi-Timeframe Chart Flow (HTF ➔ MTF ➔ LTF Carousel)**
    - *Konsep*: Carousel upload 3 tingkat gambar analisa dalam 1 trade: *Higher Timeframe Narrative (Daily/4H)* ➔ *Medium Timeframe Setup (15m)* ➔ *Lower Timeframe Trigger (1m/5m)*.

41. **🧪 Backtest vs Live "Execution Gap" Simulator**
    - *Konsep*: Memisahkan kurva data Backtesting vs Live Trading pada strategi yang sama untuk mengukur perbedaan (*Execution Gap*) antara teori strategi vs disiplin nyata.

42. **🛡️ Prop Firm Trailing Drawdown High-Water Mark Engine**
    - *Konsep*: Kalkulasi cerdas untuk aturan prop firm berbasis *Trailing Drawdown EOD / Intra-day (Apex, Topstep, FundedNext)* yang batas risikonya naik mengunci di saldo tertinggi.

43. **🔥 Heatmap Matrix Sesi Trading x Pair (Pair Session Volatility Matcher)**
    - *Konsep*: Matriks analitik yang menunjukkan pair mana yang paling menguntungkan di sesi tertentu (misal: *GBPJPY di London Open* vs *XAUUSD di NY AM*).

44. **🛡️ Automated Account Risk Shield & Hard Lockout Timer**
    - *Konsep*: Timer countdown lockout otomatis ketika menyentuh Max Daily Loss yang ditentukan sendiri untuk menghentikan siklus *revenge trading*.

### E. Fitur Eksklusif Baru (Gelombang Terkini)
45. **📴 True Offline-First Sync & Background Auto-Queue**
    - *Konsep*: Dukungan penuh offline via IndexedDB di browser. Trader dapat mencatat trade dan melampirkan screenshot saat koneksi terputus (misal di pesawat), dan otomatis tersinkronisasi ke Supabase begitu internet kembali terhubung.

46. **⚡ Quick Screenshot Clipboard OCR & Auto-Fill**
    - *Konsep*: Tekan `Ctrl + V` untuk paste screenshot TradingView/MetaTrader, lalu sistem otomatis membaca teks nama Pair, Timeframe, dan Tanggal dari chart untuk mengisi form secara instan tanpa ketik manual.

47. **🎯 R:R Multiple Efficiency Grader & Early Exit Leak Detector**
    - *Konsep*: Penilaian otomatis efisiensi eksekusi (Grade A, B, C, F) dengan membandingkan *Planned R:R* vs *Achieved R:R* untuk mendeteksi kebiasaan *cut profit* terlalu dini.

48. **🗂️ Multi-Tag Logic Query Builder (Filter Kombinasi Bebas)**
    - *Konsep*: Mesin pencarian filter lanjutan dengan logika AND/OR antar tag (contoh: *London Session* + *ICT Silver Bullet* + *Rule Followed = TRUE* + *R:R ≥ 2.5*).

49. **📉 Realized Drawdown vs Maximum Favorable Excursion (MAE / MFE Matrix)**
    - *Konsep*: Analisis seberapa jauh harga sempat floating minus (*Maximum Adverse Excursion*) dan seberapa jauh harga sempat floating profit (*Maximum Favorable Excursion*) sebelum posisi ditutup untuk mengoptimalkan penempatan Stop Loss dan Take Profit.

50. **🛡️ Dynamic Lot Risk Calculator Shortcut Langsung di Form Input**
    - *Konsep*: Tombol kalkulator risiko instan di dalam TradeFormModal yang langsung mengkalkulasi lot berdasarkan Stop Loss price dan % resiko saldo saat itu juga.

---

### F. Saran Fitur Baru & Inovasi Tingkat Lanjut (Batch 51 - 62)

51. **📊 Trade Equity Curve & Watermark Overlay (Pemisahan Kurva Profit per Setup)**
    - *Konsep*: Memecah kurva ekuitas saldo keseluruhan menjadi beberapa sub-kurva berwarna untuk tiap Setup/SOP (misal: kurva *FVG Mitigation* vs *Breakout*) dalam satu grafik, sehingga terlihat jelas strategi mana yang menggendong portofolio dan mana yang membebani.

52. **🎯 Live Risk of Ruin & Drawdown Probability Matrix**
    - *Konsep*: Menghitung probabilitas matematis akun mengalami drawdown 10%, 20%, 50%, atau modal habis (Ruin) berdasarkan formula statistik *Vince / Ralph* menggunakan data historis Winrate & Payoff Ratio aktual.

53. **🔄 Live Position Sizing Converter & Multi-Pair Currency Cross Rates**
    - *Konsep*: Konverter pip value otomatis real-time untuk cross pair eksotis (misal: EURGBP, EURAUD, GBPCHF) yang menghitung rate konversi mata uang akun (misal USD) ke quote currency tanpa perlu tebak-tebakan pip value.

54. **🧠 Smart AI Rule Adherence Audit & Tagging (AI Post-Mortem Analyzer)**
    - *Konsep*: Evaluasi otomatis via prompt analitis internal terhadap isian catatan `Lessons` dan `Notes` trader untuk memberikan skor objektivitas, mendeteksi kata-kata bernada panik/FOMO, dan memberi saran perbaikan mindset.

55. **📈 Rolling Sharpe & Sortino Ratio Performance Gauge**
    - *Konsep*: Menampilkan grafik metrik hedge fund standar (Sharpe Ratio untuk volatilitas total, Sortino Ratio khusus volatilitas downside negatif) dengan window 30 trade bergulir (*rolling 30-trade window*) untuk mengukur konsistensi risiko.

56. **📋 Automated End-of-Day / Weekend PDF Digest to Telegram/Email**
    - *Konsep*: Pengiriman ringkasan performa harian / mingguan (Total Trade, Winrate, Net PnL, Top Winner, Biggest Mistake) otomatis ke bot Telegram atau Email pribadi trader pada penutupan pasar Jumat malam.

57. **🎯 R-Multiple Distribution Histogram & Expectancy Curve**
    - *Konsep*: Visualisasi histogram sebaran keuntungan dalam kelipatan R (+1R, +2R, +3R, -1R) untuk melihat apakah kurva profit trader memiliki *fat positive tail* (laba besar asimetris) atau justru sering terkena *negative outlier*.

58. **🛡️ Max Floating Profit Loss Guard (Trailing Profit Protector Calculator)**
    - *Konsep*: Menghitung seberapa sering posisi floating profit tinggi (+2R atau lebih) berakhir kena Stop Loss atau Break-Even, lengkap dengan rekomendasi level *Take Profit parsial* optimal.

59. **⏱️ Pre-Market Warmup & Readiness Assessment Quiz (Tes Kesiapan Mental Sebelum Trading)**
    - *Konsep*: Kuis singkat 3 pertanyaan (Kondisi fisik, rencana risiko hari ini, daftar berita berdampak tinggi) sebelum tombol 'New Trade' aktif untuk memastikan kesiapan trading 100%.

60. **🗃️ Trade Grouping & Scale-In / Scale-Out Position Bundler**
    - *Konsep*: Kemampuan menggabungkan beberapa order/tiket parsial (misal: entry 3 kali dengan layer lot bertingkat pada satu setup yang sama) menjadi satu kesatuan *Parent Trade Campaign* dengan kalkulasi rata-rata entry (Average Weighted Entry).

61. **📊 Winrate & RRR Sensitivity Threshold (Tabel Sensitivitas Impas)**
    - *Konsep*: Tabel matriks dinamis yang menunjukkan jika winrate turun 5%–10%, berapa RRR minimum yang wajib dipertahankan agar portofolio tetap profit bersih.

62. **📑 Single-Page PDF Trade Case Study Exporter (Lembar Bedah 1 Trade)**
    - *Konsep*: Cetak 1 lembar dokumen PDF eksklusif khusus untuk satu trade terpilih: berisi screenshot Before/After resolusi tinggi, checklist konfluensi, metrik angka, evaluasi psikologi, dan catatan pelajaran penting.

---

*Terakhir diperbarui: 27 Agustus 2026*
