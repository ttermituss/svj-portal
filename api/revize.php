<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':     handleList();     break;
    case 'save':     handleSave();     break;
    case 'delete':   handleDelete();   break;
    case 'download': handleDownload(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $stmt = getDb()->prepare(
        'SELECT id, typ, nazev, datum_posledni, interval_mesice, datum_pristi,
                soubor_nazev, poznamka
         FROM revize WHERE svj_id = :svj_id ORDER BY datum_pristi ASC, nazev ASC'
    );
    $stmt->execute([':svj_id' => $user['svj_id']]);
    jsonOk(['revize' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id             = (int) ($_POST['id'] ?? 0);
    $typ            = sanitize($_POST['typ'] ?? '');
    $nazev          = sanitize($_POST['nazev'] ?? '');
    $datumPosledni  = sanitize($_POST['datum_posledni'] ?? '');
    $intervalMesice = isset($_POST['interval_mesice']) && $_POST['interval_mesice'] !== ''
                      ? (int) $_POST['interval_mesice'] : null;
    $datumPristi    = sanitize($_POST['datum_pristi'] ?? '');
    $poznamka       = sanitize($_POST['poznamka'] ?? '');

    $allowedTypy = ['vytah', 'elektro', 'plyn', 'hromosvod', 'hasici', 'jine'];
    if (!in_array($typ, $allowedTypy, true)) jsonError('Neplatný typ revize', 400, 'INVALID_TYP');
    if (!$nazev) jsonError('Název je povinný', 400, 'MISSING_NAZEV');
    if (!$datumPosledni || !strtotime($datumPosledni)) jsonError('Neplatné datum poslední revize', 400, 'INVALID_DATE');

    // datum_pristi: buď zadáno ručně, nebo vypočítáno z intervalu
    if ($datumPristi && !strtotime($datumPristi)) jsonError('Neplatné datum příští revize', 400, 'INVALID_DATE');
    if (!$datumPristi && $intervalMesice) {
        $dt = new DateTime($datumPosledni);
        $dt->modify("+{$intervalMesice} months");
        $datumPristi = $dt->format('Y-m-d');
    }

    $db = getDb();

    // Ověření vlastnictví záznamu
    if ($id) {
        $chk = $db->prepare('SELECT id, soubor_cesta FROM revize WHERE id = :id AND svj_id = :svj_id');
        $chk->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
        $existing = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$existing) jsonError('Revize nenalezena', 404, 'NOT_FOUND');
    }

    $souborNazev = $id ? ($existing['soubor_nazev'] ?? null) : null;
    $souborCesta = $id ? ($existing['soubor_cesta'] ?? null) : null;

    if (!empty($_FILES['soubor']) && $_FILES['soubor']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = $_FILES['soubor'];
        if ($file['error'] !== UPLOAD_ERR_OK) jsonError('Chyba při nahrávání souboru', 400, 'UPLOAD_ERROR');
        if ($file['size'] > 10 * 1024 * 1024) jsonError('Soubor je příliš velký (max 10 MB)', 413, 'FILE_TOO_LARGE');

        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if ($mime !== 'application/pdf') jsonError('Povoleny jsou pouze soubory PDF', 415, 'INVALID_MIME');

        $uploadDir = __DIR__ . '/../uploads/revize/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0750, true);

        if ($souborCesta) {
            $old = $uploadDir . basename($souborCesta);
            if (file_exists($old)) unlink($old);
        }

        $filename    = $user['svj_id'] . '_' . bin2hex(random_bytes(8)) . '.pdf';
        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            jsonError('Nepodařilo se uložit soubor', 500, 'SAVE_ERROR');
        }
        $souborNazev = basename($file['name']);
        $souborCesta = $filename;
    }

    if ($id) {
        $db->prepare(
            'UPDATE revize SET typ = :typ, nazev = :nazev, datum_posledni = :posledni,
             interval_mesice = :interval, datum_pristi = :pristi,
             soubor_nazev = :sn, soubor_cesta = :sc, poznamka = :poz
             WHERE id = :id'
        )->execute([
            ':typ'      => $typ,
            ':nazev'    => $nazev,
            ':posledni' => $datumPosledni,
            ':interval' => $intervalMesice,
            ':pristi'   => $datumPristi ?: null,
            ':sn'       => $souborNazev,
            ':sc'       => $souborCesta,
            ':poz'      => $poznamka ?: null,
            ':id'       => $id,
        ]);
    } else {
        $db->prepare(
            'INSERT INTO revize (svj_id, typ, nazev, datum_posledni, interval_mesice,
             datum_pristi, soubor_nazev, soubor_cesta, poznamka)
             VALUES (:svj_id, :typ, :nazev, :posledni, :interval, :pristi, :sn, :sc, :poz)'
        )->execute([
            ':svj_id'   => $user['svj_id'],
            ':typ'      => $typ,
            ':nazev'    => $nazev,
            ':posledni' => $datumPosledni,
            ':interval' => $intervalMesice,
            ':pristi'   => $datumPristi ?: null,
            ':sn'       => $souborNazev,
            ':sc'       => $souborCesta,
            ':poz'      => $poznamka ?: null,
        ]);
    }

    jsonOk(['message' => 'Revize uložena']);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db   = getDb();
    $stmt = $db->prepare('SELECT id, soubor_cesta FROM revize WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row  = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Revize nenalezena', 404, 'NOT_FOUND');

    if ($row['soubor_cesta']) {
        $path = __DIR__ . '/../uploads/revize/' . basename($row['soubor_cesta']);
        if (file_exists($path)) unlink($path);
    }

    $db->prepare('DELETE FROM revize WHERE id = :id')->execute([':id' => $row['id']]);
    jsonOk();
}

function handleDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT soubor_cesta, soubor_nazev FROM revize WHERE id = :id AND svj_id = :svj_id'
    );
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !$row['soubor_cesta']) jsonError('Soubor nenalezen', 404, 'NOT_FOUND');

    $path = __DIR__ . '/../uploads/revize/' . basename($row['soubor_cesta']);
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404, 'FILE_MISSING');

    $nazev = $row['soubor_nazev'] ?: 'revize.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . rawurlencode($nazev) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}
