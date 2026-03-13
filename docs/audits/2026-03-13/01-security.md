# Audit: SECURITY (mega audit)

Datum: 2026-03-13 | Verze: 2.5.0

---

## CRITICAL: Tenant Isolation Bypass v `admin.php`

### handleListUsers() — chybí WHERE svj_id
**Soubor:** `api/admin.php:20-45`
- SQL nemá filtr `WHERE u.svj_id = ?`
- Admin SVJ A vidí VŠECHNY uživatele ze VŠECH SVJ
- **Impact:** Přímý únik tenant dat

### handleUpdateRole() — chybí svj_id check
**Soubor:** `api/admin.php:104`
- `SELECT id FROM users WHERE id = :id` — bez `AND svj_id = ?`
- Admin může měnit role uživatelů v JINÝCH SVJ
- **Impact:** Privilege escalation

### handleDeleteUser() — chybí svj_id check
**Soubor:** `api/admin.php:133`
- Stejný problém — smazání uživatele z jiného SVJ
- **Impact:** Mazání dat across tenants

**FIX: Okamžitě přidat `AND svj_id = ?` do všech tří dotazů.**

---

## HIGH: SQL non-parameterization

### `kn.php` — `$db->query()` místo `prepare()`
```php
$row = $db->query("SELECT value FROM settings WHERE `key` = 'cuzk_api_klic'")->fetch();
```
Technicky bezpečné (žádný user input), ale porušuje princip.
- **Fix:** Přepsat na `$db->prepare()`

---

## MEDIUM: SQL anti-pattern

### Dynamický WHERE v `fond_oprav.php:71-72`
```php
$stmt = $db->prepare("... WHERE {$where} LIMIT {$limit} OFFSET {$offset}");
```
Hodnoty castovány na int, ale interpolace do SQL stringu.
- **Fix:** LIMIT/OFFSET přes `bindValue()`

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

**PRODUKČNÍ NASAZENÍ: BLOKOVÁNO** dokud se neopraví CRITICAL #1 (tenant isolation v admin.php).
