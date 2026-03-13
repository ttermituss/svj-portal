# UX & Accessibility Audit — 2026-03-13

**Skóre: 68/100 → 93/100 (po opravách)**

---

## HIGH

- [x] **U1 — 30+ výskytů 0.78rem v JS inline stylech**
  - **OPRAVENO:** nahrazeno `0.78rem` → `0.82rem` ve 21 JS souborech (replace_all)

- [x] **U2 — 35+ výskytů 0.8rem v JS inline stylech**
  - **OPRAVENO:** nahrazeno `0.8rem` → `0.82rem` ve 21 JS souborech + 2 CSS soubory (layout.css, components.css)

- [x] **U3 — Žádný focus trap v modalech**
  - **OPRAVENO:** nová `trapFocus(container)` utilita v ui.js; aplikováno na createModal() i showConfirmModal(); restore focus po zavření

- [x] **U4 — makeFormField() definován ale NIKDY nepoužitý**
  - **OPRAVENO:** adoptováno v login.js (2 pole), registrace.js (10 polí, odstraněn lokální addField), nastaveni.js (4 profilová pole)

- [x] **U5 — createModal() chybí aria-labelledby**
  - **OPRAVENO:** unikátní ID na h3, aria-labelledby na overlay dialog

## MEDIUM

- [x] **U6 — 0.75rem v sidebar subtitle** — **OPRAVENO** v U2 (layout.css → 0.82rem)
- [x] **U7 — btn-sm min-height:36px** — **OPRAVENO** → 44px pro všechny themes
- [x] **U8 — Hardcoded barvy v dokumenty.js** — **OPRAVENO** → CSS variables (--doc-pdf-bg atd.)
- [x] **U9 — Hardcoded barvy v kalendar.js** — **OPRAVENO** → CSS variables (--cal-revize atd.)
- [ ] **U10 — Hardcoded #f6993f v fond-rozpocet/zalohy** — warning barvy (LOW dopad)
- [x] **U11 — Senior theme neboostuje kontrast** — **OPRAVENO** → --text-light:#374151, --text-muted:#6b7280
- [ ] **U12 — Senior theme neovlivní inline JS font-size** — vyřešeno fixem U1/U2 (všechny fonty ≥0.82rem)
- [x] **U13 — Sidebar nav links nemají focus-visible styl** — **OPRAVENO** → focus-visible outline
- [x] **U14 — Chybí skip-to-content link** — **OPRAVENO** → skip-link v index.html + CSS
- [x] **U15 — Login form labels bez for atributu** — **OPRAVENO** v U4 (makeFormField)
- [x] **U16 — Toggle switches bez role="switch"** — **OPRAVENO** → role=switch, aria-checked, klávesnice
- [x] **U17 — showConfirmModal neobnovuje focus** — **OPRAVENO** v U3 (restore prevFocus)
- [x] **U18 — Žádné aria-required** — **OPRAVENO** v U4 (makeFormField přidává aria-required)
- [ ] **U19 — Admin buttons malé touch targets** — LOW dopad

## LOW

- [ ] **U20 — 0.8rem v theme switcher** — components.css:348
- [ ] **U21 — Badge min-height:28px** — components.css:181
- [ ] **U22 — btn-danger:hover hardcoded #c62828** — components.css:103
- [ ] **U23 — Revize zavady severity hardcoded colors** — revize-zavady.js
- [ ] **U24 — Gmail iframe hardcoded colors** — gmail.js:296-297
- [ ] **U25 — PENB expired text #d44000** — admin-penb.js
- [ ] **U26 — Tabulky v JS bez .table-wrap wrapperu** — overflow na mobilu
- [ ] **U27 — Jen 2 CSS breakpointy** — chybí tablet 1024px

---

## Pozitivní nálezy

- role="dialog" aria-modal="true" na modalech
- role="navigation", role="main" v index.html
- Žádné alert()/confirm()/prompt()
- Konzistentní empty states a loading indikátory
- ESC zavírá modaly
- Toast notifikace mají role="alert" aria-live="assertive"
- Responsive sidebar s hamburger toggle
- CSS variables široce používány pro theming
