# Best Practices Audit — 2026-03-13

**Skóre: 82/100**

---

## CRITICAL

- [ ] **B1 — Špatný sloupec `zprava` v revize notifikaci** — `revize.php:376-383`
  - `revizeScheduleNotif()` používá sloupec `zprava` ale tabulka `notifikace` má `nazev`
  - Runtime crash (PDOException) při každém uložení revize s připomenutím
  - Fix: `zprava` → `nazev`, přidat `detail` sloupec

## MEDIUM

- [ ] **B2 — Žádný globální PHP exception handler**
  - PDO ERRMODE_EXCEPTION + žádný try/catch = raw 500 error s potenciálním stack trace
  - Fix: set_exception_handler() v helpers.php nebo bootstrap

- [ ] **B3 — Chybí error handling na file_put_contents (cache)**
  - weather.php a okoli.php nekontrolují návratovou hodnotu cache write
  - Fix: check return value, logovat warning

- [ ] **B4 — in_array() bez strict mode (11 míst)**
  - revize.php, meridla.php, kontakty.php, revize_zavady.php, hlasovani.php, google_gmail.php
  - Fix: přidat `true` jako 3. parametr

- [ ] **B5 — strtotime() místo DateTime::createFromFormat() pro validaci dat**
  - 35+ míst stále používá strtotime() (akceptuje "next Friday", "+1 week")
  - Fix: DateTime::createFromFormat('Y-m-d', $date) pro přesnou validaci

- [ ] **B6 — export.php $_GET bez getParam()** — `export.php:10-11`
  - Fix: `getParam('type', '')` a `getParam('format', 'csv')`

- [ ] **B7 — jsonResponse() místo jsonError() v admin.php a user.php**
  - Duplikuje error response pattern
  - Fix: nahradit za `jsonError(message, status, code)`

- [ ] **B8 — innerHTML pro markdown rendering** — `dokumenty-preview.js:144`
  - mdEsc() escapuje HTML, ale stojí za ověření kompletnosti sanitizace

## LOW

- [ ] **B9 — Chybí requireMethod() na 8+ endpointech**
  - vlastnici.php, weather.php, stats.php, export.php, kontakty.php, meridla.php
  - Fix: přidat requireMethod('GET')

- [ ] **B10 — fond_rozpocet.php přepisuje $svjId** — line 114
  - `$svjId = $user['svj_id']` po requireSvj()
  - Fix: odebrat redundantní řádek

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
