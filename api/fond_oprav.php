<?php
/**
 * Fond oprav — záznamy příjmů/výdajů + bankovní účty + rozšířené statistiky + přílohy.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':            handleList();            break;
    case 'stats':           handleStats();           break;
    case 'statsRocni':      handleStatsRocni();      break;
    case 'statsKat':        handleStatsKat();        break;
    case 'add':             handleAdd();             break;
    case 'update':          handleUpdate();          break;
    case 'delete':          handleDelete();          break;
    case 'upload':          handleUpload();          break;
    case 'prilohy':         handlePrilohy();         break;
    case 'prilohaDownload': handlePrilohaDownload(); break;
    case 'prilohaDelete':   handlePrilohaDelete();   break;
    case 'uctyList':        handleUctyList();        break;
    case 'uctySave':        handleUctySave();        break;
    case 'uctyDelete':      handleUctyDelete();      break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== ZÁZNAMY ===== */

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $limit     = max(1, min(200, (int) getParam('limit', 50)));
    $offset    = max(0, (int) getParam('offset', 0));
    $typ       = getParam('typ', '');
    $rok       = getParam('rok', '');
    $kategorie = getParam('kategorie', '');
    $q         = trim(getParam('q', ''));

    $where = 'f.svj_id = :svj_id';
    $params = [':svj_id' => $user['svj_id']];

    if ($typ === 'prijem' || $typ === 'vydaj') {
        $where .= ' AND f.typ = :typ';
        $params[':typ'] = $typ;
    }
    if ($rok && is_numeric($rok)) {
        $where .= ' AND YEAR(f.datum) = :rok';
        $params[':rok'] = (int) $rok;
    }
    if ($kategorie) {
        $where .= ' AND f.kategorie = :kat';
        $params[':kat'] = $kategorie;
    }
    if ($q) {
        $where .= ' AND f.popis LIKE :q';
        $params[':q'] = '%' . $q . '%';
    }

    $db   = getDb();
    $stmt = $db->prepare(
        "SELECT f.id, f.typ, f.kategorie, f.popis, f.castka, f.datum, f.poznamka,
                (SELECT COUNT(*) FROM fond_prilohy p WHERE p.fond_oprav_id = f.id) AS pocet_priloh
         FROM fond_oprav f WHERE {$where} ORDER BY f.datum DESC, f.id DESC
         LIMIT {$limit} OFFSET {$offset}"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM fond_oprav f WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    jsonOk(['zaznamy' => $rows, 'total' => $total]);
}

/* ===== STATISTIKY — základní (měsíční) ===== */

function handleStats(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();
    $svjId = $user['svj_id'];

    $sumStmt = $db->prepare(
        'SELECT typ, SUM(castka) AS suma FROM fond_oprav WHERE svj_id = :sid GROUP BY typ'
    );
    $sumStmt->execute([':sid' => $svjId]);
    $sums = ['prijem' => 0.0, 'vydaj' => 0.0];
    foreach ($sumStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $sums[$row['typ']] = (float) $row['suma'];
    }

    $mesicStmt = $db->prepare(
        "SELECT DATE_FORMAT(datum, '%Y-%m') AS mesic, typ, SUM(castka) AS suma
         FROM fond_oprav WHERE svj_id = :sid AND datum >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY mesic, typ ORDER BY mesic ASC"
    );
    $mesicStmt->execute([':sid' => $svjId]);
    $mesice = [];
    foreach ($mesicStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $m = $row['mesic'];
        if (!isset($mesice[$m])) $mesice[$m] = ['prijem' => 0.0, 'vydaj' => 0.0];
        $mesice[$m][$row['typ']] = (float) $row['suma'];
    }

    jsonOk([
        'prijem_celkem' => $sums['prijem'],
        'vydaj_celkem'  => $sums['vydaj'],
        'zustatek'      => $sums['prijem'] - $sums['vydaj'],
        'mesice'        => $mesice,
    ]);
}

/* ===== STATISTIKY — roční přehled ===== */

function handleStatsRocni(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();
    $stmt = $db->prepare(
        "SELECT YEAR(datum) AS rok, typ, SUM(castka) AS suma
         FROM fond_oprav WHERE svj_id = :sid
         GROUP BY rok, typ ORDER BY rok ASC"
    );
    $stmt->execute([':sid' => $user['svj_id']]);

    $roky = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $r = (int) $row['rok'];
        if (!isset($roky[$r])) $roky[$r] = ['prijem' => 0.0, 'vydaj' => 0.0];
        $roky[$r][$row['typ']] = (float) $row['suma'];
    }

    // Running balance per year
    $running = 0.0;
    $result = [];
    foreach ($roky as $rok => $data) {
        $running += $data['prijem'] - $data['vydaj'];
        $result[] = [
            'rok'    => $rok,
            'prijem' => $data['prijem'],
            'vydaj'  => $data['vydaj'],
            'saldo'  => $data['prijem'] - $data['vydaj'],
            'zustatek_kumulativni' => $running,
        ];
    }

    // Monthly running balance for trend chart (last 24 months)
    $trendStmt = $db->prepare(
        "SELECT DATE_FORMAT(datum, '%Y-%m') AS mesic, typ, SUM(castka) AS suma
         FROM fond_oprav WHERE svj_id = :sid AND datum >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
         GROUP BY mesic, typ ORDER BY mesic ASC"
    );
    $trendStmt->execute([':sid' => $user['svj_id']]);
    $mesice = [];
    foreach ($trendStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $m = $row['mesic'];
        if (!isset($mesice[$m])) $mesice[$m] = ['prijem' => 0.0, 'vydaj' => 0.0];
        $mesice[$m][$row['typ']] = (float) $row['suma'];
    }

    // Calculate balance before the 24-month window
    $beforeStmt = $db->prepare(
        'SELECT typ, SUM(castka) AS suma FROM fond_oprav
         WHERE svj_id = :sid AND datum < DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
         GROUP BY typ'
    );
    $beforeStmt->execute([':sid' => $user['svj_id']]);
    $beforeSums = ['prijem' => 0.0, 'vydaj' => 0.0];
    foreach ($beforeStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $beforeSums[$row['typ']] = (float) $row['suma'];
    }
    $trendBalance = $beforeSums['prijem'] - $beforeSums['vydaj'];

    $trend = [];
    ksort($mesice);
    foreach ($mesice as $m => $data) {
        $trendBalance += $data['prijem'] - $data['vydaj'];
        $trend[] = ['mesic' => $m, 'zustatek' => $trendBalance];
    }

    jsonOk(['roky' => $result, 'trend' => $trend]);
}

/* ===== STATISTIKY — top kategorie ===== */

function handleStatsKat(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT kategorie, SUM(castka) AS suma FROM fond_oprav
         WHERE svj_id = :sid AND typ = "vydaj"
         GROUP BY kategorie ORDER BY suma DESC LIMIT 10'
    );
    $stmt->execute([':sid' => $user['svj_id']]);
    $vydaje = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt2 = $db->prepare(
        'SELECT kategorie, SUM(castka) AS suma FROM fond_oprav
         WHERE svj_id = :sid AND typ = "prijem"
         GROUP BY kategorie ORDER BY suma DESC LIMIT 10'
    );
    $stmt2->execute([':sid' => $user['svj_id']]);
    $prijmy = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // Monthly averages
    $avgStmt = $db->prepare(
        "SELECT typ, AVG(mesicni_suma) AS prumer FROM (
            SELECT typ, DATE_FORMAT(datum, '%Y-%m') AS m, SUM(castka) AS mesicni_suma
            FROM fond_oprav WHERE svj_id = :sid AND datum >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY typ, m
         ) sub GROUP BY typ"
    );
    $avgStmt->execute([':sid' => $user['svj_id']]);
    $prumery = ['prijem' => 0.0, 'vydaj' => 0.0];
    foreach ($avgStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $prumery[$row['typ']] = round((float) $row['prumer'], 2);
    }

    jsonOk([
        'top_vydaje' => $vydaje,
        'top_prijmy' => $prijmy,
        'prumer_mesicni_prijem' => $prumery['prijem'],
        'prumer_mesicni_vydaj'  => $prumery['vydaj'],
    ]);
}

/* ===== PŘIDÁNÍ ZÁZNAMU ===== */

function handleAdd(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $data = fondValidateRecord($body);

    getDb()->prepare(
        'INSERT INTO fond_oprav (svj_id, typ, kategorie, popis, castka, datum, poznamka)
         VALUES (:svj_id, :typ, :kat, :popis, :castka, :datum, :poz)'
    )->execute([
        ':svj_id' => $user['svj_id'],
        ':typ'    => $data['typ'],
        ':kat'    => $data['kategorie'],
        ':popis'  => $data['popis'],
        ':castka' => $data['castka'],
        ':datum'  => $data['datum'],
        ':poz'    => $data['poznamka'],
    ]);

    jsonOk(['message' => 'Záznam přidán', 'id' => (int) getDb()->lastInsertId()]);
}

/* ===== EDITACE ZÁZNAMU ===== */

function handleUpdate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM fond_oprav WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    if (!$stmt->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    $data = fondValidateRecord($body);

    $db->prepare(
        'UPDATE fond_oprav SET typ=:typ, kategorie=:kat, popis=:popis,
                castka=:castka, datum=:datum, poznamka=:poz
         WHERE id=:id AND svj_id=:svj_id'
    )->execute([
        ':typ'    => $data['typ'],
        ':kat'    => $data['kategorie'],
        ':popis'  => $data['popis'],
        ':castka' => $data['castka'],
        ':datum'  => $data['datum'],
        ':poz'    => $data['poznamka'],
        ':id'     => $id,
        ':svj_id' => $user['svj_id'],
    ]);

    jsonOk(['message' => 'Záznam upraven']);
}

function fondValidateRecord(array $body): array
{
    $typ       = sanitize($body['typ'] ?? '');
    $kategorie = sanitize($body['kategorie'] ?? '');
    $popis     = sanitize($body['popis'] ?? '');
    $castka    = str_replace(',', '.', $body['castka'] ?? '');
    $datum     = sanitize($body['datum'] ?? '');
    $poznamka  = sanitize($body['poznamka'] ?? '');

    if (!in_array($typ, ['prijem', 'vydaj'], true)) jsonError('Neplatný typ', 400, 'INVALID_TYP');
    if (!$kategorie) jsonError('Kategorie je povinná', 400, 'MISSING_KAT');
    if (!$popis) jsonError('Popis je povinný', 400, 'MISSING_POPIS');
    if (!is_numeric($castka) || (float)$castka <= 0) jsonError('Neplatná částka', 400, 'INVALID_CASTKA');
    if (!$datum || !strtotime($datum)) jsonError('Neplatné datum', 400, 'INVALID_DATE');

    return [
        'typ'       => $typ,
        'kategorie' => $kategorie,
        'popis'     => $popis,
        'castka'    => round((float)$castka, 2),
        'datum'     => $datum,
        'poznamka'  => $poznamka ?: null,
    ];
}

/* ===== SMAZÁNÍ ZÁZNAMU ===== */

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? getParam('id', 0));
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM fond_oprav WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    if (!$stmt->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    // Delete attachment files before DB cascade removes records
    fondDeleteAttachmentFiles($db, $id, $user['svj_id']);

    $db->prepare('DELETE FROM fond_oprav WHERE id = :id')->execute([':id' => $id]);
    jsonOk();
}

function fondDeleteAttachmentFiles(PDO $db, int $fondId, int $svjId): void
{
    $stmt = $db->prepare(
        'SELECT soubor_cesta FROM fond_prilohy WHERE fond_oprav_id = :fid AND svj_id = :sid'
    );
    $stmt->execute([':fid' => $fondId, ':sid' => $svjId]);
    $dir = __DIR__ . '/../uploads/fond/';
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $path) {
        $file = $dir . basename($path);
        if (file_exists($file)) unlink($file);
    }
}

/* ===== PŘÍLOHY ===== */

function handleUpload(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $fondId = (int) ($_POST['fond_oprav_id'] ?? 0);
    if (!$fondId) jsonError('Chybí fond_oprav_id', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM fond_oprav WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $fondId, ':sid' => $user['svj_id']]);
    if (!$stmt->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    if (empty($_FILES['soubor']) || $_FILES['soubor']['error'] === UPLOAD_ERR_NO_FILE) {
        jsonError('Soubor nebyl nahrán', 400, 'NO_FILE');
    }
    $file = $_FILES['soubor'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Chyba při nahrávání', 400, 'UPLOAD_ERROR');
    }
    if ($file['size'] > 10 * 1024 * 1024) {
        jsonError('Soubor je příliš velký (max 10 MB)', 413, 'FILE_TOO_LARGE');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $allowed = [
        'application/pdf' => 'pdf',
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
    ];
    if (!isset($allowed[$mime])) {
        jsonError('Nepodporovaný formát. Povoleny: PDF, JPEG, PNG', 415, 'INVALID_MIME');
    }
    $ext = $allowed[$mime];

    $uploadDir = __DIR__ . '/../uploads/fond/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0750, true);

    $filename = $user['svj_id'] . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        jsonError('Nepodařilo se uložit soubor', 500, 'SAVE_ERROR');
    }

    $db->prepare(
        'INSERT INTO fond_prilohy (fond_oprav_id, svj_id, soubor_nazev, soubor_cesta)
         VALUES (:fid, :sid, :nazev, :cesta)'
    )->execute([
        ':fid'   => $fondId,
        ':sid'   => $user['svj_id'],
        ':nazev' => basename($file['name']),
        ':cesta' => $filename,
    ]);

    jsonOk(['message' => 'Příloha nahrána', 'id' => (int) $db->lastInsertId()]);
}

function handlePrilohy(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $fondId = (int) getParam('fond_oprav_id', '0');
    if (!$fondId) jsonError('Chybí fond_oprav_id', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT id, soubor_nazev, created_at FROM fond_prilohy
         WHERE fond_oprav_id = :fid AND svj_id = :sid ORDER BY created_at DESC'
    );
    $stmt->execute([':fid' => $fondId, ':sid' => $user['svj_id']]);

    jsonOk(['prilohy' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handlePrilohaDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', '0');
    if (!$id) jsonError('Chybí ID přílohy', 400, 'MISSING_ID');

    $stmt = getDb()->prepare(
        'SELECT soubor_cesta, soubor_nazev FROM fond_prilohy WHERE id = :id AND svj_id = :sid'
    );
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Příloha nenalezena', 404, 'NOT_FOUND');

    $path = __DIR__ . '/../uploads/fond/' . basename($row['soubor_cesta']);
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
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID přílohy', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT soubor_cesta FROM fond_prilohy WHERE id = :id AND svj_id = :sid'
    );
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Příloha nenalezena', 404, 'NOT_FOUND');

    $file = __DIR__ . '/../uploads/fond/' . basename($row['soubor_cesta']);
    if (file_exists($file)) unlink($file);

    $db->prepare('DELETE FROM fond_prilohy WHERE id = :id')->execute([':id' => $id]);
    jsonOk(['deleted' => true]);
}

/* ===== BANKOVNÍ ÚČTY ===== */

function handleUctyList(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT * FROM fond_ucty WHERE svj_id = :sid ORDER BY nazev'
    );
    $stmt->execute([':sid' => $user['svj_id']]);

    jsonOk(['ucty' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleUctySave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id          = (int) ($body['id'] ?? 0);
    $nazev       = sanitize($body['nazev'] ?? '');
    $cisloUctu   = sanitize($body['cislo_uctu'] ?? '');
    $banka       = sanitize($body['banka'] ?? '');
    $typ         = sanitize($body['typ'] ?? 'bezny');
    $zustatek    = str_replace(',', '.', $body['zustatek'] ?? '0');
    $sazba       = $body['urokova_sazba'] ?? null;
    $poznamka    = sanitize($body['poznamka'] ?? '');

    if (!$nazev) jsonError('Název účtu je povinný', 422, 'VALIDATION_ERROR');
    if (!in_array($typ, ['bezny', 'sporici', 'terminovany', 'jiny'], true)) $typ = 'bezny';

    $db = getDb();
    $params = [
        ':nazev' => $nazev, ':cislo' => $cisloUctu ?: null, ':banka' => $banka ?: null,
        ':typ' => $typ, ':zust' => round((float) $zustatek, 2),
        ':sazba' => ($sazba !== null && $sazba !== '') ? round((float) $sazba, 3) : null,
        ':poz' => $poznamka ?: null, ':sid' => $user['svj_id'],
    ];

    if ($id > 0) {
        $stmt = $db->prepare('SELECT id FROM fond_ucty WHERE id = :id AND svj_id = :sid');
        $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
        if (!$stmt->fetch()) jsonError('Účet nenalezen', 404, 'NOT_FOUND');

        $db->prepare(
            'UPDATE fond_ucty SET nazev=:nazev, cislo_uctu=:cislo, banka=:banka, typ=:typ,
                    zustatek=:zust, urokova_sazba=:sazba, poznamka=:poz
             WHERE id=:id AND svj_id=:sid'
        )->execute(array_merge($params, [':id' => $id]));
    } else {
        $db->prepare(
            'INSERT INTO fond_ucty (svj_id, nazev, cislo_uctu, banka, typ, zustatek, urokova_sazba, poznamka)
             VALUES (:sid, :nazev, :cislo, :banka, :typ, :zust, :sazba, :poz)'
        )->execute($params);
        $id = (int) $db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

function handleUctyDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) jsonError('Neplatné ID', 422, 'VALIDATION_ERROR');

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM fond_ucty WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    if ($stmt->rowCount() === 0) jsonError('Účet nenalezen', 404, 'NOT_FOUND');

    jsonOk(['deleted' => true]);
}
