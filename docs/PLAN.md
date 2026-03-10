# SVJ Portál — Plán projektu

## Vize
Vlastní self-hosted SVJ portál s automatickým předvyplněním dat z veřejných rejstříků.
Nasaditelný na Apache, moderní, modulární, přístupný i pro seniory.

## Tech Stack (aktuální)

| Vrstva | Technologie |
|---|---|
| Frontend | Vanilla JS SPA (žádný framework, žádný build step) |
| Backend | PHP 8.4 (Apache mod_php) |
| DB | MySQL 8.4 |
| Auth | Custom session (PDO + bcrypt) |
| Soubory | Local filesystem (`uploads/`) |
| Šifrování | AES-256-CBC pro citlivá nastavení v DB |

## Integrovaná API

| API | Účel | Auth | Limit |
|---|---|---|---|
| ARES (základní) | Název, sídlo, IČO SVJ | žádná | volné |
| ARES (VR) | Statutární orgán (předseda, výbor) | žádná | volné |
| ČÚZK API KN | Stavby + jednotky z katastru | ApiKey header | 500/den |

### Plánovaná API (zatím neimplementováno)
- **RÚIAN** — validace a standardizace adres (zdarma, bez auth)
- **Hlídač státu** — insolvence, veřejné zakázky (zdarma, token)
- **ISDS** — vyhledání datové schránky (SOAP, auth přes DS)
- **Mapy.cz** — geokódování, mapa domu (zdarma, API klíč)

### Co NELZE automaticky
- PENB (energetický průkaz) — žádné veřejné API
- Havarijní/servisní kontakty — manuální zadání
- Smlouvy a finanční údaje — manuální zadání
- Odečty měřidel — manuální nebo IoT

## Fáze vývoje

### Fáze 1 — MVP ✅ (hotovo)
- [x] Kostra SPA (layout, navigace, hash router, 3 témata)
- [x] Registrace SVJ přes IČO → ARES auto-fill
- [x] Multi-tenant model (svj_id ze session, invite systém)
- [x] Role: `vlastnik`, `vybor`, `admin` (zakladatel = admin)
- [x] Přihlášení / odhlášení / session management
- [x] Avatar (upload foto nebo barevný kruh s iniciálami)
- [x] Nastavení profilu
- [x] Správa uživatelů (admin)
- [x] Pozvánky s expirací (admin/vybor)
- [x] Systémová nastavení (SMTP, ARES, ČÚZK) — AES šifrování v DB
- [x] Auto-fill výboru z ARES VR (OR/Obchodní rejstřík)
- [x] Import jednotek z ČÚZK API KN (stavba → jednotky)
- [x] Přehled jednotek (tabulka z DB)
- [x] Nástěnka příspěvků
- [x] Nahrávání dokumentů

### Fáze 2 — Rozšíření (plánováno)
- [ ] Hlasování per rollam (hlasovací formulář, výsledky, PDF zápis)
- [ ] Hlášení závad (ticketing: popis, foto, stav, zodpovědná osoba)
- [ ] Kalendář revizí a kontrol (výtah, kotel, elektro…)
- [ ] Monitoring katastru — upozornění na změnu vlastníka
- [ ] Monitoring insolvencí vlastníků (Hlídač státu API)
- [ ] Správa vlastníků s vazbou na jednotky (CRUD)
- [ ] PWA + push notifikace
- [ ] E-mail notifikace přes SMTP (nástěnka, hlasování, pozvánky)

### Fáze 3 — Enterprise (vzdálená budoucnost)
- [ ] Účetnictví + vyúčtování služeb
- [ ] Napojení na banku (přehled plateb)
- [ ] AI asistent (dotazy na stanovy, legislativu)
- [ ] Multi-SVJ dashboard (jedna instalace, více SVJ)
- [ ] PDF generátor (zápisů, výzev, vyúčtování)

## Databázové migrace

| Soubor | Obsah |
|---|---|
| `001_init.sql` | Základní tabulky: users, svj, sessions |
| `002_invites.sql` | Tabulka invite_tokens |
| `003_settings.sql` | Tabulka settings (klíč-hodnota) |
| `004_or_cache.sql` | Cache pro OR/ARES data |
| `005_avatar.sql` | Sloupec `avatar` v users |
| `006_settings_ext.sql` | SMTP a gov API nastavení |
| `007_settings_cuzk.sql` | ČÚZK WSDP → API KN přechod |
| `008_kn_integration.sql` | `svj.kod_adresniho_mista`, tabulka `jednotky`, settings pro API KN |

## Bezpečnostní model

- Hesla: bcrypt cost 12
- Sessions: SameSite=Lax, HttpOnly, 8h lifetime + sliding window 30 min
- Invite tokeny: `bin2hex(random_bytes(32))` — 64 hex znaků
- Citlivá nastavení v DB: AES-256-CBC, klíč v `config.php` (mimo git)
- Soubory (avatary): MIME check přes `finfo`, `.htaccess` blokuje PHP execution
- Tenant isolation: `svj_id` vždy ze session, nikdy z requestu

## Konkurence

| Portál | Cena | API | Hlavní feature |
|---|---|---|---|
| SVJO.cz | 0/150 Kč | NE | Free tier, jednoduché |
| SVJ Aplikace | placené | NE | Katastr monitoring |
| Bydloo.cz | 99–299 Kč | NE | PWA, AI asistent |
| PSVJ.cz | 17–159 Kč/j. | NE | Účetnictví, banka |
| Sousedé.cz | na dotaz | NE | Legislativa, workflow |
| WebDOMU.cz | 2400 Kč/rok | NE | Katastr import |

**Náš diferenciátor**: self-hosted, open-source, automatický import z ARES + ČÚZK, přístupnost pro seniory, AES šifrování API klíčů.
