# Audit: UX & Accessibility (pro seniory)

Datum: 2026-03-13 | Verze: 2.5.0

---

## Banned UI elementy — PASS

- Žádný `alert()` v kódu
- Žádný `confirm()` v kódu (všude `showConfirmModal`)
- Žádný `prompt()` v kódu

---

## CRITICAL: Fonty pod 16px

Projekt porušuje vlastní pravidlo min. 16px v mnoha místech.

### Extra malé (0.65–0.72rem = 10–11px)
- `js/notifikace.js:29` — badge: `font-size:0.65rem`
- `js/notifikace.js:193` — timestamp: `font-size:0.72rem`
- `js/pages/nastaveni-google.js:317` — chevron: `font-size:0.65rem`
- `js/pages/admin-fond-oprav.js:106` — chart label: `font-size:0.65rem`
- `js/pages/fond-oprav.js:418` — chart label: `font-size:0.65rem`
- `js/pages/kalendar.js:266` — "více" link: `font-size:0.65rem`
- `js/pages/revize-zavady.js:100,112,170` — badge/button: `font-size:0.72rem`

### Malé (0.75–0.78rem = 12–12.5px)
Systematicky v: notifikace, form hints, badge labely, table headers, chart legendy, timestamps.

### CSS komponenty:
- `css/components.css:106` — `.btn-sm: font-size: 0.8rem` (12.8px)
- `css/components.css:117` — form labels: `font-size: 0.85rem` (13.6px)
- `css/components.css:165` — form hints: `font-size: 0.8rem` (12.8px)
- `css/components.css:178` — badges: `font-size: 0.75rem` (12px)
- `css/components.css:259` — table headers: `font-size: 0.8rem` (12.8px)

### Senior theme nepokrývá inline styly
Senior theme zvětšuje base font na 22px, ale ~30% UI používá inline `font-size` v JS, které se neškálují s tématem.

---

## HIGH: Hardcoded barvy (ne CSS proměnné)

### CSS:
- `css/components.css:80,99` — `.btn-primary color: #fff`
- `css/components.css:103` — `.btn-danger background: #c62828`
- `css/components.css:291` — `.info-box-warning color: #7a6400`

### JavaScript inline:
- `js/ui.js:17` — toast: `#2e7d32` (success), `#c62828` (error)
- `js/ui.js:183` — avatar palette: hardcoded hex barvy
- `js/pages/revize-zavady.js:5` — severity: `#f08600`
- `js/pages/meridla.js:192` — badge: `color:#fff`

---

## CRITICAL: Touch targets pod 44×44px

- `css/components.css:106` — `.btn-sm: padding: 5px 10px`
- `js/notifikace.js:100` — close button: `padding:3px 8px`
- `js/pages/fond-oprav-modal.js:207` — delete: `padding:2px 6px`
- `js/pages/kalendar.js:364` — edit: `padding:2px 8px`
- `js/pages/admin-cenova-mapa.js:92` — badge: `padding:1px 7px`
- `css/layout.css:51` — sidebar nav: `padding: 9px 12px`
- `css/layout.css:118-119` — hamburger: `width:36px;height:36px`

---

## CRITICAL: Chybějící ARIA atributy

Celý projekt nemá žádné:
- `aria-label` na tlačítkách
- `aria-required` na formulářích
- `aria-live` na dynamickém obsahu
- `role` atributy na custom komponentách

---

## MEDIUM: Formuláře

- Chybí `<label for="...">` propojení — většina formulářů v JS
- Placeholdery místo viditelných labelů
- Povinná pole označena `*` ale bez `aria-required`

---

## MEDIUM: Kontrastní poměr

- `--text-light: #6b7280` na bílém pozadí — 4.5:1 (AA, ale těsně)
- Dark theme: `--text-light: #9ca3af` na `--bg-card: #1e1e2a` — ověřit
- `.info-box-warning: color: #7a6400` na `#fff8e1` — hraničně

---

## Souhrn

| Kategorie | Závažnost | Výskyt |
|-----------|-----------|--------|
| Font < 16px | CRITICAL | 100+ míst |
| Touch targets < 44px | CRITICAL | 25+ |
| Chybějící ARIA | CRITICAL | celý projekt |
| Hardcoded barvy | HIGH | 15+ |
| Senior theme neškáluje inline | HIGH | ~30% UI |
| Form label semantics | MEDIUM | 20+ stránek |
| Kontrastní poměr | MEDIUM | 3–5 míst |
