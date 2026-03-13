<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/xlsx_helper.php';
require_once __DIR__ . '/pdf_helper.php';

$user   = requireAuth();
$svjId  = requireSvj($user);
$type   = $_GET['type']   ?? '';
$format = $_GET['format'] ?? 'csv';

if (!in_array($format, ['csv', 'xlsx', 'pdf'], true)) jsonError('Nepodporovaný formát', 400);

$allowed = ['vlastnici', 'jednotky', 'fond_oprav', 'revize', 'parkovani', 'zavady', 'meridla'];
if (!in_array($type, $allowed, true)) jsonError('Nepodporovaný typ exportu', 400);

$db = getDb();

switch ($type) {
    case 'vlastnici':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT u.jmeno, u.prijmeni, u.email, u.telefon, u.role, u.created_at, j.cislo_jednotky
             FROM users u
             LEFT JOIN jednotky j ON j.id = u.jednotka_id
             WHERE u.svj_id = ? ORDER BY u.prijmeni, u.jmeno'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Jméno', 'Příjmení', 'E-mail', 'Telefon', 'Jednotka', 'Role', 'Registrace'];
        $data    = array_map(fn($r) => [
            $r['jmeno'], $r['prijmeni'], $r['email'], $r['telefon'] ?? '',
            $r['cislo_jednotky'] ?? '',
            $r['role'],
            $r['created_at'] ? date('d.m.Y', strtotime($r['created_at'])) : '',
        ], $rows);
        $filename = 'vlastnici';
        $sheet    = 'Vlastníci';
        break;

    case 'jednotky':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT j.cislo_jednotky, j.typ_jednotky, j.zpusob_vyuziti,
                    j.podil_citatel, j.podil_jmenovatel, j.lv, j.katastralni_uzemi,
                    j.plomba_aktivni, j.pronajem,
                    j.poznamka,
                    COALESCE(u.jmeno, ve.jmeno, \'\')     AS vlastnik_jmeno,
                    COALESCE(u.prijmeni, ve.prijmeni, \'\') AS vlastnik_prijmeni,
                    j.najemce_jmeno, j.najemce_prijmeni, j.najemce_telefon
             FROM jednotky j
             LEFT JOIN users u        ON u.id  = (SELECT id FROM users WHERE jednotka_id = j.id LIMIT 1)
             LEFT JOIN vlastnici_ext ve ON ve.id = (SELECT id FROM vlastnici_ext WHERE jednotka_id = j.id LIMIT 1)
             WHERE j.svj_id = ? ORDER BY j.cislo_jednotky + 0'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Č. jednotky', 'Typ', 'Využití', 'Podíl čit.', 'Podíl jmen.', 'LV', 'K.ú.',
                    'Vlastník', 'Plomba', 'Pronájem', 'Nájemce', 'Tel. nájemce', 'Poznámka'];
        $data    = array_map(fn($r) => [
            $r['cislo_jednotky'],
            $r['typ_jednotky']   ?? '',
            $r['zpusob_vyuziti'] ?? '',
            $r['podil_citatel']      ?? '',
            $r['podil_jmenovatel']   ?? '',
            $r['lv']             ?? '',
            $r['katastralni_uzemi'] ?? '',
            trim(($r['vlastnik_jmeno'] ?? '') . ' ' . ($r['vlastnik_prijmeni'] ?? '')),
            $r['plomba_aktivni'] ? 'Ano' : 'Ne',
            $r['pronajem']       ? 'Ano' : 'Ne',
            trim(($r['najemce_jmeno'] ?? '') . ' ' . ($r['najemce_prijmeni'] ?? '')),
            $r['najemce_telefon'] ?? '',
            $r['poznamka']       ?? '',
        ], $rows);
        $filename = 'jednotky';
        $sheet    = 'Jednotky';
        break;

    case 'fond_oprav':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT typ, kategorie, popis, castka, datum FROM fond_oprav WHERE svj_id = ? ORDER BY datum DESC'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Typ', 'Kategorie', 'Popis', 'Částka (Kč)', 'Datum'];
        $data    = array_map(fn($r) => [
            $r['typ'] === 'prijem' ? 'Příjem' : 'Výdaj',
            $r['kategorie'] ?? '',
            $r['popis'] ?? '',
            $r['castka'],
            $r['datum'] ? date('d.m.Y', strtotime($r['datum'])) : '',
        ], $rows);
        $filename = 'fond_oprav';
        $sheet    = 'Fond oprav';
        break;

    case 'revize':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT nazev, typ, datum_posledni, interval_mesice, datum_pristi, poznamka
             FROM revize WHERE svj_id = ? ORDER BY datum_pristi'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Název', 'Typ', 'Poslední revize', 'Interval (měs.)', 'Příští revize', 'Poznámka'];
        $data    = array_map(fn($r) => [
            $r['nazev'],
            $r['typ'],
            $r['datum_posledni'] ? date('d.m.Y', strtotime($r['datum_posledni'])) : '',
            $r['interval_mesice'],
            $r['datum_pristi'] ? date('d.m.Y', strtotime($r['datum_pristi'])) : '',
            $r['poznamka'] ?? '',
        ], $rows);
        $filename = 'revize';
        $sheet    = 'Revize';
        break;

    case 'parkovani':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT cislo, typ, cislo_jednotky, najemce, poznamka FROM parkovani WHERE svj_id = ? ORDER BY typ, cislo'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Číslo místa', 'Typ', 'Č. jednotky', 'Nájemce', 'Poznámka'];
        $data    = array_map(fn($r) => [
            $r['cislo'] ?? '',
            $r['typ'] ?? '',
            $r['cislo_jednotky'] ?? '',
            $r['najemce'] ?? '',
            $r['poznamka'] ?? '',
        ], $rows);
        $filename = 'parkovani';
        $sheet    = 'Parkovací místa';
        break;

    case 'meridla':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT m.typ, m.vyrobni_cislo, m.umisteni_typ, m.misto, m.jednotka_mereni,
                    m.datum_instalace, m.datum_cejchu, m.datum_pristi_cejch, m.aktivni,
                    j.cislo_jednotky,
                    (SELECT o.hodnota FROM odecty o WHERE o.meridlo_id = m.id ORDER BY o.datum DESC LIMIT 1) AS posledni_hodnota,
                    (SELECT o.datum   FROM odecty o WHERE o.meridlo_id = m.id ORDER BY o.datum DESC LIMIT 1) AS posledni_datum
             FROM meridla m
             LEFT JOIN jednotky j ON j.id = m.jednotka_id
             WHERE m.svj_id = ?
             ORDER BY m.typ, j.cislo_jednotky, m.vyrobni_cislo'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $typyMap = ['voda_studena' => 'Studená voda', 'voda_tepla' => 'Teplá voda',
                    'plyn' => 'Plyn', 'elektrina' => 'Elektřina', 'teplo' => 'Teplo', 'jine' => 'Jiné'];
        $headers = ['Typ', 'Výr. číslo', 'Umístění', 'Jednotka', 'Místo', 'Jednotka měření',
                    'Instalace', 'Cejch', 'Příští cejch', 'Aktivní', 'Posl. odečet', 'Datum odečtu'];
        $data    = array_map(fn($r) => [
            $typyMap[$r['typ']] ?? $r['typ'],
            $r['vyrobni_cislo'] ?? '',
            $r['umisteni_typ'] === 'spolecne' ? 'Společné' : 'Jednotka',
            $r['cislo_jednotky'] ?? '',
            $r['misto'] ?? '',
            $r['jednotka_mereni'] ?? '',
            $r['datum_instalace'] ? date('d.m.Y', strtotime($r['datum_instalace'])) : '',
            $r['datum_cejchu'] ? date('d.m.Y', strtotime($r['datum_cejchu'])) : '',
            $r['datum_pristi_cejch'] ? date('d.m.Y', strtotime($r['datum_pristi_cejch'])) : '',
            $r['aktivni'] ? 'Ano' : 'Ne',
            $r['posledni_hodnota'] !== null ? $r['posledni_hodnota'] : '',
            $r['posledni_datum'] ? date('d.m.Y', strtotime($r['posledni_datum'])) : '',
        ], $rows);
        $filename = 'meridla';
        $sheet    = 'Měřidla';
        break;

    case 'zavady':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT z.nazev, z.popis, z.lokace, z.priorita, z.stav,
                    z.zodpovedna_osoba, z.created_at, z.uzavreno_at,
                    u.jmeno, u.prijmeni
             FROM zavady z
             JOIN users u ON u.id = z.vytvoril_id
             WHERE z.svj_id = ? ORDER BY z.created_at DESC'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stavMap = ['nova' => 'Nová', 'v_reseni' => 'V řešení', 'vyreseno' => 'Vyřešeno', 'zamitnuto' => 'Zamítnuto'];
        $prioMap = ['nizka' => 'Nízká', 'normalni' => 'Normální', 'vysoka' => 'Vysoká', 'kriticka' => 'Kritická'];
        $headers = ['Název', 'Popis', 'Místo', 'Priorita', 'Stav',
                    'Zodpovědná osoba', 'Nahlásil/a', 'Vytvořeno', 'Uzavřeno'];
        $data    = array_map(fn($r) => [
            $r['nazev'],
            $r['popis'] ?? '',
            $r['lokace'] ?? '',
            $prioMap[$r['priorita']] ?? $r['priorita'],
            $stavMap[$r['stav']] ?? $r['stav'],
            $r['zodpovedna_osoba'] ?? '',
            trim(($r['jmeno'] ?? '') . ' ' . ($r['prijmeni'] ?? '')),
            $r['created_at'] ? date('d.m.Y', strtotime($r['created_at'])) : '',
            $r['uzavreno_at'] ? date('d.m.Y', strtotime($r['uzavreno_at'])) : '',
        ], $rows);
        $filename = 'zavady';
        $sheet    = 'Hlášení závad';
        break;

    default:
        jsonError('Neznámý typ', 400);
}

$date = date('Y-m-d');
if ($format === 'pdf') {
    $svjStmt = $db->prepare('SELECT nazev FROM svj WHERE id = ?');
    $svjStmt->execute([$svjId]);
    $svjName = $svjStmt->fetchColumn() ?: '';
    $pdfTitle = $sheet . ($svjName ? ' — ' . $svjName : '');
    $bytes = buildPdf($headers, $data, $pdfTitle, 'Export ' . date('d.m.Y H:i'));
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '_' . $date . '.pdf"');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
} elseif ($format === 'xlsx') {
    $bytes = buildXlsx($headers, $data, $sheet);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '_' . $date . '.xlsx"');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
} else {
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . $filename . '_' . $date . '.csv"');
    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM
    fputcsv($out, $headers, ';');
    foreach ($data as $row) {
        fputcsv($out, $row, ';');
    }
    fclose($out);
}
exit;
