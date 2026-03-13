<?php
/**
 * Fond oprav — přílohy (upload, list, download, delete).
 * Vyčleněno z fond_oprav.php pro dodržení limitu 500 řádků.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'upload':   handleUpload();   break;
    case 'list':     handlePrilohy();  break;
    case 'download': handlePrilohaDownload(); break;
    case 'delete':   handlePrilohaDelete();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleUpload(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $fondId = (int) ($_POST['fond_oprav_id'] ?? 0);
    if (!$fondId) jsonError('Chybí fond_oprav_id', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM fond_oprav WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $fondId, ':sid' => $svjId]);
    if (!$stmt->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    if (empty($_FILES['soubor']) || $_FILES['soubor']['error'] === UPLOAD_ERR_NO_FILE) {
        jsonError('Soubor nebyl nahrán', 400, 'NO_FILE');
    }
    $file = $_FILES['soubor'];
    $allowed = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];
    $ext = validateUpload($file, $allowed, UPLOAD_MAX_STANDARD, 'Nepodporovaný formát. Povoleny: PDF, JPEG, PNG');

    $filename = $svjId . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $storage = storageUpload($svjId, 'fond', $file, $filename, $file['name']);

    $db->prepare(
        'INSERT INTO fond_prilohy (fond_oprav_id, svj_id, soubor_nazev, soubor_cesta) VALUES (:fid, :sid, :nazev, :cesta)'
    )->execute([':fid' => $fondId, ':sid' => $svjId, ':nazev' => basename($file['name']), ':cesta' => $filename]);

    $resp = ['message' => 'Příloha nahrána', 'id' => (int) $db->lastInsertId()];
    if ($storage['gdrive_file_id']) $resp['gdrive'] = true;
    if ($storage['gdrive_error'])   $resp['gdrive_warning'] = $storage['gdrive_error'];
    jsonOk($resp);
}

function handlePrilohy(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $fondId = (int) getParam('fond_oprav_id', '0');
    if (!$fondId) jsonError('Chybí fond_oprav_id', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT id, soubor_nazev, created_at FROM fond_prilohy WHERE fond_oprav_id = :fid AND svj_id = :sid ORDER BY created_at DESC'
    );
    $stmt->execute([':fid' => $fondId, ':sid' => $svjId]);
    jsonOk(['prilohy' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handlePrilohaDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $id = (int) getParam('id', '0');
    if (!$id) jsonError('Chybí ID přílohy', 400, 'MISSING_ID');

    $stmt = getDb()->prepare('SELECT soubor_cesta, soubor_nazev FROM fond_prilohy WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $svjId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Příloha nenalezena', 404, 'NOT_FOUND');

    $path = storageDownload($svjId, 'uploads/fond/' . basename($row['soubor_cesta']));
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404, 'FILE_MISSING');

    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mimes = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'png' => 'image/png'];
    header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . rawurlencode($row['soubor_nazev']) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function handlePrilohaDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID přílohy', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT soubor_cesta FROM fond_prilohy WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $svjId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Příloha nenalezena', 404, 'NOT_FOUND');

    storageDelete($svjId, 'uploads/fond/' . basename($row['soubor_cesta']));
    $db->prepare('DELETE FROM fond_prilohy WHERE id = :id')->execute([':id' => $id]);
    jsonOk(['deleted' => true]);
}
