# Changelog

Všechny změny jsou dokumentovány v tomto souboru.
Formát: [Semantic Versioning](https://semver.org/)

---

## [1.5.0] — 2026-03-12

### Přidáno

#### Hlášení závad — nová stránka `#zavady`
- Každý přihlášený člen může nahlásit závadu (název, popis, místo v domě, priorita, volitelná fotka)
- Přehled závad s filtrem dle stavu (Nová / V řešení / Vyřešeno / Zamítnuto) a počítadla
- Detail závady v modalu: info, fotka, timeline historie změn, komentáře
- Výbor/admin: změna stavu, priority, přiřazení zodpovědné osoby/firmy
- Admin: smazání závady (včetně fotky a historie)
- Upload fotek: JPEG, PNG, WebP (max 5 MB), servírováno přes auth endpoint
- Komentáře: každý člen může přidávat poznámky k závadě
- Timeline: chronologická historie všech změn stavu, priority, přiřazení a komentářů
- Export závad: PDF/XLSX/CSV (jen výbor/admin)
- Migration: `022_zavady.sql` (tabulky `zavady` + `zavady_historie`)

#### Kalendář — nová stránka `#kalendar`
- Měsíční kalendář s navigací (předchozí/následující měsíc, tlačítko Dnes)
- Agregované události ze všech modulů: revize, PENB, hlasování, dokumenty, závady, fond oprav
- Barevné tečky na dnech dle typu události (červená = deadline, oranžová = termín, modrá = závady, zelená = vyřešeno)
- Kliknutí na den → detail panel s výpisem událostí a navigací na příslušnou stránku
- Zvýrazněný aktuální den, automatické zobrazení dnešních událostí
- Legenda typů událostí
- API endpoint `api/kalendar.php` — unified event aggregation ze 6 tabulek
- Fond oprav viditelný v kalendáři jen pro výbor/admin

---

## [1.4.0] — 2026-03-12

### Přidáno

#### Export do PDF
- Nový formát `pdf` v `api/export.php` vedle stávajících `xlsx` a `csv`
- Pure PHP PDF generátor `api/pdf_helper.php` — žádné externí závislosti
- Embeddovaný font **DejaVu Sans** (Regular + Bold) v `api/fonts/` — plná podpora českých znaků (č, ř, ě, š, ž, ů, ď, ť, ň)
- TTF parser (cmap + hmtx) pro správné šířky glyfů a CIDFont Type2 embedding
- A4 landscape, automatické stránkování, hlavička tabulky na každé stránce
- Alternující řádky, titulek s názvem SVJ, patička s datem a číslem stránky
- Automatický výpočet šířek sloupců, truncation s elipsou pro dlouhý text
- Tlačítko „Export PDF" na stránkách: Jednotky, Vlastníci, Fond oprav, Revize
- `.htaccess` v `api/fonts/` blokuje přímý přístup k fontům přes web

---

## [1.3.0] — 2026-03-11

### Přidáno

#### Propojení vlastníků s jednotkami
- Nové pole `telefon` u registrovaných uživatelů — každý si nastaví sám v Nastavení účtu
- Nové pole `jednotka_id` v tabulce `users` — admin/výbor přiřadí konkrétní byt ke každému uživateli
- Správa portálu → Uživatelé: nové sloupce Telefon a Jednotka, tlačítko „Přiřadit/Změnit"

#### Pronájmy a nájemci
- Každá jednotka může být označena jako pronajímaná (příznak + kontakt na nájemce)
- Pole: `pronajem`, `najemce_jmeno`, `najemce_prijmeni`, `najemce_email`, `najemce_telefon`, `poznamka`
- Stránka Jednotky: sloupec Vlastník, badge „Pronájem", tlačítko „Upravit" → modal (jen výbor/admin)
- Kontakty nájemce skryté pro řadové vlastníky

#### Neregistrovaní vlastníci (`vlastnici_ext`)
- Nová tabulka a endpoint `api/vlastnici_ext.php` pro vlastníky bez portálového účtu
- Evidence: jméno, příjmení, telefon, e-mail, přiřazená jednotka, poznámka
- Správa portálu: nová karta „Neregistrovaní vlastníci" s přidáním, úpravou a smazáním
- Stránka Vlastníci: druhá sekce „Ostatní vlastníci" ze stejného zdroje

#### Export rozšířen
- Export vlastníků: přidány sloupce Telefon a Jednotka
- Export jednotek: přidány sloupce Vlastník, Pronájem, Nájemce, Tel. nájemce, Poznámka (vyžaduje výbor/admin)

### Migrace
- `021_vlastnici_ext.sql` — `users.telefon`, `users.jednotka_id`, pronájem/nájemce do `jednotky`, nová tabulka `vlastnici_ext`

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
