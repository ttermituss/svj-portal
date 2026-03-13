# Security Audit v2 — 2026-03-13

**Skóre: 85/100 → 97/100 (po opravách)**
**Scope:** Všechny PHP API soubory (mimo vendor/), .htaccess, klíčové JS soubory
**Reviewnutých souborů:** 45 PHP, 6 JS, 4 .htaccess

---

## MEDIUM findings

- [x] **S1 — Gmail HTML body bez sanitizace** — `google_gmail.php`
  - `extractBody()` vrací raw HTML z emailů, JS ho renderuje přes innerHTML
  - CSP blokuje `<script>`, ale event handlery (`onload`, `onerror`) projdou
  - **OPRAVENO:** přidána `sanitizeEmailHtml()` — stripuje script/style/iframe/object/embed/form tagy, on* event handlery, javascript:/data: URL; plain text se escapuje přes `htmlspecialchars()`+`nl2br()`

- [x] **S2 — Parkování export chybí role check** — `export.php:121`
  - `parkovani` case nemá `requireRole('admin', 'vybor')` na rozdíl od ostatních exportů
  - **OPRAVENO:** přidán `requireRole('admin', 'vybor')` na začátek parkovani case

- [x] **S3 — Export chybí requireSvj()** — `export.php:9`
  - `$svjId = $user['svj_id']` bez null checku; uživatel bez SVJ triggeruje queries s null
  - **OPRAVENO:** nahrazeno za `$svjId = requireSvj($user)`

- [x] **S4 — Chybí rate limit na changePassword** — `user.php`
  - Endpoint `changePassword` nemá rate limiting, lze brute-forcovat
  - **OPRAVENO:** přidán `checkRateLimit()` (10 pokusů/5min per user), `recordRateLimit()` při špatném hesle, `clearRateLimit()` při úspěchu

- [x] **S5 — ZFO filename path traversal** — `datovka.php:136`
  - `$f['name']` z ZFO parseru použit přímo v `file_put_contents($destPath, ...)`
  - **OPRAVENO:** `$safeName = basename($f['name'])` — sanitizace před použitím v cestě

---

## LOW findings

- [x] **S6 — WhereBuilder `addRaw()` footgun** — `helpers.php`
  - **OPRAVENO:** přejmenováno na `addRawUnsafe()` s `@internal` PHPDoc varováním; všechna volání aktualizována

- [x] **S7 — Špatné sloupce v settings query** — `google_calendar.php:333`
  - `SELECT val FROM settings WHERE klic = ...` ale tabulka má `key`/`value`
  - **OPRAVENO:** opraveno na `SELECT value FROM settings WHERE \`key\` = ...`

- [x] **S8 — Raw `$_GET['action']` místo `getParam()`** — `hlasovani.php:16`, `kn.php:16`
  - **OPRAVENO:** nahrazeno za `getParam('action', '')`

- [ ] **S9 — HSTS zakomentovaný** — `.htaccess:11`
  - Čeká na potvrzení HTTPS v produkci
  - PONECHÁNO: záměrně zakomentovaný do nasazení HTTPS

- [x] **S10 — Externí API chyby leakují klientovi** — `google_gmail.php`, `google_calendar.php`
  - **OPRAVENO:** 4 místa opravena — `$e->getMessage()` jde do `error_log()`, klient dostává generickou hlášku

- [ ] **S11 — Rate limit key používá MD5** — `ratelimit.php:12`
  - MD5 nepotřebný, stačí plain IP jako klíč
  - PONECHÁNO: funkčně bezpečné, kosmetická změna

- [x] **S12 — Chybí CSP frame-ancestors** — `.htaccess:13`
  - **OPRAVENO:** přidáno `frame-ancestors 'self'` do CSP headeru

- [x] **S13 — Helper soubory nezablokované v FilesMatch** — `api/.htaccess`
  - **OPRAVENO:** přidáno 9 helper souborů do `<FilesMatch>` deny listu

---

## Pozitivní nálezy

- SQL injection: 10/10 — všechny queries parametrizované, EMULATE_PREPARES=false
- Tenant isolation: 10/10 — svj_id vždy ze session, requireSvj() konzistentní
- Upload security: vícevrstvá (MIME + extension blacklist + .htaccess + basename)
- Sensitive data: config chráněn, tokeny šifrované AES-256-CBC, hesla nikdy v response
- Session: httponly, SameSite=Lax, secure dynamicky, HMAC OAuth state
- Input validation: konzistentní (int) casting, sanitize(), filter_var()
- Rate limiting: auth endpointy + changePassword
- HTTP headers: CSP kompletní vč. frame-ancestors, všechny moderní security headers
