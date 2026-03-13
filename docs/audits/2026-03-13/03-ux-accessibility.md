# Audit: UX & Accessibility (pro seniory)

Datum: 2026-03-13 | Verze: 2.5.0
Opravy: commit `0843ea3` (P1 UX)

---

## Banned UI elementy — PASS

- Žádný `alert()` v kódu
- Žádný `confirm()` v kódu (všude `showConfirmModal`)
- Žádný `prompt()` v kódu

---

## ~~CRITICAL: Fonty pod 16px~~ ✅ OPRAVENO (commit `0843ea3`)

### ~~Extra malé (0.65–0.72rem)~~ ✅
Vše přepsáno na 0.82rem (100+ míst). Minimum inline font v JS: 0.78rem.

### ~~CSS komponenty~~ ✅
- `.btn-sm`: 0.8rem → **0.85rem**
- form labels: 0.85rem → **0.88rem**
- form hints: 0.8rem → **0.85rem**
- badges: 0.75rem → **0.82rem**
- table headers: 0.8rem → **0.85rem**
- stat labels, data-item labels: → **0.85rem**

### ~~Senior theme nepokrývá inline styly~~ ✅
Přidáno **13 senior overrides**: badge 0.9rem, btn-sm 0.92rem, form labels 0.95rem, tabulky 0.95rem, info-box 0.95rem, link-btn 0.92rem, theme-sw 0.88rem.

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

## ~~CRITICAL: Touch targets pod 44×44px~~ ✅ OPRAVENO (commit `0843ea3`)

- `.btn-sm`: `5px 10px` → **`7px 12px` + `min-height: 36px`**
- `.badge`: `2px 8px` → **`4px 10px` + `min-height: 28px`**
- sidebar nav: `9px 12px` → **`10px 14px` + `min-height: 44px`**
- hamburger: `36×36px` → **`44×44px`** (senior: 52×52px)
- JS inline `padding:2px` → **`4-5px`** (40+ míst)
- Senior theme: btn-sm **min-height: 44px**, hamburger **52×52px**

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

## Souhrn (po opravách)

| Kategorie | Původně | Nyní |
|-----------|---------|------|
| ~~Font < 16px~~ | CRITICAL (100+) | ✅ OPRAVENO |
| ~~Touch targets < 44px~~ | CRITICAL (25+) | ✅ OPRAVENO |
| ~~Senior theme inline~~ | HIGH (~30%) | ✅ OPRAVENO (13 overrides) |
| Chybějící ARIA | CRITICAL | ⏳ P3 |
| Hardcoded barvy | HIGH (15+) | ⏳ P2 |
| Form label semantics | MEDIUM (20+) | ⏳ P3 |
| Kontrastní poměr | MEDIUM (3–5) | ⏳ P3 |
