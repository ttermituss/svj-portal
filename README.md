# SVJ Portál

Univerzální multi-tenant webový portál pro správu **Společenství vlastníků jednotek (SVJ)** v ČR.

## Stack

| Vrstva | Technologie |
|---|---|
| Backend | PHP 8.4 |
| Databáze | MySQL 8.4 |
| Frontend | Vanilla JS (žádný framework, žádný build step) |
| Webserver | Apache + mod_rewrite |

## Funkce

### Pro všechny členy SVJ
- 📋 **Nástěnka** — příspěvky a oznámení
- 🏢 **Jednotky** — přehled bytových a nebytových jednotek z KN (Využití, Podíl, LV, K.ú.)
- 🗳️ **Hlasování** — ankety a hlasování s výsledky a quorem
- 📁 **Dokumenty** — nahrávání a sdílení souborů
- 🌤️ **Počasí** — aktuální počasí u budovy (OpenMeteo, GPS z RÚIAN)
- 👤 **Profil** — nastavení účtu, avatar

### Pro výbor a správce
- 👥 **Vlastníci** — seznam členů SVJ s ISIR deep linkem (insolvenční rejstřík)
- 🗳️ **Hlasování** — vytvoření, ukončení, doplnění externích hlasů (papír/email/schůze)
- 🏗️ **ČÚZK KN** — import jednotek, parcel a stavby z Katastru nemovitostí
- 🗺️ **Mapa budovy** — OpenStreetMap iframe + odkaz na Mapy.cz
- 💰 **Dotace** — přehled programů (Panel 2020+, NZÚ, IROP, MMR) s doporučením dle budovy

### Pro správce (admin)
- 👥 **Správa uživatelů** — role, pozvánky, smazání
- ⚙️ **Systémová nastavení** — ČÚZK API klíč (šifrovaný AES-256)
- 🏛️ **OR / ARES** — statutární orgán z Obchodního rejstříku

## Integrace externích API

| API | Účel | Auth |
|---|---|---|
| ARES | Data SVJ, statutární orgán | Zdarma, bez klíče |
| ČÚZK KN | Katastr nemovitostí — jednotky, parcely, plomby | API klíč (500 volání/den) |
| RÚIAN ArcGIS | GPS, adresa, rok výstavby, konstrukce | Zdarma, bez klíče |
| OpenMeteo | Počasí u budovy | Zdarma, bez klíče |
| ISIR | Insolvenční rejstřík | Deep link (bez API) |

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
   sudo mysql svj_portal < api/migrations/001_init.sql
   # ... postupně všechny migrace až po nejvyšší číslo
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

## Architektura

```
SPA (index.html)
├── js/router.js        # hash router
├── js/auth.js          # session management
├── js/api.js           # HTTP wrapper
└── js/pages/*.js       # jednotlivé stránky

API (api/*.php)
├── middleware.php       # auth, role check
├── helpers.php          # jsonOk, jsonError
├── svj_helper.php       # ARES + RÚIAN integrace
└── *.php                # endpointy
```

## Bezpečnost

- Tenant isolation — `svj_id` vždy ze session, nikdy z user inputu
- PDO prepared statements — žádný SQL injection
- AES-256-CBC šifrování citlivých nastavení v DB (API klíče)
- `bcrypt` pro hesla, `bin2hex(random_bytes(32))` pro tokeny
- SameSite=Lax cookies, X-Frame-Options, X-Content-Type-Options

## Témata

Portál podporuje 3 vizuální témata (optimalizováno pro seniory):
- `light` — světlý mód (výchozí)
- `dark` — tmavý mód
- `senior` — zvětšené písmo, vysoký kontrast

## Databázové migrace

```bash
sudo mysql svj_portal < api/migrations/00X_nazev.sql
```

Nikdy neupravuj stávající migraci — vždy přidej novou.

## Vývoj

Viz [`CLAUDE.md`](CLAUDE.md) pro coding standards, pravidla a architekturu.
Viz [`TODO.md`](TODO.md) pro roadmap a plánované funkce.
