# CLAUDE.md — SVJ Portál

Tento soubor řídí práci Claude Code na tomto projektu.

## Co je SVJ Portál

Univerzální **multi-tenant webový portál** pro správu Společenství vlastníků jednotek (SVJ) v ČR.
- Stack: **PHP 8.4 + MySQL 8.4 + vanilla JS** (žádné frameworky, žádný build step)
- Dev URL: `http://svj-portal.local/`
- Apache virtualhost: `/etc/apache2/sites-available/svj-portal.local.conf`
- DB: `svj_portal` (user: `www`, heslo viz `api/config.php` — není v gitu)

## Architektura

```
/
├── index.html              # SPA shell (načítá všechny JS/CSS)
├── css/
│   ├── theme.css           # CSS proměnné, 3 témata (light/dark/senior)
│   ├── layout.css          # sidebar, header, main layout
│   └── components.css      # card, btn, badge, form, table, empty-state…
├── js/
│   ├── theme.js            # přepínač témat
│   ├── ui.js               # showToast, showConfirmModal, makeAvatarEl, copyToClipboard
│   ├── auth.js             # Auth modul (session, user, svj cache)
│   ├── router.js           # hash router (#page)
│   ├── api.js              # Api modul (apiGet, apiPost, createInvite…)
│   ├── notifikace.js       # NotifBadge modul (badge, dropdown, polling)
│   ├── app.js              # init, buildNavWithUser, avatary v nav
│   └── pages/
│       ├── login.js        # přihlášení + registrace IČO (admin)
│       ├── registrace.js   # registrace přes invite token
│       ├── home.js         # úvod (context-aware: SVJ/no-SVJ/guest)
│       ├── nastenka.js     # nástěnka příspěvků
│       ├── vlastnici.js    # správa vlastníků
│       ├── jednotky.js     # přehled jednotek (z KN importu)
│       ├── dokumenty.js    # dokumenty: seznam, karty, helpery
│       ├── dokumenty-upload.js # dokumenty: upload karta (drag&drop, preview, formulář)
│       ├── nastaveni.js    # profil + avatar uživatele
│       ├── nastaveni-google.js # karta: Google integrace (připojit/odpojit Google účet)
│       ├── nastaveni-gdrive.js # karta: Google Drive úložiště (aktivace, sync panel, progress)
│       ├── gmail.js           # stránka: Gmail inbox, detail zprávy, compose modal
│       ├── kalendar-gcal.js   # modal: Google Calendar sync (push/pull)
│       ├── admin.js        # správa portálu: router + SVJ banner + OR karta + helpery
│       ├── admin-users.js  # karta: správa uživatelů
│       ├── admin-invites.js# karta: pozvaánky
│       ├── admin-kn.js     # karta: ČÚZK KN import jednotek
│       ├── admin-sfpi.js   # karta: dotace pro SVJ (Panel 2020+, NZÚ, IROP…)
│       ├── admin-penb.js   # karta: PENB — průkaz energetické náročnosti (třída, platnost, PDF)
│       ├── admin-revize.js # karta: evidence revizí — seznam, status badge, historie tlačítko
│       ├── admin-revize-form.js  # formulář přidání/úpravy revize (kontakt, náklady, připomenutí)
│       ├── admin-revize-historie.js # modal historie: archiv revizí (výsledek, PDF, kontakt, CRUD, závady)
│       ├── revize-zavady.js         # závady z revize: CRUD, závažnost, termín, workflow stavu
│       ├── admin-fond-oprav.js # karta: fond oprav — READ-ONLY mini (zůstatek + graf) pro O domě
│       ├── fond-oprav.js      # stránka: fond oprav dashboard (admin/výbor) — taby, filtry, summary
│       ├── fond-oprav-charts.js # fond oprav: měsíční bar chart, trend SVG, helper funkce
│       ├── fond-oprav-modal.js # fond oprav: modal přidání/editace záznamu + přílohy (upload, seznam, smazání)
│       ├── fond-oprav-detail.js # fond oprav: roční tabulka, statistiky, účty render, záznamy + stránkování
│       ├── fond-rozpocet.js    # fond oprav: rozpočet tab — plán vs. skutečnost, progress bary, CRUD modal
│       ├── fond-zalohy.js      # fond oprav: zálohy tab — předpisy, platby, roční přehled, summary
│       ├── fond-zalohy-modal.js # fond zálohy: modaly — generovat předpisy, editace předpisu, platba zálohy
│       ├── admin-okoli.js  # karta: okolí budovy — Overpass API (MHD, obchody, zdraví…)
│       ├── admin-parkovani.js  # karta: parkovací místa (garáž, stání, venkovní, moto)
│       ├── admin-cenova-mapa.js# karta: cenová mapa — odkazy cenovamapa.org, ČÚZK, Sreality
│       ├── odom.js         # stránka O domě: info o budově + PENB + revize + fond oprav + okolí + parkování + ceny
│       ├── jednotky.js     # jednotky — přehled, Vlastník, Pronájem badge, export; modal Upravit
│       ├── jednotky-qr.js  # jednotky: QR kódy — modal, tisk, api.qrserver.com
│       ├── vlastnici.js    # vlastníci — registrovaní (telefon, jednotka, ISIR) + neregistrovaní (vlastnici_ext)
│       ├── hlasovani.js    # hlasování/ankety (list, create, vote, výsledky)
│       ├── dokumenty.js    # dokumenty — drag&drop upload, kategorie, karty se stahováním
│       ├── dokumenty-preview.js # preview modal (PDF/obrázky/MD/TXT) + markdown renderer
│       ├── zavady.js       # hlášení závad — seznam, filtr, formulář nahlášení (fotka upload)
│       ├── zavady-detail.js # detail modal — info, fotka, timeline, komentáře, admin správa
│       ├── kalendar.js     # měsíční kalendář — události ze všech modulů, denní detail
│       ├── kontakty.js     # stránka: servisní kontakty — karty, kategorie, CRUD modal
│       ├── meridla.js     # stránka: měřidla — seznam karet, seskupení, cejch badge
│       ├── meridla-modal.js # modaly: přidání/úprava měřidla + odečty (tabulka, inline přidání)
│       ├── meridla-hromadny.js # hromadný odečet: modal s tabulkou všech měřidel, batch save
│       ├── meridla-graf.js    # graf spotřeby: CSS bar chart, souhrn, tabulka odečtů
│       ├── admin-vlastnici-ext.js # karta: neregistrovaní vlastníci (vlastnici_ext CRUD + modal)
│       ├── admin-settings.js# karta: systémová nastavení (jen admin)
│       ├── kalendar-modal.js   # modal pro vytvoření/editaci vlastní události
│       ├── datovka.js          # datová schránka — archiv zpráv, přílohy, stav
│       └── datovka-guide.js    # průvodce nastavením datové schránky
└── api/
    ├── config.php          # DB + konstanty (není v gitu — v .gitignore!)
    ├── settings_crypto.php # AES-256-CBC šifrování citlivých settings
    ├── db.php              # getDb() → PDO singleton
    ├── helpers.php         # jsonOk, jsonError, jsonResponse, sanitize, getParam…
    ├── middleware.php      # requireAuth(), requireRole(string ...$roles), requireMethod
    ├── svj_helper.php      # getOrFetchSvj, fetchFromAres, upsertSvj, fetchOrManagement,
    │                       # fetchRuianData (GPS+adresa), fetchKamFromVr, fetchRuianBuildingInfo (tech.info)
    ├── auth.php            # login, logout, register (admin/invite), me, svj
    ├── invite.php          # createInvite, listInvites, deleteInvite
    ├── svj.php             # getSvj, updateSvj, fetchOr (OR/ARES)
    ├── admin.php           # listUsers, updateRole, deleteUser, getSettings, updateSetting
    ├── kn.php              # ČÚZK API KN: status, findBuilding, importUnits
    ├── jednotky.php        # seznam jednotek pro SVJ
    ├── vlastnici.php       # seznam registrovaných členů SVJ (+ telefon, cislo_jednotky)
    ├── vlastnici_ext.php   # CRUD neregistrovaných vlastníků (list/save/delete, tenant isolation)
    ├── stats.php           # dashboard statistiky (vlastníci, jednotky, plomby)
    ├── weather.php         # počasí — proxy OpenMeteo (zdarma, bez klíče), vstup: GPS z RÚIAN
    ├── hlasovani.php       # hlasování/ankety: list, get, create, vote, close, delete, setExterni
    ├── penb.php            # PENB: get, save (upsert + PDF upload), delete, download (auth)
    ├── revize.php          # revize: list, save, delete, download (PDF protokol)
    ├── revize_zavady.php   # závady z revize: list, listByRevize, save, delete, updateStav
    ├── fond_oprav.php      # fond oprav: list (filtry+fulltext+WhereBuilder), stats, statsRocni, statsKat, add, update, delete + notifikace
    ├── fond_prilohy.php    # fond přílohy: upload, list, download, delete (vyčleněno z fond_oprav)
    ├── fond_ucty.php       # fond účty SVJ: list, save, delete (vyčleněno z fond_oprav)
    ├── fond_rozpocet.php   # fond rozpočet: list, save (upsert), delete, compare (plán vs. skutečnost)
    ├── fond_zalohy.php     # fond zálohy: predpisList/Save/Generate/Delete, zalohyList/Generate/Save, zalohyStats
    ├── fond_notif_helper.php # fond notifikace: helper — lowBalance, highExpense, unpaidZalohy
    ├── storage_helper.php  # abstrakční vrstva: hybrid local + GDrive storage (upload/download/delete/sync)
    ├── google_drive.php    # GDrive API: status, enable, disable, syncStart, syncStatus, folderUrl
    ├── google_calendar_webhook.php # Calendar webhook: přijímá push notifikace od Google, inkrementální sync
    ├── okoli.php           # okolí budovy: proxy Overpass API (OSM), POI v 600 m
    ├── parkovani.php       # parkovací místa: list, save (upsert), delete
    ├── kontakty.php        # kontakty: list, save (upsert), delete — servisní firmy, řemeslníci
    ├── meridla.php         # měřidla: list, save, delete, odectyList/Save/Delete, spotreba
    ├── zavady.php          # hlášení závad: list, get, add, update, comment, delete, photo
    ├── kalendar.php        # kalendář: events (agregace ze 7 zdrojů vč. vlastních událostí)
    ├── kalendar_udalosti.php # vlastní události: list, save, delete (admin/výbor)
    ├── notifikace.php      # notifikace: count, list, read, readAll
    ├── export.php          # export výkazů: PDF/CSV/XLSX (vlastnici/jednotky/fond_oprav/revize/parkovani/zavady)
    ├── xlsx_helper.php     # minimální XLSX writer (ZipArchive, žádné závislosti)
    ├── pdf_helper.php      # minimální PDF writer (TTF embedding, CIDFont, žádné závislosti)
    ├── fonts/
    │   ├── DejaVuSans.ttf      # font pro PDF export (české znaky)
    │   ├── DejaVuSans-Bold.ttf # tučný font pro PDF export
    │   └── .htaccess           # blokuje přímý přístup
    ├── dokumenty.php       # dokumenty: list, upload, download, preview (inline), delete
    ├── avatar.php          # upload + delete avataru
    ├── user.php            # updateProfile, changePassword, getNotifPrefs, updateNotifPrefs
    ├── google_helper.php   # Google API klient, token store/load (AES šifrování), auto-refresh, OAuth state
    ├── google_oauth.php    # Google OAuth: authUrl, callback, status, disconnect
    ├── google_gmail.php    # Gmail API: inbox, message detail, send (admin/výbor)
    ├── google_calendar.php # Google Calendar sync: push/pull/delete + watchStart/Stop/Status (webhooky)
    ├── datovka.php         # datová schránka: archiv zpráv, přílohy, stažení
    ├── zfo_parser.php      # ZFO file parser (formát datových zpráv)
    ├── ratelimit.php       # rate limiting pro auth endpointy
    ├── session.php         # session management (start, validate, destroy)
    ├── composer.json       # Composer (google/apiclient — Calendar, Drive, Gmail, Oauth2)
    ├── vendor/             # Composer dependencies (v .gitignore)
    └── migrations/
        ├── 001_init.sql              # základní tabulky: svj, users, sessions
        ├── 002_rate_limits.sql
        ├── 003_settings.sql
        ├── 004_invitations.sql
        ├── 005_avatar.sql
        ├── 006_settings_ext.sql
        ├── 007_settings_cuzk.sql
        ├── 008_kn_integration.sql    # tabulky jednotky, parcely, stavba_id do svj
        ├── 009_jednotky_ext.sql      # přidá typ_kod, zpusob_kod, lv_id, katastralni_uzemi
        ├── 010_ruian_parcely_plomby.sql # lat/lon/adresa_plna do svj, plomba_aktivni do jednotky
        ├── 011_svj_building_info.sql # rok, konstrukce, podlaží, výtah, vytápění do svj
        ├── 012_hlasovani.sql         # tabulky hlasovani + hlasy
        ├── 013_hlasovani_ext.sql     # externi_hlasy do hlasovani (papír/email/schůze)
        ├── 014_penb.sql              # tabulka penb (třída, datums, soubor, poznámka)
        ├── 015_dokumenty.sql         # tabulka dokumenty (kategorie, platnost, přístup, uploaded_by)
        ├── 016_revize.sql            # tabulka revize (typ, nazev, datum, interval, soubor)
        ├── 017_fond_oprav.sql        # tabulka fond_oprav (typ, kategorie, castka, datum)
        ├── 018_parkovani.sql         # tabulka parkovani (cislo, typ, cislo_jednotky, najemce)
        ├── 019_isds.sql              # isds_id VARCHAR do svj (ID datové schránky)
        ├── 020_datovka.sql           # tabulky datovka_zpravy + datovka_prilohy
        ├── 021_vlastnici_ext.sql     # users.telefon/jednotka_id, jednotky pronájem/nájemce, tabulka vlastnici_ext
        ├── 022_zavady.sql            # tabulky zavady + zavady_historie (hlášení závad, workflow, komentáře)
        ├── 023_kalendar_udalosti.sql # tabulka kalendar_udalosti (vlastní události)
        ├── 024_notifikace.sql        # tabulka notifikace + users.notif_* preference
        ├── 025_fond_ucty.sql         # tabulka fond_ucty (bankovní účty SVJ)
        ├── 026_kontakty.sql          # tabulka kontakty (servisní firmy, řemeslníci)
        ├── 027_revize_ext.sql        # revize: kontakt_id, naklady, pripomenout_dni + tabulka revize_historie
        ├── 028_meridla.sql           # tabulky meridla + odecty (vodoměry, plynoměry, elektroměry…)
        ├── 029_google_sync.sql       # tabulky google_tokens + google_calendar_sync
        ├── 030_google_settings.sql   # Google OAuth credentials v settings tabulce
        ├── 031_fond_oprav_ext.sql    # tabulka fond_prilohy (přílohy k záznamům fondu oprav)
        ├── 032_fond_rozpocet_zalohy.sql # fond_rozpocet + fond_predpis + fond_zalohy + notifikace typ 'fond'
        ├── 033_gdrive_storage.sql    # gdrive_folders + gdrive_files + svj.gdrive_folder_id + svj.gdrive_enabled
        ├── 034_calendar_watch.sql   # google_calendar_watch (webhook kanály, sync tokeny)
        ├── 035_revize_zavady_meridla_ext.sql # revize_zavady (závady z revizní zprávy)
        ├── 036_datovka_fk.sql            # cizí klíče pro datovka tabulky
        └── 037_missing_indexes.sql       # chybějící indexy: penb(svj_id), dokumenty(svj_id, kategorie, created_at)
```

### CLI skripty

```
cli/
├── bootstrap.php           # sdílená inicializace, DB, helpers, Google client, output formátování
├── google-gmail.php        # Gmail: inbox, read, send, status
├── google-drive.php        # GDrive: status, list, sync, upload
└── google-calendar.php     # Calendar: list, push, pull, status, watch, unwatch, watch-renew
```

## Coding Standards — POVINNÉ

### Principy (vždy dodržovat)
- **DRY** — neopakovat kód, sdílet přes helpery/moduly
- **KISS** — nejjednodušší řešení které funguje
- **YAGNI** — nepsat co teď není potřeba
- **SOLID** — jednoznačná odpovědnost, otevřenost pro rozšíření
- **Skautské pravidlo** — kód opusť čistší než jsi ho našel
- **Kompozice** nad dědičností
- **Modularita** — logické celky, oddělené soubory

### Limit délky souborů
- **Max 500 řádků na soubor** — tvrdý limit
- Výjimka POUZE pokud rozdělení poruší logickou integritu (pak zdůvodnit)
- Překračuje-li soubor limit → rozdělit na logické moduly

### Jazyk
- Komunikace: **česky**
- Kód, komentáře, proměnné: **anglicky nebo česky** (konzistentně v rámci souboru)
- UI texty: vždy **česky**

## UX — Cílová skupina

Portál používají **senioři a lidé s horším zrakem** — vlastníci bytů v SVJ.

### Povinné UX zásady
- Písmo min. **16px** v základním stavu
- Dostatečný kontrast (WCAG AA minimum)
- Velká klikatelná plocha tlačítek (min. 44×44px)
- Jednoduché formuláře — jen nutná pole, jasné labely
- Srozumitelné chybové hlášky v češtině
- Žádné zavádějící UI patterny

### Tematické módy — VŽDY implementovat
Projekt má **3 témata**, vždy myslet na všechna tři:

| Třída/atribut | Popis |
|---|---|
| `[data-theme="light"]` (default) | Světlý mód |
| `[data-theme="dark"]` | Tmavý mód |
| `[data-theme="senior"]` | Zvětšený, vysoký kontrast pro seniory |

**Nikdy nepoužívat hardcoded barvy** (`#fff`, `#f8f8f8`, apod.) — vždy `var(--bg-*)`, `var(--text-*)`, `var(--border)` atd.

### Responzivita — VŽDY
- Mobile-first nebo alespoň mobile-ready
- Testovat mentálně pro: mobil (360px+), tablet (768px+), desktop (1024px+)
- Flexbox/grid pro layouty, žádné fixed px widths v hlavních layoutech

### Zakázané UI prvky — ABSOLUTNÍ ZÁKAZ
- **`alert()`** — NIKDY, nahradit `showToast(msg, 'error')`
- **`confirm()`** — NIKDY, nahradit `showConfirmModal(title, detail, onConfirm)`
- **`prompt()`** — NIKDY, nahradit inline formulář v modalu
- Sdílené UI helpery jsou v `js/ui.js` (globálně dostupné)

## Bezpečnost — KRITICKÉ

Portál jde do produkce. Bezpečnost na maximum.

### Povinné kontroly
- **SQL injection**: vždy PDO prepared statements, nikdy string concat
- **Tenant isolation**: `svj_id` VŽDY ze session, nikdy z user inputu
- **XSS**: `strip_tags()` na vstupu, v JS `textContent` místo `innerHTML`
- **CSRF**: SameSite=Lax cookie session
- **Rate limiting**: na všechny auth endpointy (již implementováno)
- **Sensitive files**: `config.php`, `db.php`, helpery — blokovat přímý přístup přes `.htaccess`
- **Password hashing**: `password_hash(..., PASSWORD_BCRYPT, ['cost' => BCRYPT_COST])`
- **Invite tokeny**: `bin2hex(random_bytes(32))` — kryptograficky bezpečné
- **HTTP headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy (nastaveno v Apache)
- **Settings šifrování**: citlivé hodnoty v DB šifrovány AES-256-CBC (`settings_crypto.php`)
  - Secret keys: `smtp_heslo`, `cuzk_api_klic` — rozšiřuj `SETTINGS_SECRET_KEYS`
  - Encryption key v `config.php` jako `SETTINGS_ENCRYPTION_KEY` (64 hex znaků)
  - Vygeneruj: `php -r "echo bin2hex(random_bytes(32));"`

### Co nikdy nedělat
- Nevěřit `svj_id` z POST/GET dat
- Nepoužívat `$_GET` přímo v SQL
- Nelogovat hesla ani tokeny
- Necommitovat `api/config.php` (je v `.gitignore`)

## Multi-tenant model

- Jedna instalace, jedna DB, více SVJ
- Každý tenant = jeden záznam v tabulce `svj`
- Každý SQL dotaz na tenantská data musí mít `WHERE svj_id = ?` s hodnotou ze session
- Vlastníci se registrují **pouze přes invite token** — žádné volné přiřazení k SVJ

## Integrace s externími API

### ARES (Administrativní registr ekonomických subjektů)
- Base URL: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest` (v `config.php` jako `ARES_BASE_URL`)
- `/ekonomicke-subjekty/{ico}` — základní data SVJ (název, sídlo, IČO, `kodAdresnihoMista`)
- `/ekonomicke-subjekty-vr/{ico}` — statutární orgán (předseda, výbor) z veřejného rejstříku
- Auth: žádná, zdarma

### ČÚZK API KN (Katastr nemovitostí)
- Base URL: `https://api-kn.cuzk.gov.cz`
- Auth: header `ApiKey: <klic>` — klíč uložen šifrovaně v `settings.cuzk_api_klic`
- Limit: 500 volání/den
- Odpověď vždy zabalena: `{ data: {...}, zpravy: [], aktualnostDatK: ... }`
- `/api/v1/Stavby/AdresniMisto/{kod}` — najde stavbu dle RÚIAN kódu adresního místa
- `/api/v1/Jednotky/{id}` — detail jednotky (⚠️ `/Stavby/{id}/Jednotky` neexistuje → 404)
- `/api/v1/Parcely/{id}` — detail parcely
- `kodAdresnihoMista` se načítá z ARES `sidlo.kodAdresnihoMista`, záloha z VR `zaznamy[].adresy[].adresa.kodAdresnihoMista`

### RÚIAN (ArcGIS, zdarma, bez auth)
- Base: `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer`
- **Layer 1 (AdresniMisto)**: `?where=KOD={kam}&outFields=*&outSR=4326&f=json`
  → WGS84 `geometry.x` (lon), `geometry.y` (lat), `attributes.adresa`
  → `fetchRuianData(int $kam)` v `svj_helper.php`
- **Layer 3 (StavebniObjekt)**: `?where=isknbudovaid={stavba_id}&outFields=...&f=json`
  → `dokonceni` (ms timestamp), `druhkonstrukcekod`, `pocetpodlazi`, `pocetbytu`,
    `zastavenaplocha`, `vybavenivytahemkod`, `zpusobvytapenikod`
  → `fetchRuianBuildingInfo(int $stavbaId)` v `svj_helper.php`

### OpenMeteo (počasí, zdarma, bez auth, bez klíče)
- URL: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=...&daily=...&timezone=Europe/Prague`
- Implementováno v `weather.php`, vstup: GPS z RÚIAN uložené v `svj.lat/lon`

### ISIR (Insolvenční rejstřík)
- Nemá veřejné REST API → implementováno jako deep link
- URL: `https://isir.justice.cz/isir/usl/richtext.do?dotaz.jmeno={j}&dotaz.prijmeni={p}`
- Zobrazeno jako tlačítko ⚖️ ISIR u každého vlastníka (jen admin/výbor)

## Avatar
- Upload: `api/avatar.php` (multipart POST), MIME check přes `finfo`, max 2MB
- Formáty: jpeg, png, gif, webp
- Uložení: `uploads/avatars/{userId}_{hex}.{ext}` (přímé přístupy blokuje `.htaccess`)
- Zobrazení: `makeAvatarEl(user, size)` v `js/ui.js` — `<img>` nebo barevný kruh s iniciálami

## Migrace DB

Nová migrace = nový soubor `api/migrations/00X_popis.sql`.
Spustit: `sudo mysql svj_portal < api/migrations/00X_popis.sql`
