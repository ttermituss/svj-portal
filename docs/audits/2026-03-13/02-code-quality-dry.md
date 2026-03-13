# Audit: Code Quality (DRY / KISS / YAGNI)

Datum: 2026-03-13 | Verze: 2.5.0

---

## CRITICAL: Soubory překračující 500 řádků

| Soubor | Řádků | Překročení |
|--------|-------|------------|
| `api/fond_oprav.php` | 592 | +92 |
| `js/pages/dokumenty.js` | 570 | +70 |
| `js/pages/fond-oprav.js` | 558 | +58 |
| `js/pages/fond-oprav-detail.js` | 528 | +28 |
| `js/pages/jednotky.js` | 524 | +24 |
| `js/pages/nastaveni-google.js` | 507 | +7 |
| `js/pages/hlasovani.js` | 505 | +5 |
| `api/pdf_helper.php` | 503 | +3 |

---

## HIGH: DRY porušení

### Magic numbers — file size limity hardcoded
7 souborů duplikuje `X * 1024 * 1024` bez centrální konstanty:
- `avatar.php` (2 MB), `penb.php` (10 MB), `datovka.php` (10 MB), `fond_oprav.php` (10 MB), `revize.php` (10 MB), `zavady.php` (5 MB), `dokumenty.php` (20 MB)
- **Fix:** Konstanty v `config.php`

### SVJ validace opakována 15+×
```php
if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');
```
- **Fix:** Helper `requireSvj(array $user): int`

### Ownership check duplikován
Pattern `SELECT id FROM table WHERE id=? AND svj_id=?` + `if (!fetch) jsonError` — ve 6+ souborech.
- **Fix:** Helper `verifyOwnership(PDO $db, string $table, int $id, int $svjId)`

---

## MEDIUM: KISS porušení

### Duplicitní fetch error handling v `api.js`
`apiPost`, `apiGet`, `validateInvite` — identický `.then(res => res.json().then(...))` pattern.
- **Fix:** Sdílená `fetchJson()` funkce

### Duplicitní měsíční agregace v `fond_oprav.php`
Řádky 104–115 a 163–174 — skoro identická logika.
- **Fix:** Extrahovat do `fondAggregateByMonth()`

### Deep nesting v chart renderingu
`fond-oprav.js:400-442` — 4 úrovně vnořených forEach.
- **Fix:** Extrahovat vnitřní smyčky do pojmenovaných funkcí

---

## LOW: YAGNI

### `lookupAresLegacy()` v `api.js`
Komentář říká "zpětná kompatibilita" ale žádný kód ji nevolá.
- **Fix:** Ověřit a případně smazat

### `$subDir` parametr v `storageUpload()`
Používá jen `datovka.php` — zvážit specifické řešení

---

## MEDIUM: Code Smells

- Nekonzistentní return types: některé handlery `never`, některé `void`
- Mixed string/int parametry: `getParam('rok', '')` vs `(int) getParam('limit', 50)`
- Tiché selhání GDrive uploadu — chybí error_log v `storageTrackAndSync()`
- Chybějící timeout na externí API volání (`svj_helper.php` — ARES, RÚIAN)

---

## Souhrn

| Kategorie | Výskyt | Závažnost |
|-----------|--------|-----------|
| Soubory > 500 řádků | 8 | CRITICAL |
| DRY porušení | 12+ patterns | HIGH |
| Komplexita | 6 oblastí | MEDIUM |
| Dead code | 2 | LOW |
| Naming nekonzistence | průřezově | LOW |
