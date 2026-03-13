# Fond oprav — TODO & Roadmap

## Fáze 1 — Implementovat teď

- [x] **Separátní stránka `#fond-oprav`** v menu (admin/výbor), plnohodnotný dashboard
- [x] **Bankovní účty SVJ** — název, číslo účtu, banka, zůstatek, úroková sazba %, typ (běžný/spořicí/termínovaný)
- [x] **Roční přehled** — sumarizace po rocích (příjmy/výdaje/zůstatek), meziročí porovnání, trendový čárový graf zůstatku
- [x] **Rozšířené statistiky** — top kategorie výdajů (bar chart), průměrné měsíční výdaje, trend zůstatku v čase
- [x] **O domě — zůstane read-only** — jen zůstatek + mini graf pro řadové vlastníky (bez CRUD, odkaz na detail)

## Fáze 2 — Editace + Přílohy + Filtrování ✅

- [x] **Editace záznamů** — úprava existujícího záznamu (modal přidání/editace, API `update`)
- [x] **Přílohy k záznamům** — PDF/JPEG/PNG (max 10 MB), upload/download/smazání, tabulka `fond_prilohy`
- [x] **Filtrování a vyhledávání** — filtr dle roku, typu, kategorie; fulltext LIKE na popis (debounce 300ms)
- [x] **Stránkování** — Předchozí/Další navigace v seznamu záznamů
- [x] **Indikátor příloh** — ikona 📎 s počtem u každého záznamu

## Fáze 3 — Později

- [ ] **Rozpočet / plán** — plánovaný roční rozpočet vs. skutečnost (plán příjmů × skutečné příjmy, plán výdajů × skutečné výdaje), progress bar "jak čerpáme"
- [ ] **Měsíční zálohy vlastníků** — pravidelné měsíční zálohy (předpis × skutečnost), přehled kdo zaplatil / kdo nezaplatil
- [ ] **Notifikace** — upozornění na vysoké výdaje, nízký zůstatek, neuhrazené zálohy
