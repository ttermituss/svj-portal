<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/zfo_parser.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':       handleList();       break;
    case 'upload':     handleUpload();     break;
    case 'detail':     handleDetail();     break;
    case 'download':   handleDownload();   break;
    case 'delete':     handleDelete();     break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('Účet není přiřazen k SVJ', 400);

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT z.id, z.dm_id, z.sender, z.sender_isds, z.annotation, z.sender_ref,
                z.personal_delivery, z.ts_zpravy, z.uploaded_at,
                COUNT(p.id) AS prilohy_count
         FROM datovka_zpravy z
         LEFT JOIN datovka_prilohy p ON p.zprava_id = z.id
         WHERE z.svj_id = ?
         GROUP BY z.id
         ORDER BY COALESCE(z.ts_zpravy, z.uploaded_at) DESC'
    );
    $stmt->execute([$svjId]);
    $zpravy = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($zpravy as &$z) {
        $z['id']               = (int)$z['id'];
        $z['prilohy_count']    = (int)$z['prilohy_count'];
        $z['personal_delivery']= (bool)$z['personal_delivery'];
    }
    unset($z);

    jsonResponse(['zpravy' => $zpravy]);
}

function handleUpload(): void
{
    requireMethod('POST');
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('Účet není přiřazen k SVJ', 400);

    if (!isset($_FILES['zfo']) || $_FILES['zfo']['error'] !== UPLOAD_ERR_OK) {
        jsonError('Nepodařilo se nahrát soubor', 400, 'UPLOAD_ERROR');
    }

    $file = $_FILES['zfo'];

    // Kontrola přípony a velikosti (max 10 MB)
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'zfo') {
        jsonError('Pouze soubory .zfo jsou podporovány', 422, 'INVALID_TYPE');
    }
    if ($file['size'] > 10 * 1024 * 1024) {
        jsonError('Soubor je příliš velký (max 10 MB)', 422, 'FILE_TOO_LARGE');
    }

    // Parsovat ZFO
    $parsed = parseZfo($file['tmp_name']);
    if (isset($parsed['error'])) {
        jsonError('Nepodařilo se zpracovat ZFO: ' . $parsed['error'], 422, 'ZFO_PARSE_ERROR');
    }

    $meta  = $parsed['meta'];
    $files = $parsed['files'];

    if (empty($meta['dm_id'])) {
        jsonError('ZFO neobsahuje ID zprávy', 422, 'MISSING_DM_ID');
    }

    $db = getDb();

    // Kontrola duplicity
    $chk = $db->prepare('SELECT id FROM datovka_zpravy WHERE svj_id = ? AND dm_id = ?');
    $chk->execute([$svjId, $meta['dm_id']]);
    if ($chk->fetch()) {
        jsonError('Zpráva s tímto ID je již v archivu', 409, 'DUPLICATE');
    }

    // Uložit záznam zprávy
    $ins = $db->prepare(
        'INSERT INTO datovka_zpravy
         (svj_id, dm_id, sender, sender_isds, recipient, annotation, sender_ref, personal_delivery, ts_zpravy, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $svjId,
        $meta['dm_id'],
        mb_substr($meta['sender'], 0, 500),
        $meta['sender_isds'] ?: null,
        mb_substr($meta['recipient'], 0, 500),
        mb_substr($meta['annotation'], 0, 2000),
        $meta['sender_ref'] ? mb_substr($meta['sender_ref'], 0, 200) : null,
        $meta['personal_delivery'] ? 1 : 0,
        $meta['ts_zpravy'],
        $user['id'],
    ]);
    $zpravaId = (int)$db->lastInsertId();

    // Uložit přílohy na disk
    $baseDir = __DIR__ . '/../uploads/datovka/' . $svjId . '/' . $zpravaId;
    if (!is_dir($baseDir)) {
        mkdir($baseDir, 0750, true);
        file_put_contents($baseDir . '/.htaccess', "Require all denied\n");
    }

    $insPril = $db->prepare(
        'INSERT INTO datovka_prilohy (zprava_id, svj_id, filename, mimetype, file_meta_type, file_path, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    foreach ($files as $f) {
        $destPath = $baseDir . '/' . $f['name'];
        // Ošetřit kolizi názvů
        if (file_exists($destPath)) {
            $destPath = $baseDir . '/' . uniqid() . '_' . $f['name'];
        }
        file_put_contents($destPath, $f['data']);
        $relPath = 'uploads/datovka/' . $svjId . '/' . $zpravaId . '/' . basename($destPath);

        $insPril->execute([
            $zpravaId, $svjId,
            $f['name'], $f['mime'], $f['meta_type'],
            $relPath, strlen($f['data']),
        ]);
    }

    jsonResponse([
        'ok'          => true,
        'zprava_id'   => $zpravaId,
        'dm_id'       => $meta['dm_id'],
        'annotation'  => $meta['annotation'],
        'prilohy'     => count($files),
    ]);
}

function handleDetail(): void
{
    requireMethod('GET');
    $user    = requireRole('admin', 'vybor');
    $svjId   = (int)$user['svj_id'];
    $zpravaId = (int)getParam('id', 0);
    if (!$zpravaId) jsonError('Chybí id', 400);

    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM datovka_zpravy WHERE id = ? AND svj_id = ?');
    $stmt->execute([$zpravaId, $svjId]);
    $z = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$z) jsonError('Zpráva nenalezena', 404);

    $stmt2 = $db->prepare('SELECT id, filename, mimetype, file_meta_type, file_size FROM datovka_prilohy WHERE zprava_id = ? ORDER BY file_meta_type DESC, id');
    $stmt2->execute([$zpravaId]);
    $prilohy = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    foreach ($prilohy as &$p) {
        $p['id']        = (int)$p['id'];
        $p['file_size'] = (int)$p['file_size'];
    }
    unset($p);

    $z['id']               = (int)$z['id'];
    $z['personal_delivery']= (bool)$z['personal_delivery'];
    jsonResponse(['zprava' => $z, 'prilohy' => $prilohy]);
}

function handleDownload(): void
{
    requireMethod('GET');
    $user    = requireRole('admin', 'vybor');
    $svjId   = (int)$user['svj_id'];
    $prilohaId = (int)getParam('priloha_id', 0);
    if (!$prilohaId) jsonError('Chybí priloha_id', 400);

    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM datovka_prilohy WHERE id = ? AND svj_id = ?');
    $stmt->execute([$prilohaId, $svjId]);
    $p = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$p) jsonError('Příloha nenalezena', 404);

    $absPath = __DIR__ . '/../' . $p['file_path'];
    if (!is_file($absPath)) jsonError('Soubor nenalezen na disku', 404);

    $inline  = getParam('inline', '0') === '1';
    $disp    = $inline ? 'inline' : 'attachment';
    $mime    = $p['mimetype'] ?: 'application/octet-stream';

    // HTML inline — servírovat jako text/html v sandbox iframe
    header('Content-Type: ' . $mime);
    header('Content-Disposition: ' . $disp . '; filename="' . rawurlencode($p['filename']) . '"');
    header('Content-Length: ' . filesize($absPath));
    header('X-Content-Type-Options: nosniff');
    // Zabránit frame-jacking pro neHTML
    if ($mime !== 'text/html') {
        header('X-Frame-Options: SAMEORIGIN');
    }
    readfile($absPath);
    exit;
}

function handleDelete(): void
{
    requireMethod('POST');
    $user     = requireRole('admin', 'vybor');
    $svjId    = (int)$user['svj_id'];
    $body     = getJsonBody();
    $zpravaId = (int)($body['id'] ?? 0);
    if (!$zpravaId) jsonError('Chybí id', 400);

    $db   = getDb();
    $stmt = $db->prepare('SELECT id FROM datovka_zpravy WHERE id = ? AND svj_id = ?');
    $stmt->execute([$zpravaId, $svjId]);
    if (!$stmt->fetch()) jsonError('Zpráva nenalezena', 404);

    // Smazat soubory z disku
    $dir = __DIR__ . '/../uploads/datovka/' . $svjId . '/' . $zpravaId;
    if (is_dir($dir)) {
        foreach (glob($dir . '/*') as $f) { @unlink($f); }
        @rmdir($dir);
    }

    $db->prepare('DELETE FROM datovka_zpravy WHERE id = ? AND svj_id = ?')->execute([$zpravaId, $svjId]);
    jsonResponse(['ok' => true]);
}
