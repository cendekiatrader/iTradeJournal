//+------------------------------------------------------------------+
//|                                              ITJCopyTrade.mq5    |
//|                       CopyTrade iTradeJournal - EA MT5 (Fase 2-3)|
//|                                                                  |
//| APA INI                                                          |
//|   Satu EA untuk dua peran (PRD CopyTrade iTradeJournal):         |
//|     PROVIDER - membaca posisi di terminal ini sendiri lalu       |
//|                mempublikasikan lifecycle-nya (OPEN / MODIFY_SL / |
//|                MODIFY_TP / PARTIAL_CLOSE / CLOSE) + snapshot     |
//|                posisi ke Supabase PostgREST. EA provider bersifat |
//|                READ-ONLY: tidak pernah membuka order sendiri.    |
//|     CLIENT   - menarik delivery pending, menjalankan guard lokal |
//|                (PRD 5), menghitung lot dengan rumus risk %       |
//|                (PRD 4.1), lalu mengeksekusi / memodifikasi /     |
//|                menutup posisi memakai order milik akun ini.      |
//|                                                                  |
//| MODEL: MIRROR penuh (entry + exit), rolling. Web app TIDAK PERNAH |
//|   menekan order di akun client - eksekusi selalu di terminal ini. |
//|                                                                  |
//| LANGKAH INSTALASI                                                |
//|   1. Simpan file ini di <Terminal Data Folder>/MQL5/Experts/      |
//|      (MetaTrader 5 > File > Open Data Folder).                    |
//|   2. Buka MetaEditor (F4 di MT5) > pilih file ini > Compile (F7). |
//|      TIDAK ADA dependency eksternal; hanya <Trade/Trade.mqh>      |
//|      bawaan MT5. File .ex5 akan muncul di folder yang sama.       |
//|   3. Pasang EA ke TEPAT SATU chart saja (mis. EURUSD M1) milik     |
//|      akun yang mau dipakai. Tick tidak diperlukan: semua kerja     |
//|      dilakukan OnTimer(1 dtk), jadi chart apa pun boleh.           |
//|   4. Isi input SupabaseUrl (mis. https://abcd.supabase.co),        |
//|      AnonKey, dan EaToken (token per terminal dari halaman         |
//|      CopyTrade web app). EaToken WAJIB diisi - tanpa itu tidak     |
//|      ada request yang diizinkan RLS.                               |
//|   5. Tools > Options > Expert Advisors > centang "Allow WebRequest |
//|      for listed URL" lalu TAMBAHKAN https://<proj>.supabase.co     |
//|      (HOST SAJA, tanpa path, tanpa slash di akhir). Kalau lupa,    |
//|      EA akan menulis error 4060 di log dan tidak jalan.            |
//|   6. Centang "Allow Algo Trading" (toolbar). Tanpa ini OnTimer     |
//|      tetap jalan tetapi eksekusi order diblokir terminal.          |
//|   7. Aktifkan "Allow DLL imports"? TIDAK PERLU. EA ini tidak pakai |
//|      DLL.                                                          |
//|                                                                  |
//| PERINGATAN JUJUR                                                 |
//|   EA ini BELUM diuji dengan akun MT5 nyata / Supabase nyata -     |
//|   hanya lolos kompilasi. Uji dulu di AKUN DEMO. Tidak ada mode    |
//|   dry-run di produk (PRD keputusan 12); flag DebugDryRun hanya    |
//|   alat pengujian internal kita, bukan fitur.                      |
//|   Berapa pun hasilnya, hasil client TIDAK akan identik dengan     |
//|   provider (PRD K4): beda broker, spread, slippage, rounding lot. |
//|                                                                  |
//| BATASAN YANG DISENGAJA (agar kode tetap jelas & bisa diaudit)     |
//|   - Parser JSON ditulis sendiri dan hanya menangani bentuk yang   |
//|     benar-benar dikirim/diterima (objek rata + array objek).      |
//|   - Tidak ada dependency pihak ketiga.                            |
//+------------------------------------------------------------------+
#property copyright "iTradeJournal"
#property link      "https://itradejournal.com"
#property version   "1.00"
#property description "CopyTrade MT5 (MIRROR) - provider publisher + client follower via Supabase PostgREST"

#include <Trade/Trade.mqh>

//====================================================================
// 1. INPUT (persis PRD 8.1)
//====================================================================
enum ENUM_ITJ_ROLE
  {
   ROLE_PROVIDER = 0,  // PROVIDER - hanya mempublikasikan posisi
   ROLE_CLIENT   = 1,  // CLIENT   - hanya meniru provider
   ROLE_BOTH     = 2   // BOTH     - dua-duanya (akun uji)
  };

enum ENUM_ITJ_PUBLISH_MODE
  {
   PUBLISH_ALL        = 0, // ALL        - publikasikan semua posisi akun
   PUBLISH_MAGIC_ONLY = 1  // MAGIC_ONLY - hanya posisi yang punya magic number
  };

input ENUM_ITJ_ROLE   Role                = ROLE_CLIENT; // Peran terminal ini
input string          SupabaseUrl         = "";          // https://<proj>.supabase.co  (WAJIB whitelist di Tools>Options)
input string          AnonKey             = "";          // anon key (publik) proyek Supabase
input string          EaToken             = "";          // token per terminal (dari web app)
input int             PollSeconds         = 2;           // interval polling client (dtk)
input int             SnapshotSeconds     = 30;          // interval snapshot & rekonsiliasi (dtk)
input long            Magic               = 777000;      // dasar magic client
input ENUM_ITJ_PUBLISH_MODE PublishMode   = PUBLISH_ALL; // (provider) apa yang dipublikasikan
input double          LocalRiskPctCap     = 0;           // >0 = cap lokal; EA pakai min(server, lokal)
input bool            DebugDryRun         = false;       // TERSEMBUNYI - pengujian internal saja
input int             ModifyThrottleSeconds = 3;         // jeda minimum antar perubahan SL-TP (PRD 6.5.4)
input int             MinModifyPoints     = 0;           // abaikan perubahan SL-TP lebih kecil dari X poin

enum ENUM_ITJ_SLTP_MODE
  {
   SLTP_RELATIVE = 0, // RELATIVE - jarak SL/TP dipindah proporsional (aman lintas broker)
   SLTP_ABSOLUTE = 1  // ABSOLUTE - harga provider apa adanya (hanya untuk akun identik)
  };

input ENUM_ITJ_SLTP_MODE SlTpMode        = SLTP_RELATIVE; // cara memindahkan SL/TP provider ke client
input string          SymbolMap         = "";            // pemetaan simbol: XAUUSD=GOLD,US500=SPX500
input bool            AutoResolveSymbol = true;          // cari otomatis kalau nama simbol beda (suffix/prefix)

//=== KONSTANTA PERILAKU ============================================
#define ITJ_MAX_PROVIDERS      32   // client bebas follow berapa pun, tapi array kita dibatasi
#define ITJ_HTTP_TIMEOUT_MS    5000 // WebRequest blocking -> jangan terlalu panjang
#define ITJ_MAX_POS_SNAPSHOT   256
#define ITJ_COMMENT_PREFIX     "ITJ-"
#define ITJ_RETRY_PRICE        1     // PRD 8.3: requote -> retry 1x

//====================================================================
// 2. GLOBAL STATE
//====================================================================
CTrade   g_trade;

bool     g_isProvider = false;
bool     g_isClient   = false;
bool     g_ready      = false;   // input wajib sudah terisi

datetime g_lastTick    = 0;   // gate OnTimer 1 detik
datetime g_lastPoll    = 0;
datetime g_lastSnapshot= 0;
int      g_pollSec     = 2;   // salinan input yang sudah di-clamp (input = konstanta)
int      g_snapSec     = 30;
datetime g_lastSnapProv= 0;   // snapshot provider (terpisah dari rekonsiliasi client
datetime g_lastRecon   = 0;   // supaya Role=BOTH tidak saling menimpa timer)
bool     g_dirty       = false; // ditandai OnTradeTransaction, dikonsumsi OnTimer (PRD 8.2)
long     g_seq         = 0;     // copy_events.seq monoton

// --- cache config (fail-closed, PRD 8.2) ---
string   g_cfgRawJson  = "";
bool     g_cfgFromFile = false;

// --- statistik harian client (guard) ---
string   g_dayKey         = "";
double   g_dayStartEquity = 0.0;
double   g_equityPeak     = 0.0;
double   g_dayRealizedPnl = 0.0;
int      g_tradesToday    = 0;
datetime g_statsAt        = 0;
int      g_failStreak     = 0;

//====================================================================
// 3. TIPE DATA INTERNAL
//====================================================================
// Posisi MT5 yang kita amati (provider snapshot & pembacaan client).
struct PosInfo
  {
   long     ticket;
   string   symbol;
   int      side;      // +1 buy, -1 sell
   double   volume;
   double   entry;
   double   sl;
   double   tp;
   long     magic;
   string   comment;
   datetime opened;
  };

// Satu baris copy_deliveries yang sudah di-parse.
struct Delivery
  {
   string   id;
   string   providerId;
   string   providerPositionId;
   string   kind;
   string   symbol;
   int      side;
   double   entry;
   double   sl;
   double   tp;
   double   volume;      // volume posisi PROVIDER setelah event ini
   double   oldVolume;   // volume posisi PROVIDER sebelum PARTIAL_CLOSE
   long     seq;
  };

// Setelan satu copy_link (hasil parse copy_links.settings + runtime_state).
struct LinkSettings
  {
   string   linkId;
   string   providerId;
   bool     killSwitch;
   bool     paused;
   // sizing
   double   riskPct;
   string   basis;              // balance | equity
   double   maxLotCap;
   bool     allowMinLotFallback;
   // stops
   int      slFallbackPoints;
   bool     copyTp;
   int      maxHoldMinutes;
   // mirror
   int      modifyThrottleSeconds;
   int      minModifyPoints;
   string   riskBreachAction;   // warn | trim | ignore
   // guards
   int      maxSpreadPoints;
   int      maxEntryDeviationPoints;
   int      maxSlippagePoints;
   int      maxPositions;
   int      maxPositionsPerSymbol;
   string   allowSymbolsJson;
   string   blockSymbolsJson;
   bool     sessionEnabled;
   string   sessionStart;
   string   sessionEnd;
   bool     followOnReconnect;
   bool     failStreakPause;
   // limits
   double   maxTotalRiskPct;
   double   dailyLossLimitPct;
   double   dailyProfitTargetPct;
   double   maxDrawdownPct;
   int      maxTradesPerDay;
   // order
   int      deviationPoints;
  };

// Snapshot posisi provider (untuk diff 1 detik) + waktu throttle per ticket.
PosInfo  g_pPrev[];
datetime g_pThrottleTicket[]; // paralel dengan g_pPrev: kapan MODIFY terakhir dipublikasikan
long     g_pThrottleIds[];
string   g_knownProviders[];
int      g_knownProviderIdx[];

LinkSettings g_links[];   // cache setelan per link (provider)
string       g_respHeaders = "";
bool         g_missedLogged = false;   // supaya log "missed" tidak spam
long         g_lastRev      = -1;      // pola `rev` (PRD 2.2)

//====================================================================
// 4. UTILITAS UMUM
//====================================================================
string TrimTrailingSlash(const string s)
  {
   string r = s;
   while(StringLen(r) > 0 && StringGetCharacter(r, StringLen(r)-1) == '/')
      r = StringSubstr(r, 0, StringLen(r)-1);
   return r;
  }

string BoolStr(const bool b) { return(b ? "true" : "false"); }

// Format angka untuk body JSON. PostgREST menerima literal numerik apa pun
// yang valid; kita selalu kirim 8 desimal supaya presisi harga tidak hilang.
string JsonNum(const double v)
  {
   if(!MathIsValidNumber(v)) return("null");
   return(StringFormat("%.8f", v));
  }

// Escape string untuk body JSON. Simbol & id kita ASCII, jadi UTF-16 -> short
// char aman; karakter kontrol di-escape agar body tidak rusak.
string JsonEscape(const string s)
  {
   string r = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c == '"')            r += "\\\"";
      else if(c == '\\')      r += "\\\\";
      else if(c == '\n')      r += "\\n";
      else if(c == '\r')      r += "\\r";
      else if(c == '\t')      r += "\\t";
      else if(c < 32)         r += StringFormat("\\u%04x", c);
      else                    r += ShortToString(c);
     }
   return(r);
  }

string JsonStr(const string s) { return("\"" + JsonEscape(s) + "\""); }

// Timestamp ISO-8601 UTC. PostgREST/Postgres menolak format "2026.10.13 10:00"
// yang dipakai TimeToString, jadi kita rakit sendiri dari waktu GMT terminal.
string IsoUtc(const datetime t)
  {
   datetime g = (t == 0) ? TimeGMT() : t;
   string d = TimeToString(g, TIME_DATE);     // "2026.10.13"
   string h = TimeToString(g, TIME_SECONDS);  // "10:00:00"
   if(StringLen(d) < 10) return("");
   return(StringSubstr(d, 0, 4) + "-" + StringSubstr(d, 5, 2) + "-" + StringSubstr(d, 8, 2)
          + "T" + h + "Z");
  }

// "HH:MM" -> menit sejak tengah malam, -1 kalau tidak valid.
int ParseHm(const string hm)
  {
   int p = StringFind(hm, ":");
   if(p <= 0) return(-1);
   int h = (int)StringToInteger(StringSubstr(hm, 0, p));
   int m = (int)StringToInteger(StringSubstr(hm, p+1, 2));
   if(h < 0 || h > 23 || m < 0 || m > 59) return(-1);
   return(h * 60 + m);
  }

// shortId deterministik dari provider_position_id -> dipakai di comment MT5
// (PRD 6.3: batas 31 karakter, jangan pakai UUID penuh).
string ShortId(const string pid)
  {
   string hexOnly = "";
   int n = StringLen(pid);
   for(int i = 0; i < n && StringLen(hexOnly) < 8; i++)
     {
      ushort c = StringGetCharacter(pid, i);
      if((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))
         hexOnly += ShortToString(c);
     }
   while(StringLen(hexOnly) < 8) hexOnly += "0";
   return(hexOnly);
  }

string PositionComment(const string pid) { return(ITJ_COMMENT_PREFIX + ShortId(pid)); }

// magic client = Magic + index provider (PRD 6.3), supaya satu akun bisa
// mengikuti banyak provider tanpa saling menutup posisi.
int ProviderIndex(const string providerId)
  {
   for(int i = 0; i < ArraySize(g_knownProviders); i++)
      if(g_knownProviders[i] == providerId) return(g_knownProviderIdx[i]);
   int idx = ArraySize(g_knownProviders);
   ArrayResize(g_knownProviders, idx + 1);
   ArrayResize(g_knownProviderIdx, idx + 1);
   g_knownProviders[idx]   = providerId;
   g_knownProviderIdx[idx] = idx;
   return(idx);
  }

long ClientMagicFor(const string providerId) { return(Magic + ProviderIndex(providerId)); }

// true kalau magic milik EA ini (bukan trade manual client).
bool IsOwnMagic(const long m)
  {
   if(m < Magic) return(false);
   return(m - Magic < ITJ_MAX_PROVIDERS);
  }

//====================================================================
// 5. PARSER JSON MINIMAL
//    Hanya menangani bentuk yang benar-benar kita kirim/terima:
//    objek rata dan array of objek. Dipakai untuk menarik field dari
//    respons PostgREST dan dari payload jsonb.
//====================================================================
int SkipWs(const string js, int i)
  {
   int n = StringLen(js);
   while(i < n)
     {
      ushort c = StringGetCharacter(js, i);
      if(c == ' ' || c == '\t' || c == '\n' || c == '\r') { i++; continue; }
      break;
     }
   return(i);
  }

// Cari posisi AWAL NILAI untuk key tertentu mulai dari offset `from`.
int JsonValuePos(const string js, const string key, const int from = 0)
  {
   string pat = "\"" + key + "\"";
   int n = StringLen(js);
   int i = from;
   while(i < n)
     {
      int p = StringFind(js, pat, i);
      if(p < 0) return(-1);
      int q = SkipWs(js, p + StringLen(pat));
      if(q < n && StringGetCharacter(js, q) == ':')
         return(SkipWs(js, q + 1));
      i = p + StringLen(pat);
     }
   return(-1);
  }

// Ambil substring satu nilai JSON (string, angka, objek, array) di posisi i.
string JsonSliceAt(const string js, const int i)
  {
   int n = StringLen(js);
   if(i < 0 || i >= n) return("");
   ushort c = StringGetCharacter(js, i);
   if(c == '"')
     {
      int j = i + 1;
      while(j < n)
        {
         ushort d = StringGetCharacter(js, j);
         if(d == '\\') { j += 2; continue; }
         if(d == '"')  break;
         j++;
        }
      return(StringSubstr(js, i, j - i + 1));
     }
   if(c == '{' || c == '[')
     {
      int depth = 0, j = i;
      bool inStr = false;
      while(j < n)
        {
         ushort d = StringGetCharacter(js, j);
         if(inStr)
           {
            if(d == '\\') { j += 2; continue; }
            if(d == '"')  inStr = false;
           }
         else
           {
            if(d == '"') inStr = true;
            else if(d == '{' || d == '[') depth++;
            else if(d == '}' || d == ']')
              {
               depth--;
               if(depth == 0) { j++; break; }
              }
           }
         j++;
        }
      return(StringSubstr(js, i, j - i));
     }
   // primitif: baca sampai pemisah level atas
   int j = i;
   while(j < n)
     {
      ushort d = StringGetCharacter(js, j);
      if(d == ',' || d == '}' || d == ']') break;
      j++;
     }
   string r = StringSubstr(js, i, j - i);
   StringTrimRight(r);
   return(r);
  }

string JsonRaw(const string js, const string key, const int from = 0)
  {
   int p = JsonValuePos(js, key, from);
   if(p < 0) return("");
   return(JsonSliceAt(js, p));
  }

string JsonUnescape(const string s)
  {
   string r = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c == '\\' && i + 1 < n)
        {
         ushort d = StringGetCharacter(s, i + 1);
         if(d == 'n')      { r += "\n"; i++; }
         else if(d == 't') { r += "\t"; i++; }
         else if(d == 'r') { r += "\r"; i++; }
         else if(d == '"') { r += "\""; i++; }
         else if(d == '\\'){ r += "\\"; i++; }
         else if(d == '/') { r += "/";  i++; }
         else if(d == 'u' && i + 5 < n)
           {
            string hex = StringSubstr(s, i + 2, 4);
            r += ShortToString((ushort)strtol_hex(hex));
            i += 5;
           }
         else { r += ShortToString(d); i++; }
        }
      else r += ShortToString(c);
     }
   return(r);
  }

// helper kecil: "1F" -> 31. Ditulis manual supaya tidak perlu StringToInteger
// dengan basis (MQL5 tidak punya).
int strtol_hex(const string h)
  {
   int v = 0;
   int n = StringLen(h);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(h, i);
      int d = -1;
      if(c >= '0' && c <= '9') d = (int)(c - '0');
      else if(c >= 'a' && c <= 'f') d = (int)(c - 'a' + 10);
      else if(c >= 'A' && c <= 'F') d = (int)(c - 'A' + 10);
      if(d < 0) break;
      v = v * 16 + d;
     }
   return(v);
  }

string JsonGetStr(const string js, const string key, const string def = "", const int from = 0)
  {
   string raw = JsonRaw(js, key, from);
   if(StringLen(raw) == 0 || raw == "null") return(def);
   if(StringGetCharacter(raw, 0) == '"')
      return(JsonUnescape(StringSubstr(raw, 1, StringLen(raw) - 2)));
   return(JsonUnescape(raw));
  }

double JsonGetNum(const string js, const string key, const double def = 0.0, const int from = 0)
  {
   string raw = JsonRaw(js, key, from);
   if(StringLen(raw) == 0 || raw == "null") return(def);
   return(StringToDouble(JsonUnescape(raw)));
  }

long JsonGetInt(const string js, const string key, const long def = 0, const int from = 0)
  {
   string raw = JsonRaw(js, key, from);
   if(StringLen(raw) == 0 || raw == "null") return(def);
   return((long)StringToInteger(JsonUnescape(raw)));
  }

bool JsonGetBool(const string js, const string key, const bool def = false, const int from = 0)
  {
   string raw = JsonRaw(js, key, from);
   if(StringLen(raw) == 0 || raw == "null") return(def);
   return(JsonUnescape(raw) == "true");
  }

// Pecah array JSON tingkat atas menjadi elemen-elemen mentah.
int JsonSplitArray(const string arr, string &out[])
  {
   ArrayResize(out, 0);
   int n = StringLen(arr);
   int i = SkipWs(arr, 0);
   if(i >= n) return(0);
   if(StringGetCharacter(arr, i) != '[') return(0);
   i++;
   int start = -1, depth = 0;
   bool inStr = false;
   while(i < n)
     {
      ushort c = StringGetCharacter(arr, i);
      if(inStr)
        {
         if(c == '\\') { i += 2; continue; }
         if(c == '"')  inStr = false;
         i++;
         continue;
        }
      if(c == '"') { if(start < 0) start = i; inStr = true; }
      else if(c == '{' || c == '[') { if(start < 0) start = i; depth++; }
      else if(c == '}' || c == ']')
        {
         if(c == ']' && depth == 0)
           {
            if(start >= 0)
              {
               string el = StringSubstr(arr, start, i - start);
               StringTrimRight(el);
               int k = ArraySize(out);
               ArrayResize(out, k + 1);
               out[k] = el;
              }
            break;
           }
         depth--;
         if(depth == 0 && start >= 0)
           {
            string el = StringSubstr(arr, start, i - start + 1);
            int k = ArraySize(out);
            ArrayResize(out, k + 1);
            out[k] = el;
            start = -1;
           }
        }
      else if(c == ',' && depth == 0)
        {
         if(start >= 0)
           {
            string el = StringSubstr(arr, start, i - start);
            StringTrimRight(el);
            int k = ArraySize(out);
            ArrayResize(out, k + 1);
            out[k] = el;
            start = -1;
           }
        }
      else if(c != ' ' && c != '\n' && c != '\r' && c != '\t' && start < 0)
         start = i;
      i++;
     }
   return(ArraySize(out));
  }

bool JsonArrayHasString(const string arr, const string val)
  {
   if(StringLen(arr) == 0 || arr == "null" || arr == "[]") return(false);
   string parts[];
   int n = JsonSplitArray(arr, parts);
   for(int i = 0; i < n; i++)
     {
      string s = parts[i];
      if(StringGetCharacter(s, 0) == '"')
         s = JsonUnescape(StringSubstr(s, 1, StringLen(s) - 2));
      if(StringCompare(s, val, false) == 0) return(true);
     }
   return(false);
  }

//====================================================================
// 6. TRANSPORT: WebRequest + PostgREST
//====================================================================
void LogTransportError(const int err)
  {
   if(err == 4060 || err == 4014)
     {
      Print("ITJ: WebRequest DITOLAK (error ", err, "). Buka Tools > Options > ",
            "Expert Advisors > 'Allow WebRequest for listed URL' lalu tambahkan ",
            TrimTrailingSlash(SupabaseUrl), " (host saja, tanpa path).");
      Alert("ITJCopyTrade: URL ", TrimTrailingSlash(SupabaseUrl),
            " belum di-whitelist. Tools > Options > Expert Advisors.");
     }
   else
      Print("ITJ: WebRequest gagal, error ", err);
  }

// Panggil PostgREST. `path` contoh: "copy_events?select=id".
// return = HTTP status, atau -1 kalau gagal di level transport.
int HttpCall(const string method, const string path, const string body, string &out, const string prefer = "")
  {
   out = "";
   if(StringLen(SupabaseUrl) == 0 || StringLen(AnonKey) == 0)
     { Print("ITJ: SupabaseUrl / AnonKey belum diisi."); return(-1); }

   string url = TrimTrailingSlash(SupabaseUrl) + "/rest/v1/" + path;
   string hdrs = "apikey: " + AnonKey + "\r\n"
                 "Authorization: Bearer " + AnonKey + "\r\n"
                 "Accept: application/json\r\n"
                 "Content-Type: application/json\r\n"
                 "x-ea-token: " + EaToken + "\r\n";
   if(StringLen(prefer) > 0) hdrs += "Prefer: " + prefer + "\r\n";

   char data[];
   ArrayResize(data, 0);
   int blen = StringLen(body);
   if(blen > 0)
     {
      // Body kita murni ASCII (id, simbol, angka), jadi jumlah karakter = jumlah byte.
      int copied = StringToCharArray(body, data, 0, blen, CP_UTF8);
      if(copied > 0) ArrayResize(data, copied);
     }

   char result[];
   ArrayResize(result, 0);
   g_respHeaders = "";

   ResetLastError();
   int code = WebRequest(method, url, hdrs, ITJ_HTTP_TIMEOUT_MS, data, result, g_respHeaders);
   if(code == -1)
     {
      LogTransportError(GetLastError());
      return(-1);
     }
   out = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(code >= 400)
      Print("ITJ: HTTP ", code, " ", method, " ", path, " -> ", StringSubstr(out, 0, 300));
   return(code);
  }

int HttpGet(const string path, string &out)              { return(HttpCall("GET",   path, "", out)); }
int HttpPost(const string path, const string body, string &out, const string prefer = "return=minimal")
                                                          { return(HttpCall("POST",  path, body, out, prefer)); }
int HttpPatch(const string path, const string body, string &out)
                                                          { return(HttpCall("PATCH", path, body, out, "return=minimal")); }

//====================================================================
// 7. CACHE CONFIG KE FILE (fail-closed, PRD 8.2)
//    Kalau Supabase tidak bisa dihubungi, EA tetap tahu setelan terakhir
//    dan tetap boleh MENUTUP posisi, tapi TIDAK membuka posisi baru.
//====================================================================
#define ITJ_CFG_FILE "ITJCopyTrade_cfg.json"
#define ITJ_SEQ_FILE "ITJCopyTrade_seq.txt"
#define ITJ_PEAK_FILE "ITJCopyTrade_peak.txt"

void SaveConfigCache(const string raw)
  {
   int h = FileOpen(ITJ_CFG_FILE, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) { Print("ITJ: tidak bisa menulis cache config"); return; }
   FileWriteString(h, raw);
   FileClose(h);
  }

bool LoadConfigCache(string &raw)
  {
   raw = "";
   if(!FileIsExist(ITJ_CFG_FILE)) return(false);
   int h = FileOpen(ITJ_CFG_FILE, FILE_READ | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return(false);
   while(!FileIsEnding(h)) raw += FileReadString(h);
   FileClose(h);
   return(StringLen(raw) > 2);
  }

void SaveSeq()
  {
   int h = FileOpen(ITJ_SEQ_FILE, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, IntegerToString(g_seq));
   FileClose(h);
  }

void LoadSeq()
  {
   if(!FileIsExist(ITJ_SEQ_FILE)) { g_seq = (long)TimeCurrent() * 100; return; }
   int h = FileOpen(ITJ_SEQ_FILE, FILE_READ | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) { g_seq = (long)TimeCurrent() * 100; return; }
   string s = "";
   while(!FileIsEnding(h)) s += FileReadString(h);
   FileClose(h);
   g_seq = (long)StringToInteger(s);
   if(g_seq <= 0) g_seq = (long)TimeCurrent() * 100;
  }

void SavePeak(const double peak)
  {
   int h = FileOpen(ITJ_PEAK_FILE, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   FileWriteString(h, DoubleToString(peak, 2));
   FileClose(h);
  }

double LoadPeak()
  {
   if(!FileIsExist(ITJ_PEAK_FILE)) return(0);
   int h = FileOpen(ITJ_PEAK_FILE, FILE_READ | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE) return(0);
   string s = "";
   while(!FileIsEnding(h)) s += FileReadString(h);
   FileClose(h);
   return(StringToDouble(s));
  }

//====================================================================
// 8. PEMBACAAN POSISI LOKAL
//====================================================================
bool ReadPositionByTicket(const long ticket, PosInfo &p)
  {
   if(!PositionSelectByTicket((ulong)ticket)) return(false);
   p.ticket  = (long)PositionGetInteger(POSITION_TICKET);
   p.symbol  = PositionGetString(POSITION_SYMBOL);
   p.side    = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
   p.volume  = PositionGetDouble(POSITION_VOLUME);
   p.entry   = PositionGetDouble(POSITION_PRICE_OPEN);
   p.sl      = PositionGetDouble(POSITION_SL);
   p.tp      = PositionGetDouble(POSITION_TP);
   p.magic   = (long)PositionGetInteger(POSITION_MAGIC);
   p.comment = PositionGetString(POSITION_COMMENT);
   p.opened  = (datetime)PositionGetInteger(POSITION_TIME);
   return(true);
  }

// Semua posisi yang cocok dengan filter publikasi provider.
int CollectPositions(PosInfo &out[])
  {
   ArrayResize(out, 0);
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      PosInfo p;
      if(!ReadPositionByTicket((long)t, p)) continue;
      if(PublishMode == PUBLISH_MAGIC_ONLY && p.magic == 0) continue;
      int k = ArraySize(out);
      if(k >= ITJ_MAX_POS_SNAPSHOT) break;
      ArrayResize(out, k + 1);
      out[k] = p;
     }
   return(ArraySize(out));
  }

// Posisi client milik EA ini yang dipetakan ke provider_position_id tertentu.
// Pemetaan memakai comment "ITJ-<shortId>" (PRD 6.3) -> tidak perlu round-trip DB.
bool FindClientPositionByPid(const string pid, PosInfo &out)
  {
   string want = PositionComment(pid);
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      PosInfo p;
      if(!ReadPositionByTicket((long)t, p)) continue;
      if(!IsOwnMagic(p.magic)) continue;
      if(p.comment == want) { out = p; return(true); }
     }
   return(false);
  }

// Semua posisi milik EA ini (untuk guard maxPositions / rekonsiliasi).
int CollectOwnPositions(PosInfo &out[])
  {
   ArrayResize(out, 0);
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      PosInfo p;
      if(!ReadPositionByTicket((long)t, p)) continue;
      if(!IsOwnMagic(p.magic)) continue;
      int k = ArraySize(out);
      ArrayResize(out, k + 1);
      out[k] = p;
     }
   return(ArraySize(out));
  }

int CountPositionsByProvider(const LinkSettings &s)
  {
   PosInfo own[];
   int n = CollectOwnPositions(own);
   int c = 0;
   for(int i = 0; i < n; i++)
      if(own[i].magic == ClientMagicFor(s.providerId)) c++;
   return(c);
  }

//====================================================================
// 9. ENGINE PROVIDER
//    Prinsip: OnTradeTransaction HANYA menandai dirty (WebRequest itu
//    blocking dan mengganggu konteks trade). Sumber kebenaran = diff
//    polling 1 detik (PRD 6.5.1).
//====================================================================
// Jarak harga -> poin. Dipakai MinModifyPoints & guard deviation.
double PointsFromPrice(const string sym, const double dist)
  {
   double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0) return(0);
   return(dist / pt);
  }

// Cari index PosInfo di snapshot lama berdasarkan ticket.
int PrevIndexOf(const long ticket, const int count)
  {
   for(int i = 0; i < count; i++)
      if(g_pPrev[i].ticket == ticket) return(i);
   return(-1);
  }

int ThrottleIndexOf(const long ticket)
  {
   for(int i = 0; i < ArraySize(g_pThrottleIds); i++)
      if(g_pThrottleIds[i] == ticket) return(i);
   return(-1);
  }

void ThrottleTouch(const long ticket, const datetime when)
  {
   int i = ThrottleIndexOf(ticket);
   if(i < 0)
     {
      int k = ArraySize(g_pThrottleIds);
      ArrayResize(g_pThrottleIds, k + 1);
      ArrayResize(g_pThrottleTicket, k + 1);
      g_pThrottleIds[k] = ticket;
      g_pThrottleTicket[k] = when;
      return;
     }
   g_pThrottleTicket[i] = when;
  }

datetime ThrottleLast(const long ticket)
  {
   int i = ThrottleIndexOf(ticket);
   if(i < 0) return(0);
   return(g_pThrottleTicket[i]);
  }

// Payload always carries the COMPLETE position state (PRD 6.5.2), bukan delta.
string ProviderPayload(const PosInfo &p, const string pid, const double oldVolume)
  {
   string j = "{";
   j += "\"provider_ticket\":" + IntegerToString(p.ticket);
   j += ",\"provider_position_id\":" + (StringLen(pid) > 0 ? JsonStr(pid) : "null");
   j += ",\"symbol\":" + JsonStr(p.symbol);
   j += ",\"side\":" + JsonStr(p.side > 0 ? "buy" : "sell");
   j += ",\"entry\":" + JsonNum(p.entry);
   j += ",\"sl\":" + JsonNum(p.sl);
   j += ",\"tp\":" + JsonNum(p.tp);
   j += ",\"volume\":" + JsonNum(p.volume);
   if(oldVolume > 0) j += ",\"old_volume\":" + JsonNum(oldVolume);
   j += ",\"magic\":" + IntegerToString(p.magic);
   j += ",\"opened_at\":" + JsonStr(IsoUtc(p.opened));
   j += "}";
   return(j);
  }

// POST satu event ke copy_events. Server (trigger/RPC) yang mengisi
// provider_id dari x-ea-token dan mem-fan-out ke copy_deliveries.
bool PublishEvent(const string kind, const string payloadJson, const long providerTicket,
                  string &pidOut, string &pendingOut[])
  {
   ArrayResize(pendingOut, 0);
   string body = "[{";
   body += "\"kind\":" + JsonStr(kind);
   body += ",\"seq\":" + IntegerToString(g_seq);
   body += ",\"provider_ticket\":" + IntegerToString(providerTicket);
   body += ",\"payload\":" + payloadJson;
   body += "}]";

   string resp = "";
   int code = HttpPost("copy_events?select=id,provider_position_id", body, resp, "return=representation");
   if(code != 200 && code != 201)
     {
      Print("ITJ: publish ", kind, " gagal (HTTP ", code, "). Event di-drop; ",
            "rekonsiliasi ", SnapshotSeconds, " dtk akan menyamakan state akhir.");
      return(false);
     }
   g_seq++;
   SaveSeq();

   // Balikkan id baris yang baru dibuat supaya bisa dipasangkan ke posisi.
   string rows[];
   if(JsonSplitArray(resp, rows) > 0)
     {
      pidOut = JsonGetStr(rows[0], "provider_position_id");
      if(StringLen(pidOut) == 0) pidOut = JsonGetStr(rows[0], "id");
     }
   return(true);
  }

// Snapshot provider_positions (PRD 6.1). Dipakai server untuk halaman publik
// dan sebagai sumber kebenaran rekonsiliasi client (PRD 6.4).
void PublishSnapshot(const PosInfo &list[], const int count)
  {
   if(count == 0)
     {
      // Tidak ada posisi terbuka: tidak ada yang perlu di-upsert. Client akan
      // menyimpulkan "provider sudah close" dari provider_positions.status=open
      // yang kosong pada rekonsiliasi berikutnya.
      return;
     }
   string body = "[";
   for(int i = 0; i < count; i++)
     {
      if(i > 0) body += ",";
      body += "{";
      body += "\"provider_ticket\":" + IntegerToString(list[i].ticket);
      body += ",\"symbol\":" + JsonStr(list[i].symbol);
      body += ",\"side\":" + JsonStr(list[i].side > 0 ? "buy" : "sell");
      body += ",\"volume\":" + JsonNum(list[i].volume);
      body += ",\"entry\":" + JsonNum(list[i].entry);
      body += ",\"sl\":" + JsonNum(list[i].sl);
      body += ",\"tp\":" + JsonNum(list[i].tp);
      body += ",\"opened_at\":" + JsonStr(IsoUtc(list[i].opened));
      body += ",\"status\":\"open\"";
      body += "}";
     }
   body += "]";

   string resp = "";
   // on_conflict WAJIB menyebut seluruh kunci unik tabel: unique-nya
   // (provider_id, provider_ticket). Kalau hanya "provider_ticket", Postgres
   // menolak dengan 42P10 "no unique or exclusion constraint matching the
   // ON CONFLICT specification". provider_id sendiri diisi server dari
   // x-ea-token lewat BEFORE INSERT trigger, jadi body tetap tidak memuatnya.
   int code = HttpPost("provider_positions?on_conflict=provider_id,provider_ticket", body, resp,
                       "resolution=merge-duplicates,return=minimal");
   if(code != 200 && code != 201 && code != 204)
      Print("ITJ: snapshot provider gagal (HTTP ", code, ")");
  }

// Diff snapshot: OPEN / MODIFY_SL / MODIFY_TP / PARTIAL_CLOSE / CLOSE.
void ProviderDiff()
  {
   PosInfo cur[];
   int cn = CollectPositions(cur);

   // 1) posisi baru -> OPEN
   for(int i = 0; i < cn; i++)
     {
      if(PrevIndexOf(cur[i].ticket, ArraySize(g_pPrev)) >= 0) continue;
      string pid = "";
      string pend[];
      string pl = ProviderPayload(cur[i], "", 0);
      PublishEvent("OPEN", pl, cur[i].ticket, pid, pend);
      ThrottleTouch(cur[i].ticket, TimeCurrent());
     }

   // 2) posisi hilang -> CLOSE
   for(int i = 0; i < ArraySize(g_pPrev); i++)
     {
      if(PrevIndexOf(g_pPrev[i].ticket, cn) >= 0) continue;
      string pid = "";
      string pend[];
      PublishEvent("CLOSE", ProviderPayload(g_pPrev[i], "", 0), g_pPrev[i].ticket, pid, pend);
     }

   // 3) perubahan pada posisi yang masih ada
   for(int i = 0; i < cn; i++)
     {
      int j = PrevIndexOf(cur[i].ticket, ArraySize(g_pPrev));
      if(j < 0) continue;
      PosInfo old = g_pPrev[j];

      double pt = SymbolInfoDouble(cur[i].symbol, SYMBOL_POINT);

      // 3a. volume berkurang -> PARTIAL_CLOSE
      if(cur[i].volume < old.volume - 0.0000001)
        {
         string pid = "";
         string pend[];
         PublishEvent("PARTIAL_CLOSE", ProviderPayload(cur[i], "", old.volume), cur[i].ticket, pid, pend);
        }

      // 3b. SL / TP berubah -> event MODIFY dengan pasangan LENGKAP
      bool slChanged = MathAbs(cur[i].sl - old.sl) > pt / 2.0;
      bool tpChanged = MathAbs(cur[i].tp - old.tp) > pt / 2.0;
      if(!slChanged && !tpChanged) continue;

      // MinModifyPoints: perubahan kecil diabaikan (throttle halus untuk trailing).
      // Snapshot lokal tetap diperbarui supaya tidak memicu berulang; state akhir
      // tetap konvergen lewat rekonsiliasi 30 dtk (PRD 6.4).
      if(MinModifyPoints > 0)
        {
         if(slChanged && old.sl > 0 && PointsFromPrice(cur[i].symbol, MathAbs(cur[i].sl - old.sl)) < MinModifyPoints)
            slChanged = false;
         if(tpChanged && old.tp > 0 && PointsFromPrice(cur[i].symbol, MathAbs(cur[i].tp - old.tp)) < MinModifyPoints)
            tpChanged = false;
         if(!slChanged && !tpChanged) continue;
        }

      // ModifyThrottleSeconds: maksimal 1 publish perubahan SL-TP per posisi per X dtk.
      if(TimeCurrent() - ThrottleLast(cur[i].ticket) < ModifyThrottleSeconds) continue;

      string kind = (slChanged && tpChanged) ? "MODIFY_SL" : (slChanged ? "MODIFY_SL" : "MODIFY_TP");
      string pid = "";
      string pend[];
      if(PublishEvent(kind, ProviderPayload(cur[i], "", 0), cur[i].ticket, pid, pend))
         ThrottleTouch(cur[i].ticket, TimeCurrent());
     }

   // Simpan snapshot baru sebagai basis diff berikutnya.
   ArrayResize(g_pPrev, cn);
   for(int i = 0; i < cn; i++) g_pPrev[i] = cur[i];
  }

//====================================================================
// 10. SETELAN LINK & GUARD (CLIENT)
//====================================================================
void SetLinkDefaults(LinkSettings &s)
  {
   s.killSwitch = false;
   s.paused     = false;
   s.riskPct    = 1.0;
   s.basis      = "balance";
   s.maxLotCap  = 0;
   s.allowMinLotFallback = false;
   s.slFallbackPoints = 100;
   s.copyTp     = true;
   s.maxHoldMinutes = 0;
   s.modifyThrottleSeconds = ModifyThrottleSeconds;
   s.minModifyPoints = MinModifyPoints;
   s.riskBreachAction = "warn";
   s.maxSpreadPoints = 30;
   s.maxEntryDeviationPoints = 50;
   s.maxSlippagePoints = 20;
   s.maxPositions = 5;
   s.maxPositionsPerSymbol = 1;
   s.allowSymbolsJson = "";
   s.blockSymbolsJson = "";
   s.sessionEnabled = false;
   s.sessionStart = "07:00";
   s.sessionEnd   = "22:00";
   s.followOnReconnect = false;
   s.failStreakPause = true;
   s.maxTotalRiskPct = 10;
   s.dailyLossLimitPct = 5;
   s.dailyProfitTargetPct = 0;
   s.maxDrawdownPct = 15;
   s.maxTradesPerDay = 20;
   s.deviationPoints = 20;
  }

void ParseSettings(const string row, LinkSettings &s)
  {
   SetLinkDefaults(s);
   s.linkId     = JsonGetStr(row, "id");
   s.providerId = JsonGetStr(row, "provider_id");

   string st = JsonGetStr(row, "status");
   s.paused = (st == "paused");
   s.killSwitch = JsonGetBool(row, "kill_switch", false);

   string set = JsonRaw(row, "settings");
   string run = JsonRaw(row, "runtime_state");
   if(StringLen(run) > 0)
     {
      if(JsonGetBool(run, "kill_switch", false)) s.killSwitch = true;
      if(JsonGetStr(run, "state") == "paused")   s.paused = true;
     }

   if(StringLen(set) < 3) return; // pakai default

   // sizing
   string sizing = JsonRaw(set, "sizing");
   if(StringLen(sizing) > 2)
     {
      s.riskPct = JsonGetNum(sizing, "riskPct", s.riskPct);
      s.basis   = JsonGetStr(sizing, "basis", s.basis);
      s.maxLotCap = JsonGetNum(sizing, "maxLotCap", s.maxLotCap);
      s.allowMinLotFallback = JsonGetBool(sizing, "allowMinLotFallback", s.allowMinLotFallback);
     }

   // stops
   string stops = JsonRaw(set, "stops");
   if(StringLen(stops) > 2)
     {
      s.slFallbackPoints = (int)JsonGetInt(stops, "slFallbackPoints", s.slFallbackPoints);
      s.copyTp           = JsonGetBool(stops, "copyTp", s.copyTp);
      s.maxHoldMinutes   = (int)JsonGetInt(stops, "maxHoldMinutes", s.maxHoldMinutes);
     }

   // mirror
   string mirror = JsonRaw(set, "mirror");
   if(StringLen(mirror) > 2)
     {
      s.modifyThrottleSeconds = (int)JsonGetInt(mirror, "modifyThrottleSeconds", s.modifyThrottleSeconds);
      s.minModifyPoints       = (int)JsonGetInt(mirror, "minModifyPoints", s.minModifyPoints);
      s.riskBreachAction      = JsonGetStr(mirror, "riskBreachAction", s.riskBreachAction);
     }

   // guards
   string guards = JsonRaw(set, "guards");
   if(StringLen(guards) > 2)
     {
      s.maxSpreadPoints         = (int)JsonGetInt(guards, "maxSpreadPoints", s.maxSpreadPoints);
      s.maxEntryDeviationPoints = (int)JsonGetInt(guards, "maxEntryDeviationPoints", s.maxEntryDeviationPoints);
      s.maxSlippagePoints       = (int)JsonGetInt(guards, "maxSlippagePoints", s.maxSlippagePoints);
      s.maxPositions            = (int)JsonGetInt(guards, "maxPositions", s.maxPositions);
      s.maxPositionsPerSymbol   = (int)JsonGetInt(guards, "maxPositionsPerSymbol", s.maxPositionsPerSymbol);
      s.allowSymbolsJson        = JsonRaw(guards, "allowSymbols");
      s.blockSymbolsJson        = JsonRaw(guards, "blockSymbols");
      s.followOnReconnect       = JsonGetBool(guards, "followOnReconnect", s.followOnReconnect);
      s.failStreakPause         = JsonGetBool(guards, "failStreakPause", s.failStreakPause);
      string sess = JsonRaw(guards, "sessionFilter");
      if(StringLen(sess) > 2)
        {
         s.sessionEnabled = JsonGetBool(sess, "enabled", s.sessionEnabled);
         s.sessionStart   = JsonGetStr(sess, "start", s.sessionStart);
         s.sessionEnd     = JsonGetStr(sess, "end", s.sessionEnd);
        }
     }

   // limits
   string limits = JsonRaw(set, "limits");
   if(StringLen(limits) > 2)
     {
      s.maxTotalRiskPct      = JsonGetNum(limits, "maxTotalRiskPct", s.maxTotalRiskPct);
      s.dailyLossLimitPct    = JsonGetNum(limits, "dailyLossLimitPct", s.dailyLossLimitPct);
      s.dailyProfitTargetPct = JsonGetNum(limits, "dailyProfitTargetPct", s.dailyProfitTargetPct);
      s.maxDrawdownPct       = JsonGetNum(limits, "maxDrawdownPct", s.maxDrawdownPct);
      s.maxTradesPerDay      = (int)JsonGetInt(limits, "maxTradesPerDay", s.maxTradesPerDay);
     }

   // order
   string order = JsonRaw(set, "order");
   if(StringLen(order) > 2)
      s.deviationPoints = (int)JsonGetInt(order, "deviationPoints", s.deviationPoints);

   // Cap lokal (input user) > 0 -> pakai yang lebih kecil (PRD 8.1).
   if(LocalRiskPctCap > 0 && s.riskPct > LocalRiskPctCap) s.riskPct = LocalRiskPctCap;
   if(s.modifyThrottleSeconds < ModifyThrottleSeconds) s.modifyThrottleSeconds = ModifyThrottleSeconds;
   if(MinModifyPoints > s.minModifyPoints) s.minModifyPoints = MinModifyPoints;
  }

// Cari setelan untuk provider tertentu; kalau belum ada, pakai default.
// (Out-param, bukan return by value: struktur berisi string = "complex struct".)
void LinkForProvider(const string providerId, LinkSettings &out)
  {
   for(int i = 0; i < ArraySize(g_links); i++)
      if(g_links[i].providerId == providerId) { out = g_links[i]; return; }
   // TIDAK ditemukan: jangan pakai default. linkId sengaja dibiarkan kosong
   // sebagai penanda "tidak aktif/tercabut" supaya pemanggil melewati delivery
   // (fail-closed). Kalau di sini kita isi default, delivery dari link yang
   // sudah revoked/paused akan dieksekusi dengan riskPct 1% - persis yang
   // tidak boleh terjadi.
   SetLinkDefaults(out);
   out.providerId = providerId;
   out.linkId = "";
   if(LocalRiskPctCap > 0 && out.riskPct > LocalRiskPctCap) out.riskPct = LocalRiskPctCap;
  }

// Ambil copy_links aktif dari server; kalau gagal -> pakai cache file (fail-closed).
void RefreshLinks()
  {
   string resp = "";
   // status=in.(active,paused): link yang di-pause HARUS tetap terlihat, kalau tidak
   // EA tidak menemukannya dan jatuh ke setelan default (riskPct 1%) - artinya
   // "pause" malah bikin trade jalan dengan setelan yang bukan pilihan user.
   int code = HttpGet("copy_links?status=in.(active,paused)&select=id,provider_id,status,settings,runtime_state,updated_at", resp);
   if(code != 200)
     {
      if(!g_cfgFromFile && LoadConfigCache(g_cfgRawJson)) { g_cfgFromFile = true; }
      if(StringLen(g_cfgRawJson) > 2) ParseLinksFromRaw(g_cfgRawJson);
      return;
     }
   g_cfgRawJson  = resp;
   g_cfgFromFile = false;
   SaveConfigCache(resp);
   ParseLinksFromRaw(resp);
  }

void ParseLinksFromRaw(const string raw)
  {
   string rows[];
   int n = JsonSplitArray(raw, rows);
   ArrayResize(g_links, 0);
   for(int i = 0; i < n && i < ITJ_MAX_PROVIDERS; i++)
     {
      LinkSettings s;
      ParseSettings(rows[i], s);
      if(StringLen(s.providerId) == 0) continue;
      int k = ArraySize(g_links);
      ArrayResize(g_links, k + 1);
      g_links[k] = s;
     }
   Print("ITJ: ", ArraySize(g_links), " copy_link aktif dimuat",
         (g_cfgFromFile ? " (DARI CACHE FILE - server tidak terjangkau)" : ""));
  }

//====================================================================
// 11. GUARD LOKAL (PRD 5)
//====================================================================
string g_skipReason = "";

bool GuardSession(const LinkSettings &s, string &why)
  {
   if(!s.sessionEnabled) return(true);
   int a = ParseHm(s.sessionStart), b = ParseHm(s.sessionEnd);
   if(a < 0 || b < 0) return(true);
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int now = dt.hour * 60 + dt.min;
   bool ok = (a <= b) ? (now >= a && now <= b) : (now >= a || now <= b);
   if(!ok) why = StringFormat("Dilewati: di luar jam sesi (%s-%s)", s.sessionStart, s.sessionEnd);
   return(ok);
  }

//====================================================================
// 11b. BROKER BERBEDA: nama simbol + perpindahan SL/TP
//====================================================================
// Broker client TIDAK harus sama dengan broker provider. Yang harus ada:
//   1. simbolnya tersedia di broker client (nama boleh beda -> SymbolMap /
//      AutoResolveSymbol);
//   2. SL/TP dipindah sebagai JARAK, bukan harga absolut.
// Nama simbol hanya dipakai SEKALI, saat OPEN: setelah posisi client ada,
// MODIFY/PARTIAL/CLOSE mencari posisi lewat provider_position_id dan memakai
// simbol milik posisi itu sendiri.
#define ITJ_MAX_SYMMAP 64
string g_symIn[ITJ_MAX_SYMMAP];    // nama di sisi provider
string g_symOut[ITJ_MAX_SYMMAP];   // nama di broker client
int    g_symCount = 0;

string SymTrim(const string v)
  {
   string s = v;
   StringTrimLeft(s);
   StringTrimRight(s);
   return(s);
  }

// Kunci pembanding: hanya huruf (dibesarkan) dan angka.
// "XAUUSD.a" -> "XAUUSDA", "mXAUUSD" -> "MXAUUSD", "XAU/USD" -> "XAUUSD".
string SymKey(const string s)
  {
   string out = "";
   int n = StringLen(s);
   for(int i = 0; i < n; i++)
     {
      ushort c = StringGetCharacter(s, i);
      if(c >= 'a' && c <= 'z') c = (ushort)(c - 32);
      if((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) out += ShortToString(c);
     }
   return(out);
  }

// Pasangan di input SymbolMap, format "XAUUSD=GOLD,US500=SPX500" (kiri = nama
// provider, kanan = nama di broker client).
string MapLookup(const string providerSym)
  {
   if(StringLen(SymTrim(SymbolMap)) == 0) return("");
   string pairs[];
   int n = StringSplit(SymbolMap, ',', pairs);
   for(int i = 0; i < n; i++)
     {
      string kv[];
      if(StringSplit(pairs[i], '=', kv) != 2) continue;
      string k = SymKey(kv[0]);
      if(StringLen(k) == 0) continue;
      if(k == SymKey(providerSym)) return(SymTrim(kv[1]));
     }
   return("");
  }

bool SymbolUsable(const string sym)
  {
   if(StringLen(sym) == 0) return(false);
   if(!SymbolSelect(sym, true)) return(false);
   return(SymbolInfoInteger(sym, SYMBOL_SELECT) != 0);
  }

// Cari padanan otomatis di broker client (suffix/prefix broker: XAUUSD ->
// XAUUSD.a, XAUUSDm, mXAUUSD, GOLD.a). Kembalikan "" kalau tidak ada atau
// AMBIGU: menebak simbol yang salah jauh lebih berbahaya daripada melewati satu sinyal.
string MatchBrokerSymbol(const string providerSym)
  {
   string base = SymKey(providerSym);
   if(StringLen(base) < 2) return("");
   string best = "";
   int    bestScore = 999;
   bool   tie = false;
   int total = SymbolsTotal(false);          // semua simbol broker, bukan cuma Market Watch
   for(int i = 0; i < total; i++)
     {
      string name = SymbolName(i, false);
      string key  = SymKey(name);
      int score = -1;
      int rem = StringLen(key) - StringLen(base);
      if(key == base)                                 score = 0;
      else if(rem > 0 && StringFind(key, base) == 0 && rem <= 4)                 score = rem;         // XAUUSDxxx
      else if(rem > 0 && StringFind(key, base) == StringLen(key) - StringLen(base) && rem <= 2) score = rem; // xxxXAUUSD
      if(score < 0) continue;
      if(score < bestScore) { bestScore = score; best = name; tie = false; }
      else if(score == bestScore && name != best) tie = true;
     }
   if(tie)
     { Print("ITJ: simbol ", providerSym, " ambigu di broker ini (kandidat ", best, ") - isi input SymbolMap"); return(""); }
   return(best);
  }

// Nama simbol yang benar-benar dipakai di broker client (dengan cache).
string ResolveClientSymbol(const string providerSym)
  {
   string key = SymKey(providerSym);
   for(int i = 0; i < g_symCount; i++)
      if(SymKey(g_symIn[i]) == key) return(g_symOut[i]);

   string mapped = MapLookup(providerSym);
   string found  = "";
   if(StringLen(mapped) > 0 && SymbolUsable(mapped))      found = mapped;
   else if(SymbolUsable(providerSym))                     found = providerSym;
   else if(AutoResolveSymbol)                             found = MatchBrokerSymbol(providerSym);

   if(StringLen(found) > 0)
     {
      // hanya hasil sukses yang di-cache, supaya simbol yang baru ditambahkan
      // ke Market Watch tetap dicoba lagi nanti
      if(g_symCount < ITJ_MAX_SYMMAP)
        { g_symIn[g_symCount] = providerSym; g_symOut[g_symCount] = found; g_symCount++; }
      if(found != providerSym)
         Print("ITJ: simbol provider ", providerSym, " dipetakan ke ", found, " di broker ini");
     }
   return(found);
  }

// Harga absolut provider (SL/TP) -> harga di sisi client.
// RELATIVE (default): yang dipindah adalah JARAK dari entry provider, proporsional
// terhadap harga. Harga dua broker tidak pernah sama, jadi harga absolut membuat
// risiko client menyimpang dari yang dia pilih (dan SL bisa mendarat di sisi yang
// salah). ABSOLUTE hanya masuk akal untuk akun yang benar-benar identik.
double LevelForClient(const double providerEntry, const double providerLevel,
                      const double clientAnchor, const int absoluteMode)
  {
   if(providerLevel <= 0 || providerEntry <= 0 || clientAnchor <= 0) return(0);
   if(absoluteMode) return(providerLevel);
   double ratio = MathAbs(providerLevel - providerEntry) / providerEntry;
   double dist  = ratio * clientAnchor;
   return(providerLevel > providerEntry ? clientAnchor + dist : clientAnchor - dist);
  }

bool GuardSymbol(const LinkSettings &s, const string sym, string &why)
  {
   if(JsonArrayHasString(s.blockSymbolsJson, sym))
     { why = "Dilewati: simbol " + sym + " ada di blockSymbols"; return(false); }
   // allowSymbols kosong/absen = izinkan semua simbol.
   string parts[];
   int n = JsonSplitArray(s.allowSymbolsJson, parts);
   if(n > 0 && !JsonArrayHasString(s.allowSymbolsJson, sym))
     { why = "Dilewati: simbol " + sym + " tidak ada di allowSymbols"; return(false); }
   return(true);
  }

double CurrentSpreadPoints(const string sym)
  {
   double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0) return(0);
   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);
   return((ask - bid) / pt);
  }

bool GuardSpread(const LinkSettings &s, const string sym, string &why)
  {
   double sp = CurrentSpreadPoints(sym);
   if(s.maxSpreadPoints > 0 && sp > s.maxSpreadPoints)
     {
      why = StringFormat("Dilewati: spread %.0f > batas %d", sp, s.maxSpreadPoints);
      return(false);
     }
   return(true);
  }

bool GuardEntryDeviation(const LinkSettings &s, const string sym, const int side,
                         const double providerEntry, string &why)
  {
   if(providerEntry <= 0) return(true);
   double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0) return(true);
   double mkt = (side > 0) ? SymbolInfoDouble(sym, SYMBOL_ASK) : SymbolInfoDouble(sym, SYMBOL_BID);
   double dev = MathAbs(mkt - providerEntry) / pt;
   if(s.maxEntryDeviationPoints > 0 && dev > s.maxEntryDeviationPoints)
     {
      why = StringFormat("Dilewati: harga bergerak %.0f poin dari fill provider (batas %d)",
                         dev, s.maxEntryDeviationPoints);
      return(false);
     }
   return(true);
  }

bool GuardMaxPositions(const LinkSettings &s, string &why)
  {
   if(s.maxPositions <= 0) return(true);
   int c = CountPositionsByProvider(s);
   if(c >= s.maxPositions)
     { why = StringFormat("Dilewati: posisi copy sudah %d (batas %d)", c, s.maxPositions); return(false); }
   return(true);
  }

bool GuardMaxPerSymbol(const LinkSettings &s, const string sym, string &why)
  {
   if(s.maxPositionsPerSymbol <= 0) return(true);
   PosInfo own[];
   int n = CollectOwnPositions(own);
   long mag = ClientMagicFor(s.providerId);
   int c = 0;
   for(int i = 0; i < n; i++)
      if(own[i].magic == mag && own[i].symbol == sym) c++;
   if(c >= s.maxPositionsPerSymbol)
     { why = StringFormat("Dilewati: sudah %d posisi %s (batas %d)", c, sym, s.maxPositionsPerSymbol); return(false); }
   return(true);
  }

bool GuardAntiHedge(const LinkSettings &s, const string sym, const int side, string &why)
  {
   PosInfo own[];
   int n = CollectOwnPositions(own);
   long mag = ClientMagicFor(s.providerId);
   for(int i = 0; i < n; i++)
      if(own[i].magic == mag && own[i].symbol == sym && own[i].side != side)
        { why = "Dilewati: sudah ada posisi berlawanan di " + sym + " (anti-hedge)"; return(false); }
   return(true);
  }

// Risiko posisi terbuka dalam mata uang deposit (dipakai maxTotalRiskPct).
double RiskOfPosition(const PosInfo &p)
  {
   if(p.sl <= 0) return(0); // tanpa SL: tidak bisa dihitung, dianggap 0 dan dibiarkan guard lain bekerja
   double tv = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_VALUE);
   double ts = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_SIZE);
   if(ts <= 0) return(0);
   double perUnitPerLot = tv / ts;
   return(MathAbs(p.entry - p.sl) * p.volume * perUnitPerLot);
  }

void RefreshDailyStats()
  {
   if(TimeCurrent() - g_statsAt < 10) return;
   g_statsAt = TimeCurrent();

   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   string key = StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(key != g_dayKey)
     {
      g_dayKey = key;
      g_dayStartEquity = eq;
      g_dayRealizedPnl = 0;
      g_tradesToday = 0;
      g_failStreak = 0;
     }
   if(g_dayStartEquity <= 0) g_dayStartEquity = eq;
   if(eq > g_equityPeak) { g_equityPeak = eq; SavePeak(g_equityPeak); }

   // Hitung deal hari ini untuk magic milik EA ini (realized PnL + jumlah entry).
   datetime dayStart = StringToTime(key + " 00:00:00");
   if(!HistorySelect(dayStart, TimeCurrent() + 60)) return;
   int total = HistoryDealsTotal();
   double pnl = 0;
   int entries = 0;
   for(int i = 0; i < total; i++)
     {
      ulong t = HistoryDealGetTicket(i);
      if(t == 0) continue;
      long m = (long)HistoryDealGetInteger(t, DEAL_MAGIC);
      if(!IsOwnMagic(m)) continue;
      pnl += HistoryDealGetDouble(t, DEAL_PROFIT)
           + HistoryDealGetDouble(t, DEAL_COMMISSION)
           + HistoryDealGetDouble(t, DEAL_SWAP);
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN) entries++;
     }
   g_dayRealizedPnl = pnl;
   g_tradesToday    = entries;
  }

bool GuardTotalRisk(const LinkSettings &s, const string sym, const int side,
                    const double addRisk, string &why)
  {
   if(s.maxTotalRiskPct <= 0) return(true);
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   if(bal <= 0) return(true);
   PosInfo own[];
   int n = CollectOwnPositions(own);
   double sum = 0;
   for(int i = 0; i < n; i++) sum += RiskOfPosition(own[i]);
   double pct = (sum + addRisk) / bal * 100.0;
   if(pct > s.maxTotalRiskPct)
     { why = StringFormat("Ditolak: total risiko terbuka %.1f%% > batas %.1f%%", pct, s.maxTotalRiskPct); return(false); }
   return(true);
  }

bool GuardDailyLoss(const LinkSettings &s, string &why)
  {
   if(s.dailyLossLimitPct <= 0 || g_dayStartEquity <= 0) return(true);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double lossPct = (g_dayStartEquity - eq) / g_dayStartEquity * 100.0;
   if(lossPct >= s.dailyLossLimitPct)
     {
      why = StringFormat("STOP: daily loss %.1f%% >= batas %.1f%% (lanjut besok / resume manual)",
                         lossPct, s.dailyLossLimitPct);
      return(false);
     }
   return(true);
  }

bool GuardDailyProfit(const LinkSettings &s, string &why)
  {
   if(s.dailyProfitTargetPct <= 0 || g_dayStartEquity <= 0) return(true);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double gainPct = (eq - g_dayStartEquity) / g_dayStartEquity * 100.0;
   if(gainPct >= s.dailyProfitTargetPct)
     { why = StringFormat("STOP: target profit harian %.1f%% tercapai", gainPct); return(false); }
   return(true);
  }

bool GuardDrawdown(const LinkSettings &s, string &why)
  {
   if(s.maxDrawdownPct <= 0 || g_equityPeak <= 0) return(true);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd = (g_equityPeak - eq) / g_equityPeak * 100.0;
   if(dd >= s.maxDrawdownPct)
     { why = StringFormat("STOP: drawdown %.1f%% >= batas %.1f%%", dd, s.maxDrawdownPct); return(false); }
   return(true);
  }

bool GuardMaxTradesPerDay(const LinkSettings &s, string &why)
  {
   if(s.maxTradesPerDay <= 0) return(true);
   if(g_tradesToday >= s.maxTradesPerDay)
     { why = StringFormat("STOP: trade hari ini %d >= batas %d", g_tradesToday, s.maxTradesPerDay); return(false); }
   return(true);
  }

bool GuardFailStreak(const LinkSettings &s, string &why)
  {
   if(!s.failStreakPause) return(true);
   if(g_failStreak >= 3)
     {
      why = "PAUSE: 3 eksekusi gagal berturut - restart EA atau ubah setelan untuk melanjutkan";
      return(false);
     }
   return(true);
  }

//====================================================================
// 12. SIZING ENGINE (PRD 4.1)
//====================================================================
// Rumus: riskAmount = basis x riskPct/100
//        stopDistance = |entryRef - sl| (fallback slFallbackPoints kalau SL kosong)
//        moneyPerUnitPerLot = TICK_VALUE / TICK_SIZE
//        rawLots = riskAmount / (stopDistance x moneyPerUnitPerLot)
//        lots = floor(rawLots/step)*step  (SELALU ke bawah)
double ComputeLots(const LinkSettings &s, const string sym, const int side,
                   const double entryRef, const double slPrice,
                   double &riskAmountOut, double &stopDistOut, string &why)
  {
   riskAmountOut = 0;
   stopDistOut   = 0;
   why = "";

   double basisVal = (StringCompare(s.basis, "equity", false) == 0)
                     ? AccountInfoDouble(ACCOUNT_EQUITY)
                     : AccountInfoDouble(ACCOUNT_BALANCE);
   if(basisVal <= 0 || s.riskPct <= 0) { why = "sizing: basis/riskPct tidak valid"; return(0); }

   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   double stopDist = 0;
   if(slPrice > 0 && entryRef > 0) stopDist = MathAbs(entryRef - slPrice);

   if(stopDist <= 0)
     {
      // Provider tidak diwajibkan punya SL (keputusan 9). Jaring pengaman ada di
      // sisi client sebagai setelan milik client sendiri (slFallbackPoints).
      if(s.slFallbackPoints > 0) stopDist = s.slFallbackPoints * point;
     }
   if(stopDist <= 0) { why = "sizing: stopDistance 0 (SL provider kosong & slFallbackPoints off)"; return(0); }

   double tv = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
   double ts = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
   if(ts <= 0 || tv <= 0) { why = "sizing: tickValue/tickSize broker tidak valid"; return(0); }
   double perUnitPerLot = tv / ts;

   double riskAmount = basisVal * s.riskPct / 100.0;
   double rawLots = riskAmount / (stopDist * perUnitPerLot);
   if(rawLots <= 0) { why = "sizing: rawLots <= 0"; return(0); }

   double step = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   double minL  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxL  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double limL  = SymbolInfoDouble(sym, SYMBOL_VOLUME_LIMIT);
   if(step <= 0) step = 0.01;
   if(minL  <= 0) minL = step;

   // Dibulatkan SELALU ke bawah - tidak pernah ke atas (aturan tetap PRD 4.1).
   double lots = MathFloor(NormalizeDouble(rawLots / step, 8)) * step;
   lots = NormalizeDouble(lots, 8);

   // clamp: minLot <= lots <= min(maxLotCap, VOLUME_MAX)
   double hi = maxL;
   if(s.maxLotCap > 0 && s.maxLotCap < hi) hi = s.maxLotCap;
   if(lots > hi) lots = MathFloor(NormalizeDouble(hi / step, 8)) * step;

   // Batas fisik broker: VOLUME_LIMIT dibagi jumlah posisi sejenis (PRD 4.1 no.5).
   if(limL > 0)
     {
      int sameSide = 0;
      PosInfo own[];
      int n = CollectOwnPositions(own);
      for(int i = 0; i < n; i++)
         if(own[i].symbol == sym && own[i].side == side) sameSide++;
      double allowed = limL / (double)(sameSide + 1);
      if(allowed < lots) lots = MathFloor(NormalizeDouble(allowed / step, 8)) * step;
     }

   if(lots < minL)
     {
      if(!s.allowMinLotFallback)
        {
         why = StringFormat("sizing: lot %.4f < minLot %.4f (allowMinLotFallback OFF)", lots, minL);
         return(0);
        }
      lots = minL;
     }

   // Validasi margin: butuh <= ACCOUNT_MARGIN_FREE x 0.8 (PRD 4.1 no.6).
   ENUM_ORDER_TYPE ot = (side > 0) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double px = (side > 0) ? SymbolInfoDouble(sym, SYMBOL_ASK) : SymbolInfoDouble(sym, SYMBOL_BID);
   double margin = 0;
   if(!OrderCalcMargin(ot, sym, lots, px, margin))
     { why = "sizing: OrderCalcMargin gagal"; return(0); }
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(margin > freeMargin * 0.8)
     {
      why = StringFormat("insufficient margin (butuh %.2f, tersedia %.2f)", margin, freeMargin);
      return(0);
     }

   riskAmountOut = stopDist * lots * perUnitPerLot;
   stopDistOut   = stopDist;
   return(lots);
  }

//====================================================================
// 13. EKSEKUSI CLIENT
//====================================================================
// Clamp SL/TP ke jarak minimum broker (SYMBOL_TRADE_STOPS_LEVEL).
// Dipakai saat retcode 10016 INVALID_STOPS (PRD 6.5.6): clamp lalu retry 1x.
bool ClampStops(const string sym, const int side, double &sl, double &tp)
  {
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   long stopsLv  = SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL);
   long freezeLv = SymbolInfoInteger(sym, SYMBOL_TRADE_FREEZE_LEVEL);
   double minDist = (double)MathMax(stopsLv, freezeLv) * point;
   if(minDist <= 0) return(false);

   double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
   double bid = SymbolInfoDouble(sym, SYMBOL_BID);
   bool changed = false;

   if(side > 0)
     {
      if(sl > 0 && bid - sl < minDist) { sl = NormalizeDouble(bid - minDist, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS)); changed = true; }
      if(tp > 0 && tp - ask < minDist) { tp = NormalizeDouble(ask + minDist, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS)); changed = true; }
     }
   else
     {
      if(sl > 0 && sl - ask < minDist) { sl = NormalizeDouble(ask + minDist, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS)); changed = true; }
      if(tp > 0 && bid - tp < minDist) { tp = NormalizeDouble(bid - minDist, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS)); changed = true; }
     }
   return(changed);
  }

double SlippagePoints(const string sym, const double requested, const double filled)
  {
   double pt = SymbolInfoDouble(sym, SYMBOL_POINT);
   if(pt <= 0) return(0);
   return(MathAbs(filled - requested) / pt);
  }

// Ack delivery ke copy_deliveries (PRD 6.2). status: executed|skipped|failed.
void AckDelivery(const string id, const string status, const string reason,
                 const long clientTicket, const double lots, const double fillPrice,
                 const double slippage, const double riskAmount, const double riskPct)
  {
   if(StringLen(id) == 0) return;
   string body = "{";
   body += "\"status\":" + JsonStr(status);
   if(status == "skipped")      body += ",\"skip_reason\":" + JsonStr(reason);
   if(status == "failed")       body += ",\"fail_reason\":" + JsonStr(reason);
   if(clientTicket > 0)         body += ",\"client_ticket\":" + IntegerToString(clientTicket);
   if(fillPrice > 0)            body += ",\"fill_price\":" + JsonNum(fillPrice);
   if(slippage >= 0 && fillPrice > 0) body += ",\"slippage_points\":" + JsonNum(slippage);
   if(lots > 0)                 body += ",\"lots\":" + JsonNum(lots);
   if(riskAmount > 0)           body += ",\"risk_amount\":" + JsonNum(riskAmount);
   if(riskPct > 0)              body += ",\"risk_pct\":" + JsonNum(riskPct);
   body += ",\"ea_balance\":" + JsonNum(AccountInfoDouble(ACCOUNT_BALANCE));
   body += ",\"ea_equity\":" + JsonNum(AccountInfoDouble(ACCOUNT_EQUITY));
   body += ",\"executed_at\":" + JsonStr(IsoUtc(TimeCurrent()));
   body += "}";

   string resp = "";
   int code = HttpPatch("copy_deliveries?id=eq." + id, body, resp);
   if(code != 200 && code != 204)
      Print("ITJ: ack delivery ", id, " gagal (HTTP ", code, ")");
  }

// --- OPEN (PRD 6.1) ---
void HandleOpen(const Delivery &d, const LinkSettings &s)
  {
   // Daftar simbol di web app ditulis dengan nama PROVIDER, jadi guard memakai
   // nama itu; eksekusinya memakai nama yang ada di broker client.
   string why = "";
   if(!GuardSymbol(s, d.symbol, why)) { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }

   string sym = ResolveClientSymbol(d.symbol);
   if(StringLen(sym) == 0)
     {
      AckDelivery(d.id, "skipped",
         "simbol " + d.symbol + " tidak ada di broker client ini dan tidak ada padanannya. "
         "Isi input SymbolMap (mis. " + d.symbol + "=NAMA_DI_BROKER) atau nyalakan AutoResolveSymbol",
         0,0,0,0,0,0);
      return;
     }

   if(!GuardSession(s, why))          { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardSpread(s, sym, why))      { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardMaxPositions(s, why))     { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardMaxPerSymbol(s, sym, why)){ AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardAntiHedge(s, sym, d.side, why)) { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardMaxTradesPerDay(s, why))  { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardDailyLoss(s, why))        { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardDailyProfit(s, why))      { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardDrawdown(s, why))         { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardFailStreak(s, why))       { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }
   if(!GuardEntryDeviation(s, sym, d.side, d.entry, why)) { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }

   double riskAmount = 0, stopDist = 0;
   double lots = ComputeLots(s, sym, d.side, d.entry, d.sl, riskAmount, stopDist, why);
   if(lots <= 0) { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }

   if(!GuardTotalRisk(s, sym, d.side, riskAmount, why))
     { AckDelivery(d.id, "skipped", why, 0,0,0,0,0,0); return; }

   // SL/TP yang dipasang:
   //  - SL provider dipakai apa adanya kalau ada.
   //  - SL provider kosong -> pakai slFallbackPoints milik client (PRD 6.5).
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double px = (d.side > 0) ? SymbolInfoDouble(sym, SYMBOL_ASK) : SymbolInfoDouble(sym, SYMBOL_BID);
   // px = harga pasar client saat ini, dipakai sebagai jangkar supaya JARAK SL/TP
   // provider terjaga berapa pun selisih harga antar broker.
   double sl = 0, tp = 0;
   if(d.sl > 0) sl = NormalizeDouble(LevelForClient(d.entry, d.sl, px, SlTpMode == SLTP_ABSOLUTE), digits);
   else if(s.slFallbackPoints > 0)
      sl = NormalizeDouble(d.side > 0 ? px - s.slFallbackPoints * point : px + s.slFallbackPoints * point, digits);
   if(s.copyTp && d.tp > 0) tp = NormalizeDouble(LevelForClient(d.entry, d.tp, px, SlTpMode == SLTP_ABSOLUTE), digits);

   long mag = ClientMagicFor(d.providerId);
   string cmt = PositionComment(d.providerPositionId);
   if(StringLen(cmt) > 31) cmt = StringSubstr(cmt, 0, 31);

   if(DebugDryRun)
     {
      Print("ITJ[dryrun]: OPEN ", sym, " side=", d.side, " lots=", DoubleToString(lots,2),
            " sl=", DoubleToString(sl, digits), " tp=", DoubleToString(tp, digits));
      AckDelivery(d.id, "executed", "DebugDryRun: tidak ada order dikirim", 0, lots, px, 0, riskAmount, s.riskPct);
      return;
     }

   g_trade.SetExpertMagicNumber(mag);
   g_trade.SetDeviationInPoints((ulong)MathMax(1, s.maxSlippagePoints > 0 ? s.maxSlippagePoints : s.deviationPoints));
   g_trade.SetTypeFillingBySymbol(sym);

   bool ok = false;
   for(int attempt = 0; attempt <= ITJ_RETRY_PRICE; attempt++)
     {
      bool r;
      if(d.side > 0) r = g_trade.Buy(lots, sym, 0.0, sl, tp, cmt);
      else           r = g_trade.Sell(lots, sym, 0.0, sl, tp, cmt);
      uint rc = g_trade.ResultRetcode();
      if(r && (rc == TRADE_RETCODE_DONE || rc == TRADE_RETCODE_DONE_PARTIAL || rc == TRADE_RETCODE_PLACED))
        { ok = true; break; }

      // PRD 8.3: INVALID_STOPS saat OPEN -> skip (bukan retry clamp).
      if(rc == TRADE_RETCODE_INVALID_STOPS)
        {
         AckDelivery(d.id, "skipped",
                     StringFormat("INVALID_STOPS saat open (SL/TP terlalu dekat, retcode %u)", rc),
                     0, 0, 0, 0, 0, 0);
         g_failStreak++;
         return;
        }
      if(rc == TRADE_RETCODE_NO_MONEY)
        {
         AckDelivery(d.id, "skipped", "insufficient margin (TRADE_RETCODE_NO_MONEY)", 0,0,0,0,0,0);
         return;
        }
      if(rc == TRADE_RETCODE_PRICE_CHANGED || rc == TRADE_RETCODE_PRICE_OFF || rc == TRADE_RETCODE_REQUOTE)
        {
         Print("ITJ: requote, retry harga terbaru (attempt ", attempt, ")");
         px = (d.side > 0) ? SymbolInfoDouble(sym, SYMBOL_ASK) : SymbolInfoDouble(sym, SYMBOL_BID);
         continue;
        }
      break;
     }

   if(!ok)
     {
      g_failStreak++;
      AckDelivery(d.id, "failed",
                  StringFormat("OrderSend gagal, retcode %u (%s)", g_trade.ResultRetcode(),
                               g_trade.ResultRetcodeDescription()),
                  0, 0, 0, 0, 0, 0);
      NotifyFailStreak(g_failStreak);
      return;
     }

   long ticket = (long)g_trade.ResultDeal();
   double fill = g_trade.ResultPrice();
   // Ticket posisi (bukan deal) lebih berguna untuk modify/close nanti.
   long posTicket = PositionTicketFromDeal(fill, sym, mag);
   if(posTicket > 0) ticket = posTicket;

   g_failStreak = 0;
   AckDelivery(d.id, "executed", "", ticket, lots, fill,
               SlippagePoints(sym, px, fill), riskAmount, s.riskPct);
   Print("ITJ: OPEN ", sym, " ", (d.side > 0 ? "BUY" : "SELL"), " ", DoubleToString(lots, 2),
         " lot @ ", DoubleToString(fill, digits), " ticket=", ticket);
  }

// Ambil ticket posisi hasil deal terakhir dengan magic+symbol tertentu.
long PositionTicketFromDeal(const double dealPrice, const string sym, const long mag)
  {
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != sym) continue;
      if((long)PositionGetInteger(POSITION_MAGIC) != mag) continue;
      if(MathAbs(PositionGetDouble(POSITION_PRICE_OPEN) - dealPrice) < 0.0000001) return((long)t);
     }
   return(0);
  }

void NotifyFailStreak(const int streak)
  {
   if(streak >= 3)
      Print("ITJ: PAUSE - ", streak, " eksekusi gagal berturut-turut. Periksa log & koneksi broker.");
  }

// --- MODIFY_SL / MODIFY_TP (PRD 6.5) ---
// Prinsip: kirim pasangan (sl, tp) LENGKAP. MQL5 PositionModify selalu menimpa
// keduanya, dan nilai 0 berarti MENGHAPUS - jadi kita tidak boleh mengirim
// hanya satu sisi (kalau tidak, TP client terhapus tanpa sengaja).
void HandleModify(const Delivery &d, const LinkSettings &s)
  {
   PosInfo p;
   if(!FindClientPositionByPid(d.providerPositionId, p))
     {
      // Provider open tapi client belum punya posisi -> missed, tidak dikejar
      // (PRD 6.4), kecuali followOnReconnect ON.
      if(s.followOnReconnect)
        {
         Delivery d2 = d;
         d2.kind = "OPEN";
         HandleOpen(d2, s);
         return;
        }
      AckDelivery(d.id, "skipped", "perintah MODIFY diabaikan: client tidak punya posisi (missed)", 0,0,0,0,0,0);
      return;
     }

   int digits = (int)SymbolInfoInteger(p.symbol, SYMBOL_DIGITS);
   // Jangkar = entry posisi client sendiri (bukan harga provider), supaya geseran
   // SL/TP provider dipindah dengan jarak yang setara dan risiko tetap seperti
   // yang dipilih client. Termasuk saat provider memindahkan SL ke titik break-even:
   // jaraknya nol -> SL client juga di entry-nya sendiri.
   double newSl = 0, newTp = 0;
   if(d.sl > 0) newSl = NormalizeDouble(LevelForClient(d.entry, d.sl, p.entry, SlTpMode == SLTP_ABSOLUTE), digits);
   if(s.copyTp && d.tp > 0) newTp = NormalizeDouble(LevelForClient(d.entry, d.tp, p.entry, SlTpMode == SLTP_ABSOLUTE), digits);

   // Idempotent (PRD 6.5.3): state di client sudah sama -> ack executed tanpa aksi.
   if(MathAbs(newSl - p.sl) < SymbolInfoDouble(p.symbol, SYMBOL_POINT) / 2.0 &&
      MathAbs(newTp - p.tp) < SymbolInfoDouble(p.symbol, SYMBOL_POINT) / 2.0)
     {
      AckDelivery(d.id, "executed", "sudah sesuai provider", p.ticket, 0, 0, 0, 0, 0);
      return;
     }

   // Throttle penerapan (PRD 6.5.4) - state akhir tetap disamakan rekonsiliasi.
   if(TimeCurrent() - ThrottleLast(p.ticket) < s.modifyThrottleSeconds)
     {
      AckDelivery(d.id, "skipped", "throttle: modify terlalu sering, ditunda", p.ticket, 0,0,0,0,0);
      return;
     }

   if(DebugDryRun)
     {
      Print("ITJ[dryrun]: MODIFY ticket=", p.ticket, " sl=", DoubleToString(newSl, digits),
            " tp=", DoubleToString(newTp, digits));
      AckDelivery(d.id, "executed", "DebugDryRun", p.ticket, 0,0,0,0,0);
      return;
     }

   g_trade.SetExpertMagicNumber(p.magic);
   bool ok = g_trade.PositionModify((ulong)p.ticket, newSl, newTp);
   uint rc = g_trade.ResultRetcode();

   // NO_CHANGES = no-op, anggap sukses (PRD 6.5.6).
   if(rc == TRADE_RETCODE_NO_CHANGES)
     {
      ThrottleTouch(p.ticket, TimeCurrent());
      AckDelivery(d.id, "executed", "no changes", p.ticket, 0,0,0,0,0);
      return;
     }

   // INVALID_STOPS: clamp ke jarak minimum broker lalu retry 1x.
   if(!ok && rc == TRADE_RETCODE_INVALID_STOPS)
     {
      double csl = newSl, ctp = newTp;
      if(ClampStops(p.symbol, p.side, csl, ctp))
        {
         Print("ITJ: INVALID_STOPS -> clamp sl=", DoubleToString(csl, digits),
               " tp=", DoubleToString(ctp, digits), " retry 1x");
         ok = g_trade.PositionModify((ulong)p.ticket, csl, ctp);
         rc = g_trade.ResultRetcode();
         if(ok || rc == TRADE_RETCODE_NO_CHANGES)
           {
            ThrottleTouch(p.ticket, TimeCurrent());
            Print("ITJ: MODIFY diterapkan setelah clamp (posisi terlindungi)");
            AckDelivery(d.id, "executed", "clamped ke jarak minimum broker", p.ticket,0,0,0,0,0);
            return;
           }
        }
      // Masih gagal: posisi client berpotensi tidak terlindungi.
      Print("ITJ: PERINGATAN - posisi client tidak terlindungi (MODIFY gagal, retcode ", rc, ")");
      AckDelivery(d.id, "failed", "invalid stops setelah clamp - posisi client tidak terlindungi", p.ticket,0,0,0,0,0);
      return;
     }

   // POSITION_CLOSED: posisi client sudah tutup (mis. SL fallback kena lebih dulu).
   // Jangan tandai gagal - picu rekonsiliasi (PRD 6.5.6).
   if(rc == TRADE_RETCODE_POSITION_CLOSED)
     {
      Print("ITJ: posisi client sudah tertutup saat MODIFY -> picu rekonsiliasi");
      g_dirty = true;
      AckDelivery(d.id, "executed", "posisi client sudah tertutup (10036) - rekonsiliasi dipicu", p.ticket,0,0,0,0,0);
      return;
     }

   if(ok)
     {
      ThrottleTouch(p.ticket, TimeCurrent());
      AckDelivery(d.id, "executed", "sl/tp disinkronkan dari provider", p.ticket,0,0,0,0,0);
      // Risiko aktual bisa berubah karena SL berubah (PRD 6.5.5) - cukup dicatat.
      ReportRiskDrift(p, newSl, s);
      return;
     }

   AckDelivery(d.id, "failed",
               StringFormat("PositionModify gagal, retcode %u (%s)", rc, g_trade.ResultRetcodeDescription()),
               p.ticket, 0,0,0,0,0);
  }

// PRD 6.5.5: lot tidak dihitung ulang saat MODIFY, jadi risiko % aktual bergerak.
// Default `warn`: SL tetap ditiru apa adanya + baris log.
void ReportRiskDrift(const PosInfo &p, const double newSl, const LinkSettings &s)
  {
   if(newSl <= 0) return;
   double tv = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_VALUE);
   double ts = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_SIZE);
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   if(ts <= 0 || bal <= 0) return;
   double newRisk = MathAbs(p.entry - newSl) * p.volume * (tv / ts);
   double newPct = newRisk / bal * 100.0;
   if(newPct > s.riskPct * 1.2)
     {
      Print(StringFormat("ITJ: SL provider menjauh; risiko posisi naik %.2f%% -> %.2f%% (%s)",
                         s.riskPct, newPct, s.riskBreachAction));
      if(StringCompare(s.riskBreachAction, "trim", false) == 0 && newPct > 0)
        {
         double target = p.volume * (s.riskPct / newPct);
         double step = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_STEP);
         double closeVol = MathFloor(NormalizeDouble((p.volume - target) / step, 8)) * step;
         double minL = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_MIN);
         if(closeVol >= minL)
           {
            g_trade.PositionClosePartial((ulong)p.ticket, closeVol);
            Print("ITJ: trim partial close ", DoubleToString(closeVol, 2), " lot (risiko kembali ke ",
                  DoubleToString(s.riskPct, 2), "%)");
           }
        }
     }
  }

// --- PARTIAL_CLOSE (PRD 6.1) ---
// Lot client = proporsi volume provider, dibulatkan ke bawah ke volume step.
void HandlePartialClose(const Delivery &d, const LinkSettings &s)
  {
   PosInfo p;
   if(!FindClientPositionByPid(d.providerPositionId, p))
     { AckDelivery(d.id, "skipped", "perintah PARTIAL_CLOSE: client tidak punya posisi", 0,0,0,0,0,0); return; }

   if(d.oldVolume <= 0 || d.volume <= 0)
     { AckDelivery(d.id, "skipped", "payload PARTIAL_CLOSE tidak lengkap (volume)", 0,0,0,0,0,0); return; }

   double ratio = d.volume / d.oldVolume;      // sisa proporsi provider
   double step  = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_STEP);
   double minL  = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_MIN);
   if(step <= 0) step = 0.01;

   double targetLots = MathFloor(NormalizeDouble(p.volume * ratio / step, 8)) * step;
   double closeLots  = p.volume - targetLots;
   closeLots = MathFloor(NormalizeDouble(closeLots / step, 8)) * step;

   if(closeLots < minL || closeLots <= 0)
     {
      AckDelivery(d.id, "skipped",
         StringFormat("partial close dibulatkan ke 0 (%.4f < minLot %.4f) - lot terlalu kecil untuk dibagi",
                      closeLots, minL), p.ticket, 0,0,0,0,0);
      return;
     }
   if(closeLots > p.volume) closeLots = p.volume;

   if(DebugDryRun)
     {
      AckDelivery(d.id, "executed", "DebugDryRun: partial close tidak dikirim", p.ticket, closeLots,0,0,0,0);
      return;
     }

   g_trade.SetExpertMagicNumber(p.magic);
   if(g_trade.PositionClosePartial((ulong)p.ticket, closeLots))
     {
      AckDelivery(d.id, "executed", "", p.ticket, closeLots, g_trade.ResultPrice(), 0, 0, 0);
      Print("ITJ: PARTIAL_CLOSE ", p.symbol, " ", DoubleToString(closeLots, 2), " lot (sisa ",
            DoubleToString(p.volume - closeLots, 2), ")");
     }
   else
     {
      uint rc = g_trade.ResultRetcode();
      if(rc == TRADE_RETCODE_POSITION_CLOSED)
        { g_dirty = true; AckDelivery(d.id, "executed", "posisi sudah tertutup (10036)", p.ticket,0,0,0,0,0); }
      else
         AckDelivery(d.id, "failed",
            StringFormat("PositionClosePartial gagal, retcode %u (%s)", rc, g_trade.ResultRetcodeDescription()),
            p.ticket, 0,0,0,0,0);
     }
  }

// --- CLOSE (PRD 6.1 + 6.2) ---
// CLOSE TIDAK PERNAH expire: selalu diproses, berapa pun telatnya. Karena itu
// CLOSE juga dieksekusi dari cache config saat server tidak terjangkau.
void HandleClose(const Delivery &d, const LinkSettings &s)
  {
   PosInfo p;
   if(!FindClientPositionByPid(d.providerPositionId, p))
     { AckDelivery(d.id, "executed", "tidak ada posisi client untuk ditutup", 0,0,0,0,0,0); return; }

   if(DebugDryRun)
     { AckDelivery(d.id, "executed", "DebugDryRun: close tidak dikirim", p.ticket,0,0,0,0,0); return; }

   g_trade.SetExpertMagicNumber(p.magic);
   if(g_trade.PositionClose((ulong)p.ticket))
     {
      AckDelivery(d.id, "executed", "", p.ticket, p.volume, g_trade.ResultPrice(), 0, 0, 0);
      Print("ITJ: CLOSE ", p.symbol, " ticket=", p.ticket, " (",
            DoubleToString(p.volume, 2), " lot)");
     }
   else
     {
      uint rc = g_trade.ResultRetcode();
      if(rc == TRADE_RETCODE_POSITION_CLOSED)
         AckDelivery(d.id, "executed", "posisi sudah tertutup", p.ticket,0,0,0,0,0);
      else
         AckDelivery(d.id, "failed",
            StringFormat("PositionClose gagal, retcode %u (%s)", rc, g_trade.ResultRetcodeDescription()),
            p.ticket, 0,0,0,0,0);
     }
  }

// KLASIFIKASI & DISPATCH satu delivery.
void ProcessDelivery(const string row)
  {
   Delivery d;
   d.id         = JsonGetStr(row, "id");
   string ev    = JsonRaw(row, "copy_events");
   string pay   = JsonRaw(ev, "payload");     // payload jsonb: state LENGKAP
   if(StringLen(pay) < 3) pay = JsonRaw(row, "payload"); // fallback: payload rata

   d.kind           = JsonGetStr(ev, "kind");
   if(StringLen(d.kind) == 0) d.kind = JsonGetStr(row, "kind");
   d.seq            = JsonGetInt(ev, "seq");
   d.providerId     = JsonGetStr(ev, "provider_id");
   d.providerPositionId = JsonGetStr(ev, "provider_position_id");
   if(StringLen(d.providerPositionId) == 0) d.providerPositionId = JsonGetStr(pay, "provider_position_id");
   if(StringLen(d.providerId) == 0) d.providerId = JsonGetStr(row, "provider_id");
   if(StringLen(d.id) == 0) { Print("ITJ: delivery tanpa id, dilewati"); return; }
   if(StringLen(d.kind) == 0) { AckDelivery(d.id, "skipped", "kind event kosong", 0,0,0,0,0,0); return; }

   d.symbol = JsonGetStr(pay, "symbol");
   string sideStr = JsonGetStr(pay, "side", "buy");
   d.side   = (StringCompare(sideStr, "sell", false) == 0) ? -1 : 1;
   d.entry  = JsonGetNum(pay, "entry");
   d.sl     = JsonGetNum(pay, "sl");
   d.tp     = JsonGetNum(pay, "tp");
   d.volume = JsonGetNum(pay, "volume");
   d.oldVolume = JsonGetNum(pay, "old_volume");
   if(StringLen(d.symbol) == 0) d.symbol = JsonGetStr(pay, "provider_symbol");

   LinkSettings s;
   LinkForProvider(d.providerId, s);

   // Fail-closed: link yang tidak termuat (revoked / di luar cache / baru saja
   // dipause sebelum EA menyegarkan konfigurasi) TIDAK dieksekusi.
   if(StringLen(s.linkId) == 0)
     { AckDelivery(d.id, "skipped", "copy_link tidak aktif atau tidak ditemukan di terminal ini - delivery dilewati (fail-closed)", 0,0,0,0,0,0); return; }

   // Kill switch & pause: posisi existing dibiarkan (PRD 5).
   if(s.killSwitch)
     { AckDelivery(d.id, "skipped", "kill switch aktif di web app - EA berhenti membuka posisi", 0,0,0,0,0,0); return; }
   if(s.paused)
     { AckDelivery(d.id, "skipped", "copy_link dalam status paused", 0,0,0,0,0,0); return; }

   Print("ITJ: delivery ", d.kind, " ", d.symbol, " (seq=", d.seq, ")");

   if(d.kind == "OPEN")                     HandleOpen(d, s);
   else if(d.kind == "MODIFY_SL" || d.kind == "MODIFY_TP") HandleModify(d, s);
   else if(d.kind == "PARTIAL_CLOSE")       HandlePartialClose(d, s);
   else if(d.kind == "CLOSE")               HandleClose(d, s);
   else if(d.kind == "CLOSE_ALL")           HandleCloseAll(s);
   else AckDelivery(d.id, "skipped", "kind tidak dikenal: " + d.kind, 0,0,0,0,0,0);
  }

// CLOSE_ALL: tombol di app provider (PRD 6.1).
void HandleCloseAll(const LinkSettings &s)
  {
   PosInfo own[];
   int n = CollectOwnPositions(own);
   long mag = ClientMagicFor(s.providerId);
   for(int i = 0; i < n; i++)
     {
      if(own[i].magic != mag) continue;
      g_trade.SetExpertMagicNumber(mag);
      if(!g_trade.PositionClose((ulong)own[i].ticket))
         Print("ITJ: CLOSE_ALL gagal untuk ticket ", own[i].ticket, " retcode ", g_trade.ResultRetcode());
     }
  }

//====================================================================
// 14. REKONSILIASI (PRD 6.4) - ini penyelamat, bukan fitur tambahan
//====================================================================
// Bandingkan posisi client (milik EA ini) dengan provider_positions.
//   provider tutup & client masih open   -> CLOSE client sekarang
//   provider open & client tidak punya   -> tandai missed (tidak dikejar)
//   keduanya open                        -> sinkronkan sl/tp
// Posisi yang BUKAN milik EA ini tidak pernah disentuh.
void Reconcile()
  {
   for(int li = 0; li < ArraySize(g_links); li++)
     {
      LinkSettings s = g_links[li];
      if(StringLen(s.providerId) == 0) continue;
      if(s.killSwitch) continue; // EA berhenti mengelola link yang di-kill

      string resp = "";
      int code = HttpGet("provider_positions?status=eq.open&select=provider_ticket,provider_position_id,symbol,side,entry,sl,tp,volume,revision,provider_id",
                         resp);
      if(code != 200)
        {
         Print("ITJ: rekonsiliasi dilewati - provider_positions tidak terbaca (HTTP ", code,
               "). Tidak ada posisi baru dibuka selama server tidak terjangkau (fail-closed).");
         return;
        }

      string rows[];
      int rn = JsonSplitArray(resp, rows);

      PosInfo own[];
      int on = CollectOwnPositions(own);
      long mag = ClientMagicFor(s.providerId);
      bool matched[];   // penanda: baris provider ini sudah ketemu pasangannya
      ArrayResize(matched, on);

      // 1) Untuk setiap posisi provider: cari pasangan client lewat comment.
      for(int i = 0; i < rn; i++)
        {
         string pid = JsonGetStr(rows[i], "provider_position_id");
         if(StringLen(pid) == 0) pid = JsonGetStr(rows[i], "id");
         string pidFor = StringLen(pid) > 0 ? pid : JsonGetStr(rows[i], "provider_ticket");
         double pSl = JsonGetNum(rows[i], "sl");
         double pTp = JsonGetNum(rows[i], "tp");

         PosInfo cp;
         bool haveClient = FindClientPositionByPid(pidFor, cp);
         if(!haveClient)
           {
            // Provider open, client tidak punya posisi -> missed. TIDAK dikejar
            // kecuali followOnReconnect = ON (PRD 6.4 / guard).
            if(!s.followOnReconnect)
              {
               if(!g_missedLogged)
                 {
                  Print("ITJ: provider ", StringSubstr(s.providerId,0,8), " punya posisi tanpa pasangan client -> missed (tidak dikejar)");
                  g_missedLogged = true;
                 }
              }
            continue;
           }
         if(cp.magic != mag) continue;

         for(int k = 0; k < on; k++)
            if(own[k].ticket == cp.ticket) matched[k] = true;

         // Sinkronkan sl/tp kalau drift (event MODIFY yang hilang / throttle).
         int digits = (int)SymbolInfoInteger(cp.symbol, SYMBOL_DIGITS);
         double pt = SymbolInfoDouble(cp.symbol, SYMBOL_POINT);
         double wantSl = NormalizeDouble(pSl, digits);
         double wantTp = NormalizeDouble(s.copyTp ? pTp : 0, digits);
         if(MathAbs(wantSl - cp.sl) > pt / 2.0 || MathAbs(wantTp - cp.tp) > pt / 2.0)
           {
            if(!DebugDryRun)
              {
               g_trade.SetExpertMagicNumber(cp.magic);
               if(!g_trade.PositionModify((ulong)cp.ticket, wantSl, wantTp))
                 {
                  uint rc = g_trade.ResultRetcode();
                  if(rc == TRADE_RETCODE_INVALID_STOPS)
                    {
                     double a1 = wantSl, a2 = wantTp;
                     if(ClampStops(cp.symbol, cp.side, a1, a2))
                        g_trade.PositionModify((ulong)cp.ticket, a1, a2);
                    }
                  else if(rc != TRADE_RETCODE_NO_CHANGES && rc != TRADE_RETCODE_POSITION_CLOSED)
                     Print("ITJ: rekonsiliasi modify gagal ticket ", cp.ticket, " retcode ", rc);
                 }
              }
            Print("ITJ: rekonsiliasi - sl/tp ", cp.symbol, " disinkronkan ke state provider");
           }
        }

      // 2) Posisi client milik EA ini yang TIDAK punya pasangan provider terbuka
      //    -> provider sudah close tapi client masih open: CLOSE sekarang.
      //    Ini menutup celah exit yang terlewat (PRD 6.4).
      for(int k = 0; k < on; k++)
        {
         if(matched[k]) continue;
         if(own[k].magic != mag) continue;
         Print("ITJ: rekonsiliasi - provider sudah close, client masih open ticket ",
               own[k].ticket, " -> CLOSE");
         if(!DebugDryRun)
           {
            g_trade.SetExpertMagicNumber(own[k].magic);
            if(!g_trade.PositionClose((ulong)own[k].ticket))
              {
               uint rc = g_trade.ResultRetcode();
               if(rc != TRADE_RETCODE_POSITION_CLOSED)
                  Print("ITJ: rekonsiliasi close gagal ticket ", own[k].ticket, " retcode ", rc);
              }
           }
        }

      // 3) maxHoldMinutes: anti posisi yatim kalau provider hilang (PRD 5).
      if(s.maxHoldMinutes > 0)
        {
         for(int k = 0; k < on; k++)
           {
            if(own[k].magic != mag) continue;
            if(TimeCurrent() - own[k].opened > (datetime)s.maxHoldMinutes * 60)
              {
               Print("ITJ: maxHoldMinutes terlampaui untuk ticket ", own[k].ticket, " -> close paksa");
               if(!DebugDryRun)
                 {
                  g_trade.SetExpertMagicNumber(own[k].magic);
                  g_trade.PositionClose((ulong)own[k].ticket);
                 }
              }
           }
        }
     }
  }

//====================================================================
// 15. LOOP CLIENT
//====================================================================
// Pola `rev` (PRD 2.2): cek murah dulu (~60 byte), payload penuh hanya kalau berubah.

bool FeedRevChanged()
  {
   string resp = "";
   int code = HttpGet("ea_feed?select=rev&limit=1", resp);
   if(code != 200) return(true); // server tidak terbaca: jangan blokir CLOSE dari cache
   string rows[];
   if(JsonSplitArray(resp, rows) <= 0) return(false);
   long rev = JsonGetInt(rows[0], "rev", -1);
   if(rev < 0) return(false);
   if(rev != g_lastRev) { g_lastRev = rev; return(true); }
   return(false);
  }

void ClientTick(bool serverReachable)
  {
   if(serverReachable && FeedRevChanged())
     {
      string resp = "";
      int code = HttpGet("copy_deliveries?status=eq.pending&select=id,event_id,status,provider_id,"
                         "copy_events(id,kind,seq,provider_id,provider_position_id,payload,created_at)", resp);
      if(code == 200)
        {
         string rows[];
         int n = JsonSplitArray(resp, rows);
         if(n > 0) Print("ITJ: ", n, " delivery pending");
         for(int i = 0; i < n; i++)
            ProcessDelivery(rows[i]);
        }
     }
  }

//====================================================================
// 16. HEARTBEAT
//====================================================================
void Heartbeat()
  {
   string body = "{";
   body += "\"last_seen\":" + JsonStr(IsoUtc(TimeCurrent()));
   body += ",\"terminal_build\":" + JsonStr(IntegerToString(TerminalInfoInteger(TERMINAL_BUILD)));
   body += ",\"account_login\":" + JsonStr(IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)));
   body += ",\"account_server\":" + JsonStr(AccountInfoString(ACCOUNT_SERVER));
   body += ",\"is_demo\":" + BoolStr(AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);
   body += ",\"leverage\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE));
   body += "}";
   // ea_tokens di-identifikasi server dari header x-ea-token; EA tidak pernah
   // mengirim token mentah ke tabel (PRD 7.4).
   string resp = "";
   int code = HttpPatch("ea_tokens?token_hash=not.is.null", body, resp);
   if(code != 200 && code != 204)
      Print("ITJ: heartbeat gagal (HTTP ", code, ")");
  }

//====================================================================
// 17. EVENT HANDLERS
//====================================================================
int OnInit()
  {
   if(StringLen(SupabaseUrl) == 0 || StringLen(AnonKey) == 0 || StringLen(EaToken) == 0)
     {
      Print("ITJ: SupabaseUrl / AnonKey / EaToken wajib diisi. EA berhenti.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   if(PollSeconds < 1)   g_pollSec = 1;  else g_pollSec = PollSeconds;
   if(SnapshotSeconds < 5) g_snapSec = 5; else g_snapSec = SnapshotSeconds;

   g_isProvider = (Role == ROLE_PROVIDER || Role == ROLE_BOTH);
   g_isClient   = (Role == ROLE_CLIENT   || Role == ROLE_BOTH);

   if(g_isClient && LocalRiskPctCap > 100)
     {
      Print("ITJ: LocalRiskPctCap > 100 tidak wajar. EA berhenti.");
      return(INIT_PARAMETERS_INCORRECT);
     }

   g_trade.SetAsyncMode(false);
   g_trade.SetMarginMode();
   g_trade.LogLevel(LOG_LEVEL_ERRORS);

   LoadSeq();
   g_equityPeak = LoadPeak();
   if(g_equityPeak <= 0) g_equityPeak = AccountInfoDouble(ACCOUNT_EQUITY);

   // Cache config dibaca lebih dulu supaya CLOSE dari cache tetap bisa jalan
   // walau server sedang tidak terjangkau (fail-closed, PRD 8.2).
   if(g_isClient)
     {
      if(LoadConfigCache(g_cfgRawJson))
        {
         g_cfgFromFile = true;
         ParseLinksFromRaw(g_cfgRawJson);
        }
      RefreshLinks();
     }

   ArrayResize(g_pPrev, 0);

   EventSetTimer(1); // gate 1 detik: provider diff tiap detik (PRD 6.5.1)

   Print("ITJ: mulai. role=", EnumToString(Role), " provider=", g_isProvider, " client=", g_isClient,
         " magicBase=", Magic, " demo=", (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO));
   Print("ITJ: PERINGATAN - EA ini belum diuji di akun nyata; uji di akun DEMO lebih dulu.");
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   SaveSeq();
   Print("ITJ: berhenti (reason=", reason, ")");
  }

void OnTimer()
  {
   datetime now = TimeCurrent();
   if(now == g_lastTick) return;   // OnTimer bisa dipanggil lebih dari sekali per detik
   g_lastTick = now;

   bool serverOk = true;

   // --- PROVIDER: diff snapshot tiap 1 detik (sumber kebenaran, PRD 6.5.1) ---
   if(g_isProvider)
     {
      if(now - g_lastSnapProv >= g_snapSec || g_dirty)
        {
         ProviderDiff();
         g_dirty = false;
        }
      if(g_lastSnapProv == 0 || now - g_lastSnapProv >= g_snapSec)
        {
         PosInfo cur[];
         int cn = CollectPositions(cur);
         PublishSnapshot(cur, cn);
         g_lastSnapProv = now;
        }
     }

   // --- CLIENT: poll + rekonsiliasi ---
   if(g_isClient)
     {
      RefreshDailyStats();

      if(now - g_lastPoll >= g_pollSec)
        {
         g_lastPoll = now;
         RefreshLinks();
         ClientTick(serverOk);
         Heartbeat();
        }

      if(now - g_lastRecon >= g_snapSec)
        {
         g_lastRecon = now;
         Reconcile();
        }
     }
  }

// PRD 8.2: OnTradeTransaction HANYA menandai dirty. WebRequest blocking dan
// mengganggu konteks trade, jadi publish selalu dilakukan di OnTimer.
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(g_isProvider)
     {
      if(trans.type == TRADE_TRANSACTION_POSITION ||
         trans.type == TRADE_TRANSACTION_DEAL_ADD ||
         trans.type == TRADE_TRANSACTION_DEAL_UPDATE)
         g_dirty = true;
     }
   if(g_isClient)
     {
      // Catat fill sebenarnya untuk slippage / client_positions (PRD 8.2).
      if(trans.type == TRADE_TRANSACTION_DEAL_ADD && trans.deal != 0)
        {
         if(HistoryDealSelect(trans.deal))
           {
            long m = (long)HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
            if(IsOwnMagic(m))
              {
               double price = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
               double vol   = HistoryDealGetDouble(trans.deal, DEAL_VOLUME);
               Print("ITJ: fill tercatat deal=", trans.deal, " price=", DoubleToString(price, 5),
                     " vol=", DoubleToString(vol, 2));
              }
           }
        }
     }
  }

void OnTick()
  {
   // Tidak dipakai. Semua kerja lewat OnTimer supaya satu chart cukup dan
   // hasil tidak bergantung pada ada/tidaknya tick masuk.
  }
//+------------------------------------------------------------------+
