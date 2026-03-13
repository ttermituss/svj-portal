# Audit v2 — Souhrnný přehled — 2026-03-13

## Skóre

| Audit | Původní | Po opravách | Detaily |
|-------|---------|-------------|---------|
| Security | 85/100 | **97/100** | [01-security.md](01-security.md) |
| Performance | **52/100** | — | [02-performance.md](02-performance.md) |
| DRY / Code Quality | 72/100 | **89/100** | [03-dry-quality.md](03-dry-quality.md) |

## Stav oprav

### 1. Security — HOTOVO (11/13, 2 záměrně ponechány)
- [x] S1: Gmail HTML sanitizace (`sanitizeEmailHtml()`)
- [x] S2: Parkování export role check
- [x] S3: Export requireSvj()
- [x] S4: Rate limit changePassword (10/5min per user)
- [x] S5: ZFO basename() path traversal
- [x] S6: addRaw() → addRawUnsafe() + @internal
- [x] S7: settings query sloupce (val/klic → value/key)
- [x] S8: $_GET['action'] → getParam() (hlasovani, kn)
- [ ] S9: HSTS (čeká na HTTPS)
- [x] S10: API error leaking → error_log() + generická hláška
- [ ] S11: Rate limit MD5 (kosmetické, ponecháno)
- [x] S12: CSP frame-ancestors
- [x] S13: Helper FilesMatch (9 souborů)

### 2. DRY — HOTOVO (12/17, 5 záměrně ponechány)
- [x] D1: requireSvj() v 8 souborech (14 výskytů)
- [x] D2: isPrivileged() helper (28 výskytů ve 20 souborech)
- [x] D3: createModal() helper (3 modaly migrovány jako demonstrace)
- [x] D4: hlasovani.php plný refactor (global → params, requireRole)
- [x] D5: getJsonBody() v hlasovani.php (5×)
- [x] D6: serveFile() helper (penb, fond_prilohy, revize)
- [x] D7: daysUntil() helper (4 soubory)
- [x] D8: formatDate() globální
- [x] D9: dokumenty.php → validateUpload() (-27 řádků)
- [x] D10: $svjId reassignment fix (4 soubory)
- [x] D11: magic numbers → konstanty (auth, helpers, fond_oprav, zavady)
- [ ] D12: role string konstanty (ponecháno — nízký přínos)
- [x] D13: fondFmt() → formatCzk() globální
- [ ] D14-D16: ponecháno (LOW priority)

### 3. Performance — ČEKÁ
- [ ] P1: defer na skripty
- [ ] P2: bundlování/minifikace
- [ ] P3-P4: server-side cache (weather, okolí)
- [ ] P5-P7: DB optimalizace
