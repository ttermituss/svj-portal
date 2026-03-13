<?php
/**
 * Fond oprav — záznamy příjmů/výdajů + bankovní účty + rozšířené statistiky + přílohy.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/fond_notif_helper.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':            handleList();            break;
    case 'stats':           handleStats();           break;
    case 'statsRocni':      handleStatsRocni();      break;
    case 'statsKat':        handleStatsKat();        break;
    case 'add':             handleAdd();             break;
    case 'update':          handleUpdate();          break;
    case 'delete':          handleDelete();          break;
    // Přílohy → api/fond_prilohy.php, Účty → api/fond_ucty.php
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== ZÁZNAMY ===== */

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $limit     = max(1, min(200, (int) getParam('limit', 50)));
    $offset    = max(0, (int) getParam('offset', 0));
    $typ       = getParam('typ', '');
    $rok       = getParam('rok', '');
    $kategorie = getParam('kategorie', '');
    $q         = trim(getParam('q', ''));

    $qb = new WhereBuilder('f.svj_id', $svjId);
    if ($typ === 'prijem' || $typ === 'vydaj') $qb->addWhereAlways('f.typ = ?', $typ);
    if ($rok && is_numeric($rok)) $qb->addWhereAlways('YEAR(f.datum) = ?', (int) $rok);
    $qb->addWhere('f.kategorie = ?', $kategorie);
    $qb->addLike('f.popis', $q);

    $db   = getDb();
    $stmt = $db->prepare(
        "SELECT f.id, f.typ, f.kategorie, f.popis, f.castka, f.datum, f.poznamka,
                (SELECT COUNT(*) FROM fond_prilohy p WHERE p.fond_oprav_id = f.id) AS pocet_priloh
         FROM fond_oprav f WHERE " . $qb->sql() . " ORDER BY f.datum DESC, f.id DESC
         LIMIT ? OFFSET ?"
    );
    $qb->bind($stmt);
    $paramCount = count($qb->params());
    $stmt->bindValue($paramCount + 1, $limit, PDO::PARAM_INT);
    $stmt->bindValue($paramCount + 2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM fond_oprav f WHERE " . $qb->sql());
    $countStmt->execute($qb->params());
    $total = (int) $countStmt->fetchColumn();

    jsonOk(['zaznamy' => $rows, 'total' => $total]);
}

/* ===== STATISTIKY — základní (měsíční) ===== */

function handleStats(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

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
    $svjId = requireSvj($user);

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
    $svjId = requireSvj($user);

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
    $svjId = requireSvj($user);

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

    $newId = (int) getDb()->lastInsertId();

    // Fond notifikace
    if ($data['typ'] === 'vydaj') {
        fondNotifyHighExpense(getDb(), $user['svj_id'], $data['castka'], $data['popis']);
    }
    fondNotifyLowBalance(getDb(), $user['svj_id']);

    jsonOk(['message' => 'Záznam přidán', 'id' => $newId]);
}

/* ===== EDITACE ZÁZNAMU ===== */

function handleUpdate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

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
    $svjId = requireSvj($user);

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

    fondNotifyLowBalance($db, $user['svj_id']);

    jsonOk();
}

function fondDeleteAttachmentFiles(PDO $db, int $fondId, int $svjId): void
{
    $stmt = $db->prepare(
        'SELECT soubor_cesta FROM fond_prilohy WHERE fond_oprav_id = :fid AND svj_id = :sid'
    );
    $stmt->execute([':fid' => $fondId, ':sid' => $svjId]);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $path) {
        storageDelete($svjId, 'uploads/fond/' . basename($path));
    }
}

