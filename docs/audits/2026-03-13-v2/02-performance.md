# Performance Audit — 2026-03-13

**Skóre: 52/100**

---

## CRITICAL

- [ ] **P1 — 59 skriptů bez `defer`** — `index.html:36-94`
  - Všech 59 `<script>` tagů blokuje rendering; každý musí být stažen a spuštěn před zobrazením stránky
  - Fix: přidat `defer` na všechny skripty

- [ ] **P2 — Žádné bundlování/minifikace** — `index.html`
  - 3 CSS + 59 JS souborů načítáno jednotlivě bez minifikace (~200-400KB)
  - Fix: concat + minify do 2-3 bundlů (i jednoduchý `cat *.js | terser`)

## HIGH

- [ ] **P3 — Žádný server-side cache pro weather** — `weather.php`
  - Každý page load = živý HTTP request na OpenMeteo; data se mění max hourly
  - Fix: cache v DB/souboru s 30-60 min TTL

- [ ] **P4 — Žádný cache pro Overpass/okolí** — `okoli.php`
  - POI data se téměř nemění, ale fetchují se pokaždé; Overpass má rate limity
  - Fix: cache v DB s 24h+ TTL

- [ ] **P5 — N+1 API calls v KN importu** — `kn.php:213-251`
  - `handleImportUnits()` volá ČÚZK API sekvenčně pro každou jednotku v loopu
  - 50 jednotek = 50 HTTP requestů (~12+ minut)
  - Fix: `curl_multi_*` pro paralelní requesty

- [ ] **P6 — Žádné HTTP cache headers** — `helpers.php:7-12`
  - `jsonResponse()` nenastavuje `Cache-Control`; semi-statická data (weather, building info) by benefitovala
  - Fix: `Cache-Control: no-store` pro mutable, `max-age=300` pro semi-static

- [ ] **P7 — Unbounded export queries** — `export.php`
  - Všechny exporty fetchují ALL záznamy bez LIMIT; velký fond_oprav = memory exhaustion
  - Fix: max cap (10 000), streaming pro CSV

## MEDIUM

- [ ] **P8 — Korelované subqueries v meridla** — `meridla.php:29-41`
  - 3 subqueries per row (posledni_hodnota, posledni_datum, odectu_pocet)
  - Fix: LEFT JOIN s derived table nebo window function

- [ ] **P9 — Korelované subqueries v hlasovani** — `hlasovani.php:41-48`
  - 2 subqueries per row (pocet_hlasu, muj_hlas)
  - Fix: LEFT JOIN

- [ ] **P10 — Missing index na dokumenty.svj_id** — `migrations/015_dokumenty.sql`
  - Fix: composite index `(svj_id, kategorie, created_at)`

- [ ] **P11 — Korelované subqueries v jednotky** — `jednotky.php:44-47`
  - 2 scalar subqueries v LEFT JOINech per unit
  - Fix: proper LEFT JOIN s GROUP BY

- [ ] **P12 — Insert-in-loop pro notifikace** — `fond_notif_helper.php:88-94`
  - Notifikace vkládány po jedné v loopu
  - Fix: batch INSERT

- [ ] **P13 — Korelované subqueries v meridla export** — `export.php:144-146`
  - Fix: stejný jako P8

- [ ] **P14 — File loaded celý do paměti pro GDrive** — `storage_helper.php:332`
  - `file_get_contents()` pro upload; 20MB = 20MB RAM
  - Fix: chunked/resumable upload pro velké soubory

- [ ] **P15 — Weather necachované client-side** — `home.js:112-118`
  - Fetch pokaždé při SPA navigaci
  - Fix: `sessionStorage` s 30min TTL

- [ ] **P16 — Sekvenční API calls na O domě** — `odom.js:18-24`
  - 7 `render*Card()` volány sekvenčně, ne paralelně
  - Fix: `Promise.all()`

- [ ] **P17 — 5 API calls na fond-oprav místo 1** — `fond-oprav.js:166-171`
  - Fix: combined `?action=dashboard` endpoint

- [ ] **P18 — Dokumenty list bez paginace** — `dokumenty.php:18-39`
  - Vrací všechny dokumenty bez LIMIT
  - Fix: přidat paginaci

- [ ] **P19 — Sekvenční API calls v KN findBuilding** — `kn.php:74-170`
  - 6+ sekvenčních HTTP volání (ARES → VR → ČÚZK → RÚIAN GPS → RÚIAN info → parcely)
  - Fix: paralelizovat nezávislé calls

## LOW

- [ ] **P20 — Notification polling v hidden tabu** — `notifikace.js:64`
  - Fix: `document.visibilityState` check

- [ ] **P21 — Žádný DocumentFragment pro tabulky** — `vlastnici.js` aj.
- [ ] **P22 — Extra API call pro Google Calendar status** — `kalendar.js:102-111`
- [ ] **P23 — Separate COUNT query pro paginaci** — `fond_oprav.php`
- [ ] **P24 — ARES cache TTL příliš krátký (24h)** — `svj_helper.php:22`
- [ ] **P25 — 4 separate queries pro stats** — `stats.php:17-27`
- [ ] **P26 — Žádné preconnect hinty** — `index.html`
- [ ] **P27 — Chybí favicon** — `index.html` (zbytečný 404 request)

---

## Pozitivní nálezy

- PDO singleton (žádné duplicitní DB connections)
- Fond oprav má proper paginaci (LIMIT/OFFSET + WhereBuilder)
- Search input má debounce (300ms)
- Všechny curl calls mají timeout
- `storageIsGdriveActive()` má static cache
- Lazy-load taby ve fond-oprav
- NotifBadge má `destroy()` cleanup
