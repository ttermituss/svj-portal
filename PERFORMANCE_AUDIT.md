# SVJ Portál — Performance Audit

**Verze:** 2.7.0 | **Datum auditu:** 2026-03-14
**Celkem problémů:** 24 (8× HIGH, 11× MEDIUM, 5× LOW)

---

## Fáze 1 — Quick wins (databáze + gzip) ⚡

### Chybějící DB indexy

- [x] **[HIGH]** `zavady_historie` — index na `zavada_id` ✓ (existoval `idx_zavady_hist_zavada` z dřívějška)

- [x] **[HIGH]** `zavady_historie` — kompozitní index `(zavada_id, typ)` pro count komentářů ✓ přidán `idx_zavady_hist_zavada_typ` (migrace 038)

- [x] **[HIGH]** `odecty` — index na `meridlo_id` ✓ (existoval `idx_odecty_meridlo` z dřívějška)

  → Migrace `038_performance_indexes.sql` spuštěna ✓

### Komprese a cache headers

- [x] **[MEDIUM]** Apache: `mod_deflate` povolen, gzip pravidla přidána do `.htaccess` ✓ (ověřeno: `Content-Encoding: gzip` na CSS/JS)

- [x] **[MEDIUM]** Apache: `Cache-Control` headers přidány do `.htaccess` ✓ (CSS/JS 30 dní, obrázky 7 dní, HTML must-revalidate, PHP no-store)

- [x] **[MEDIUM]** PHP: output buffering s `ob_gzhandler` přidán do `api/db.php` ✓

---

## Fáze 2 — N+1 query problémy 🗄️

### `api/zavady.php`

- [x] **[HIGH]** N+1: subquery `COUNT(komentary)` → LEFT JOIN + GROUP BY ✓
  - Bylo: 1 main + N subqueries | Teď: **1 dotaz** s `LEFT JOIN zavady_historie` + `COUNT(DISTINCT CASE WHEN h.typ = 'komentar' THEN h.id END)` + `GROUP BY z.id`

### `api/meridla.php`

- [x] **[HIGH]** N+1: 3 subqueries per měřidlo → derived tables s ROW_NUMBER() ✓
  - Bylo: **3N+1 dotazů** (30 měřidel = 91 dotazů) | Teď: **3 dotazy** (main + 2 derived tables s idx_odecty_svj)

### `api/fond_oprav.php`

- [x] **[HIGH]** N+1: subquery `COUNT(prilohy)` → LEFT JOIN + GROUP BY ✓
  - Bylo: 1 main + N subqueries | Teď: **1 dotaz** s `LEFT JOIN fond_prilohy` + `COUNT(DISTINCT p.id)` + `GROUP BY f.id`

### `api/export.php`

- [x] **[MEDIUM]** N+1: correlated subqueries pro jednotky (users, vlastnici_ext) → derived tables ✓
  - Bylo: 1 main + 2N subqueries | Teď: **1 dotaz** se 2 derived tables s GROUP BY
- [x] **[MEDIUM]** N+1: 2 subqueries pro posledni odečet měřidel → derived table s ROW_NUMBER() ✓

---

## Fáze 3 — API a soubory 📂

### Stahování a upload souborů

- [x] **[MEDIUM]** `api/helpers.php` → `serveFile()` — ukončí ob buffering + čte po 64KB chunkách ✓
  - `while (ob_get_level()) ob_end_clean()` + `fread($fp, 65536)` + `flush()`

- [x] **[MEDIUM]** `api/storage_helper.php` → GDrive inline upload — soubory >10MB přeskočeny, sync přes cron ✓
  - `if (filesize($absPath) > 10 * 1024 * 1024) return null;` — zachytí ho background `storageSync()`

- [ ] **[LOW]** `api/storage_helper.php` → `storageDownloadFromGdrive()` — `getContents()` — zatím OK pro SVJ (soubory <10MB), řešit pokud by se objevily větší soubory

### Export PDF/XLSX

- [x] **[MEDIUM]** `api/xlsx_helper.php` — přidán `buildXlsxFile()` (vrací tmpfile path, nezatěžuje RAM) ✓
- [x] **[MEDIUM]** `api/export.php` — PDF i XLSX streamovány přes `serveFile()` + `register_shutdown_function` na cleanup tmpfile ✓
- [x] **[MEDIUM]** `api/export.php` — CSV také flushuje ob buffer před streamem ✓

### Externí API

- [x] **[MEDIUM]** `api/svj_helper.php` — refaktor na sdílený `curlGet()` helper ✓
  - Timeout snížen: 10/15s → **5s** (connect 3s)
  - Duplicitní curl kód odstraněn ze 4 funkcí (`fetchFromAres`, `fetchRuianData`, `fetchRuianBuildingInfo`, `fetchVrRaw`)
  - Chyby logované přes `error_log()`

---

## Fáze 4 — Frontend optimalizace 🖥️

### JavaScript

- [x] **[MEDIUM]** `js/notifikace.js` — Page Visibility API: `startPolling()` / `stopPolling()` + `visibilitychange` event ✓
  - Tab na pozadí → interval zastaven úplně (ne jen přeskočen)
  - Tab zpět → okamžitý `refreshCount()` + restart intervalu

- [x] **[HIGH]** `index.html` — build step přes esbuild ✓
  - `build.sh`: concat 59 JS souborů → esbuild minify → `dist/bundle.min.js`
  - 626KB unminified → **427KB minified → 93KB gzipped** (15× komprese)
  - 59 HTTP requestů → **1 request**
  - Cache busting: `?v=HASH` (md5 z bundle obsahu), hash v index.html při každém buildu
  - Dev: `git checkout index.html` pro reset na 59 separátních souborů

### CSS

- [x] **[LOW]** CSS minifikace — esbuild v `build.sh` ✓
  - 3 soubory → `dist/bundle.min.css` → 16KB → **12KB → 3.4KB gzipped**

- [ ] **[LOW]** Senior téma se načítá pro všechny uživatele — lazy load `theme-senior.css` (nízká priorita, minor win)

### Service Worker

- [ ] **[MEDIUM]** Service Worker — offline cache-first strategie (větší effort, plánovat samostatně)

---

## Fáze 5 — Hardening a doplňky 🔒

- [ ] **[LOW]** Apache: HSTS — `.htaccess` má řádek připravený, odkomentovat po nasazení HTTPS na produkci
  ```apache
  # Odkomentovat po potvrzení HTTPS:
  # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  ```
  → Dev běží na HTTP (svj-portal.local) → nelze aktivovat nyní, **pending HTTPS setup**

- [x] **[LOW]** `api/helpers.php` → `validateUpload()` — extension derivována výhradně z MIME mapy ✓
  - Odstraněna závislost na `$_FILES['name']` (user input)
  - `return is_array($expectedExt) ? reset($expectedExt) : $expectedExt`
  - Double extension attack check zachován

- [ ] **[LOW / WONTFIX]** Rate limiting na všechny POST endpointy — **accepted risk**
  - Všechny POST endpointy jsou za `requireAuth()` → pouze přihlášení vlastníci
  - Existující rate limit chrání auth endpointy (jediné veřejně přístupné)
  - Přidání DB rate limit na každý POST = overhead bez odpovídajícího bezp. přínosu pro SVJ scale

- [x] **[LOW]** `api/fond_ucty.php` — `SELECT *` → explicitní sloupce v list query ✓
  - `fond_rozpocet.php` — již měl explicitní sloupce ✓
  - Zbývající `SELECT *` v kódu jsou single-row PK lookups (detail fetch před update) → legitimní použití, ponecháno

---

## Souhrn priorit

| Priorita | Počet | Co |
|----------|-------|----|
| **HIGH** | 8 | DB indexy, N+1 queries (zavady/meridla/fond), JS minifikace |
| **MEDIUM** | 11 | Gzip, cache headers, serveFile stream, GDrive async, polling, extern. API retry, export chunking, SW |
| **LOW** | 5 | CSS minifikace, SELECT *, HSTS, rate limit rozšíření, upload MIME |

---

## Poznámky

- N+1 v `meridla.php` je nejkritičtější — 30 měřidel = 91 DB dotazů
- DB indexy jsou nejrychlejší win (migrace 038, 30 minut práce)
- Build step (minifikace JS) je největší effort, naplánovat jako samostatný sprint
- GDrive async sync = middleware change, otestovat důkladně před nasazením
