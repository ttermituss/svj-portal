# Kontakty, Měřidla, Revize — TODO & Roadmap

## Fáze 1 — Kontakty (servisní firmy a řemeslníci)

- [x] **Tabulka `kontakty`** — název firmy/osoby, telefon, email, web, adresa, kategorie, poznámka
- [x] **Kategorie**: správce, výtah, elektro, plyn, voda, topení, klíčová služba, úklid, zahradník, pojišťovna, účetní, jiné
- [x] **CRUD** pro admin/výbor, read-only pro vlastníky
- [x] **API endpoint** `api/kontakty.php` — list, save, delete
- [x] **Stránka `#kontakty`** v menu (všichni vidí, CRUD jen admin/výbor)
- [x] **Migrace** `026_kontakty.sql`

## Fáze 2 — Revize vylepšení

- [x] **Historie revizí** — archiv všech revizí (ne jen poslední), modal s timeline, CRUD, PDF protokol per záznam
- [x] **Revizní firma/technik** — propojení s kontakty (FK `kontakt_id`), select z katalogu kontaktů
- [x] **Výsledek revize** — ok / se závadami / nezpůsobilé (badge s barvou)
- [x] **Náklady revize** — kolik stála (na hlavní revizi i na každém záznamu historie)
- [x] **Notifikace** — upozornění X dní před vypršením revize (konfigurovatelné per revize)
- [ ] **Závady z revize** — seznam závad z revizní zprávy s termínem odstranění (budoucí rozšíření)

## Fáze 3 — Měřidla a odečty

- [x] **Tabulka `meridla`** — typ (voda studená/teplá, plyn, elektřina, teplo), výrobní číslo, umístění (jednotka/společné), cejch, aktivní
- [x] **Tabulka `odecty`** — meridlo_id, datum, stav (hodnota), kdo odečetl, poznámka
- [x] **Dashboard měřidel** — karty seskupené dle umístění, poslední odečet, cejch badge
- [x] **Self-service odečty** — vlastník vidí měřidla své jednotky + může zadat odečet
- [x] **Odečty modal** — tabulka s historií odečtů, spotřeba (delta), inline přidání odečtu
- [x] **CRUD měřidel** — admin/výbor: přidání, úprava, smazání (modal s výběrem jednotky)
- [x] **Migrace** `028_meridla.sql`
- [ ] **Hromadný odečet** — výbor/admin zadá odečty pro celý dům najednou (budoucí)
- [ ] **Grafy spotřeby** — vývoj spotřeby v čase (per jednotka i celý dům) (budoucí)
- [ ] **Export** — CSV/XLSX/PDF pro rozúčtování (budoucí)
