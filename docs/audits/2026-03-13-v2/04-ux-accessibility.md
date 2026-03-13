# UX & Accessibility Audit — 2026-03-13

**Skóre: 68/100**

---

## HIGH

- [ ] **U1 — 30+ výskytů 0.78rem v JS inline stylech**
  - Předchozí audit fix byl neúplný — tvrdil "posledních 6 míst opraveno" ale zbylo 30+
  - Soubory: notifikace.js, vlastnici.js, odom.js, home.js, meridla-graf.js, nastaveni.js, fond-zalohy.js, fond-oprav-detail.js, revize-zavady.js, meridla.js, admin-revize-form.js, kalendar-gcal.js, admin-parkovani.js, admin-vlastnici-ext.js, admin-settings.js, zavady-detail.js, gmail.js, jednotky.js, admin-revize.js, datovka.js
  - Fix: nahradit `0.78rem` → `0.82rem`

- [ ] **U2 — 35+ výskytů 0.8rem v JS inline stylech** (pod minimum 0.82rem)
  - Soubory: app.js, nastaveni-google.js, admin-penb.js, fond-oprav-detail.js, vlastnici.js, home.js, revize-zavady.js, kalendar-gcal.js, hlasovani.js, kalendar.js, admin-invites.js, admin-settings.js, admin-parkovani.js, admin-fond-oprav.js, meridla-hromadny.js, admin-vlastnici-ext.js, admin-revize.js, fond-zalohy.js, nastaveni-gdrive.js, meridla-modal.js, admin-users.js
  - Fix: nahradit `0.8rem` → `0.82rem`

- [ ] **U3 — Žádný focus trap v modalech**
  - createModal() i showConfirmModal() nemají focus trapping
  - Uživatel může Tab-ovat ven z modalu do pozadí
  - Fix: implementovat focus trap (Tab na posledním → zpět na první, Shift+Tab opačně)

- [ ] **U4 — makeFormField() definován ale NIKDY nepoužitý**
  - ui.js:200-252 definuje helper s label[for], aria-required, aria-describedby
  - Žádná stránka ho nepoužívá — 92+ inputů bez label-input propojení
  - Fix: adoptovat v klíčových formulářích (login, registrace, nastavení)

- [ ] **U5 — createModal() chybí aria-labelledby**
  - Modal má role="dialog" aria-modal="true" ale není propojen s nadpisem
  - Fix: vygenerovat ID pro h3, nastavit aria-labelledby na overlay

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
