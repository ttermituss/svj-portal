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

- [ ] **[MEDIUM]** `js/notifikace.js` — polling každých 60s i na pozadí — přidat Page Visibility API
  ```javascript
  document.addEventListener('visibilitychange', () => {
      document.hidden ? stopPolling() : startPolling();
  });
  ```

- [ ] **[HIGH]** `index.html` — 59 JS souborů bez minifikace (~40KB+) — přidat build step
  - Nástroj: esbuild nebo rollup
  - Výstup: `core.min.js` (eager) + `pages.min.js` (defer)
  - Přidat hash do názvu souboru pro cache busting

### CSS

- [ ] **[LOW]** `css/theme.css`, `css/layout.css`, `css/components.css` — nejsou minifikované (~8–10KB → ~4–5KB)

- [ ] **[LOW]** Senior téma se načítá pro všechny uživatele — zvážit lazy load `theme-senior.css` jen při výběru tématu

### Service Worker

- [ ] **[MEDIUM]** Chybí Service Worker — přidat cache-first strategii pro CSS/JS/fonty
  - Cache name verzovaný: `svj-cache-v2.7.0`
  - Offline fallback pro SPA shell

---

## Fáze 5 — Hardening a doplňky 🔒

- [ ] **[LOW]** Apache: přidat HSTS header (`Strict-Transport-Security: max-age=31536000`)

- [ ] **[LOW]** `api/helpers.php` → `validateUpload()` — nepoužívat extension z `$_FILES['name']`, derivovat ext výhradně z MIME typu

- [ ] **[LOW]** Rate limiting: rozšířit `api/ratelimit.php` i na všechny POST endpointy (nejen auth)

- [ ] **[LOW]** `api/fond_ucty.php` + `api/fond_rozpocet.php` — nahradit `SELECT *` explicitními sloupci

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
