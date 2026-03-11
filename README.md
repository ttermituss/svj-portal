# SVJ Portál v1.3.0

Univerzální multi-tenant webový portál pro správu **Společenství vlastníků jednotek (SVJ)** v ČR.

## Stack

| Vrstva | Technologie |
|---|---|
| Backend | PHP 8.4 |
| Databáze | MySQL 8.4 |
| Frontend | Vanilla JS (žádný framework, žádný build step) |
| Webserver | Apache + mod_rewrite |

---

## Funkce

### 🏢 O domě — pro všechny vlastníky
- 🏗️ **Info o budově** — adresa, GPS, rok dokončení, konstrukce, podlaží, výtah, vytápění (z RÚIAN/KN)
- ⚡ **PENB** — průkaz energetické náročnosti (třída A–G, platnost, upload PDF, upozornění na vypršení)
- 🔧 **Evidence revizí** — výtah, elektro, plyn, hromosvod, hasicí přístroje; automatický výpočet termínů
- 💰 **Fond oprav** — příjmy/výdaje, zůstatek, měsíční sloupcový graf
- 🗺️ **Okolí budovy** — MHD, obchody, lékárny, banky, pošta v okruhu 600 m (OpenStreetMap)
- 🅿️ **Parkovací místa** — evidence garáží a stání, přiřazení k jednotce nebo nájemci
- 📊 **Cenová mapa** — přímé odkazy na cenovamapa.org, ČÚZK cenové mapy, Sreality

### 📋 Pro všechny členy SVJ
- 📢 **Nástěnka** — příspěvky a oznámení
- 🗳️ **Hlasování** — ankety s výsledky, progress bary a quorem
- 📁 **Dokumenty** — drag & drop upload, kategorie, datum platnosti, náhled (PDF/obrázky/Markdown/TXT)
- 🌤️ **Počasí** — aktuální + 7denní výhled u budovy (OpenMeteo, GPS z RÚIAN)
- 👤 **Profil** — nastavení účtu, avatar

### 👥 Pro výbor a správce
- 🏘️ **Jednotky** — přehled z KN (Vlastník, Využití, Podíl, LV, K.ú., plomba badge), QR kódy + tisk, export XLSX/CSV
- 🔑 **Pronájmy** — označení pronajímané jednotky + evidence kontaktu na nájemce
- 👥 **Vlastníci** — registrovaní členové + neregistrovaní vlastníci; telefon, přiřazená jednotka, ISIR deep link, export XLSX/CSV
- 🗳️ **Hlasování** — vytvoření, ukončení, doplnění externích hlasů (papír/email/schůze)
- 🏗️ **ČÚZK KN** — import jednotek, parcel a stavby z Katastru nemovitostí
- 🗺️ **Mapa budovy** — OpenStreetMap iframe + odkaz na Mapy.cz
- 💰 **Dotace SFPI** — Panel 2020+, NZÚ, IROP, MMR s doporučením dle budovy
- 📤 **Export výkazů** — XLSX/CSV pro revize, fond oprav, parkovací místa

### 📬 Datová schránka (ISDS) — jen admin/výbor
- **Archiv zpráv** — upload `.zfo` souborů (drag & drop), kartotéka s odesílatelem, předmětem, datem
- **ZFO parser** — automatická extrakce metadat + příloh z CMS/PKCS7 obálky (HTML, PDF, XML…)
- **Náhled příloh** — HTML inline (sandboxed iframe), PDF inline, stažení libovolného souboru
- **Průvodce** — 5 kroků jak stáhnout ZFO z mojedatovaschranka.cz + FAQ (fikce doručení, 90denní mazání...)

### ⚙️ Pro správce (admin)
- 👥 **Správa uživatelů** — role, pozvánky, smazání; přiřazení jednotky + telefon
- 👤 **Neregistrovaní vlastníci** — evidence kontaktů a propojení s jednotkami (vlastnici_ext)
- 🏛️ **OR / ARES** — statutární orgán z Obchodního rejstříku
- 📬 **ID datové schránky** — uložení ISDS ID, odkaz na ověření (mojedatovaschranka.cz)
- ⚙️ **Systémová nastavení** — ČÚZK API klíč (šifrovaný AES-256)

---

## Integrace externích API

| API | Účel | Auth |
|---|---|---|
| ARES | Data SVJ, statutární orgán z OR | Zdarma, bez klíče |
| ČÚZK KN | Katastr — jednotky, parcely, plomby | API klíč (500 volání/den) |
| RÚIAN ArcGIS | GPS, adresa, rok výstavby, konstrukce | Zdarma, bez klíče |
| OpenMeteo | Počasí u budovy | Zdarma, bez klíče |
| Overpass API | Okolí budovy (POI z OpenStreetMap) | Zdarma, bez klíče |
| ISIR | Insolvenční rejstřík | Deep link (bez API) |
| cenovamapa.org | Cenové mapy bytů | Deep link (bez API) |
| mojedatovaschranka.cz | Ověření datové schránky + archiv zpráv (ZFO) | Deep link (bez API) |
| api.qrserver.com | QR kódy jednotek | Zdarma, bez klíče |

---

## Instalace

### Požadavky
- PHP 8.4+ s rozšířeními: `pdo_mysql`, `curl`, `json`, `openssl`, `fileinfo`
- MySQL 8.4+
- Apache s `mod_rewrite`

### Kroky

1. **Naklonuj repozitář**
   ```bash
   git clone <repo> /var/www/svj-portal
   ```

2. **Vytvoř konfiguraci**
   ```bash
   cp api/config.example.php api/config.php
   # Vyplň DB přihlašovací údaje a vygeneruj encryption key:
   php -r "echo bin2hex(random_bytes(32));"
   ```

3. **Spusť migrace**
   ```bash
   for f in api/migrations/*.sql; do sudo mysql svj_portal < "$f"; done
   # Aktuálně: 001–021 (init → vlastnici_ext)
   ```

4. **Nastav Apache virtualhost**
   ```apache
   <VirtualHost *:80>
     ServerName svj-portal.local
     DocumentRoot /var/www/svj-portal
     <Directory /var/www/svj-portal>
       AllowOverride All
     </Directory>
   </VirtualHost>
   ```

5. **Zaregistruj první SVJ** přes webové rozhraní (`/` → přihlášení → IČO)

---

## Architektura

```
SPA (index.html)
├── js/router.js            # hash router (#page)
├── js/auth.js              # session management
├── js/api.js               # HTTP wrapper
├── js/ui.js                # showToast, showConfirmModal, makeAvatarEl
└── js/pages/
    ├── home.js             # dashboard
    ├── nastenka.js         # nástěnka
    ├── hlasovani.js        # hlasování
    ├── dokumenty.js        # dokumenty
    ├── odom.js             # O domě (PENB, revize, fond, okolí, parkování)
    ├── admin.js            # správa portálu + sdílené helpery
    └── admin-*.js          # jednotlivé karty správy

API (api/*.php)
├── middleware.php          # requireAuth(), requireRole()
├── helpers.php             # jsonOk, jsonError, sanitize
├── svj_helper.php          # ARES + RÚIAN integrace
└── *.php                   # endpointy
```

## Bezpečnost

- **Tenant isolation** — `svj_id` vždy ze session, nikdy z user inputu
- **SQL injection** — PDO prepared statements, žádný string concat
- **AES-256-CBC** — šifrování citlivých nastavení v DB (API klíče, hesla)
- **bcrypt** pro hesla, `bin2hex(random_bytes(32))` pro tokeny
- **SameSite=Lax** cookies, X-Frame-Options, X-Content-Type-Options
- **MIME check** — `finfo` pro upload souborů, přímý přístup blokován `.htaccess`

## Témata

Portál podporuje 3 vizuální témata (optimalizováno pro seniory):

| Atribut | Popis |
|---|---|
| `data-theme="light"` | Světlý mód (výchozí) |
| `data-theme="dark"` | Tmavý mód |
| `data-theme="senior"` | Zvětšené písmo (18px), vysoký kontrast |

## Databázové migrace

```bash
sudo mysql svj_portal < api/migrations/00X_nazev.sql
```

| Migrace | Obsah |
|---|---|
| 001–005 | Základ: svj, users, sessions, rate_limits, avatar |
| 006–007 | Settings ext + ČÚZK klíč |
| 008–011 | KN integrace, jednotky ext, RÚIAN, info o budově |
| 012–013 | Hlasování + externí hlasy |
| 014 | PENB |
| 015 | Dokumenty |
| 016 | Evidence revizí |
| 017 | Fond oprav |
| 018 | Parkovací místa |
| 019 | Datová schránka ISDS (isds_id do svj) |
| 020 | Archiv datové schránky (zprávy + přílohy) |
| 021 | Vlastníci ↔ jednotky: telefon, jednotka_id, pronájem, vlastnici_ext |

Nikdy neupravuj stávající migraci — vždy přidej novou.

---

## Vývoj

Viz [`CLAUDE.md`](CLAUDE.md) pro coding standards, pravidla a architekturu.
Viz [`TODO.md`](TODO.md) pro roadmap a plánované funkce.
Viz [`CHANGELOG.md`](CHANGELOG.md) pro historii verzí.
