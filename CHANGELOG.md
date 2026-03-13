# Changelog

Všechny změny jsou dokumentovány v tomto souboru.
Formát: [Semantic Versioning](https://semver.org/)

---

## [2.1.0] — 2026-03-13

### Přidáno

#### Fond oprav — Fáze 2: editace, přílohy, filtrování
- **Editace záznamů** — modal `fondShowRecordModal` slouží pro přidání i editaci (tlačítko ✏️ u každého záznamu)
  - Nová API akce `update` (POST, admin/výbor) s validací přes sdílenou `fondValidateRecord()`
- **Přílohy k záznamům** — upload PDF/JPEG/PNG (max 10 MB) ke každému záznamu fondu oprav
  - Tabulka `fond_prilohy` (FK na `fond_oprav` s CASCADE delete)
  - Upload přes multipart POST (`finfo` MIME check, filename `{svj_id}_{hex}.{ext}`)
  - Stažení přes auth endpoint s tenant isolation
  - Smazání přílohy (soubor + DB záznam)
  - Sekce příloh v edit modalu (upload + seznam + smazání)
  - Indikátor 📎 s počtem příloh u každého záznamu v seznamu
  - Upload dir `uploads/fond/` s `.htaccess` (deny PHP execution)
- **Filtrování a vyhledávání** — filtrační bar nad záznamy
  - Select rok (dynamicky z dat), typ (Příjem/Výdaj), kategorie (dynamicky dle typu)
  - Fulltext hledání v popisu (debounce 300ms, LIKE na backendu)
  - Tlačítko Reset pro smazání všech filtrů
  - Filtry předávány do API `list` jako query parametry (`rok`, `typ`, `kategorie`, `q`)
- **Stránkování** — navigace Předchozí/Další v seznamu záznamů (30 per page) s info "X–Y z N"
- **Smazání záznamu** — automatické smazání souborů příloh při smazání záznamu (před DB CASCADE)
- Frontend rozdělen na 3 soubory: `fond-oprav.js` (stránka + filtry), `fond-oprav-modal.js` (modal + přílohy), `fond-oprav-detail.js` (render komponenty)
- Migration: `031_fond_oprav_ext.sql`

---

## [2.0.0] — 2026-03-12

### Přidáno

#### Google integrace — OAuth 2.0, Gmail, Calendar sync
- **OAuth 2.0** — bezpečné propojení Google účtu (per-user tokeny šifrované AES-256-CBC)
  - HMAC-signed state parametr proti CSRF
  - Auto-refresh tokenů, odpojení účtu
  - Credentials (Client ID + Secret) zadává admin ve Správě portálu → Systémová nastavení (ne na serveru)
- **Gmail** — nová stránka `#gmail` (jen admin/výbor)
  - Čtení inboxu s vyhledáváním a stránkováním
  - Detail zprávy v modalu (HTML v sandboxed iframe)
  - Odesílání emailů přes propojený Google účet (UTF-8, B-encoding)
- **Google Calendar** — obousměrná synchronizace s kalendářem portálu
  - Push: odeslání vlastních událostí do Google Calendar (celodenní i časové)
  - Pull: načtení událostí z Google Calendar pro aktuální měsíc
  - Sync tracking tabulka (`google_calendar_sync`) pro deduplikaci
  - Tlačítko „🔄 Google" v kalendáři (zobrazeno jen pokud je Google připojen)
- **In-app průvodce** — 5 kroků jak nastavit Google Cloud projekt + FAQ
  - Interaktivní akordeon s copy-to-clipboard na kódové bloky
  - Auto-generated redirect URI
- **Composer** — `google/apiclient` v2.x, cleanup script (jen Calendar/Drive/Gmail/Oauth2 services)
- API: `google_helper.php`, `google_oauth.php`, `google_gmail.php`, `google_calendar.php`
- Frontend: `nastaveni-google.js`, `gmail.js`, `kalendar-gcal.js`
- Migrations: `029_google_sync.sql`, `030_google_settings.sql`

---

## [1.9.0] — 2026-03-12

### Přidáno

#### Měřidla a odečty — nová stránka `#meridla`
- Evidence vodoměrů, plynoměrů, elektroměrů a měřičů tepla
- 6 typů: studená voda, teplá voda, plyn, elektřina, teplo, jiné
- Karty seskupené dle umístění (společné / per jednotka), cejch badge (OK/Brzy/Vypršel)
- CRUD měřidel pro admin/výbor: modal s výběrem jednotky, typ, výrobní číslo, cejchování
- **Self-service odečty** — vlastník vidí měřidla své jednotky + může zapsat odečet
- Modal odečtů: tabulka s historií, automatický výpočet spotřeby (delta), kdo odečetl
- Inline přidání odečtu přímo v modalu (datum + hodnota)
- API endpoint `api/meridla.php` (list/save/delete/odectyList/odectySave/odectyDelete/spotreba)
- Migration: `028_meridla.sql` (tabulky `meridla` + `odecty`)

#### Revize — přesun do levého menu
- Revize mají vlastní stránku `#revize` v menu (jen admin/výbor)
- Stránka O domě zobrazuje jen mini read-only přehled s odkazem na detail

---

## [1.8.0] — 2026-03-12

### Přidáno

#### Revize — rozšíření (historie, kontakty, notifikace)
- **Historie revizí** — archiv všech provedených revizí v modalu s timeline (datum, výsledek, náklady, PDF)
- **Výsledek revize** — ok / se závadami / nezpůsobilé — barevné badge
- **Revizní firma** — propojení s katalogem kontaktů (FK, select v formuláři)
- **Náklady** — evidence ceny na hlavní revizi i na každém záznamu historie
- **Notifikace** — konfigurovatelné připomenutí X dní před vypršením termínu (per revize)
- CRUD na historii: přidání, úprava, smazání, upload PDF protokolu per záznam
- API rozšířeno: `historieList`, `historieSave`, `historieDelete`, `historieDownload`
- Frontend rozdělen na 3 soubory: `admin-revize.js` (seznam), `admin-revize-form.js` (formulář), `admin-revize-historie.js` (modal)
- Migration: `027_revize_ext.sql` (sloupce `kontakt_id`, `naklady`, `pripomenout_dni` + tabulka `revize_historie`)

#### Kontakty — servisní firmy a řemeslníci (`#kontakty`)
- Nová stránka přístupná všem přihlášeným členům SVJ
- Evidence důležitých kontaktů: název, telefon, email, web, adresa, poznámka
- 12 kategorií: správce, výtah, elektro, plyn, voda, topení, klíčová služba, úklid, zahradník, pojišťovna, účetní, jiné
- Karty seskupené dle kategorie s ikonami, klikatelné telefony/emaily/weby
- CRUD modal pro admin/výbor (přidání, úprava, smazání s potvrzením)
- Read-only přehled pro řadové vlastníky
- API endpoint `api/kontakty.php` (list/save/delete, tenant isolation)
- Migration: `026_kontakty.sql`

---

## [1.7.0] — 2026-03-12

### Přidáno

#### Fond oprav — plnohodnotný dashboard (`#fond-oprav`)
- Nová separátní stránka v menu (jen admin/výbor) s kompletním přehledem hospodaření
- **Bankovní účty SVJ** — evidence účtů (název, číslo, banka, typ, zůstatek, úrok. sazba), CRUD modaly, celkový zůstatek
- **Roční přehled** — tabulka po rocích (příjmy, výdaje, saldo, kumulativní zůstatek), meziročí porovnání
- **Trend zůstatku** — SVG čárový graf vývoje zůstatku za 24 měsíců
- **Rozšířené statistiky** — top kategorie výdajů (horizontal bar chart), průměrné měsíční příjmy/výdaje
- **Měsíční graf** — rozšířen na 120px výšku, větší bary
- Přidání záznamu přes moderní modal (místo inline formuláře)
- Stránka O domě: zjednodušen na read-only (zůstatek, mini graf, odkaz na detail)
- Export PDF/XLSX/CSV zachován
- Migration: `025_fond_ucty.sql` (tabulka `fond_ucty`)
- API rozšířeno: `statsRocni`, `statsKat`, `uctyList`, `uctySave`, `uctyDelete`

### Změněno
- Barvy v kalendáři: modrá (hlasování/dokumenty), oranžová (závady), fialová (události) — lepší rozlišení

---

## [1.6.0] — 2026-03-12

### Přidáno

#### Vlastní události v kalendáři
- Admin/výbor může vytvářet vlastní události přímo v kalendáři (tlačítko „+ Nová událost")
- Modal formulář: název, popis, datum od/do, celodení/časové, místo, kategorie (schůzka/údržba/kontrola/společenská/jiné), opakování
- Editace a smazání existujících vlastních událostí z denního detailu
- Vícedenní události zobrazeny na každém dni v rozsahu
- Nový API endpoint `api/kalendar_udalosti.php` (CRUD: list/save/delete)
- Migration: `023_kalendar_udalosti.sql`

#### Notifikace
- Zvonkový badge v hlavičce s počtem nepřečtených notifikací (polling 60s)
- Dropdown panel s výpisem notifikací — ikona dle typu, čas, označení jako přečtené
- Tlačítko „Označit vše" pro hromadné přečtení
- Klik na notifikaci → navigace na příslušnou stránku
- Automatické vytvoření notifikací při nové události (pro členy SVJ s preference zapnutou)
- Nový API endpoint `api/notifikace.php` (count/list/read/readAll)
- Uživatelské preference notifikací v Nastavení účtu — toggle pro: události, závady, hlasování, revize
- Nový endpoint `api/user.php?action=getNotifPrefs/updateNotifPrefs`
- Migration: `024_notifikace.sql` (tabulka `notifikace` + 4 preference sloupce na `users`)

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
