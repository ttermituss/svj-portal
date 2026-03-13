# UX & Accessibility Audit — 2026-03-13

**Skóre: 68/100 → 85/100 (po opravách)**

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

- [ ] **U6 — 0.75rem v sidebar subtitle** — `layout.css:34`
- [ ] **U7 — btn-sm min-height:36px** — `components.css:106` (pod 44px minimum)
- [ ] **U8 — Hardcoded barvy v dokumenty.js** — file type badge hex barvy (13-22)
- [ ] **U9 — Hardcoded barvy v kalendar.js** — event dot colors (16-19)
- [ ] **U10 — Hardcoded #f6993f v fond-rozpocet/zalohy** — warning barvy
- [ ] **U11 — Senior theme neboostuje kontrast** — jen sizing, ne colors
- [ ] **U12 — Senior theme neovlivní inline JS font-size** — highest specificity
- [ ] **U13 — Sidebar nav links nemají focus-visible styl** — layout.css
- [ ] **U14 — Chybí skip-to-content link** — index.html
- [ ] **U15 — Login form labels bez for atributu** — login.js:41-73
- [ ] **U16 — Toggle switches bez role="switch"** — nastaveni.js:217
- [ ] **U17 — showConfirmModal neobnovuje focus po zavření** — ui.js
- [ ] **U18 — Žádné aria-required na required polích**
- [ ] **U19 — Admin buttons s padding:4px 10px** — malé touch targets

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
