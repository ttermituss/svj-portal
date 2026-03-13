# Audit: SECURITY (mega audit)

Datum: 2026-03-13 | Verze: 2.5.0
Opravy: commit `6bc7a2f` (2026-03-13)

---

## ~~CRITICAL: Tenant Isolation Bypass v `admin.php`~~ ✅ OPRAVENO

### ~~handleListUsers() — chybí WHERE svj_id~~ ✅
Přidán `WHERE u.svj_id = :svj_id` + validace `$svjId`

### ~~handleUpdateRole() — chybí svj_id check~~ ✅
Přidán `AND svj_id = :svj_id` do SELECT i UPDATE

### ~~handleDeleteUser() — chybí svj_id check~~ ✅
Přidán `AND svj_id = :svj_id` do SELECT i DELETE

---

## ~~HIGH: SQL non-parameterization~~ ✅ OPRAVENO

### ~~`kn.php` — `$db->query()` místo `prepare()`~~ ✅
Přepsáno na `$db->prepare()` s parametrem `:k`

---

## MEDIUM: SQL anti-pattern

### ~~Dynamický WHERE + LIMIT v `fond_oprav.php:71-72`~~ ✅ OPRAVENO
LIMIT/OFFSET přepsáno na `bindValue(:lim, $limit, PDO::PARAM_INT)`.
WHERE interpolace zůstává (parametry jsou safe), ale LIMIT/OFFSET opraveno.

### Dynamický WHERE v `storage_helper.php:415`
Stejný pattern — aktuálně bezpečné, architektonicky rizikové.

---

## MEDIUM: Chybějící HTTP security headers

Chybí v Apache konfiguraci:
- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options` — neúplně

---

## LOW

### Rate limiting pouze IP-based
- `ratelimit.php:12` — `REMOTE_ADDR` bez `X-Forwarded-For`
- Za proxy sdílejí rate limit všichni klienti

### HTTPS konfigurace
- Session cookie secure flag závisí na `$_SERVER['HTTPS']`
- Ověřit produkční server konfiguraci

---

## PASSING (dobře implementováno)

- **SQL Injection:** PDO prepared statements konzistentně, `ATTR_EMULATE_PREPARES = false`
- **XSS:** `textContent` v JS, `strip_tags()` v PHP, žádný nebezpečný `innerHTML`
- **Sessions:** 256-bit tokeny, DB storage, HttpOnly + SameSite=Lax
- **Encryption:** AES-256-CBC pro citlivá nastavení, proper IV
- **Password hashing:** bcrypt s `password_hash()`
- **File uploads:** finfo MIME check, size limits, randomized names, .htaccess block
- **CSRF:** HMAC-SHA256 signed OAuth state
- **SSRF:** SSL verify enabled na CURL

---

## Souhrn

| ID | Závažnost | Kategorie | Soubor |
|----|-----------|-----------|--------|
| 1 | CRITICAL | Tenant Isolation | `api/admin.php` |
| 2 | HIGH | SQL Practice | `api/kn.php` |
| 3 | MEDIUM | SQL Anti-Pattern | `api/fond_oprav.php`, `api/storage_helper.php` |
| 4 | MEDIUM | HTTP Headers | Apache vhost |
| 5 | LOW | Rate Limiting | `api/ratelimit.php` |
| 6 | LOW | HTTPS Config | Server config |

**PRODUKČNÍ NASAZENÍ: ODBLOKOVÁNO** — všechny CRITICAL a HIGH security nálezy opraveny (commit `6bc7a2f`).
