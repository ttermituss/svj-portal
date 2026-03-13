# Architecture Audit — 2026-03-13

**Skóre: 87/100 → 92/100 (po opravách)**

---

## HIGH

- [x] **A1 — Chybí FK na datovka tabulkách**
  - **OPRAVENO:** migrace `036_datovka_fk.sql` — FK na svj(id) + users(id) s CASCADE delete

- [x] **A2 — .gitignore nekompletní**
  - **OPRAVENO:** přidáno `uploads/`, `source/`, `.idea/`, `.vscode/`

## MEDIUM

- [ ] **A3 — 4 soubory nad 500 řádků**
  - fond-oprav-detail.js (528), nastaveni-google.js (507), hlasovani.js (505), pdf_helper.php (503)

- [ ] **A4 — Duplikátní --radius CSS proměnné** — `theme.css:46-47 vs 56-57`
  - Prvních 6px/10px přepsáno 8px/12px — dead code

- [ ] **A5 — Hardcoded barvy v CSS** — `components.css:80,99,103`
  - `#fff` na btn-primary/danger, `#c62828` na btn-danger:hover
  - Fix: CSS variable `--btn-text-light`, `--btn-danger-hover`

- [ ] **A6 — Missing indexy: penb.svj_id, dokumenty.svj_id**
  - Žádný explicitní index na svj_id (MySQL možná auto-vytvoří pro FK)
  - Fix: migrace s ADD INDEX

- [ ] **A7 — CLAUDE.md chybí 6 souborů** v architektuře
  - datovka.php, zfo_parser.php, ratelimit.php, session.php, datovka.js, datovka-guide.js

- [ ] **A8 — Smíšený requireSvj()/user['svj_id'] pattern** — 9 souborů
  - requireSvj() voláno ale return ignorován, pak $user['svj_id'] použito
  - Fix: vždy $svjId = requireSvj($user), pak používat $svjId

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
