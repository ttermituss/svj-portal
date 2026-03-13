<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':    handleList();    break;
    case 'get':     handleGet();     break;
    case 'add':     handleAdd();     break;
    case 'update':  handleUpdate();  break;
    case 'comment': handleComment(); break;
    case 'delete':  handleDelete();  break;
    case 'photo':   handlePhoto();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $stav   = sanitize(getParam('stav', ''));
    $limit  = min((int) getParam('limit', 50), 200);
    $offset = (int) getParam('offset', 0);

    $qb = new WhereBuilder('z.svj_id', $svjId);
    $allowedStavy = ['nova', 'v_reseni', 'vyreseno', 'zamitnuto'];
    if ($stav && in_array($stav, $allowedStavy, true)) {
        $qb->addWhereAlways('z.stav = ?', $stav);
    }

    $db = getDb();
    $stmt = $db->prepare(
        "SELECT z.id, z.nazev, z.lokace, z.priorita, z.stav, z.zodpovedna_osoba,
                z.foto_nazev, z.created_at, z.uzavreno_at,
                u.jmeno AS autor_jmeno, u.prijmeni AS autor_prijmeni,
                (SELECT COUNT(*) FROM zavady_historie h WHERE h.zavada_id = z.id AND h.typ = 'komentar') AS pocet_komentaru
         FROM zavady z
         JOIN users u ON u.id = z.vytvoril_id
         WHERE " . $qb->sql() . "
         ORDER BY FIELD(z.stav, 'nova', 'v_reseni', 'vyreseno', 'zamitnuto'), z.created_at DESC
         LIMIT ? OFFSET ?"
    );
    $qb->bind($stmt);
    $pc = count($qb->params());
    $stmt->bindValue($pc + 1, $limit, PDO::PARAM_INT);
    $stmt->bindValue($pc + 2, $offset, PDO::PARAM_INT);
    $stmt->execute();

    $countStmt = $db->prepare(
        "SELECT stav, COUNT(*) AS cnt FROM zavady WHERE svj_id = :svj_id GROUP BY stav"
    );
    $countStmt->execute([':svj_id' => $user['svj_id']]);
    $counts = [];
    foreach ($countStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $counts[$row['stav']] = (int) $row['cnt'];
    }

    jsonOk([
        'zavady' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'pocty'  => $counts,
    ]);
}

function handleGet(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT z.*, u.jmeno AS autor_jmeno, u.prijmeni AS autor_prijmeni
         FROM zavady z
         JOIN users u ON u.id = z.vytvoril_id
         WHERE z.id = :id AND z.svj_id = :svj_id'
    );
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $zavada = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$zavada) jsonError('Závada nenalezena', 404, 'NOT_FOUND');

    $histStmt = $db->prepare(
        'SELECT h.*, u.jmeno, u.prijmeni
         FROM zavady_historie h
         JOIN users u ON u.id = h.user_id
         WHERE h.zavada_id = :id
         ORDER BY h.created_at ASC'
    );
    $histStmt->execute([':id' => $id]);

    jsonOk([
        'zavada'   => $zavada,
        'historie' => $histStmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
}

function handleAdd(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $nazev    = sanitize($_POST['nazev'] ?? '');
    $popis    = sanitize($_POST['popis'] ?? '');
    $lokace   = sanitize($_POST['lokace'] ?? '');
    $priorita = sanitize($_POST['priorita'] ?? 'normalni');

    if (!$nazev) jsonError('Název závady je povinný', 400, 'MISSING_NAZEV');
    if (!$popis) jsonError('Popis závady je povinný', 400, 'MISSING_POPIS');

    $allowedPriority = ['nizka', 'normalni', 'vysoka', 'kriticka'];
    if (!in_array($priorita, $allowedPriority, true)) $priorita = 'normalni';

    $fotoNazev = null;
    $fotoCesta = null;

    if (!empty($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = $_FILES['foto'];
        $allowedMime = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $ext = validateUpload($file, $allowedMime, UPLOAD_MAX_PHOTO, 'Povoleny jsou pouze obrázky (JPEG, PNG, WebP)');
        $filename = $user['svj_id'] . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $fotoStorage = storageUpload((int) $user['svj_id'], 'zavady', $file, $filename, $file['name']);
        $fotoNazev = basename($file['name']);
        $fotoCesta = $filename;
    }

    $db = getDb();
    $db->prepare(
        'INSERT INTO zavady (svj_id, nazev, popis, lokace, priorita, foto_nazev, foto_cesta, vytvoril_id)
         VALUES (:svj_id, :nazev, :popis, :lokace, :priorita, :fn, :fc, :uid)'
    )->execute([
        ':svj_id'   => $user['svj_id'],
        ':nazev'    => $nazev,
        ':popis'    => $popis,
        ':lokace'   => $lokace ?: null,
        ':priorita' => $priorita,
        ':fn'       => $fotoNazev,
        ':fc'       => $fotoCesta,
        ':uid'      => $user['id'],
    ]);

    $zavadaId = $db->lastInsertId();

    $db->prepare(
        'INSERT INTO zavady_historie (zavada_id, user_id, typ, novy_stav)
         VALUES (:zid, :uid, :typ, :stav)'
    )->execute([
        ':zid'  => $zavadaId,
        ':uid'  => $user['id'],
        ':typ'  => 'zmena_stavu',
        ':stav' => 'nova',
    ]);

    $resp = ['message' => 'Závada nahlášena', 'id' => $zavadaId];
    if (isset($fotoStorage['gdrive_file_id']) && $fotoStorage['gdrive_file_id']) $resp['gdrive'] = true;
    if (isset($fotoStorage['gdrive_error']))  $resp['gdrive_warning'] = $fotoStorage['gdrive_error'];
    jsonOk($resp);
}

function handleUpdate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $id = (int) ($data['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM zavady WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$existing) jsonError('Závada nenalezena', 404, 'NOT_FOUND');

    $novyStav     = sanitize($data['stav'] ?? '');
    $novaPriorita = sanitize($data['priorita'] ?? '');
    $zodpovedna   = sanitize($data['zodpovedna_osoba'] ?? '');

    $updates = [];
    $params  = [':id' => $id];

    $allowedStavy = ['nova', 'v_reseni', 'vyreseno', 'zamitnuto'];
    if ($novyStav && in_array($novyStav, $allowedStavy, true) && $novyStav !== $existing['stav']) {
        $updates[] = 'stav = :stav';
        $params[':stav'] = $novyStav;

        if (in_array($novyStav, ['vyreseno', 'zamitnuto'], true)) {
            $updates[] = 'uzavreno_at = NOW()';
        } elseif ($existing['uzavreno_at']) {
            $updates[] = 'uzavreno_at = NULL';
        }

        $db->prepare(
            'INSERT INTO zavady_historie (zavada_id, user_id, typ, stary_stav, novy_stav)
             VALUES (:zid, :uid, :typ, :old, :new)'
        )->execute([
            ':zid' => $id, ':uid' => $user['id'], ':typ' => 'zmena_stavu',
            ':old' => $existing['stav'], ':new' => $novyStav,
        ]);
    }

    $allowedPriority = ['nizka', 'normalni', 'vysoka', 'kriticka'];
    if ($novaPriorita && in_array($novaPriorita, $allowedPriority, true) && $novaPriorita !== $existing['priorita']) {
        $updates[] = 'priorita = :priorita';
        $params[':priorita'] = $novaPriorita;

        $db->prepare(
            'INSERT INTO zavady_historie (zavada_id, user_id, typ, stary_stav, novy_stav)
             VALUES (:zid, :uid, :typ, :old, :new)'
        )->execute([
            ':zid' => $id, ':uid' => $user['id'], ':typ' => 'zmena_priority',
            ':old' => $existing['priorita'], ':new' => $novaPriorita,
        ]);
    }

    if ($zodpovedna !== ($existing['zodpovedna_osoba'] ?? '')) {
        $updates[] = 'zodpovedna_osoba = :zodp';
        $params[':zodp'] = $zodpovedna ?: null;

        if ($zodpovedna) {
            $db->prepare(
                'INSERT INTO zavady_historie (zavada_id, user_id, typ, text)
                 VALUES (:zid, :uid, :typ, :txt)'
            )->execute([
                ':zid' => $id, ':uid' => $user['id'], ':typ' => 'prirazeni',
                ':txt' => $zodpovedna,
            ]);
        }
    }

    if ($updates) {
        $sql = 'UPDATE zavady SET ' . implode(', ', $updates) . ' WHERE id = :id';
        $db->prepare($sql)->execute($params);
    }

    jsonOk(['message' => 'Závada aktualizována']);
}

function handleComment(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $zavadaId = (int) ($data['zavada_id'] ?? 0);
    $text     = sanitize($data['text'] ?? '');

    if (!$zavadaId) jsonError('Chybí ID závady', 400, 'MISSING_ID');
    if (!$text)     jsonError('Komentář nesmí být prázdný', 400, 'MISSING_TEXT');

    $db = getDb();
    $chk = $db->prepare('SELECT id FROM zavady WHERE id = :id AND svj_id = :svj_id');
    $chk->execute([':id' => $zavadaId, ':svj_id' => $user['svj_id']]);
    if (!$chk->fetch()) jsonError('Závada nenalezena', 404, 'NOT_FOUND');

    $db->prepare(
        'INSERT INTO zavady_historie (zavada_id, user_id, typ, text) VALUES (:zid, :uid, :typ, :txt)'
    )->execute([':zid' => $zavadaId, ':uid' => $user['id'], ':typ' => 'komentar', ':txt' => $text]);

    jsonOk(['message' => 'Komentář přidán']);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin');
    $svjId = requireSvj($user);

    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $id = (int) ($data['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT id, foto_cesta FROM zavady WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Závada nenalezena', 404, 'NOT_FOUND');

    if ($row['foto_cesta']) {
        storageDelete((int) $user['svj_id'], 'uploads/zavady/' . basename($row['foto_cesta']));
    }

    $db->prepare('DELETE FROM zavady WHERE id = :id')->execute([':id' => $row['id']]);
    jsonOk(['message' => 'Závada smazána']);
}

function handlePhoto(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT foto_cesta, foto_nazev FROM zavady WHERE id = :id AND svj_id = :svj_id'
    );
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !$row['foto_cesta']) jsonError('Fotka nenalezena', 404, 'NOT_FOUND');

    $path = storageDownload((int) $user['svj_id'], 'uploads/zavady/' . basename($row['foto_cesta']));
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404, 'FILE_MISSING');

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="' . rawurlencode($row['foto_nazev'] ?: 'foto.jpg') . '"');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=86400');
    readfile($path);
    exit;
}
