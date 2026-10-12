# PRD — CopyTrade (MT5) — iTradeJournal

Status: **final untuk Fase 0–3** (jawaban terbuka sudah ditutup; sisa pertanyaan ada di §14).
Skala: **publik, multi-tenant, self-serve** (provider langsung tayang, moderasi setelah laporan).
Model copy: **MIRROR** — provider entry/exit di MT5-nya sendiri, client meniru otomatis.
Client mode: **FULL AUTO**, sizing **risk % dari balance** (tanpa batas keras), **tanpa dry-run**.
Notifikasi: **Telegram, bot per-provider + kode akses** (§7.3).
Platform: **MetaTrader 5 saja** (forex/CFD/XAU/indeks/crypto-CFD). Bukan saham IDX.

---

## 1. Ringkasan

Modul **CopyTrade** di iTradeJournal dengan dua peran:

- **Provider (Master)** — trader yang memasang EA di MT5-nya. EA-nya **membaca posisinya sendiri** dan mempublikasikan tiap event (open / modify SL-TP / partial close / close) ke server. Provider tidak perlu mengetik apa pun.
- **Client (Follower)** — memilih provider, mengatur % risiko, memasang EA di MT5-nya, lalu semua entry **dan exit** provider ditiru otomatis.

Prinsip yang tidak berubah:

> Web app **tidak pernah** menekan order di akun client. Server hanya menyimpan *state posisi provider* dan *event*.
> Yang mengeksekusi adalah **EA di terminal MT5 milik client sendiri**. Broker credential client tidak pernah meninggalkan PC client.

### 1.1 Keputusan final (semua dari diskusi)

| # | Keputusan |
|---|---|
| 1 | Skala **publik multi-tenant**, self-serve |
| 2 | Provider **eksekusi di MT5-nya** → **EA provider WAJIB** (mode MASTER/PUBLISHER) |
| 3 | Model **mirror penuh**: entry **dan exit** mengikuti provider |
| 4 | Client **FULL AUTO** |
| 5 | Sizing **risk % dari balance**, **tanpa batas keras** riskPct |
| 6 | Auto-jurnal ke Journal client: **opsional, default OFF** |
| 7 | Relay memakai **Supabase yang sudah ada** (PostgREST + RLS), tanpa backend baru |
| 8 | **Provider wajib 24/7** — terminal MT5-nya harus nyala terus (rekomendasi VPS) |
| 9 | Provider **tidak** diwajibkan menstempel SL/TP di akunnya sendiri |
| 10 | Provider **langsung tayang** tanpa approval; admin menindak setelah ada laporan |
| 11 | **Tidak ada batas** jumlah provider per client |
| 12 | **Tidak ada dry-run** — tidak di UI, tidak di input EA |
| 13 | Notifikasi **Telegram**: bot milik provider, client menghubungkan diri lewat kode akses (§7.3) |
| 14 | **Setiap perubahan SL/TP provider ditiru ke client**, termasuk kasus provider memasang SL belakangan setelah posisi jalan (§6.5) |

### 1.2 Konsekuensi yang harus diterima (harus tampil di UI, bukan disembunyikan)

| # | Konsekuensi |
|---|---|
| K1 | **Provider WAJIB punya terminal MT5 nyala 24/7.** Kalau provider tutup laptop, bukan cuma entry yang hilang — **exit-nya juga hilang**. Karena SL/TP broker-side di akun provider **tidak** diwajibkan (keputusan 9), provider yang trading tanpa SL bisa membuat follower-nya ikut telanjang. Harus ditulis terang-terangan di halaman apply provider + halaman client. |
| K2 | **Client FULL AUTO juga butuh terminal nyala** untuk menerima exit. Mitigasi yang tersisa: `slFallbackPoints` (setelan client), rekonsiliasi 30 detik, dan `maxHoldMinutes`. |
| K3 | Latensi realistis **3–5 detik** end-to-end. Bukan HFT, tidak cocok untuk scalp M1. |
| K4 | Hasil client **tidak akan identik** dengan provider: beda broker, spread, slippage, gap weekend, trigger SL berbeda, partial close dibulatkan ke volume step. |
| K5 | Provider hilang koneksi di tengah trade → posisi client "yatim". Ditangani rekonsiliasi (§6.4) + `maxHoldMinutes`. |
| K6 | `riskPct` tanpa batas = client bisa set 50% dan akunnya habis dalam 1 trade. Tidak diblokir (keputusan 5), tapi warning berlapis + konfirmasi di atas 10%, dan guard margin broker tetap aktif. |
| K7 | **Tanpa dry-run**, config pertama langsung live. Pertahanannya tinggal guard + kill switch + badge akun demo. Karena itu default guard dibuat konservatif dan di-review ulang setelah tiap batch. |
| K8 | **Bot token provider = rahasia tingkat password.** Siapa pun yang memegangnya bisa mengendalikan bot itu. Ditangani dengan enkripsi + tanpa SELECT policy untuk client (§7.3). |

---

## 2. Arsitektur

```
PROVIDER — terminal MT5 (EA mode MASTER, read-only)
  OnTradeTransaction (open/modify/close) ──► tandai dirty
  OnTimer (1–2 dtk) ─────────────────────► POST /rest/v1/copy_events  (+ provider_positions upsert)
                                            header: x-ea-token
                                                    │
                                    trigger DB: fan-out ke tiap copy_link aktif
                                                    │
                                       copy_deliveries (1 baris per client per event)
                                                    │
CLIENT — terminal MT5 (EA mode FOLLOWER) ───────────┘
  OnTimer (2 dtk):
    1. GET  ea_feed?select=rev            ← payload ~60 byte (hemat egress)
       rev berubah?
    2. GET  copy_deliveries?status=eq.pending&select=...
    3. guard lokal (spread, margin, jam, kill switch, limit)
    4. sizing risk % → OrderSend / modify SL-TP / close partial / close
    5. PATCH ack (status, ticket, fill, slippage, balance, equity)
    6. GET provider_positions → REKONSILIASI (§6.4)

TELEGRAM (Edge Function)
  /start <kode-akses> dari client ──► simpan chat_id ──► kirim notifikasi
                                        via bot token provider (terenkripsi)

CLIENT — web app
  status EA, log eksekusi & skip, equity provider, posisi terbuka, kill switch
  (opsional) auto-jurnal → entri Journal, default OFF
```

### 2.1 Kenapa PostgREST langsung (bukan Edge Function)

| | PostgREST | Edge Functions |
|---|---|---|
| Request | **unlimited** di free tier | 500.000/bulan (1 client @5s sudah ~520k) |
| Cocok untuk polling EA | ✅ | ❌ |

Edge Function **tetap dipakai** untuk yang jumlahnya sedikit tapi butuh rahasia: Telegram webhook/send. Volume notifikasi jauh di bawah 500k/bulan.

### 2.2 Hemat egress — pola `rev` (wajib untuk skala publik)

Free tier Supabase membatasi **egress 5 GB/bulan**, sementara jumlah request tidak dibatasi. Jadi polling sering itu murah **asal payload-nya kecil**.

- EA memanggil dulu endpoint murah: `GET /rest/v1/ea_feed?client_id=eq.<id>&select=rev` → **~60 byte**.
- Hanya kalau `rev` berubah, EA menarik payload penuh (`copy_deliveries`, `provider_positions`).
- `rev` dinaikkan trigger setiap kali ada event baru untuk client itu.

Hitungan: poll 2 detik + payload 60 byte ≈ **~52 MB/bulan per client** → 5 GB ≈ **~95 client**. Tanpa pola ini (payload 2 KB) hanya ~5 client. Di atas ~100 client aktif: Cloudflare Workers free (100k req/hari) sebagai cache di depan, atau Supabase Pro.

---

## 3. Peran & hak akses

| Peran | Cara dapat | Bisa apa |
|---|---|---|
| `signal_provider` | **self-serve**: isi profil + centang ToS/disclaimer → langsung tayang (admin bisa suspend) | publikasikan posisi (otomatis), kelola follower, bot Telegram, statistik publik |
| Client | siapa pun yang login | follow/unfollow provider (bebas jumlah), atur risk, pasang EA, kill switch, hubungkan Telegram |
| Admin | sudah ada | suspend/verify provider, moderasi, lihat semua link |
| Publik (anon) | — | `/copytrade`, halaman profil provider, leaderboard |

Karena self-serve: **moderasi setelah laporan**. Wajib ada tombol **Laporkan provider**, `is_suspended` (langsung memutus fan-out), dan riwayat tindakan admin. ToS + disclaimer risiko dicentang saat apply (bukan saat approve, karena tidak ada approval).

---

## 4. Sizing Engine — risk % dari balance

Semua perhitungan di **sisi EA client** (hanya EA yang tahu kontrak, tick value, dan step volume broker client).

### 4.1 Rumus

```
1. riskAmount = basis × riskPct / 100
                basis = ACCOUNT_BALANCE (default, sesuai permintaan) | ACCOUNT_EQUITY
                riskPct = bebas (tanpa batas keras); divalidasi > 0

2. stopDistance = |entryRef − sl|
                entryRef = harga fill provider (acuan risiko, default)
                           atau harga pasar saat client masuk (opsi)
                SL provider kosong → slFallbackPoints (default AKTIF, 100 poin)
                provider TIDAK diwajibkan punya SL; jaring pengaman ada di sisi
                client sebagai setelan milik client sendiri

3. moneyPerUnitPerLot = SYMBOL_TRADE_TICK_VALUE / SYMBOL_TRADE_TICK_SIZE
                        // uang (mata uang deposit) per 1.0 pergerakan harga per 1 lot

4. rawLots = riskAmount / (stopDistance × moneyPerUnitPerLot)

5. lots = MathFloor(rawLots / volumeStep) × volumeStep      // SELALU ke bawah
   clamp: minLot ≤ lots ≤ min(maxLotCap, SYMBOL_VOLUME_MAX)
   lalu MathMin(lots, SYMBOL_VOLUME_LIMIT / jumlahPosisiSejenis)
   lot di bawah minLot → SKIP (default) atau pakai minLot + warning
                        (opsi `allowMinLotFallback`, default OFF)

6. margin = OrderCalcMargin(...) ; butuh ≤ ACCOUNT_MARGIN_FREE × marginBuffer (default 0.8)
   gagal → skip, alasan "insufficient margin"
```

Aturan tetap: dibulatkan **ke bawah**, tidak pernah ke atas.

### 4.2 Contoh

Balance $10.000, risk **1%** → $100. XAUUSD entry 2400.00, SL 2397.50 → stopDistance 2.50.

| Instrumen | tickValue | tickSize | money/1.0 harga/lot | rawLots | Lot final (step 0.01) |
|---|---|---|---|---|---|
| XAUUSD | $1.00 | 0.01 | $100 | 100 / (2.50 × 100) | **0.40** |
| EURUSD | $1.00 | 0.00001 | $100.000 | 100 / (0.0025 × 100.000) | **0.40** |
| US500 | $0.10 | 0.1 | $1 | 100 / (15 × 1) | **6.67** |

*(tickValue/tickSize di atas ilustrasi — EA membaca nilai asli dari broker client.)*

### 4.3 Preset & tanpa batas

Preset 0.5% / 1% (default) / 2% / 5% + input bebas. **Tidak ada hard cap** (keputusan 5). Yang tetap berlaku:

| Nilai riskPct | Perlakuan |
|---|---|
| ≤ 5% | normal |
| 5–10% | warning kuning di UI |
| 10–25% | warning merah + konfirmasi saat disimpan |
| > 25% | modal `typeToConfirm` (ketik "I UNDERSTAND THE RISK") |
| > 100% | ditolak (validasi kewajaran, bukan batas risiko) |

Guard margin/step/minLot broker tetap aktif: itu batas fisik, bukan batas kebijakan.

### 4.4 Preview hidup

UI menampilkan kalkulator dari angka EA terakhir: `balance × riskPct` → "≈ 0.40 lot per posisi (risiko $100 @ SL provider 2.50)". Kalau EA belum pernah report → tampil "Menunggu EA terhubung", tidak pakai angka karangan.

---

## 5. Guard & Kill Switch (tanpa dry-run, ini pertahanan utama)

Dievaluasi **lokal di EA** (fail-closed: kalau server tidak bisa dihubungi, EA tidak membuka posisi baru).

| Guard | Default | Aksi |
|---|---|---|
| `maxSpreadPoints` | 30 | skip |
| `maxEntryDeviationPoints` (harga pasar vs harga fill provider) | 50 | skip (anti-entry basi) |
| `maxSlippagePoints` (deviation ke OrderSend) | 20 | kirim; gagal → skip |
| `allowSymbols` / `blockSymbols` | kosong | skip |
| `sessionFilter` | kosong (24/5) | skip |
| `maxPositions` | 5 | skip |
| `maxPositionsPerSymbol` | 1 | skip |
| `antihHedge` | on | skip kalau ada posisi berlawanan di simbol sama |
| `maxTotalRiskPct` (Σ risiko posisi terbuka) | 10% | tolak sampai ada yang close |
| `dailyLossLimitPct` | 5% | **STOP** sampai hari berikutnya / resume manual |
| `dailyProfitTargetPct` | off | stop |
| `maxDrawdownPct` (peak-to-trough equity) | 15% | **STOP** + notif |
| `maxTradesPerDay` | 20 | stop |
| `maxHoldMinutes` (anti posisi yatim kalau provider hilang) | 0 = off | close paksa |
| `killSwitch` (tombol app) | — | EA berhenti; posisi existing dibiarkan (opsi close-all) |
| `followOnReconnect` (kejar posisi yang terlewat saat client kembali online) | **OFF** | ditandai `missed`, tidak dikejar |
| `failStreakPause` (3 eksekusi gagal berturut) | on | pause + notif Telegram |

Karena perubahan SL/TP provider ditiru apa adanya (§6.5), risiko per posisi bisa bergerak **setelah** entry — `maxTotalRiskPct` dan `maxDrawdownPct` dihitung ulang saat SL/TP berubah, bukan hanya saat entry. Dan karena **dry-run dihapus** (keputusan 12), guard + kill switch jadi satu-satunya pertahanan sebelum config pertama jalan live. Tambahan yang tetap dipakai:
- **Badge akun DEMO/REAL** yang dideteksi EA — client yang mau uji wajib pakai akun demo, dan itu terlihat jelas di UI.
- **Peringatan sekali** saat pertama mengaktifkan FULL AUTO (`typeToConfirm`).
- EA tetap punya flag debug `DebugDryRun` **tersembunyi dari UI** (bukan fitur produk) supaya kita bisa menguji tanpa mengirim order.

Setiap penolakan dicatat + tampil dalam bahasa manusia: *"Dilewati: spread 38 > batas 30"*, *"Dilewati: harga bergerak 62 poin dari fill provider (batas 50)"*.

**EA offline**: kalau EA client tidak heartbeat > 15 menit, server berhenti membuat delivery baru (mencegah event menumpuk lalu dieksekusi sekaligus saat EA hidup). UI menampilkan badge merah **EA OFFLINE** + notifikasi Telegram.

---

## 6. Model Mirror (entry + exit)

### 6.1 Event yang dipublikasikan EA provider

| Event | Sumber di MT5 | Diterjemahkan client jadi |
|---|---|---|
| `OPEN` | `OnTradeTransaction` DEAL_ADD | buka posisi (lot dari risk %), pasang SL/TP sesuai yang tersedia |
| `MODIFY_SL` / `MODIFY_TP` | `PositionGetDouble(POSITION_SL/TP)` berubah | `PositionModify` di posisi client |
| `PARTIAL_CLOSE` | volume posisi provider berkurang | close sebagian; lot client = proporsi, **floor ke step** |
| `CLOSE` | posisi provider hilang | **close posisi client** |
| `CLOSE_ALL` | tombol di app provider | close semua posisi client dari provider itu |

EA provider juga mengirim **snapshot** `provider_positions` (posisi terbuka + `sl/tp/volume/opened_at`) setiap ~30 detik.

### 6.2 Fan-out & ack

- Event masuk `copy_events` → trigger membuat baris `copy_deliveries` untuk tiap `copy_link` aktif (1 baris per client per event). Provider yang `is_suspended` tidak di-fan-out.
- Client EA meng-ack: `executed` / `skipped` / `failed` + alasan + detail fill.
- Event `OPEN` yang tidak diambil dalam `expires_at` (default 120 detik) → `expired`. **`CLOSE` tidak pernah expire** — selalu diproses, berapa pun telatnya (lebih baik telat close daripada posisi nyangkut).

### 6.3 Pemetaan posisi

- Client menyimpan `client_positions`: `client_ticket ↔ provider_position_id` + `lots` + `state`.
- `magic` client = `777000 + providerIndex` → EA bisa membedakan posisi per provider (client bebas follow berapa pun provider — keputusan 11).
- Batas panjang `comment` MT5 31 karakter → `comment` client = `ITJ-<shortId>`, jangan UUID penuh.

### 6.4 Rekonsiliasi (wajib — ini penyelamat)

Setiap ~30 detik EA client menarik `provider_positions` (status open) dari provider yang di-follow, lalu membandingkan dengan `client_positions` (state open):

| Kondisi | Aksi |
|---|---|
| Provider open, client open | bandingkan `sl/tp/volume` → sinkronkan kalau berbeda |
| **Provider sudah close, client masih open** | **CLOSE posisi client sekarang** (menutup celah exit yang terlewat) |
| Provider open, client tidak punya posisi | tandai `missed` — **tidak** dikejar (kecuali `followOnReconnect = ON`) |
| Client punya posisi tanpa pasangan provider | tutup **hanya** kalau `comment`/`magic` menandakan milik copy-trade ini; kalau tidak, jangan sentuh (trade manual client) |

Semua aksi rekonsiliasi dicatat di `guard_events` dan tampil di log UI.

### 6.5 Perubahan SL/TP provider → ikut berubah di client

Ya, dan ini **wajib**, bukan opsional. Tiga skenario yang harus ditangani:

| Skenario provider | Event | Yang terjadi di client |
|---|---|---|
| Open **tanpa** SL, 10 detik kemudian pasang SL | `OPEN`, lalu `MODIFY_SL` | Posisi client sudah terbuka; SL provider ditempel belakangan → `PositionModify` (~3–5 detik setelah provider menempel) |
| SL digeser (breakeven/trailing) | `MODIFY_SL` berkali-kali | SL client ikut geser, dengan throttle (§6.5.4) |
| TP dipasang / diubah / **dihapus** | `MODIFY_TP` | TP client mengikuti, termasuk penghapusan (kirim 0) |

Catatan soal SL fallback: kalau provider open **tanpa** SL dan `slFallbackPoints` client menyala (default 100 poin), posisi client tetap punya SL sendiri sejak awal. Begitu SL provider datang, **SL fallback digantikan** oleh SL provider. Kalau `slFallbackPoints` dimatikan, posisi client tidak terlindungi selama jendela 3–5 detik itu.

#### 6.5.1 Cara EA provider mendeteksi perubahan SL/TP

- **Primer — diff polling (1 detik).** Simpan snapshot `(ticket, sl, tp, volume)`, bandingkan dengan hasil `PositionsTotal()` / `PositionGetTicket()` tiap tick timer. Semua perubahan terdeteksi: SL, TP, dan volume (partial close). Ini sumber kebenaran.
- **Sekunder — `OnTradeTransaction` tipe `TRADE_TRANSACTION_POSITION`.** MT5 memang punya tipe ini khusus untuk *"changing a position not related to a deal execution"* dan membawa `price_sl` / `price_tp`. Dipakai sebagai **pemicu supaya publish lebih cepat**, bukan satu-satunya sumber.
- **Kenapa tidak bergantung event saja:** perilaku `OnTradeTransaction` tidak konsisten (mis. `TRADE_TRANSACTION_ORDER_ADD` tidak pernah muncul di Strategy Tester; praktisi MQL5 menyarankan memakainya hanya sebagai pelengkap dan melacak posisi langsung). Diff polling menjamin tidak ada perubahan yang terlewat, termasuk bila broker tidak mengirim notifikasi.

#### 6.5.2 Event membawa state penuh, bukan delta

`MODIFY_SL` / `MODIFY_TP` mengirim **pasangan (sl, tp) lengkap** dari posisi provider saat itu — bukan hanya field yang berubah. Ini bukan detail kosmetik: `PositionModify(ticket, sl, tp)` di MQL5 **selalu menimpa keduanya**, dan parameter bernilai 0 berarti **menghapus**. Kalau kita mengirim hanya SL baru tanpa menyertakan TP yang ada, TP client akan terhapus tanpa sengaja.

#### 6.5.3 Idempotent & tahan urutan

- `provider_positions.revision` naik tiap perubahan; `copy_events.seq` monoton.
- Saat menerapkan MODIFY, EA client membaca **`provider_positions` versi terakhir** (bukan angka di payload) → event yang telat, duplikat, atau tidak berurutan tidak merusak apa pun. State akhir selalu konvergen ke state provider.
- Kalau `revision` di client sudah sama → ack `executed` tanpa aksi.

#### 6.5.4 Throttle (penting untuk trailing SL)

Provider yang menggeser SL tiap detik akan membanjiri delivery, memakan kuota, dan membuat client mengirim modify puluhan kali per menit (banyak broker membatasi jumlah request per menit).

- `modifyThrottleSeconds` (default 3) — maksimal satu publish/penerapan perubahan SL-TP per posisi per X detik.
- `minModifyPoints` (default 0; opsi 5) — perubahan yang lebih kecil dari X poin diabaikan.
- Konsekuensi yang diterima: SL client mengikuti versi **terakhir yang lolos throttle**, bukan tick-perfect. Rekonsiliasi (§6.4) menyamakan state akhir.

#### 6.5.5 Risiko aktual bisa berubah karena SL berubah

Lot ditetapkan **saat entry** dan tidak dihitung ulang oleh MODIFY. Jadi kalau provider entry tanpa SL lalu memasang SL yang jauh, atau menggeser SL makin jauh, **risiko % aktual posisi client ikut berubah** — bukan lagi riskPct yang dia set.

- EA menghitung ulang: `riskAktualPct = |hargaMasuk − slBaru| × lots × moneyPerUnitPerLot ÷ balance`.
- `riskBreachAction` (per link):
  - `warn` (**default**) — SL tetap ditiru apa adanya, plus notifikasi Telegram + baris log: *"SL provider menjauh; risiko posisi naik 1.0% → 2.4%"*.
  - `trim` — partial close untuk mengembalikan risiko ke `riskPct` (lot dibulatkan ke bawah, tidak pernah menambah posisi).
  - `ignore` — tanpa peringatan.
- Ini konsekuensi sadar dari **mirror penuh**: mengikuti provider sampai ke titik risikonya, bukan menahan di titik risiko yang kita mau.

#### 6.5.6 Kalau modify gagal atau posisi sudah hilang

| retcode / kondisi | Aksi |
|---|---|
| `10025` NO_CHANGES | anggap sukses |
| `10016` INVALID_STOPS (SL terlalu dekat — mis. client masuk di harga lebih buruk, atau kena `SYMBOL_TRADE_STOPS_LEVEL` broker) | clamp ke jarak minimum yang diizinkan broker, retry 1×; masih gagal → `failed` + notifikasi Telegram **"posisi client tidak terlindungi"** |
| `10036` POSITION_CLOSED | posisi client sudah tertutup (mis. SL fallback client kena lebih dulu) → jangan tandai gagal, picu rekonsiliasi |
| Posisi provider sudah tidak ada | tidak diterapkan; event jadi no-op |
| Event MODIFY hilang (EA provider mati / internet putus tepat saat kirim) | **rekonsiliasi 30 detik** membandingkan `sl`/`tp` dan membetulkan drift — inilah alasan rekonsiliasi wajib, bukan fitur tambahan |

#### 6.5.7 Di UI

Log menampilkan tiap perubahan sebagai satu baris: `MODIFY_SL · EURUSD · 1.0820 → 1.0850 (dari provider)` + hasil di sisi client (`applied` / `clamped → 1.0845` / `failed: invalid stops`) + perubahan risiko %. Client bisa melihat sendiri kalau SL-nya tidak persis sama dengan provider, dan kenapa.

---

## 7. Skema data

### 7.1 Tabel

```sql
signal_providers (
  user_id uuid pk, display_name, slug unique, bio, avatar_url,
  is_active bool, is_suspended bool, is_verified bool,
  terms_accepted_at timestamptz, created_at
)
is_provider() → bool                       -- pola is_mentor()

copy_links (
  id uuid pk, provider_id uuid, client_id uuid,
  status text check (status in ('pending','active','paused','revoked')),
  settings jsonb,                          -- §7.2
  runtime_state jsonb,                     -- kill switch, daily pnl, equity peak, day key
  created_at, updated_at, unique (provider_id, client_id)
)

provider_positions (                       -- state posisi provider
  id uuid pk, provider_id uuid, provider_ticket bigint, symbol text, side text,
  volume numeric, entry numeric, sl numeric, tp numeric,
  opened_at timestamptz, closed_at timestamptz, updated_at timestamptz,
  revision bigint not null default 0,      -- naik tiap perubahan sl/tp/volume (§6.5.3)
  status text check (status in ('open','closed')),
  unique (provider_id, provider_ticket)
)

copy_events (                              -- append-only lifecycle
  id uuid pk, provider_id uuid,
  provider_position_id uuid references provider_positions(id),
  kind text check (kind in ('OPEN','MODIFY_SL','MODIFY_TP','PARTIAL_CLOSE','CLOSE','CLOSE_ALL')),
  seq bigint,                              -- monoton per provider
  payload jsonb,                           -- { sl, tp } LENGKAP, bukan delta (§6.5.2)
  created_at timestamptz default now()
)

copy_deliveries (                          -- 1 baris per client per event
  id uuid pk, event_id uuid, client_id uuid,
  status text check (status in ('pending','executed','skipped','expired','failed')),
  skip_reason text, fail_reason text,
  client_ticket bigint, fill_price numeric, slippage_points numeric, lots numeric,
  risk_amount numeric, risk_pct numeric,
  ea_balance numeric, ea_equity numeric, picked_at, executed_at,
  unique (event_id, client_id)
)

client_positions (
  id uuid pk, client_id uuid, provider_position_id uuid, client_ticket bigint,
  lots numeric, state text check (state in ('open','closed','missed')),
  sl numeric, tp numeric, opened_at, closed_at
)

ea_tokens (                               -- per terminal; simpan HASH
  id uuid pk, client_id uuid, token_hash text, label text, active bool,
  role text check (role in ('PROVIDER','CLIENT','BOTH')),
  last_seen timestamptz, terminal_build text, account_login text,
  account_server text, is_demo bool, leverage int
)

ea_feed (client_id uuid pk, rev bigint)   -- penanda perubahan murah

guard_events (id, client_id, kind, detail jsonb, created_at)
provider_reports (id, provider_id, reporter_id, reason, detail, status, created_at)

journal_auto_sync (client_id uuid pk, enabled bool default false, mode text)  -- default OFF
```

### 7.2 `copy_links.settings` (jsonb)

```json
{
  "mode": "auto",
  "sizing": { "method": "risk_pct", "riskPct": 1.0, "basis": "balance",
              "maxLotCap": 5.0, "allowMinLotFallback": false },
  "stops":  { "slFallbackPoints": 100, "copyTp": true, "maxHoldMinutes": 0 },
  "mirror": { "modifyThrottleSeconds": 3, "minModifyPoints": 0,
              "riskBreachAction": "warn" },   // warn | trim | ignore (§6.5.5)
  "guards": { "maxSpreadPoints": 30, "maxEntryDeviationPoints": 50,
              "maxSlippagePoints": 20, "maxPositions": 5, "maxPositionsPerSymbol": 1,
              "allowSymbols": [], "blockSymbols": [],
              "sessionFilter": { "enabled": false, "start": "07:00", "end": "22:00" },
              "followOnReconnect": false, "failStreakPause": true },
  "limits": { "maxTotalRiskPct": 10, "dailyLossLimitPct": 5, "dailyProfitTargetPct": null,
              "maxDrawdownPct": 15, "maxTradesPerDay": 20 },
  "order":  { "type": "market", "deviationPoints": 20, "fillPolicy": "IOC" },
  "journal":{ "autoSync": false, "accountId": null },
  "notify": { "telegram": true, "bell": true }
}
```

*(tidak ada `dryRun` — dihapus sesuai keputusan 12. Tidak ada `discordWebhook` — diganti Telegram.)*

### 7.3 Telegram — bot per-provider + kode akses

Alur (sesuai keputusan 13):

```
1  Provider: buat bot di @BotFather → dapat token → paste di /copytrade/provider
2  Server: simpan token TERENKRIPSI + set webhook bot ke Edge Function
             https://<proj>.supabase.co/functions/v1/tg/<provider_secret>
3  Provider: sistem generate 1 KODE AKSES per copy_link (8 karakter, bisa di-rotate)
             dan menampilkan link cepat:  t.me/<bot_username>?start=<kode>
4  Client: buka bot itu → tekan START (atau kirim kode manual)
5  Edge Function: menerima /start <kode> → cocokkan ke copy_link →
             simpan chat_id di telegram_links  → balas konfirmasi di chat
6  Notifikasi: tiap event penting untuk client itu dikirim lewat bot provider tsb
```

Tabel:

```sql
telegram_bots (
  provider_id uuid pk,
  bot_username text,
  token_enc bytea,            -- pgp_sym_encrypt(token, key) — key di secret Edge Function
  webhook_secret text,        -- dipakai di URL webhook, unik per provider
  is_active bool, linked_at timestamptz, last_error text
)

telegram_links (
  id uuid pk, copy_link_id uuid, provider_id uuid, client_id uuid,
  chat_id bigint, tg_username text, code_used text,
  is_active bool, linked_at timestamptz,
  unique (provider_id, chat_id)
)

telegram_codes (
  copy_link_id uuid pk, code text unique, rotated_at timestamptz, used_at timestamptz
)
```

Aturan keamanan dan operasional:

- **Token tidak pernah bisa dibaca client.** Tabel `telegram_bots` **tanpa SELECT policy** untuk user; hanya Edge Function (`service_role`) + satu RPC yang mengembalikan `bot_username` + status saja. Token masuk lewat Edge Function yang langsung mengenkripsi (`pgp_sym_encrypt`), dan hanya didekripsi di dalam Edge Function saat mengirim pesan.
- Kalau token bocor → provider klik **Ganti token** (BotFather `/revoke` lalu paste yang baru). UI menyediakan panduan 3 langkah.
- Notifikasi yang dikirim: **ke client** → eksekusi sukses, skip (dengan alasan), CLOSE, kill switch aktif, EA offline >15 mnt, daily loss/drawdown limit tercapai, provider memutus follow. **ke provider** → EA-nya offline, follower baru, follower berhenti, 3 kegagalan berturut.
- Rate limit Telegram Bot API (~30 pesan/detik per bot, plus batas per-chat). Untuk broadcast banyak follower, kirim lewat loop dengan jeda + tangani `429 retry_after`, dan simpan kegagalan di `last_error`. Untuk skala besar, broadcast dieksekusi `pg_cron` + Edge Function, bukan di dalam trigger DB.
- **Kode akses bisa di-rotate** kapan saja oleh provider; client yang sudah tertaut tetap tertaut (`telegram_links`), rotate hanya membatalkan kode lama.
- Provider yang belum punya bot tetap bisa jalan — Telegram bersifat opsional, notifikasi bell in-app tetap ada.

### 7.4 RPC (SECURITY DEFINER, pola coaching)

| RPC | Untuk |
|---|---|
| `apply_provider(slug, bio)` | self-serve daftar jadi provider (langsung tayang) |
| `admin_suspend_provider(user, bool)` / `admin_verify_provider(user, bool)` | moderasi |
| `report_provider(provider_id, reason, detail)` | tombol laporkan |
| `request_copy(provider_slug)` / `respond_copy_request(link_id, accept)` | relasi client↔provider |
| `set_copy_settings(link_id, settings jsonb)` | simpan setelan (validasi rentang di server) |
| `set_copy_state(link_id, state)` | pause / resume / kill switch |
| `provider_publish_event(kind, payload)` | dipanggil EA provider → insert `copy_events` + fan-out |
| `provider_sync_positions(jsonb)` | snapshot posisi provider dari EA |
| `client_ack(delivery_id, status, payload)` | ack eksekusi dari EA client |
| `provider_stats(slug)` | equity curve, winrate, avg RR, max DD (dari `provider_positions`) |
| `client_copy_overview()` | status EA, posisi terbuka, eksekusi terakhir, alasan skip terbanyak |
| `close_all_from_provider(provider_id)` | tombol CLOSE_ALL di app provider |
| `rotate_access_code(link_id)` / `telegram_status(provider_id)` | kode akses & status bot (tanpa token) |

**RLS + token EA**: EA memakai anon key + header `x-ea-token`; policy memfilter lewat hash token (tidak pernah menyimpan/membaca token mentah):

```sql
create policy ea_read_deliveries on copy_deliveries for select
using (exists (
  select 1 from ea_tokens t
  where t.active
    and t.token_hash = encode(digest(
      coalesce(current_setting('request.headers', true)::json->>'x-ea-token',''), 'sha256'), 'hex')
    and t.client_id = copy_deliveries.client_id
));
```

Pola sama untuk `UPDATE` (ack), `INSERT` event (role PROVIDER), dan `SELECT` pada `copy_links` / `ea_feed`.

---

## 8. Spesifikasi EA — `ITJCopyTrade.mq5`

### 8.1 Input

| Input | Default | Fungsi |
|---|---|---|
| `Role` | `CLIENT` | `PROVIDER` / `CLIENT` / `BOTH` |
| `SupabaseUrl` | — | wajib di-whitelist WebRequest |
| `AnonKey` | — | anon key (publik) |
| `EaToken` | — | token per terminal |
| `PollSeconds` | 2 | interval `OnTimer` |
| `SnapshotSeconds` | 30 | interval snapshot & rekonsiliasi |
| `Magic` | 777000 | dasar magic client |
| `PublishMode` | `ALL` | `ALL` \| `MAGIC_ONLY` (provider) |
| `LocalRiskPctCap` | 0 | >0 = cap lokal; EA pakai min(server, lokal) |
| `ModifyThrottleSeconds` | 3 | jeda minimum antar publish/penerapan perubahan SL-TP (§6.5.4) |
| `MinModifyPoints` | 0 | abaikan perubahan SL-TP yang lebih kecil dari X poin |
| `SlTpMode` | `RELATIVE` | cara memindahkan SL/TP provider ke client — lihat §6.6 |
| `SymbolMap` | "" | pemetaan nama simbol, `XAUUSD=GOLD,US500=SPX500` — lihat §6.7 |
| `AutoResolveSymbol` | true | cari otomatis nama simbol di broker client kalau beda (suffix/prefix) |
| `DebugDryRun` | false | **tersembunyi, hanya untuk pengujian internal** — bukan fitur produk (keputusan 12) |

### 6.6 Perpindahan SL/TP: JARAK, bukan harga (broker boleh berbeda)

Dua broker **tidak pernah** punya harga yang sama. Karena itu harga absolut provider
tidak boleh dipasang apa adanya di client — contoh nyata: provider buy XAUUSD di
2400.00 dengan SL 2397.50 (risiko 2.50), client dapat fill di 2401.50; kalau SL
ditempel di harga absolut 2397.50, risiko client jadi 4.00 — **60% lebih besar dari
yang dia pilih**, tanpa peringatan. Kalau selisihnya lebih besar lagi, SL bisa
mendarat di sisi yang salah.

Karena itu EA memindahkan **jarak**, bukan harga:

```
jarak_relatif = |provider_entry - provider_sl| / provider_entry
sl_client     = client_entry ± (jarak_relatif × client_entry)
```

- Anchor saat OPEN = harga pasar client saat order dikirim; saat MODIFY = entry posisi
  client itu sendiri (jadi saat provider memindahkan SL ke break-even, jaraknya nol →
  SL client juga tepat di entry-nya).
- Berlaku juga untuk TP, dan untuk kasus digit berbeda antar broker (XAUUSD 2 desimal
  vs 3 desimal) karena yang dipindah adalah rasio, bukan jumlah poin.
- `slFallbackPoints` tetap dihitung dalam poin **simbol client** (memang sudah benar).
- Input `SlTpMode = ABSOLUTE` disediakan hanya untuk akun yang benar-benar identik.

### 6.7 Broker client berbeda: nama simbol

Broker client **tidak harus sama**. Beberapa hal memang sudah otomatis menyesuaikan
karena selalu diambil dari simbol milik client: contract size (`SYMBOL_TRADE_TICK_VALUE`
/ `TICK_SIZE`), volume step/min/max/limit, digits, minimum stops level (SL/TP yang
terlalu dekat digeser ke jarak minimum broker), spread, dan deviation/slippage.

Yang tidak otomatis adalah **namanya**. Simbol harus ada di broker client; kalau
namanya beda (`XAUUSD` vs `GOLD`, atau suffix seperti `XAUUSD.a`/`XAUUSDm`), EA:

1. memakai input `SymbolMap` kalau ada pasangannya (kiri = nama provider, kanan = nama
   di broker client);
2. kalau tidak, memakai nama yang sama persis;
3. kalau tidak ada dan `AutoResolveSymbol` menyala, mencari padanan terbaik di seluruh
   daftar simbol broker (cocok penuh lebih dulu, lalu suffix/prefix pendek);
4. kalau tidak ada padanan **atau ambigu** (dua kandidat sama bagusnya) → sinyal
   **dilewati** dengan alasan yang tercatat di log eksekusi. Menebak simbol salah jauh
   lebih berbahaya daripada melewatkan satu entry.

Daftar simbol di web app (`allowSymbols`/`blockSymbols`) ditulis dengan nama
**provider**, dan guard-nya dievaluasi dengan nama itu; eksekusi memakai nama broker.
Nama simbol hanya diselesaikan SEKALI saat OPEN — MODIFY/PARTIAL/CLOSE mencari posisi
lewat `provider_position_id` dan memakai simbol milik posisi client itu sendiri.

### 8.2 Loop

**Provider EA** — `OnTradeTransaction` hanya menandai dirty; publish dilakukan di `OnTimer(1–2 dtk)`. `WebRequest` **tidak** dipanggil di dalam `OnTradeTransaction` (blocking, mengganggu konteks trade). Tiap `SnapshotSeconds` POST snapshot posisi.

**Client EA** — `OnTimer(2 dtk)`: cek `rev` → tarik delivery → guard → sizing → eksekusi. `OnTradeTransaction` mencatat fill sebenarnya (slippage, `client_positions`). Tiap `SnapshotSeconds` rekonsiliasi (§6.4).

**Fail-closed** — config terakhir di-cache di `MQL5/Files`. Kalau server tidak bisa dihubungi: EA **tidak** membuka posisi baru, tapi **tetap** menjalankan perintah CLOSE dari cache.

### 8.3 Error handling

| Kasus | Perilaku |
|---|---|
| `WebRequest` error 4060 (URL belum di-whitelist) | log + alert jelas: "Tools → Options → Expert Advisors → allow listed URL" |
| `TRADE_RETCODE_NO_MONEY` / margin kurang | skip + `fail_reason`, **tidak** retry |
| `TRADE_RETCODE_PRICE_CHANGED` / requote | retry 1× harga terbaru; masih gagal → `failed` |
| `TRADE_RETCODE_INVALID_STOPS` (SL terlalu dekat) — saat OPEN | skip + `fail_reason` |
| `TRADE_RETCODE_INVALID_STOPS` — saat MODIFY SL/TP | clamp ke jarak minimum broker, retry 1×; gagal → `failed` + notif **posisi tidak terlindungi** |
| `TRADE_RETCODE_POSITION_CLOSED` (10036) saat MODIFY | posisi sudah tutup → picu rekonsiliasi, jangan tandai gagal |
| `TRADE_RETCODE_NO_CHANGES` (modify no-op) | anggap sukses |
| Server down / timeout | tidak buka posisi; retry backoff |
| Dua EA di 1 akun | tolak token kedua (`account_login` sudah dipakai) |
| Provider mati di tengah trade | client rekonsiliasi → close; `maxHoldMinutes` opsional |

---

## 9. UI / Route

Mengikuti pola `/blog` (`readBlogRoute()` di App.tsx, path asli + hash; `vercel.json` rewrite `/copytrade` + `/copytrade/(.*)`).

| Route | Isi | Akses |
|---|---|---|
| `/copytrade` | Landing: cara kerja, leaderboard provider, risiko & disclaimer | Publik (SEO) |
| `/copytrade/provider/<slug>` | Profil publik: equity curve, winrate, avg RR, max DD, posisi terbuka, riwayat, tombol **Laporkan** | Publik (SEO) |
| `/copytrade/provider` | Dashboard provider: status EA-nya, follower, statistik, CLOSE_ALL, **bot Telegram + kode akses**, pengaturan publish | role provider |
| `/copytrade/client` | Dashboard client: provider di-follow, setelan risiko, status EA, log, kill switch, status Telegram | login |
| Sidebar | 1 modul `copytrade` (tier advanced), sub-tab **Provider** / **Client**, gate by role seperti Coaching | — |

Halaman **Client** (5 blok):
1. **Provider** — kartu per provider (bebas jumlah), status link, performa, pause/revoke.
2. **Setelan Risiko** — riskPct (preset + bebas), max total risk, daily loss, drawdown, filter simbol/jam, **kalkulator lot hidup**, toggle **auto-jurnal (default OFF)**.
3. **Status EA** — online/offline + last seen, akun & broker (badge DEMO/REAL), balance/equity, posisi terbuka yang dicopy, PAUSE/RESUME, panduan pemasangan.
4. **Telegram** — status terhubung (bot provider mana, chat_id ada/tidak), tombol **Hubungkan** (buka `t.me/<bot>?start=<kode>`), tombol putuskan, uji kirim.
5. **Log** — waktu, provider, simbol, kind (OPEN/CLOSE/MODIFY), lot, risiko $, fill vs provider, slippage, alasan skip.

Halaman **Provider** — prioritas #1 adalah **status EA-nya sendiri**, karena kalau terminalnya mati, semua follower-nya kehilangan exit. Peringatan merah besar, bukan sekadar badge. Blok **Telegram**: paste token (sekali), panduan BotFather 3 langkah, daftar follower + kode akses masing-masing (`t.me/<bot>?start=<kode>`), tombol rotate, tombol ganti token, indikator `last_error`.

---

## 10. Fase

| Fase | Isi | Effort |
|---|---|---|
| 0 | `/copytrade` publik + halaman profil provider + leaderboard + ToS/disclaimer + apply provider self-serve + tombol laporkan | M |
| 1 | Modul provider/client + `copy_links` + RPC + dashboard (belum ada eksekusi) | M–L |
| **2** | **EA provider (publisher) + `provider_positions` + `copy_events` + fan-out + rev** | **L** |
| **3** | **EA client FULL AUTO: risk % engine + guard + rekonsiliasi + kill switch + log** | **L–XL** |
| 4 | **Telegram bot per-provider + kode akses + notifikasi** (Edge Function, enkripsi token) | L |
| 5 | Auto-jurnal opsional, uptime/reliability score provider, multi-akun MT5, moderasi lanjutan | L |

Fase 2 & 3 bisa dikerjakan paralel; pengujian butuh dua akun MT5 demo (dua terminal di satu PC dengan dua akun demo dari broker yang sama sudah cukup). Telegram (Fase 4) independen — bisa dimajukan/ditunda tanpa mengganggu eksekusi.

Acuan implementasi EA (MIT, bebas dipakai/dimodifikasi): `Mubincodes/TradeCopierMt5` (pola master/slave + `CTrade`), `nickcomua/mt5-trade-copier` (mirror live multi-akun), `MehdiGhouryani/TradeCopier---MT5` (risk management + master/slave). Ganti transport-nya jadi Supabase PostgREST.

---

## 11. Risiko & disclaimer

1. **Legal (Indonesia)** — berbagi sinyal gratis wajar. Begitu ada pungutan biaya/langganan **atau** sistem mengeksekusi order di akun orang lain sebagai layanan berbayar, itu mendekati wilayah manajer investasi / pialang berjangka yang butuh izin OJK/Bappebti. Posisi aman: gratis, eksekusi selalu di terminal milik client, tidak ada custody dana, disclaimer di tiap halaman, ToS dicentang saat apply provider.
2. **Self-serve + tanpa approval = risiko reputasi lebih tinggi.** Mitigasi: tombol laporkan, suspend instan, riwayat tindakan, dan tampilkan provider yang di-suspend secara jelas.
3. **Hasil tidak identik** dengan provider (K4) — wajib ditulis di halaman client.
4. **Prop firm** — banyak melarang copy trading antar akun. Warning saat akun terdeteksi prop/challenge.
5. **Terminal 24/7** (K1/K2) — tampilkan status nyata provider; jangan biarkan client mengira "otomatis" berarti "tanpa syarat".
6. **riskPct tanpa batas** (K6) — warning berlapis, keputusan akhir di client.
7. **Tanpa dry-run** (K7) — pertahanan = guard konservatif + kill switch + badge demo + `failStreakPause`.
8. **Bot token Telegram** (K8) — disimpan terenkripsi, tanpa SELECT policy, hanya dipakai Edge Function; provider bisa revoke via BotFather.
9. **Kuota** — egress 5 GB/bln dengan pola `rev`; Edge Function 500k invocations/bln cukup untuk notifikasi. Di atas ~100 client aktif: Cloudflare Workers atau Supabase Pro.
10. **UU PDP** — publik + chat_id Telegram = data pribadi. Simpan seperlunya, sediakan tombol putus/ hapus tautan, dan jangan menampilkan identitas client ke provider.

---

## 12. Bahan gratis

| Kebutuhan | Bahan |
|---|---|
| DB/auth/REST/realtime | Supabase free (unlimited API request; 500 MB DB; 5 GB egress; 200 realtime conn) |
| EA | MQL5 + MetaEditor: `WebRequest`, `CTrade`, `OrderCalcMargin`, `OnTradeTransaction`, `PositionGetDouble` |
| Referensi EA copier | `Mubincodes/TradeCopierMt5`, `nickcomua/mt5-trade-copier`, `MehdiGhouryani/TradeCopier---MT5` (semua MIT) |
| Referensi TradingView→MT5 | `AgSpades/cero-trader` |
| Bridge alternatif | `MetaTrader5` Python package (resmi, gratis, Windows) |
| **Telegram bot** | @BotFather (gratis) + Telegram Bot API (gratis, webhook) |
| Enkripsi token bot | `pgcrypto` (`pgp_sym_encrypt`) + secret di Supabase Edge Function |
| Webhook & kirim pesan | Supabase Edge Functions (500k invocation/bulan gratis) |
| Jadwal/broadcast | `pg_cron` (ekstensi Supabase) |
| Tunneling untuk tes | cloudflared quick tunnel / ngrok free |
| Relay cache (kalau >100 client) | Cloudflare Workers free (100k req/hari) |
| Chart & statistik | TradingView widget + Monte Carlo yang sudah ada |
| VPS 24/7 untuk MT5 | **tidak ada yang gratis** — Oracle Always Free sekarang 2 OCPU/12 GB ARM (Linux; MT5 via Wine+emulasi ARM tidak reliable). Realistis: Windows VPS $5–15/bln. **Keputusan 8: provider wajib 24/7, jadi biaya ini harus dinyatakan terbuka di halaman apply provider.** |

---

## 13. Checklist onboarding

**Provider** (self-serve, langsung tayang)
1. Login → `/copytrade` → Apply as Provider: profil + centang ToS & disclaimer + **akui syarat 24/7** (terminal harus nyala terus; kalau mati, follower kehilangan exit).
2. Langsung tayang. (Admin hanya bisa suspend kalau ada laporan.)
3. Generate token (role `PROVIDER`) → download `ITJCopyTrade.mq5` → compile → attach 1 chart.
4. Whitelist URL + aktifkan Algo Trading → badge **EA ONLINE**.
5. Set `PublishMode` (`ALL` / `MAGIC_ONLY`) → posisi pertama langsung muncul di halaman publiknya.
6. Opsional tapi disarankan: buat bot di @BotFather → paste token → dapat **kode akses** per follower.

**Client**
1. `/copytrade` → pilih provider (bebas jumlah) → Request follow → disetujui.
2. Isi **Setelan Risiko** (default riskPct 1%, max total risk 10%, daily loss 5%, drawdown 15%) → cek preview lot.
3. Generate token (role `CLIENT`) → pasang EA (langkah sama).
4. Whitelist URL + Algo Trading → badge **EA ONLINE**; cek akun, broker, balance terbaca.
5. Uji dulu di **akun demo** (badge DEMO terlihat) — tidak ada mode dry-run, jadi ini cara aman mencoba.
6. Aktifkan **FULL AUTO** (modal konfirmasi sekali).
7. Opsional: hubungkan **Telegram** (`t.me/<bot>?start=<kode>`).
8. Opsional: aktifkan auto-jurnal ke Journal (default OFF).

---

## 14. Sisa pertanyaan (kecil, bisa diputuskan saat implementasi)

1. **Hosting Edge Function untuk Telegram** — pakai Edge Function Supabase (butuh project punya `pgcrypto`+secret), atau Cloudflare Worker (lebih murah request, tapi secret di tempat lain)? Default saya: Supabase Edge Function supaya semua di satu tempat.
2. **Notifikasi mana yang masuk Telegram** — semua event (termasuk CLOSE & skip) atau hanya yang penting (EA offline, limit tercapai, eksekusi gagal)? Default saya: eksekusi + skip bisa dimatikan, sisanya selalu kirim.
3. **`maxHoldMinutes`** untuk client yang provider-nya sering offline — default 0 (off) atau 720 menit (12 jam) sebagai pengaman?
4. **Uptime provider** — tampilkan skor uptime publik dari `ea_tokens.last_seen`? Saya sarankan ya (Fase 5), karena provider wajib 24/7 tapi tidak ada konsekuensi kalau melanggar.
5. **Suspend provider** — efeknya langsung memutus semua fan-out, atau tetap jalan sampai semua posisi terbuka ditutup lebih dulu?
