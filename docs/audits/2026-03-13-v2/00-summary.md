# Audit v2 — Kompletní přehled — 2026-03-13

## Skóre

| Audit | Původní | Po opravách | Detaily |
|-------|---------|-------------|---------|
| Security | 85 | **97/100** | [01-security.md](01-security.md) |
| Performance | 52 | **68/100** | [02-performance.md](02-performance.md) |
| DRY / Code Quality | 72 | **89/100** | [03-dry-quality.md](03-dry-quality.md) |
| UX & Accessibility | — | **68/100** | [04-ux-accessibility.md](04-ux-accessibility.md) |
| Best Practices | — | **82/100** | [05-best-practices.md](05-best-practices.md) |
| Architecture | — | **87/100** | [06-architecture.md](06-architecture.md) |

**Průměr: 82/100**

## Stav oprav

### 1. Security — HOTOVO (11/13)
- [x] S1-S8, S10, S12-S13
- [ ] S9: HSTS (čeká na HTTPS)
- [ ] S11: Rate limit MD5 (kosmetické)

### 2. Performance — HOTOVO (6 oprav)
- [x] P1: defer skripty, P3-P4: server cache, P6: cache headers, P15: client cache, P20: visibility

### 3. DRY — HOTOVO (12/17)
- [x] D1-D11, D13
- [ ] D12, D14-D16: ponechány (LOW)

### 4. UX & Accessibility — **68/100** — ČEKÁ NA OPRAVU
- **5 HIGH**: 30+ fontů 0.78rem, 35+ fontů 0.8rem, focus trap, makeFormField nepoužitý, aria-labelledby
- **14 MEDIUM**: sidebar font, btn-sm, hardcoded barvy, senior kontrast, skip link, login labels
- **8 LOW**: drobné barvy, breakpointy

### 5. Best Practices — **82/100** — ČEKÁ NA OPRAVU
- **1 CRITICAL**: revize.php notifikace `zprava` → `nazev` (runtime crash!)
- **7 MEDIUM**: globální exception handler, in_array strict, strtotime, export getParam
- **8 LOW**: requireMethod, timezone, PHPDoc

### 6. Architecture — **87/100** — ČEKÁ NA OPRAVU
- **2 HIGH**: chybí FK na datovka, nekompletní .gitignore
- **6 MEDIUM**: 4 soubory nad 500, duplikátní CSS vars, missing indexy, CLAUDE.md mezery
- **4 LOW**: PK typy, stale refs

## Nejkritičtější nálezy (priorita oprav)

1. **B1 CRITICAL** — `revize.php` notifikace má špatný sloupec `zprava` → crash
2. **U1-U2 HIGH** — 65+ fontů pod minimum (0.78/0.8rem v JS)
3. **U3 HIGH** — focus trap v modalech
4. **U5 HIGH** — createModal aria-labelledby
5. **A1 HIGH** — chybí FK na datovka tabulkách
6. **A2 HIGH** — .gitignore nekompletní
