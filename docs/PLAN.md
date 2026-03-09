# SVJ Portál — Plán projektu

## Vize
Vlastní self-hosted SVJ portál s automatickým předvyplněním dat z veřejných rejstříků.
Nasaditelný na Apache, moderní, modulární, přístupný i pro seniory.

## API Combo pro auto-fill

### Krok 1: Zadání IČO → ARES
- **Endpoint**: `GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}`
- **Vrací**: název SVJ, sídlo, IČO, datum vzniku, právní forma
- **Auth**: žádná
- **Zdarma**: ano

### Krok 2: IČO → Justice.cz (Veřejný rejstřík)
- **Endpoint**: `https://or.justice.cz/ias/ui/rejstrik-$svj` + Open Data CKAN API `https://dataor.justice.cz/`
- **Vrací**: členové výboru (předseda, místopředseda, členové), stanovy, zápisy
- **Auth**: žádná
- **Zdarma**: ano

### Krok 3: Adresa → ČÚZK API KN (Katastr)
- **Endpoint**: `https://api-kn.cuzk.gov.cz/api/v1/Jednotky/Vyhledani` + `/Stavby/`
- **Vrací**: seznam jednotek/bytů v domě, vlastníci, podíly na společných částech
- **Auth**: API klíč (registrace na registrace.cuzk.gov.cz)
- **Zdarma**: ano
- **Pozor**: potřeba registrace přes Identitu občana nebo účet ČÚZK

### Krok 4: Doplňkové API
- **RÚIAN** — validace a standardizace adres (zdarma, bez auth)
- **Hlídač státu** — insolvence, veřejné zakázky (zdarma, token)
- **ISDS** — vyhledání datové schránky (SOAP, auth přes DS)
- **Mapy.cz** — geokódování, mapa domu (zdarma, API klíč)

### Co NELZE automaticky
- PENB (energetický průkaz) — žádné veřejné API
- Havarijní/servisní kontakty — manuální zadání
- Smlouvy a finanční údaje — manuální zadání
- Odečty měřidel — manuální nebo IoT

## Tech Stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router) + shadcn/ui + Tailwind CSS |
| Backend | Next.js API Routes (proxy pro české API) |
| DB | PostgreSQL 16 (později) |
| ORM | Drizzle ORM (později) |
| Auth | Better Auth (později) |
| Soubory | MinIO / local filesystem (později) |
| PDF | @react-pdf/renderer (později) |
| E-mail | Nodemailer + React Email (později) |
| SMS | GoSMS.eu / BulkGate (později) |
| Hosting | Docker + Apache reverse proxy |

## Themes

1. **Světlý režim** — výchozí, čistý design
2. **Tmavý režim** — šetří oči, moderní
3. **Režim pro seniory** — větší písmo (18px+), vyšší kontrast, tučnější texty, větší tlačítka

## Fáze vývoje

### Fáze 1 — MVP (aktuální)
- [x] Kostra aplikace (layout, navigace, theme)
- [x] Auto-fill z ARES (IČO → základní údaje)
- [ ] Auto-fill z Justice.cz (členové výboru)
- [ ] Auto-fill z ČÚZK (jednotky, vlastníci)
- [ ] Správa vlastníků a jednotek (CRUD)
- [ ] Nahrávání dokumentů
- [ ] Nástěnka

### Fáze 2
- [ ] Hlasování per rollam
- [ ] Hlášení závad (ticketing)
- [ ] Kalendář revizí
- [ ] Monitoring katastru
- [ ] Monitoring insolvencí
- [ ] PWA + push notifikace
- [ ] PostgreSQL + auth

### Fáze 3
- [ ] Účetnictví + vyúčtování
- [ ] Napojení na banku
- [ ] AI asistent
- [ ] Multi-SVJ dashboard

## Konkurence

| Portál | Cena | API | Hlavní feature |
|---|---|---|---|
| SVJO.cz | 0/150 Kč | NE | Free tier, jednoduché |
| SVJ Aplikace | placené | NE | Katastr monitoring |
| Bydloo.cz | 99–299 Kč | NE | PWA, AI asistent |
| PSVJ.cz | 17–159 Kč/j. | NE | Účetnictví, banka |
| Sousedé.cz | na dotaz | NE | Legislativa, workflow |
| WebDOMU.cz | 2400 Kč/rok | NE | Katastr import |

**Náš diferenciátor**: otevřené API, auto-fill z rejstříků, self-hosted, open-source, přístupnost pro seniory.

## Apache konfigurace

```apache
<VirtualHost *:443>
    ServerName svj.example.cz
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/svj.example.cz/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/svj.example.cz/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
</VirtualHost>
```

Potřebné Apache moduly: `mod_proxy`, `mod_proxy_http`, `mod_rewrite`, `mod_ssl`.
