# Changelog

Všechny změny jsou dokumentovány v tomto souboru.
Formát: [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2026-03-11

### Přidáno

#### Stránka O domě (nová)
- Samostatná stránka přístupná všem přihlášeným vlastníkům
- Info o budově (adresa, GPS, rok, konstrukce, podlaží, výtah, vytápění)
- PENB — průkaz energetické náročnosti (třída A–G, platnost, PDF)
- Evidence revizí — výtah, elektro, plyn, hromosvod, hasicí přístroje
- Fond oprav — příjmy/výdaje, zůstatek, měsíční sloupcový graf
- Okolí budovy — Overpass API (MHD, obchody, zdraví, banky, pošta, parkování)
- Správa parkovacích míst — garáže, stání, přiřazení k jednotce
- Cenová mapa — odkazy na cenovamapa.org, ČÚZK, Sreality

#### Evidence revizí (`016_revize.sql`)
- Typy: výtah (36m), elektro (60m), plyn (36m), hromosvod (60m), hasicí přístroje (12m)
- Automatický výpočet příštího termínu z intervalu
- Status badge: OK / Brzy vyprší (<60 dní) / Prohláslá
- Upload PDF protokolu (max 10 MB)

#### Fond oprav (`017_fond_oprav.sql`)
- Kategorie příjmů: zálohy vlastníků, dotace, úroky, pojistné plnění
- Kategorie výdajů: oprava střechy, fasáda, výtah, elektro, malování, správa…
- Souhrnné statistiky — zůstatek, příjmy celkem, výdaje celkem
- Měsíční sloupcový graf (posledních 12 měsíců, čistý CSS)

#### Okolí budovy — Overpass API
- PHP proxy na OpenStreetMap Overpass API (bez CORS, bez API klíče)
- Radius 600 m, max 80 POI
- Vzdálenosti výpočtem Haversine
- Načítání na vyžádání (tlačítko)

#### Správa parkovacích míst (`018_parkovani.sql`)
- Typy: garáž, garážové stání, venkovní stání, motocykl, jiné
- Přiřazení k číslu jednotky nebo nájemci (volný text)
- Seskupení dle typu, volná místa zvýrazněna

#### Cenová mapa bytů
- Info karta s přímými odkazy na cenovamapa.org, ČÚZK cenové mapy, Sreality
- Adresa předvyplněna z KN importu

### Změněno

#### Architektura navigace
- Správa portálu: pouze admin věci (uživatelé, pozvánky, KN, SFPI, systém)
- O domě: vše o budově přístupné všem vlastníkům

#### Refaktory (kód)
- `formatDatum()` — sdílený helper v `admin.js` (odstraněny 3 duplikáty)
- `var(--success,#1a7c00)` → `var(--accent)` (správná CSS proměnná)
- `fondReload` DOM hack (přístup přes `children[index]`) → přímé reference

---

## [0.9.0] — 2026-02-xx

### Přidáno
- Správa dokumentů — drag & drop upload, kategorie, platnost, přístup výbor/všichni
- Náhled souborů — PDF, obrázky, Markdown, TXT inline v modalu
- PENB — průkaz energetické náročnosti (třída, platnost, PDF upload)
- Hlasování/ankety — vytvoření, hlasování, výsledky, quorum, externí hlasy
- SFPI dotace — Panel 2020+, NZÚ, IROP, MMR s kontextovým doporučením
- ISIR — insolvenční rejstřík (deep link u každého vlastníka)

---

## [0.8.0] — 2026-01-xx

### Přidáno
- ČÚZK KN integrace — import jednotek, parcel, plomba monitoring
- RÚIAN — GPS, adresa, info o budově (rok, konstrukce, podlaží, výtah)
- Mapa budovy — OpenStreetMap iframe + Mapy.cz odkaz
- Počasí widget — OpenMeteo, aktuální + 7denní výhled
- Dashboard statistiky — vlastníci, jednotky, plomby

---

## [0.7.0] — 2025-xx-xx

### Přidáno
- Multi-tenant SPA základ (router, auth, 3 témata, layout)
- Přihlášení + registrace admina přes IČO (ARES)
- Invite systém (tokeny, role: vlastník/výbor/admin)
- Nástěnka příspěvků
- Správa vlastníků
- Avatar upload (MIME check, AES šifrování)
- AES-256-CBC šifrování citlivých settings v DB
