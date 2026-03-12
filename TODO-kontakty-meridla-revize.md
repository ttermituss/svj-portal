# Kontakty, Měřidla, Revize — TODO & Roadmap

## Fáze 1 — Kontakty (servisní firmy a řemeslníci)

- [x] **Tabulka `kontakty`** — název firmy/osoby, telefon, email, web, adresa, kategorie, poznámka
- [x] **Kategorie**: správce, výtah, elektro, plyn, voda, topení, klíčová služba, úklid, zahradník, pojišťovna, účetní, jiné
- [x] **CRUD** pro admin/výbor, read-only pro vlastníky
- [x] **API endpoint** `api/kontakty.php` — list, save, delete
- [x] **Stránka `#kontakty`** v menu (všichni vidí, CRUD jen admin/výbor)
- [x] **Migrace** `026_kontakty.sql`

## Fáze 2 — Revize vylepšení

- [ ] **Historie revizí** — archiv všech revizí (ne jen poslední), timeline
- [ ] **Revizní firma/technik** — propojení s kontakty (FK nebo volný text)
- [ ] **Závady z revize** — seznam závad s termínem odstranění
- [ ] **Náklady revize** — kolik stála (volitelné propojení s fondem oprav)
- [ ] **Notifikace** — upozornění X dní před vypršením revize (infrastruktura již existuje)

## Fáze 3 — Měřidla a odečty

- [ ] **Tabulka `meridla`** — typ (voda studená/teplá, plyn, elektřina, teplo), výrobní číslo, umístění (jednotka_id/společné), datum instalace, datum cejchu, interval cejchování
- [ ] **Tabulka `odecty`** — meridlo_id, datum, stav (hodnota), kdo odečetl, poznámka
- [ ] **Dashboard měřidel** — poslední odečet, spotřeba za období, upozornění na cejch
- [ ] **Self-service odečty** — vlastník vidí měřidla své jednotky + může zadat odečet
- [ ] **Hromadný odečet** — výbor/admin zadá odečty pro celý dům najednou
- [ ] **Grafy spotřeby** — vývoj spotřeby v čase (per jednotka i celý dům)
- [ ] **Export** — CSV/XLSX/PDF pro rozúčtování
- [ ] **Migrace** `02X_meridla.sql`
