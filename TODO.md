# SVJ Portál — TODO & Roadmap

---

## ⚡ TLDR — Pravidla (vždy dodržovat)

### Kód
- **DRY** — žádný duplicitní kód, opakující se logika → helper/modul
- **KISS** — nejjednodušší řešení které funguje, žádný over-engineering
- **YAGNI** — nepsat co teď není potřeba
- **Max 500 řádků/soubor** — při překročení rozdělit na moduly
- `textContent` místo `innerHTML` — vždy (XSS!)
- SQL: vždy **PDO prepared statements**, nikdy string concat
- `svj_id` **vždy ze session**, nikdy z GET/POST

### Commity
```
feat: nová funkce
fix: oprava bugu
refactor: změna bez změny chování
chore: build, deps, config
docs: dokumentace
```

### Bezpečnost
- SQL injection → prepared statements
- XSS → `textContent`, `strip_tags()`
- Tenant isolation → `svj_id` ze session
- Citlivé hodnoty v DB → AES-256-CBC (`settings_crypto.php`)
- Hesla → `password_hash(..., PASSWORD_BCRYPT)`
- Tokeny → `bin2hex(random_bytes(32))`
- Nikdy necommitovat `api/config.php`

### Témata — VŽDY všechna 3
| Theme | Atribut |
|---|---|
| Světlý | `[data-theme="light"]` (default) |
| Tmavý | `[data-theme="dark"]` |
| Senior | `[data-theme="senior"]` |
- **Žádné hardcoded barvy** — vždy `var(--bg-*)`, `var(--text-*)`, `var(--border)`
- Min. font **16px**, min. tap target **44×44px**

### Zakázané UI prvky
- ❌ `alert()` → `showToast(msg, 'error')`
- ❌ `confirm()` → `showConfirmModal(title, detail, onConfirm)`
- ❌ `prompt()` → inline formulář v modalu

### Testy
- Každý nový API endpoint → otestovat v prohlížeči + zkontrolovat HTTP kód
- Auth testy: přístup bez přihlášení musí vrátit 401/403
- Tenant isolation: data jednoho SVJ nesmí být viditelná jinému

### Migrace DB
```bash
sudo mysql svj_portal < api/migrations/00X_popis.sql
```
Nová migrace = nový soubor `api/migrations/00X_popis.sql`, nikdy editovat stávající.

---

## ✅ Hotovo

- [x] Základní SPA shell (router, auth, témata, layout)
- [x] Přihlášení + registrace admina přes IČO (ARES)
- [x] Invite systém (tokeny, role)
- [x] Multi-tenant model (svj_id isolation)
- [x] Správa uživatelů (role, smazání)
- [x] Nástěnka příspěvků
- [x] Správa vlastníků
- [x] Avatar upload (MIME check, AES šifrování cesty)
- [x] AES-256-CBC šifrování citlivých settings v DB
- [x] ARES integrace — data SVJ, statutární orgán (OR)
- [x] ČÚZK KN integrace — findBuilding, importUnits, plomba monitoring
- [x] RÚIAN — GPS souřadnice + plná adresa (zdarma, bez API klíče)
- [x] Parcely — import z KN, zobrazení v admin kartě
- [x] Mapa budovy — OpenStreetMap iframe + Mapy.cz link
- [x] Jednotky — přehled s Využití, Podíl, LV, K.ú.
- [x] Plomba badge v jednotkách (jen admin/výbor, tooltip s info o aktualizaci)
- [x] Počasí widget — OpenMeteo, aktuální + 7denní výhled, GPS z RÚIAN
- [x] Dashboard statistiky — vlastníci, jednotky, plomby (červeně)
- [x] RÚIAN info o budově — rok výstavby, konstrukce, podlaží, plocha, výtah, vytápění
- [x] Vlastníci — seznam členů SVJ, ISIR deep link (výbor/admin)
- [x] SFPI dotace karta — Panel 2020+, NZÚ, IROP, MMR s kontextovým doporučením
- [x] Hlasování / ankety — vytvoření, hlasování, výsledky s progress bary, quorum, externí hlasy
- [x] **PENB** — průkaz energetické náročnosti (třída A–G, datum platnosti, upload PDF, ⚠ upozornění)
- [x] **Správa dokumentů** — drag & drop upload, kategorie, datum platnosti, přístup výbor/všichni, náhled (PDF/obrázky/MD/TXT inline, markdown renderer), moderní karty s type-box badges
- [x] **Evidence revizí** — výtah, elektro, plyn, hromosvod, hasicí přístroje; interval, auto-termín, PDF protokol
- [x] **Fond oprav** — příjmy/výdaje, zůstatek, měsíční sloupcový graf (CSS, bez knihoven)
- [x] **Okolí budovy** — Overpass API, 600 m, MHD/obchody/zdraví/banky/pošta/parkování, vzdálenosti Haversine
- [x] **Stránka O domě** — nová stránka přístupná všem vlastníkům (PENB, revize, fond, okolí, parkování, ceny)
- [x] **Správa parkovacích míst** — garáže, stání, venkovní, moto; přiřazení k jednotce nebo nájemci
- [x] **Cenová mapa bytů** — info karta s odkazy na cenovamapa.org, ČÚZK, Sreality; adresa z KN

---

## 🚀 Roadmap

### Priorita 1 — Snadné, vysoká hodnota

- [x] **Počasí widget (OpenMeteo)**
  - Free API, bez klíče, vstup: GPS z RÚIAN
  - Kde: dashboard / karta ve správě portálu
  - Data: aktuální počasí + 7denní výhled → plánování oprav, zimní přípravy
  - API: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&...`

- [x] **RÚIAN rozšíření — info o budově**
  - Stejné API co máme (ags.cuzk.cz), bez nového API klíče
  - Data navíc: rok výstavby, počet podlaží, typ konstrukce (zděná/panelová/skelet)
  - Kde: karta ČÚZK KN ve správě portálu + detail budovy
  - Důležité pro: pojistná hodnota, dotační programy, zateplení

### Priorita 2 — Střední obtížnost, velmi užitečné

- [x] **ISIR — Insolvenční rejstřík**
  - ⚠️ Nemá veřejné REST API → implementováno jako deep link do justice.cz
  - Kde: tlačítko ⚖️ ISIR u každého vlastníka (jen admin/výbor)

- [x] **SFPI dotace — přehled programů**
  - Státní fond podpory investic: Panel 2020+, Zelená úsporám, výtahy, zateplení
  - Kde: samostatná karta ve správě portálu nebo info sekce
  - Forma: přehled aktuálních dotačních titulů + přímé linky na žádosti
  - Bonus: filtr podle typu konstrukce budovy (máme z RÚIAN rozšíření)

- [x] **PENB — Průkaz energetické náročnosti**
  - SVJ musí mít PENB ze zákona
  - Kde: karta v správě portálu — nahrání/zobrazení, datum platnosti, připomínka vypršení
  - Bez externího API — správa interně v portálu

- [x] **Hlasování / ankety**
  - Výbor vytvoří hlasování (otázka + možnosti + deadline + rovné/podílové hlasování)
  - Vlastníci hlasují přes portál, výsledky s progress bary a quorem (X/N členů)
  - Výbor může doplnit hlasy z jiné formy (papír, email, schůze) — zobrazeny odlišně

### Priorita 3 — Zajímavé doplňky

- [x] **Cenová mapa bytů**
  - Odkazy na cenovamapa.org, ČÚZK cenové mapy, Sreality — adresa předvyplněna z KN
  - Kde: karta v O domě

- [x] **Správa dokumentů — rozšíření**
  - Kategorie dokumentů (smlouvy, revize, zápisy ze schůzí, pojistky)
  - Datum platnosti + upozornění na vypršení (revize, pojistky, PENB)
  - Přístupnost: veřejné vs. jen výbor

- [x] **Evidence revizí a kontrol**
  - Typy: výtah, elektro, plyn, hromosvod, hasicí přístroje...
  - Datum poslední revize + interval + datum příští
  - Upozornění na blížící se termín

- [x] **Fond oprav — přehled**
  - Sledování zůstatku, příjmů (zálohy), výdajů (opravy)
  - Grafy: vývoj fondu v čase (měsíční sloupcový graf, CSS bez knihoven)

- [x] **Overpass API — okolí budovy**
  - Free OpenStreetMap API
  - Data: MHD zastávky, obchody, lékaři, lékárny, banky, pošta, parkoviště
  - Kde: karta ve správě portálu, načítání na vyžádání, vzdálenosti Haversine

- [x] **Stránka O domě** — nová stránka přístupná všem vlastníkům (PENB, revize, fond oprav, okolí, info o budově)

- [x] **Správa parkovacích míst**
  - Evidence stání (číslo, vlastník/nájemce, typ: garáž/stání/venkovní/moto)
  - Přiřazení k jednotce nebo nájemci, seskupení dle typu

---

## 💡 Nápady do budoucna

- Měřidla a odečty — vodoměry, plynoměry, elektroměry, měřiče tepla; self-service odečty, hromadný odečet, grafy spotřeby
- Revize — vylepšení: historie revizí (archiv), revizní firma (propojení s kontakty), závady z revize, náklady, notifikace
- Push notifikace (PWA) — rozšíření stávajících in-app notifikací o browser push
- Mobilní app (PWA shell)
- API pro správcovské firmy (multi-SVJ správa)

## ✅ Hotovo (doplňky po v1.0.0)

- [x] **QR kódy pro jednotky** — modal, tisk, api.qrserver.com
- [x] **Export výkazů XLSX/CSV** — vlastníci, jednotky, fond oprav, revize, parkovací místa
- [x] **Integrace s datovou schránkou (ISDS)** — ID v svj tabulce, ověření přes mojedatovaschranka.cz
- [x] **Archiv datové schránky** — upload .zfo, ZFO parser (CMS/PKCS7), kartotéka zpráv, náhled příloh, průvodce
- [x] **Propojení vlastníků s jednotkami** — `users.jednotka_id`, telefon, přiřazení v admin; sloupec Vlastník v Jednotkách
- [x] **Pronájmy a nájemci** — příznak + kontakt na nájemce u každé jednotky, modal Upravit (výbor/admin), badge v přehledu
- [x] **Neregistrovaní vlastníci (`vlastnici_ext`)** — evidence jméno/telefon/email/jednotka bez portálového účtu, CRUD v admin kartě
- [x] **Export do PDF** — pure PHP PDF generátor s DejaVu Sans fontem, A4 landscape, stránkování, české znaky; vlastníci, jednotky, fond oprav, revize
- [x] **Hlášení závad** — nahlášení (název, popis, místo, priorita, fotka), stav workflow, komentáře, timeline, export PDF/XLSX/CSV
- [x] **Kalendář** — měsíční přehled událostí ze všech modulů (revize, PENB, hlasování, dokumenty, závady, fond oprav)
- [x] **Vlastní události v kalendáři** — admin/výbor vytváří události (schůzka, údržba, kontrola…), editace, smazání
- [x] **Notifikace** — zvonkový badge, dropdown panel, per-user preference (události, závady, hlasování, revize)
- [x] **Fond oprav — dashboard** — separátní stránka, bankovní účty, roční přehled, trend graf, top výdaje, průměry
- [x] **Kontakty** — servisní firmy a řemeslníci (12 kategorií), CRUD pro admin/výbor, read-only pro vlastníky, seskupení dle kategorie
