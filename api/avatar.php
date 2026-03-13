<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'upload': handleUpload(); break;
    case 'delete': handleDelete(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleUpload(): void
{
    requireMethod('POST');
    $user = requireAuth();

    if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] === UPLOAD_ERR_NO_FILE) {
        jsonError('Soubor nebyl nahrán', 400, 'NO_FILE');
    }

    $file = $_FILES['avatar'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Chyba při nahrávání souboru', 400, 'UPLOAD_ERROR');
    }

    if ($file['size'] > UPLOAD_MAX_AVATAR) {
        jsonError('Soubor je příliš velký (max 2 MB)', 413, 'FILE_TOO_LARGE');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];

    if (!isset($allowed[$mime])) {
        jsonError('Nepodporovaný formát. Použijte JPEG, PNG, GIF nebo WebP', 415, 'INVALID_MIME');
    }

    $ext       = $allowed[$mime];
    $filename  = $user['id'] . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

    // Smazat starý avatar
    $db   = getDb();
    $stmt = $db->prepare('SELECT avatar FROM users WHERE id = :id');
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch();

    $svjId = (int) ($user['svj_id'] ?? 0);
    if ($row && $row['avatar']) {
        storageDelete($svjId, 'uploads/avatars/' . basename($row['avatar']));
    }

    $storage = storageUpload($svjId, 'avatar', $file, $filename, $file['name']);

    $db->prepare('UPDATE users SET avatar = :avatar WHERE id = :id')
       ->execute([':avatar' => $filename, ':id' => $user['id']]);

    $resp = ['ok' => true, 'avatar' => $filename];
    if ($storage['gdrive_file_id']) $resp['gdrive'] = true;
    if ($storage['gdrive_error'])   $resp['gdrive_warning'] = $storage['gdrive_error'];
    jsonResponse($resp);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireAuth();

    $db   = getDb();
    $stmt = $db->prepare('SELECT avatar FROM users WHERE id = :id');
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch();

    if ($row && $row['avatar']) {
        $svjId = (int) ($user['svj_id'] ?? 0);
        storageDelete($svjId, 'uploads/avatars/' . basename($row['avatar']));
    }

    $db->prepare('UPDATE users SET avatar = NULL WHERE id = :id')
       ->execute([':id' => $user['id']]);

    jsonResponse(['ok' => true]);
}
