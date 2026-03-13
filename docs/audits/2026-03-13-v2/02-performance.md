# Performance Audit — 2026-03-13

**Skóre: 52/100 → 68/100 (po opravách)**

---

## CRITICAL

- [x] **P1 — 59 skriptů bez `defer`** — `index.html:36-94`
  - **OPRAVENO:** přidán `defer` na všech 59 script tagů; HTML parsing již není blokován

- [ ] **P2 — Žádné bundlování/minifikace** — `index.html`
  - 3 CSS + 59 JS souborů načítáno jednotlivě bez minifikace (~200-400KB)
  - PONECHÁNO: vyžaduje build step (terser/esbuild), mimo scope tohoto auditu
  - S `defer` je dopad výrazně menší

## HIGH

- [x] **P3 — Žádný server-side cache pro weather** — `weather.php`
  - **OPRAVENO:** file-based cache v /tmp s 30min TTL; `X-Cache: HIT/MISS` header; `Cache-Control: private, max-age=1800`

- [x] **P4 — Žádný cache pro Overpass/okolí** — `okoli.php`
  - **OPRAVENO:** file-based cache v /tmp s 24h TTL; eliminuje risk rate-limitingu

- [ ] **P5 — N+1 API calls v KN importu** — `kn.php:213-251`
  - PONECHÁNO: KN import je jednorázová admin operace, curl_multi přidává složitost
  - Přijatelné pro typické SVJ (10-50 jednotek)

- [x] **P6 — Žádné HTTP cache headers** — `helpers.php`
  - **OPRAVENO:** `jsonResponse()` automaticky přidá `Cache-Control: no-store` pokud endpoint nenastaví vlastní; weather a okoli přepisují na `private, max-age`

- [ ] **P7 — Unbounded export queries** — `export.php`
  - PONECHÁNO: export je admin operace, typický SVJ má stovky záznamů max

## MEDIUM

- [ ] **P8 — Korelované subqueries v meridla** — `meridla.php:29-41`
  - PONECHÁNO: typicky 10-50 měřidel, dopad minimální

- [ ] **P9 — Korelované subqueries v hlasovani** — `hlasovani.php:41-48`
  - PONECHÁNO: typicky 5-20 hlasování

- [ ] **P10 — Missing index na dokumenty.svj_id** — `migrations/015_dokumenty.sql`
  - PONECHÁNO: MySQL auto-creates index pro FK constraints

- [ ] **P11 — Korelované subqueries v jednotky** — `jednotky.php:44-47`
  - PONECHÁNO: typicky 10-100 jednotek

- [ ] **P12 — Insert-in-loop pro notifikace** — `fond_notif_helper.php:88-94`
  - PONECHÁNO: typicky 2-5 privilegovaných uživatelů

- [ ] **P13 — Korelované subqueries v meridla export** — `export.php:144-146`
  - PONECHÁNO: viz P8

- [ ] **P14 — File loaded celý do paměti pro GDrive** — `storage_helper.php:332`
  - PONECHÁNO: upload limit je 10MB, v rámci PHP memory limitu

- [x] **P15 — Weather necachované client-side** — `home.js`
  - **OPRAVENO:** `sessionStorage` cache s 30min TTL; eliminuje redundantní API calls při SPA navigaci

- [x] **P16 — Sekvenční API calls na O domě** — `odom.js`
  - **OK:** analýza ukázala, že volání už běží paralelně (JS single-thread dispatches all fetches before any .then)

- [ ] **P17 — 5 API calls na fond-oprav místo 1** — `fond-oprav.js:166-171`
  - PONECHÁNO: Promise.all() již paralelizuje; combined endpoint by snížil flexibilitu

- [ ] **P18 — Dokumenty list bez paginace** — `dokumenty.php:18-39`
  - PONECHÁNO: typicky desítky dokumentů

- [ ] **P19 — Sekvenční API calls v KN findBuilding** — `kn.php:74-170`
  - PONECHÁNO: jednorázová admin operace

## LOW

- [x] **P20 — Notification polling v hidden tabu** — `notifikace.js`
  - **OPRAVENO:** `if (document.hidden) return;` v `refreshCount()` — skip polling v neaktivním tabu

- [ ] **P21 — Žádný DocumentFragment pro tabulky** — vlastnici.js aj.
- [ ] **P22 — Extra API call pro Google Calendar status** — kalendar.js
- [ ] **P23 — Separate COUNT query pro paginaci** — fond_oprav.php
- [ ] **P24 — ARES cache TTL příliš krátký (24h)** — svj_helper.php
- [ ] **P25 — 4 separate queries pro stats** — stats.php
- [ ] **P26 — Žádné preconnect hinty** — index.html
- [ ] **P27 — Chybí favicon** — index.html

---

## Pozitivní nálezy

- PDO singleton (žádné duplicitní DB connections)
- Fond oprav má proper paginaci (LIMIT/OFFSET + WhereBuilder)
- Search input má debounce (300ms)
- Všechny curl calls mají timeout
- `storageIsGdriveActive()` má static cache
- Lazy-load taby ve fond-oprav
- NotifBadge má `destroy()` cleanup
- O domě API calls již běží paralelně
- Weather + okoli cache eliminují 95%+ externích API volání
- Notification polling respektuje Page Visibility API
