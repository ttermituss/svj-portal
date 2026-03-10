<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

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

    if ($file['size'] > 2 * 1024 * 1024) {
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
    $uploadDir = __DIR__ . '/../uploads/avatars/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0750, true);
    }

    // Smazat starý avatar
    $db   = getDb();
    $stmt = $db->prepare('SELECT avatar FROM users WHERE id = :id');
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch();

    if ($row && $row['avatar']) {
        $old = $uploadDir . basename($row['avatar']);
        if (file_exists($old)) {
            unlink($old);
        }
    }

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        jsonError('Nepodařilo se uložit soubor', 500, 'SAVE_ERROR');
    }

    $db->prepare('UPDATE users SET avatar = :avatar WHERE id = :id')
       ->execute([':avatar' => $filename, ':id' => $user['id']]);

    jsonResponse(['ok' => true, 'avatar' => $filename]);
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
        $uploadDir = __DIR__ . '/../uploads/avatars/';
        $old       = $uploadDir . basename($row['avatar']);
        if (file_exists($old)) {
            unlink($old);
        }
    }

    $db->prepare('UPDATE users SET avatar = NULL WHERE id = :id')
       ->execute([':id' => $user['id']]);

    jsonResponse(['ok' => true]);
}
