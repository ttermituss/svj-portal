<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':     handleList();     break;
    case 'upload':   handleUpload();   break;
    case 'download': handleDownload(); break;
    case 'delete':   handleDelete();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $isPriv = in_array($user['role'], ['admin', 'vybor'], true);

    $sql = 'SELECT d.id, d.nazev, d.popis, d.kategorie, d.soubor_nazev,
                   d.datum_platnosti, d.pristup, d.created_at,
                   u.jmeno, u.prijmeni
            FROM dokumenty d
            JOIN users u ON u.id = d.uploaded_by
            WHERE d.svj_id = :svj_id';
    if (!$isPriv) {
        $sql .= " AND d.pristup = 'vsichni'";
    }
    $sql .= ' ORDER BY d.kategorie, d.created_at DESC';

    $stmt = getDb()->prepare($sql);
    $stmt->execute([':svj_id' => $user['svj_id']]);
    jsonOk(['dokumenty' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleUpload(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $nazev    = sanitize($_POST['nazev'] ?? '');
    $popis    = sanitize($_POST['popis'] ?? '');
    $kategorie = sanitize($_POST['kategorie'] ?? 'ostatni');
    $datumPlatnosti = sanitize($_POST['datum_platnosti'] ?? '');
    $pristup  = sanitize($_POST['pristup'] ?? 'vsichni');

    if (!$nazev) jsonError('Název dokumentu je povinný', 400, 'MISSING_NAZEV');

    $validKategorie = ['stanovy', 'zapisy', 'smlouvy', 'pojistky', 'revize', 'ostatni'];
    if (!in_array($kategorie, $validKategorie, true)) $kategorie = 'ostatni';

    $validPristup = ['vsichni', 'vybor'];
    if (!in_array($pristup, $validPristup, true)) $pristup = 'vsichni';

    $datumPlatnostiVal = ($datumPlatnosti && strtotime($datumPlatnosti)) ? $datumPlatnosti : null;

    if (empty($_FILES['soubor']) || $_FILES['soubor']['error'] === UPLOAD_ERR_NO_FILE) {
        jsonError('Soubor nebyl nahrán', 400, 'NO_FILE');
    }

    $file = $_FILES['soubor'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Chyba při nahrávání souboru', 400, 'UPLOAD_ERROR');
    }
    if ($file['size'] > 20 * 1024 * 1024) {
        jsonError('Soubor je příliš velký (max 20 MB)', 413, 'FILE_TOO_LARGE');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);

    $allowed = [
        'application/pdf'                                                        => 'pdf',
        'application/msword'                                                     => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel'                                               => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'     => 'xlsx',
        'image/jpeg'                                                             => 'jpg',
        'image/png'                                                              => 'png',
    ];

    // Textové soubory — finfo vrací text/plain pro .md i .txt; ověříme přes příponu
    $textExt = ['md' => 'md', 'txt' => 'txt', 'markdown' => 'md'];
    $origExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (isset($allowed[$mime])) {
        $ext = $allowed[$mime];
    } elseif (($mime === 'text/plain' || $mime === 'text/markdown') && isset($textExt[$origExt])) {
        $ext = $textExt[$origExt];
    } else {
        jsonError('Nepodporovaný formát. Povoleny: PDF, Word, Excel, JPEG, PNG, Markdown, TXT', 415, 'INVALID_MIME');
    }

    $uploadDir = __DIR__ . '/../uploads/dokumenty/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0750, true);
    }

    $ext      = $allowed[$mime];
    $filename = $user['svj_id'] . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        jsonError('Nepodařilo se uložit soubor', 500, 'SAVE_ERROR');
    }

    getDb()->prepare(
        'INSERT INTO dokumenty (svj_id, nazev, popis, kategorie, soubor_nazev, soubor_cesta,
         datum_platnosti, pristup, uploaded_by)
         VALUES (:svj_id, :nazev, :popis, :kategorie, :soubor_nazev, :soubor_cesta,
         :datum_platnosti, :pristup, :uploaded_by)'
    )->execute([
        ':svj_id'          => $user['svj_id'],
        ':nazev'           => $nazev,
        ':popis'           => $popis ?: null,
        ':kategorie'       => $kategorie,
        ':soubor_nazev'    => basename($file['name']),
        ':soubor_cesta'    => $filename,
        ':datum_platnosti' => $datumPlatnostiVal,
        ':pristup'         => $pristup,
        ':uploaded_by'     => $user['id'],
    ]);

    jsonOk(['message' => 'Dokument nahrán']);
}

function handleDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int)getParam('id', '0');
    if (!$id) jsonError('Chybí ID dokumentu', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT soubor_cesta, soubor_nazev, pristup FROM dokumenty WHERE id = :id AND svj_id = :svj_id'
    );
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) jsonError('Dokument nenalezen', 404, 'NOT_FOUND');

    $isPriv = in_array($user['role'], ['admin', 'vybor'], true);
    if ($row['pristup'] === 'vybor' && !$isPriv) {
        jsonError('Přístup odepřen', 403, 'FORBIDDEN');
    }

    $path = __DIR__ . '/../uploads/dokumenty/' . basename($row['soubor_cesta']);
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404, 'FILE_MISSING');

    $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mimes = [
        'pdf'  => 'application/pdf',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls'  => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'jpg'  => 'image/jpeg',
        'png'  => 'image/png',
        'md'   => 'text/markdown',
        'txt'  => 'text/plain',
    ];

    header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . rawurlencode($row['soubor_nazev']) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID dokumentu', 400, 'MISSING_ID');

    $db   = getDb();
    $stmt = $db->prepare('SELECT id, soubor_cesta FROM dokumenty WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) jsonError('Dokument nenalezen', 404, 'NOT_FOUND');

    $path = __DIR__ . '/../uploads/dokumenty/' . basename($row['soubor_cesta']);
    if (file_exists($path)) unlink($path);

    $db->prepare('DELETE FROM dokumenty WHERE id = :id')->execute([':id' => $row['id']]);
    jsonOk();
}
