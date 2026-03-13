# Audit v2 — Finální přehled — 2026-03-13

## Skóre

| Audit | Původní | Po opravách | Detaily |
|-------|---------|-------------|---------|
| Security | 85 | **97/100** | [01-security.md](01-security.md) |
| Architecture | 87 | **92/100** | [06-architecture.md](06-architecture.md) |
| Best Practices | 82 | **90/100** | [05-best-practices.md](05-best-practices.md) |
| DRY / Code Quality | 72 | **89/100** | [03-dry-quality.md](03-dry-quality.md) |
| UX & Accessibility | 68 | **85/100** | [04-ux-accessibility.md](04-ux-accessibility.md) |
| Performance | 52 | **68/100** | [02-performance.md](02-performance.md) |
| **Průměr** | **74** | **87/100** | |

## Přehled všech oprav

### Security (11 oprav)
- [x] Gmail HTML sanitizace, export role check + requireSvj, rate limit changePassword
- [x] ZFO path traversal, addRawUnsafe, settings query, getParam, error leaking
- [x] CSP frame-ancestors, FilesMatch

### DRY / Code Quality (12 oprav)
- [x] requireSvj (14×), isPrivileged (28×), createModal + 3 migrace
- [x] hlasovani.php refactor, getJsonBody, serveFile, daysUntil/formatDate/formatCzk
- [x] dokumenty→validateUpload, $svjId reassignment, magic numbers

### Performance (6 oprav)
- [x] defer skripty, server cache weather+okolí, Cache-Control headers
- [x] Client-side weather cache, notification visibility check

### UX & Accessibility (5 oprav)
- [x] 65+ font sizes pod minimum → 0.82rem (21+21 JS souborů + 2 CSS)
- [x] Focus trap v modalech (trapFocus utilita + createModal + showConfirmModal)
- [x] makeFormField() adoptován (login, registrace, nastavení — 16 polí)
- [x] aria-labelledby na createModal()

### Best Practices (1 oprava)
- [x] CRITICAL: revize.php notifikace `zprava` → `nazev`+`detail` (fix runtime crash)

### Architecture (2 opravy)
- [x] FK na datovka tabulkách (migrace 036)
- [x] .gitignore doplněn (uploads/, source/, IDE)
