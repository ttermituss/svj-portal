<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'get':      handleGet();      break;
    case 'save':     handleSave();     break;
    case 'delete':   handleDelete();   break;
    case 'download': handleDownload(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleGet(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $stmt = getDb()->prepare(
        'SELECT id, energeticka_trida, datum_vystaveni, datum_platnosti,
                soubor_nazev, poznamka, created_at
         FROM penb WHERE svj_id = :svj_id ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([':svj_id' => $user['svj_id']]);
    jsonOk(['penb' => $stmt->fetch(PDO::FETCH_ASSOC) ?: null]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $trida          = strtoupper(sanitize($_POST['energeticka_trida'] ?? ''));
    $datumVystaveni = sanitize($_POST['datum_vystaveni'] ?? '');
    $datumPlatnosti = sanitize($_POST['datum_platnosti'] ?? '');
    $poznamka       = sanitize($_POST['poznamka'] ?? '');

    if (!in_array($trida, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], true)) {
        jsonError('Neplatná energetická třída', 400, 'INVALID_TRIDA');
    }
    if (!$datumVystaveni || !strtotime($datumVystaveni)) {
        jsonError('Neplatné datum vystavení', 400, 'INVALID_DATE');
    }
    if (!$datumPlatnosti || !strtotime($datumPlatnosti)) {
        jsonError('Neplatné datum platnosti', 400, 'INVALID_DATE');
    }

    $db = getDb();

    $stmt = $db->prepare('SELECT id, soubor_cesta FROM penb WHERE svj_id = :svj_id ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([':svj_id' => $user['svj_id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $souborNazev = $existing['soubor_nazev'] ?? null;
    $souborCesta = $existing['soubor_cesta'] ?? null;

    if (!empty($_FILES['soubor']) && $_FILES['soubor']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = $_FILES['soubor'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonError('Chyba při nahrávání souboru', 400, 'UPLOAD_ERROR');
        }
        if ($file['size'] > UPLOAD_MAX_STANDARD) {
            jsonError('Soubor je příliš velký (max 10 MB)', 413, 'FILE_TOO_LARGE');
        }

        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if ($mime !== 'application/pdf') {
            jsonError('Povoleny jsou pouze soubory PDF', 415, 'INVALID_MIME');
        }

        if ($souborCesta) {
            storageDelete($svjId, 'uploads/penb/' . basename($souborCesta));
        }

        $filename = $svjId . '_' . bin2hex(random_bytes(8)) . '.pdf';
        $penbStorage = storageUpload($svjId, 'penb', $file, $filename, $file['name']);

        $souborNazev = basename($file['name']);
        $souborCesta = $filename;
    }

    if ($existing) {
        $db->prepare(
            'UPDATE penb SET energeticka_trida = :trida, datum_vystaveni = :vystaveni,
             datum_platnosti = :platnosti, soubor_nazev = :nazev,
             soubor_cesta = :cesta, poznamka = :poznamka WHERE id = :id'
        )->execute([
            ':trida'    => $trida,
            ':vystaveni' => $datumVystaveni,
            ':platnosti' => $datumPlatnosti,
            ':nazev'    => $souborNazev,
            ':cesta'    => $souborCesta,
            ':poznamka' => $poznamka ?: null,
            ':id'       => $existing['id'],
        ]);
    } else {
        $db->prepare(
            'INSERT INTO penb (svj_id, energeticka_trida, datum_vystaveni, datum_platnosti,
             soubor_nazev, soubor_cesta, poznamka)
             VALUES (:svj_id, :trida, :vystaveni, :platnosti, :nazev, :cesta, :poznamka)'
        )->execute([
            ':svj_id'   => $user['svj_id'],
            ':trida'    => $trida,
            ':vystaveni' => $datumVystaveni,
            ':platnosti' => $datumPlatnosti,
            ':nazev'    => $souborNazev,
            ':cesta'    => $souborCesta,
            ':poznamka' => $poznamka ?: null,
        ]);
    }

    $resp = ['message' => 'PENB uložen'];
    if (isset($penbStorage['gdrive_file_id']) && $penbStorage['gdrive_file_id']) $resp['gdrive'] = true;
    if (isset($penbStorage['gdrive_error']))  $resp['gdrive_warning'] = $penbStorage['gdrive_error'];
    jsonOk($resp);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin');
    $svjId = requireSvj($user);

    $db   = getDb();
    $stmt = $db->prepare('SELECT id, soubor_cesta FROM penb WHERE svj_id = :svj_id ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) jsonError('PENB nenalezen', 404, 'NOT_FOUND');

    if ($row['soubor_cesta']) {
        storageDelete((int) $user['svj_id'], 'uploads/penb/' . basename($row['soubor_cesta']));
    }

    $db->prepare('DELETE FROM penb WHERE id = :id')->execute([':id' => $row['id']]);
    jsonOk();
}

function handleDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $stmt = getDb()->prepare(
        'SELECT soubor_cesta, soubor_nazev FROM penb WHERE svj_id = :svj_id ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !$row['soubor_cesta']) jsonError('Soubor nenalezen', 404, 'NOT_FOUND');

    $path = storageDownload((int) $user['svj_id'], 'uploads/penb/' . basename($row['soubor_cesta']));
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404, 'FILE_MISSING');

    $nazev = $row['soubor_nazev'] ?: 'penb.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . rawurlencode($nazev) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}
