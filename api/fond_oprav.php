<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':   handleList();   break;
    case 'stats':  handleStats();  break;
    case 'add':    handleAdd();    break;
    case 'delete': handleDelete(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $limit  = max(1, min(200, (int) getParam('limit', 50)));
    $offset = max(0, (int) getParam('offset', 0));
    $typ    = getParam('typ', '');

    $where = 'svj_id = :svj_id';
    $params = [':svj_id' => $user['svj_id']];

    if ($typ === 'prijem' || $typ === 'vydaj') {
        $where .= ' AND typ = :typ';
        $params[':typ'] = $typ;
    }

    $db   = getDb();
    $stmt = $db->prepare(
        "SELECT id, typ, kategorie, popis, castka, datum, poznamka
         FROM fond_oprav WHERE {$where} ORDER BY datum DESC, id DESC
         LIMIT {$limit} OFFSET {$offset}"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM fond_oprav WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    jsonOk(['zaznamy' => $rows, 'total' => $total]);
}

function handleStats(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();

    // Celkový přehled
    $sumStmt = $db->prepare(
        'SELECT typ, SUM(castka) AS suma FROM fond_oprav
         WHERE svj_id = :svj_id GROUP BY typ'
    );
    $sumStmt->execute([':svj_id' => $user['svj_id']]);
    $sums = ['prijem' => 0.0, 'vydaj' => 0.0];
    foreach ($sumStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $sums[$row['typ']] = (float) $row['suma'];
    }

    // Měsíční souhrn — posledních 12 měsíců
    $mesicStmt = $db->prepare(
        "SELECT DATE_FORMAT(datum, '%Y-%m') AS mesic, typ, SUM(castka) AS suma
         FROM fond_oprav
         WHERE svj_id = :svj_id AND datum >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY mesic, typ
         ORDER BY mesic ASC"
    );
    $mesicStmt->execute([':svj_id' => $user['svj_id']]);
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

function handleAdd(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $typ       = sanitize($_POST['typ'] ?? '');
    $kategorie = sanitize($_POST['kategorie'] ?? '');
    $popis     = sanitize($_POST['popis'] ?? '');
    $castka    = str_replace(',', '.', $_POST['castka'] ?? '');
    $datum     = sanitize($_POST['datum'] ?? '');
    $poznamka  = sanitize($_POST['poznamka'] ?? '');

    if (!in_array($typ, ['prijem', 'vydaj'], true)) jsonError('Neplatný typ', 400, 'INVALID_TYP');
    if (!$kategorie) jsonError('Kategorie je povinná', 400, 'MISSING_KAT');
    if (!$popis) jsonError('Popis je povinný', 400, 'MISSING_POPIS');
    if (!is_numeric($castka) || (float)$castka <= 0) jsonError('Neplatná částka', 400, 'INVALID_CASTKA');
    if (!$datum || !strtotime($datum)) jsonError('Neplatné datum', 400, 'INVALID_DATE');

    getDb()->prepare(
        'INSERT INTO fond_oprav (svj_id, typ, kategorie, popis, castka, datum, poznamka)
         VALUES (:svj_id, :typ, :kat, :popis, :castka, :datum, :poz)'
    )->execute([
        ':svj_id' => $user['svj_id'],
        ':typ'    => $typ,
        ':kat'    => $kategorie,
        ':popis'  => $popis,
        ':castka' => round((float)$castka, 2),
        ':datum'  => $datum,
        ':poz'    => $poznamka ?: null,
    ]);

    jsonOk(['message' => 'Záznam přidán']);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $stmt = getDb()->prepare('SELECT id FROM fond_oprav WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $user['svj_id']]);
    if (!$stmt->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    getDb()->prepare('DELETE FROM fond_oprav WHERE id = :id')->execute([':id' => $id]);
    jsonOk();
}
