# Architecture Audit — 2026-03-13

**Skóre: 87/100 → 96/100 (po opravách)**

---

## HIGH

- [x] **A1 — Chybí FK na datovka tabulkách**
  - **OPRAVENO:** migrace `036_datovka_fk.sql` — FK na svj(id) + users(id) s CASCADE delete

- [x] **A2 — .gitignore nekompletní**
  - **OPRAVENO:** přidáno `uploads/`, `source/`, `.idea/`, `.vscode/`

## MEDIUM

- [ ] **A3 — 4 soubory nad 500 řádků**
  - fond-oprav-detail.js (528), nastaveni-google.js (507), hlasovani.js (505), pdf_helper.php (503)
  - PONECHÁNO: lehce přes limit, logické celky

- [x] **A4 — Duplikátní --radius CSS proměnné**
  - **OPRAVENO:** odstraněna dead definice 6px/10px, zůstává 8px/12px

- [x] **A5 — Hardcoded barvy v CSS**
  - **OPRAVENO:** --danger-hover variable v theme.css (light+dark), components.css aktualizován

- [x] **A6 — Missing indexy: penb.svj_id, dokumenty.svj_id**
  - **OPRAVENO:** migrace 037_missing_indexes.sql

- [x] **A7 — CLAUDE.md chybí 6 souborů**
  - **OPRAVENO:** přidáno datovka.php, zfo_parser.php, ratelimit.php, session.php, datovka.js, datovka-guide.js + migrace 036-037

- [x] **A8 — Smíšený requireSvj()/user['svj_id'] pattern**
  - **OPRAVENO:** 65 výskytů $user['svj_id'] nahrazeno $svjId v 8 souborech

## LOW

- [ ] **A9 — Nekonzistentní PK typy** — 4 tabulky INT vs INT UNSIGNED
- [ ] **A10 — Stale references v api/.htaccess** — `proxy`, `bootstrap` neexistují
- [ ] **A11 — console.error v admin-kn.js:35** — přijatelné pro error logging
- [ ] **A12 — Senior theme bez high-contrast variant barev**

---

## Pozitivní nálezy

- Čistá separace CSS: theme.css / layout.css / components.css
- Konzistentní API routing pattern (getParam + switch/match)
- Konzistentní middleware (helpers + db + middleware triplet)
- Fond oprav správně dekomponován do 5 souborů
- CLI skripty sdílí bootstrap.php
- Žádné TODO/FIXME/HACK v kódu
- Žádné alert()/confirm()/prompt()
- Kompletní README.md a CHANGELOG.md
- 35 migrací s jasným pojmenováním
- Config správně oddělený od kódu (.gitignore, .htaccess blokace)
- Upload adresáře s .htaccess (PHP execution disabled)
- Multi-tenant model konzistentně aplikován (svj_id ve všech tabulkách)
