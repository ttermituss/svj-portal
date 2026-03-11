<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/xlsx_helper.php';

$user   = requireAuth();
$svjId  = $user['svj_id'];
$type   = $_GET['type']   ?? '';
$format = $_GET['format'] ?? 'csv';

if (!in_array($format, ['csv', 'xlsx'], true)) jsonError('Nepodporovaný formát', 400);

$allowed = ['vlastnici', 'jednotky', 'fond_oprav', 'revize', 'parkovani'];
if (!in_array($type, $allowed, true)) jsonError('Nepodporovaný typ exportu', 400);

$db = getDb();

switch ($type) {
    case 'vlastnici':
        requireRole('admin', 'vybor');
        $stmt = $db->prepare(
            'SELECT jmeno, prijmeni, email, role, created_at FROM users WHERE svj_id = ? ORDER BY prijmeni, jmeno'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Jméno', 'Příjmení', 'E-mail', 'Role', 'Registrace'];
        $data    = array_map(fn($r) => [
            $r['jmeno'], $r['prijmeni'], $r['email'],
            $r['role'],
            $r['created_at'] ? date('d.m.Y', strtotime($r['created_at'])) : '',
        ], $rows);
        $filename = 'vlastnici';
        $sheet    = 'Vlastníci';
        break;

    case 'jednotky':
        $stmt = $db->prepare(
            'SELECT cislo_jednotky, typ_jednotky, zpusob_vyuziti, podil_citatel, podil_jmenovatel,
                    lv, katastralni_uzemi, plomba_aktivni
             FROM jednotky WHERE svj_id = ? ORDER BY cislo_jednotky'
        );
        $stmt->execute([$svjId]);
        $rows    = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $headers = ['Č. jednotky', 'Typ', 'Využití', 'Podíl citatel', 'Podíl jmenovatel', 'LV', 'K.ú.', 'Plomba'];
        $data    = array_map(fn($r) => [
            $r['cislo_jednotky'],
            $r['typ_jednotky'] ?? '',
            $r['zpusob_vyuziti'] ?? '',
            $r['podil_citatel'] ?? '',
            $r['podil_jmenovatel'] ?? '',
            $r['lv'] ?? '',
            $r['katastralni_uzemi'] ?? '',
            $r['plomba_aktivni'] ? 'Ano' : 'Ne',
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

    default:
        jsonError('Neznámý typ', 400);
}

$date = date('Y-m-d');
if ($format === 'xlsx') {
    $bytes = buildXlsx($headers, $data, $sheet);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '_' . $date . '.xlsx"');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
} else {
    // CSV s UTF-8 BOM pro správné otevření v Excel
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
