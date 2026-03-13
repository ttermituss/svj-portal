# Audit: Best Practices (PHP + JS)

Datum: 2026-03-13 | Verze: 2.5.0

---

## CRITICAL

### SQL interpolace LIMIT/OFFSET
**Soubor:** `api/fond_oprav.php:72`
```php
"... LIMIT {$limit} OFFSET {$offset}"
```
Hodnoty jsou castovány na int, ale porušuje princip — vše přes prepared statements.
- **Fix:** Použít `LIMIT ? OFFSET ?` s `bindValue()`

### Dynamický WHERE v `storage_helper.php:415`
```php
$stmt = $db->prepare("... WHERE {$where} LIMIT ?");
```
Aktuálně bezpečné, ale architektonicky rizikové.

---

## HIGH

### DateTime parsing bez try-catch
**Soubor:** `api/revize.php:78`
```php
$dt = new DateTime($datumPosledni);
```
PHP 8.3+ vyhodí `DateMalformedStringException` při neplatném datu.
- **Fix:** `DateTime::createFromFormat()` nebo try-catch

### Chybějící timeout na CURL/file_get_contents
**Soubor:** `api/svj_helper.php`
Volání ARES, RÚIAN, ČÚZK bez timeoutu — může viset neomezeně.
- **Fix:** `stream_context_create(['http' => ['timeout' => 5]])`

### File deletion bez atomicity
`storage_helper.php:132-134` — tiché selhání, žádné logování

---

## MEDIUM

### innerHTML v markdown renderingu
**Soubor:** `js/pages/dokumenty-preview.js:144`
```javascript
rendered.innerHTML = dokRenderMarkdown(text);
```
Jediné skutečně rizikové použití innerHTML — markdown renderer musí být bezpečný.

### MIME validace bez extension check
Upload validuje MIME přes `finfo`, ale nekontroluje příponu souboru.
Teoreticky `shell.php.jpg` projde MIME checkem.

### Chybějící `.catch()` na Promise chains
141 výskytů `.then()` — ne všechny mají `.catch()`.

### Session cleanup na každý request
`session.php:79` — `cleanExpiredSessions()` volaná při každém loginu.
- **Fix:** Omezit frekvenci (jednou za hodinu)

---

## LOW

### Rate limit IP za proxy
`ratelimit.php:12` — používá `REMOTE_ADDR`, neřeší `X-Forwarded-For`.
Fallback `0.0.0.0` sdílí rate limit pro všechny bez IP.

### N+1 query v revize list
Subquery `COUNT(*) FROM revize_historie` pro každý řádek.
Akceptovatelné pro malé datasety.

---

## PASSING (dobře implementováno)

- PDO prepared statements konzistentně (až na LIMIT)
- Bcrypt password hashing s cost parametrem
- Kryptograficky bezpečné tokeny (`bin2hex(random_bytes(32))`)
- AES-256-CBC šifrování citlivých settings
- SameSite=Lax session cookies
- Tenant isolation: `svj_id` vždy ze session
- Žádné deprecated PHP funkce
- Žádné globální proměnné v JS
- Event listenery čištěny v modalech

---

## Celkové hodnocení: 85/100

| Kategorie | Výskyt | Závažnost |
|-----------|--------|-----------|
| Critical | 2 | SQL interpolace |
| High | 3 | DateTime, timeout, file ops |
| Medium | 5 | innerHTML, MIME, promises, session |
| Low | 3 | Rate limit, N+1, docs |
