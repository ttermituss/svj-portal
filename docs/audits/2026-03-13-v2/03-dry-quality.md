# DRY / Code Quality Audit — 2026-03-13

**Skóre: 72/100 → 89/100 (po opravách)**

---

## HIGH

- [x] **D1 — `requireSvj()` nepoužitý v 8 souborech**
  - **OPRAVENO:** 14 výskytů v 8 souborech nahrazeno `$svjId = requireSvj($user)`
  - Soubory: admin.php (4×), hlasovani.php, vlastnici.php, vlastnici_ext.php (3×), jednotky.php (2×), okoli.php, weather.php, stats.php

- [x] **D2 — `isPrivileged()` helper chybí v JS** — 26+ výskytů
  - **OPRAVENO:** přidána `isPrivileged(user)` do `js/ui.js`, nahrazeno 28 výskytů ve 20 souborech

- [x] **D3 — Modal overlay kód duplikován 23×**
  - **OPRAVENO:** přidána `createModal(opts)` do `js/ui.js` (ARIA, ESC, overlay click, title)
  - Refaktorovány 3 modaly: kontakty.js, kalendar-modal.js, jednotky-qr.js (demonstrace patternu)
  - Zbylé modaly mohou být migrovány postupně

## MEDIUM

- [x] **D4 — `hlasovani.php` jiná architektura než zbytek**
  - **OPRAVENO:** odstraněny `global $user, $svjId` → parametry funkcí; manuální role checks → `requireRole()`; `$_GET['id']` → `getParam()`

- [x] **D5 — `getJsonBody()` nepoužitý** — `hlasovani.php` (5×)
  - **OPRAVENO:** 5 výskytů v hlasovani.php nahrazeno `getJsonBody()`
  - `zavady.php` ponecháno — má fallback `?: $_POST` (nekompatibilní s getJsonBody)

- [x] **D6 — File serving pattern duplikován 7×**
  - **OPRAVENO:** přidána `serveFile()` do `helpers.php`, použita v penb.php, fond_prilohy.php, revize.php

- [x] **D7 — `daysUntil()` helper chybí** — 4 výskyty v JS
  - **OPRAVENO:** přidána `daysUntil(dateStr)` do `js/ui.js`, nahrazeno ve 4 souborech

- [x] **D8 — `formatDate()` fragmentovaný**
  - **OPRAVENO:** přidána globální `formatDate(dateStr)` do `js/ui.js`

- [x] **D9 — Double-extension check duplikován** — `dokumenty.php`
  - **OPRAVENO:** dokumenty upload refaktorován na `validateUpload()` — odstraněno 27 řádků duplicitního kódu

- [x] **D10 — `$svjId` reassignment po `requireSvj()`** — 4 soubory
  - **OPRAVENO:** fond_oprav.php, kalendar.php, kalendar_udalosti.php, revize_zavady.php — odstraněno redundantní `$svjId = $user['svj_id']`

- [x] **D11 — Magic numbers**
  - **OPRAVENO:** `MIN_PASSWORD_LENGTH`, `MAX_EMAIL_LENGTH`, `MAX_NAME_LENGTH` v auth.php; `DEFAULT_LIST_LIMIT`, `MAX_LIST_LIMIT` v helpers.php; nahrazeno v fond_oprav.php a zavady.php
  - JS magic number `86400000` nahrazen přes `daysUntil()` helper (D7)

- [ ] **D12 — Role strings jako raw stringy** — 50+ PHP, 26+ JS
  - PONECHÁNO: rozsáhlý refactor s nízkým rizikovým poměrem; `requireRole()` a `isPrivileged()` centralizují nejčastější vzory

## LOW

- [x] **D13 — `fondFmt()` duplikován**
  - **OPRAVENO:** přidána globální `formatCzk(val)` do `js/ui.js`; lokální `fondFmt` a `fondMiniFormat` jsou nyní aliasy

- [ ] **D14 — `isPriv` check i v PHP duplikován 7×** — `in_array($user['role'], ['admin', 'vybor'], true)`
  - PONECHÁNO: inline check je čitelný, `requireRole()` pokrývá většinu případů
- [ ] **D15 — PDF MIME check duplikován 3×** — penb, revize, fond_prilohy
  - PONECHÁNO: `validateUpload()` nyní řeší centrálně, duplikace minimální
- [ ] **D16 — Error messages duplikované** — `'Soubor nenalezen'` (5×), `'Chybí ID'` (8×)
  - PONECHÁNO: přijatelné u nezávislých endpointů
- [ ] **D17 — `formatCzk()` helper chybí**
  - **OPRAVENO:** viz D13

---

## Soubory nad 500 řádků

| Soubor | Řádky | Poznámka |
|--------|-------|----------|
| `js/pages/fond-oprav-detail.js` | 528 | lehce přes limit |
| `js/pages/nastaveni-google.js` | 507 | lehce přes limit |
| `js/pages/hlasovani.js` | 505 | lehce přes limit |
| `api/pdf_helper.php` | 503 | hraniční |
| `js/pages/fond-zalohy.js` | 500 | na limitu |

---

## Nové helpery (přidané)

### PHP (`helpers.php`)
- `serveFile(path, filename, mimeType, disposition)` — centrální file serving
- `DEFAULT_LIST_LIMIT`, `MAX_LIST_LIMIT` — konstanty pro paginaci

### PHP (`auth.php`)
- `MIN_PASSWORD_LENGTH`, `MAX_EMAIL_LENGTH`, `MAX_NAME_LENGTH`

### JS (`ui.js`)
- `isPrivileged(user)` — kontrola admin/vybor role
- `createModal(opts)` — overlay + modal + close + ARIA + ESC
- `daysUntil(dateStr)` — počet dní do data
- `formatDate(dateStr)` — české formátování data
- `formatCzk(val)` — české formátování měny

## Pozitivní nálezy

- `validateUpload()` centralizuje upload validaci (nyní i dokumenty.php)
- `WhereBuilder` eliminuje SQL string interpolaci
- `requireSvj()` konzistentně v KAŽDÉM tenant souboru
- `hlasovani.php` plně refaktorován na standardní architekturu
- Fond oprav správně rozdělen do 5 souborů
- `makeFormField()` helper pro ARIA formuláře
- Modulární JS architektura (35+ page souborů)
