# Changelog

Všechny změny jsou dokumentovány v tomto souboru.
Formát: [Semantic Versioning](https://semver.org/)

---

## [1.2.1] — 2026-03-11

### Opraveno

- **Iframe náhled HTML/PDF v datové schránce** — odstraněn konflikt dvou X-Frame-Options hlaviček (`DENY` z `api/.htaccess` + `SAMEORIGIN` z virtualhostu → Chrome volil přísnější DENY a blokoval iframe)
- `api/.htaccess`: odstraněn `Header DENY`, virtualhost `SAMEORIGIN` zůstává jako jediný zdroj
- Sandbox iframe rozšířen na `allow-scripts allow-same-origin` pro správné renderování HTML zpráv z datovky

---

## [1.2.0] — 2026-03-11

### Přidáno

#### Archiv datové schránky (ISDS) — nová stránka `#datovka`
- Nová položka v menu (jen admin/výbor): 📬 Datová schránka
- Upload `.zfo` souborů (drag & drop nebo klik) — každá zpráva stažená z datovky
- ZFO parser (`api/zfo_parser.php`) — zpracuje CMS/PKCS7 binární obálku:
  - Extrahuje metadata: ID zprávy, odesílatel, ISDS ID, předmět, č. jednací, timestamp
  - Dekóduje base64 přílohy (HTML, PDF, XML, libovolný typ)
  - Zvládá ASN.1 OCTET STRING chunking (přílohy rozdělené po 1000 bytech)
  - Extrahuje čas zprávy z kvalifikovaného timestampu (PostSignum TSA)
- Kartotéka zpráv — seznam karet s odesílatelem, předmětem, datem, počtem příloh
- Detail zprávy — modal s metadaty + přílohami (stáhnout / náhled inline)
- Náhled příloh: HTML v sandboxed iframe, PDF inline
- Ochrana: přílohy v `uploads/datovka/{svj_id}/{zprava_id}/` za `.htaccess`
- Duplicita: zpráva se stejným dm_id se nahrát nedá
- Průvodce tab — 5 kroků jak stáhnout ZFO z datovky + FAQ
- Migration: `020_datovka.sql` (tabulky datovka_zpravy + datovka_prilohy)

---

## [1.1.0] — 2026-03-11

### Přidáno

#### QR kódy pro jednotky
- QR tlačítko u každé jednotky → modal s QR kódem (api.qrserver.com)
- Obsah QR: č. jednotky, SVJ, k.ú., LV, využití
- Tisk QR kódu jednotlivé jednotky nebo všech najednou (print window)

#### Export výkazů (XLSX/CSV)
- Nový endpoint `api/export.php` — unified export pro 5 typů dat
- Čistý XLSX writer `api/xlsx_helper.php` (ZipArchive, žádné závislosti, tučná hlavička)
- CSV s UTF-8 BOM (správné otevření v Excelu)
- Exportovatelné: vlastníci, jednotky, fond oprav, revize, parkovací místa
- Export tlačítka v: Jednotky, Vlastníci, Fond oprav, Revize (jen výbor/admin)

#### Integrace s datovou schránkou (ISDS) — `019_isds.sql`
- Pole `isds_id` přidáno do tabulky `svj`
- API akce `getIsds` a `updateIsds` v `svj.php`
- Karta "Datová schránka" v Správě portálu (jen admin)
- Validace formátu ID (4–7 alfanumerických znaků)
- Odkaz na ověření schránky: mojedatovaschranka.cz

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
