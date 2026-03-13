# Best Practices Audit — 2026-03-13

**Skóre: 82/100 → 95/100 (po opravách)**

---

## CRITICAL

- [x] **B1 — Špatný sloupec `zprava` v revize notifikaci** — `revize.php`
  - **OPRAVENO:** `zprava` → `nazev` + `detail`; duplikát check i INSERT opraveny; vzor z fond_notif_helper.php

## MEDIUM

- [x] **B2 — Žádný globální PHP exception handler**
  - **OPRAVENO:** `set_exception_handler()` v helpers.php — loguje chybu, vrací JSON 500

- [x] **B3 — Chybí error handling na file_put_contents (cache)**
  - **OPRAVENO:** @file_put_contents + check return + error_log v weather.php a okoli.php

- [x] **B4 — in_array() bez strict mode (11 míst)**
  - **OPRAVENO:** přidáno `, true` ve všech 11 výskytech (6 souborů)

- [x] **B5 — strtotime() → DateTime::createFromFormat()**
  - **OPRAVENO:** 6 validačních bodů (fond_oprav, meridla, dokumenty, hlasovani, revize 2×)

- [x] **B6 — export.php $_GET → getParam()**
  - **OPRAVENO:** getParam('type','') a getParam('format','csv')

- [x] **B7 — jsonResponse() → jsonError() v admin.php a user.php**
  - **OPRAVENO:** 13 výskytů nahrazeno (6 v admin.php, 7 v user.php)

- [ ] **B8 — innerHTML pro markdown rendering** — `dokumenty-preview.js:144`
  - PONECHÁNO: mdEsc() správně escapuje, admin-only upload, CSP blokuje scripty

## LOW

- [ ] **B9 — Chybí requireMethod() na 8+ endpointech**
  - vlastnici.php, weather.php, stats.php, export.php, kontakty.php, meridla.php
  - Fix: přidat requireMethod('GET')

- [x] **B10 — fond_rozpocet.php přepisuje $svjId**
  - **OPRAVENO** v A8 (odstraněno redundantní přiřazení)

- [ ] **B11 — == místo === v notifikace.js** — 5 míst
  - `n.precteno == 0` → `!n.precteno`

- [ ] **B12 — Žádné date_default_timezone_set()**
  - Spoléhá na server php.ini
  - Fix: `date_default_timezone_set('Europe/Prague')` v config.php

- [ ] **B13 — Chybí composer.lock v gitu**
  - Nereprodukovatelné buildy
  - Fix: trackovat composer.lock

- [ ] **B14 — 7 PHP souborů bez PHPDoc hlavičky**
  - dokumenty.php, parkovani.php, export.php, db.php, session.php, user.php, svj.php

- [ ] **B15 — WhereBuilder PHPDoc na špatném místě** — helpers.php:62-72
  - Orphaned block daleko od třídy
  - Fix: přesunout nad `class WhereBuilder`

- [ ] **B16 — parkovani.php čte z $_POST místo getJsonBody()** — lines 36-41

---

## Pozitivní nálezy

- Globální unhandledrejection handler v JS (app.js:4-8)
- textContent konzistentně používán pro user data
- Tenant isolation přes requireSvj() a svj_id ze session
- SQL injection prevence (PDO prepared statements, EMULATE_PREPARES=false)
- WhereBuilder pro bezpečné dynamické queries
- validateUpload() s MIME + double-extension attack ochranou
- Kryptograficky bezpečné tokeny (bin2hex(random_bytes(32)))
- Lean composer.json (jen google/apiclient)
- NotifBadge.destroy() správně uklízí intervaly
