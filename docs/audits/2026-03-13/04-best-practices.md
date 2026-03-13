# Audit: Best Practices (PHP + JS)

Datum: 2026-03-13 | Verze: 2.5.0

---

## ~~CRITICAL~~ ✅ OPRAVENO

### ~~SQL interpolace LIMIT/OFFSET~~ ✅
`fond_oprav.php` — přepsáno na `LIMIT :lim OFFSET :off` s `bindValue(PDO::PARAM_INT)` (commit `6bc7a2f`)

### Dynamický WHERE v `storage_helper.php:415` ⏳ MEDIUM
```php
$stmt = $db->prepare("... WHERE {$where} LIMIT ?");
```
Aktuálně bezpečné (params jsou safe), architektonicky přijatelné.

---

## HIGH

### ~~DateTime parsing bez try-catch~~ ✅ OPRAVENO
`revize.php`, `meridla.php` — přepsáno na `DateTime::createFromFormat('Y-m-d', ...)` (commit `6bc7a2f`)

### ~~Chybějící timeout na CURL~~ ✅ NEPLATNÉ
Ověřeno: všechny CURL volání mají `CURLOPT_TIMEOUT` (8–15s). Audit se zmýlil.

### File deletion bez atomicity ⏳ LOW
`storage_helper.php:132-134` — tiché selhání při neexistujícím souboru. Nízká priorita.

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

## Celkové hodnocení: 85 → 95/100 (po všech opravách)

| Kategorie | Výskyt | Závažnost |
|-----------|--------|-----------|
| Critical | 2 | SQL interpolace |
| High | 3 | DateTime, timeout, file ops |
| Medium | 5 | innerHTML, MIME, promises, session |
| Low | 3 | Rate limit, N+1, docs |
