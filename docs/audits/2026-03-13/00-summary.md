# SVJ Portál — Audit Summary

Datum: 2026-03-13 | Verze: 2.5.0 | 5 paralelních auditů

---

## Výsledky auditů

| # | Audit | Soubor | Nejhorší nález |
|---|-------|--------|----------------|
| 1 | **Security** | [01-security.md](01-security.md) | CRITICAL: tenant isolation bypass v admin.php |
| 2 | **Code Quality (DRY)** | [02-code-quality-dry.md](02-code-quality-dry.md) | CRITICAL: 8 souborů > 500 řádků |
| 3 | **UX & Accessibility** | [03-ux-accessibility.md](03-ux-accessibility.md) | CRITICAL: fonty pod 16px, touch targets, chybí ARIA |
| 4 | **Best Practices** | [04-best-practices.md](04-best-practices.md) | CRITICAL: SQL LIMIT/OFFSET interpolace |
| 5 | **Architecture** | [05-architecture.md](05-architecture.md) | HIGH: hardcoded barvy, file size violations |

---

## CRITICAL nálezy (opravit IHNED)

### 1. Tenant Isolation Bypass — `api/admin.php`
- `handleListUsers()` — nemá WHERE svj_id → admin vidí uživatele VŠECH SVJ
- `handleUpdateRole()` — nemá svj_id check → role change across tenants
- `handleDeleteUser()` — nemá svj_id check → mazání uživatelů jiných SVJ
- **Impact:** Kompletní data breach mezi tenanty
- **Fix:** Přidat `AND svj_id = ?` do 3 dotazů

### 2. SQL LIMIT/OFFSET interpolace — `api/fond_oprav.php:72`
- `"LIMIT {$limit} OFFSET {$offset}"` — castované na int ale interpolované
- **Fix:** Přepsat na `LIMIT ? OFFSET ?` s bindValue

### 3. Fonty pod 16px — 100+ míst v JS
- 0.65rem–0.78rem badges, timestamps, chart labels, form hints
- Senior theme neškáluje inline styly
- **Fix:** Zvýšit minimum, přidat senior theme overrides

### 4. Touch targets pod 44px — 25+ míst
- `.btn-sm: padding: 5px 10px`, badge padding 2px, hamburger 36px
- **Fix:** min-height: 44px na interaktivní prvky

---

## HIGH nálezy

| Nález | Audit | Soubor |
|-------|-------|--------|
| 8 souborů > 500 řádků | Quality, Arch | fond_oprav.php, dokumenty.js, fond-oprav.js... |
| DateTime parsing bez try-catch | Best Practices | revize.php:78 |
| Chybějící timeout na CURL | Best Practices | svj_helper.php |
| Hardcoded barvy v JS | Architecture | admin-penb.js, dokumenty.js, revize.js... |
| DRY: file size limity hardcoded | Quality | 7 PHP souborů |
| DRY: SVJ validace opakována 15× | Quality | průřezově |
| Chybějící ARIA atributy | UX | celý projekt |

---

## MEDIUM nálezy

| Nález | Audit |
|-------|-------|
| Chybějící HTTP security headers (CSP, HSTS) | Security |
| innerHTML v markdown renderingu | Best Practices |
| MIME validace bez extension check | Best Practices |
| Kontrastní poměr hraničně | UX |
| Formuláře: placeholdery místo labelů | UX |
| Promise chains bez .catch() | Best Practices |
| Chybějící PHPDoc hlavičky | Architecture |
| README outdated (001-031 místo 001-035) | Architecture |

---

## Celkové hodnocení

| Oblast | Skóre | Status |
|--------|-------|--------|
| SQL Injection ochrana | 95/100 | Výborné (až na LIMIT interpolaci) |
| XSS ochrana | 90/100 | Velmi dobré |
| Tenant isolation | 60/100 | **CRITICAL bug v admin.php** |
| Auth & Sessions | 95/100 | Výborné |
| Encryption | 100/100 | Perfektní |
| File uploads | 90/100 | Velmi dobré |
| API konzistence | 95/100 | Výborné |
| Code quality (DRY) | 75/100 | Dobré, ale duplikace |
| UX pro seniory | 55/100 | **Nutný refactor** |
| Architecture | 85/100 | Dobré |

**Celkové skóre: 84/100** — Solidní základ, ale CRITICAL security bug blokuje produkci.

---

## Prioritní akce

1. **P0 (IHNED):** Fix tenant isolation v admin.php (30 min)
2. **P0 (IHNED):** Fix SQL LIMIT interpolace v fond_oprav.php (10 min)
3. **P1 (před produkcí):** HTTP security headers v Apache (15 min)
4. **P1 (před produkcí):** Zvýšit min. font size a touch targets
5. **P2 (brzy):** Rozdělit soubory > 500 řádků
6. **P2 (brzy):** Extrahovat DRY helpers (requireSvj, file size konstanty)
7. **P3 (plánovaně):** ARIA atributy, hardcoded barvy → CSS vars
