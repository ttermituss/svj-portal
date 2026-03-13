# Audit: Architecture & Consistency

Datum: 2026-03-13 | Verze: 2.5.0

---

## CRITICAL: README.md outdated

**Soubor:** `README.md:130`
```
"# Aktuálně: 001–031"
```
Skutečný stav: 35 migrací (001–035). Nutno opravit.

---

## HIGH: Soubory překračující 500 řádků

### JavaScript (6 souborů):
| Soubor | Řádků | Doporučení |
|--------|-------|------------|
| `js/pages/dokumenty.js` | 570 | Rozdělit: list + upload |
| `js/pages/fond-oprav.js` | 558 | Rozdělit: dashboard + list |
| `js/pages/fond-oprav-detail.js` | 528 | Rozdělit funkční celky |
| `js/pages/jednotky.js` | 524 | Extrahovat edit modal |
| `js/pages/nastaveni-google.js` | 507 | Extrahovat průvodce |
| `js/pages/hlasovani.js` | 505 | Extrahovat form builder |

### PHP (1 soubor):
| Soubor | Řádků | Doporučení |
|--------|-------|------------|
| `api/fond_oprav.php` | 592 | Rozdělit: hlavní + přílohy + účty |

---

## HIGH: Hardcoded barvy v JS

Porušení pravidla "vždy `var(--*)`":

| Soubor | Problém |
|--------|---------|
| `admin-penb.js:3-6` | PENB_BARVY: #1a7c00, #4a9e2a, #8fc127, #f4c400, #f08600, #d44000, #c00000, #fff |
| `admin-revize-historie.js` | #f08600, #fff |
| `admin-revize.js` | #f08600, #fff |
| `dokumenty.js` | Mapa barev typů souborů: #ffebee, #e3f2fd, #e8f5e9, #f3e5f5, #c62828, #1565c0, #2e7d32, #6a1b9a |
| `datovka.js`, `datovka-guide.js` | #fff |

**Fix:** Definovat v `css/theme.css` jako custom properties.

---

## MEDIUM: Chybějící PHPDoc hlavičky

Soubory bez dokumentačního bloku:
- `api/admin.php`
- `api/avatar.php`
- `api/datovka.php`
- `api/auth.php`

---

## PASSING (vše v pořádku)

| Kontrola | Stav |
|----------|------|
| JS pages vs index.html script tags | 49/49 match |
| Migrace sekvence 001–035 | Bez mezer |
| CLAUDE.md architektura | Aktuální |
| API response formát (jsonOk/jsonError) | Konzistentní |
| requireMethod() na POST endpoints | Konzistentní |
| Modaly: showConfirmModal na delete | Konzistentní |
| Žádný alert/confirm/prompt | Čisté |
| DB naming (snake_case) | Konzistentní |
| PHP handler naming (camelCase) | Konzistentní |
| CSS class naming (kebab-case) | Konzistentní |
| XSS prevence (textContent) | Konzistentní |
| Auth access control | Konzistentní |
| Export pattern | Jednotný |

---

## Souhrn

| Kategorie | Pass | Fail |
|-----------|------|------|
| File structure | 49/49 | 0 |
| API patterns | 29/29 | 0 |
| Frontend patterns | 45/45 | 0 |
| Naming conventions | vše | 0 |
| **File size** | 36/43 | **7** |
| **Theme variables** | většina | **mnoho hardcoded** |
| **Docs accuracy** | 32/35 | **3** |

**Celkově:** Silná architektonická konzistence. Hlavní problémy: file size creep, hardcoded barvy, README outdated.
