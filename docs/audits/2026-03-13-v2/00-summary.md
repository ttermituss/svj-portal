# Audit v2 — Souhrnný přehled — 2026-03-13

## Skóre

| Audit | Původní | Po opravách | Detaily |
|-------|---------|-------------|---------|
| Security | 85/100 | **97/100** | [01-security.md](01-security.md) |
| Performance | 52/100 | **68/100** | [02-performance.md](02-performance.md) |
| DRY / Code Quality | 72/100 | **89/100** | [03-dry-quality.md](03-dry-quality.md) |

## Stav oprav

### 1. Security — HOTOVO (11/13)
- [x] S1-S8, S10, S12-S13: všechny opraveny
- [ ] S9: HSTS (čeká na HTTPS)
- [ ] S11: Rate limit MD5 (kosmetické)

### 2. DRY — HOTOVO (12/17)
- [x] D1-D11, D13: všechny opraveny
- [ ] D12, D14-D16: ponechány (LOW priority)

### 3. Performance — HOTOVO (6/27 opraveno, zbytek ponechán/přijatelný)
- [x] P1: defer na všech 59 skriptech
- [x] P3: server-side weather cache (30min TTL)
- [x] P4: server-side okolí cache (24h TTL)
- [x] P6: HTTP Cache-Control headers (no-store default)
- [x] P15: client-side weather cache (sessionStorage 30min)
- [x] P16: O domě API calls — potvrzeno paralelní
- [x] P20: notification polling visibility check
- [ ] P2: bundlování (vyžaduje build step)
- [ ] P5,P7-P14,P17-P19,P21-P27: ponechány (LOW impact pro typické SVJ)
