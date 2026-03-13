<?php
/**
 * Fond oprav — roční rozpočet (plán vs. skutečnost).
 *
 * GET  ?action=list&rok=2026          → rozpočtové položky pro rok
 * POST ?action=save {rok,typ,kategorie,castka,poznamka}  → upsert
 * POST ?action=delete {id}            → smazání
 * GET  ?action=compare&rok=2026       → plán vs. skutečnost
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':    handleList();    break;
    case 'save':    handleSave();    break;
    case 'delete':  handleDelete();  break;
    case 'compare': handleCompare(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== LIST ===== */

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $rok = (int) getParam('rok', date('Y'));
    if ($rok < 2000 || $rok > 2100) jsonError('Neplatný rok', 400, 'INVALID_YEAR');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id, typ, kategorie, castka, poznamka
         FROM fond_rozpocet WHERE svj_id = :sid AND rok = :rok
         ORDER BY typ ASC, kategorie ASC'
    );
    $stmt->execute([':sid' => $user['svj_id'], ':rok' => $rok]);

    jsonOk(['rok' => $rok, 'polozky' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ===== SAVE (upsert) ===== */

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();

    $rok       = (int) ($body['rok'] ?? date('Y'));
    $typ       = sanitize($body['typ'] ?? '');
    $kategorie = sanitize($body['kategorie'] ?? '');
    $castka    = str_replace(',', '.', $body['castka'] ?? '');
    $poznamka  = sanitize($body['poznamka'] ?? '');

    if ($rok < 2000 || $rok > 2100) jsonError('Neplatný rok', 400, 'INVALID_YEAR');
    if (!in_array($typ, ['prijem', 'vydaj'], true)) jsonError('Neplatný typ', 400, 'INVALID_TYP');
    if (!$kategorie) jsonError('Kategorie je povinná', 400, 'MISSING_KAT');
    if (!is_numeric($castka) || (float) $castka < 0) jsonError('Neplatná částka', 400, 'INVALID_CASTKA');

    $db = getDb();
    $db->prepare(
        'INSERT INTO fond_rozpocet (svj_id, rok, typ, kategorie, castka, poznamka)
         VALUES (:sid, :rok, :typ, :kat, :castka, :poz)
         ON DUPLICATE KEY UPDATE castka = VALUES(castka), poznamka = VALUES(poznamka)'
    )->execute([
        ':sid'    => $user['svj_id'],
        ':rok'    => $rok,
        ':typ'    => $typ,
        ':kat'    => $kategorie,
        ':castka' => round((float) $castka, 2),
        ':poz'    => $poznamka ?: null,
    ]);

    jsonOk(['message' => 'Uloženo']);
}

/* ===== DELETE ===== */

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM fond_rozpocet WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    if ($stmt->rowCount() === 0) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    jsonOk(['deleted' => true]);
}

/* ===== COMPARE — plán vs. skutečnost ===== */

function handleCompare(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $rok = (int) getParam('rok', date('Y'));
    $svjId = $user['svj_id'];
    $db = getDb();

    // Plánované částky
    $planStmt = $db->prepare(
        'SELECT typ, kategorie, castka FROM fond_rozpocet
         WHERE svj_id = :sid AND rok = :rok'
    );
    $planStmt->execute([':sid' => $svjId, ':rok' => $rok]);
    $planRows = $planStmt->fetchAll(PDO::FETCH_ASSOC);

    // Skutečné částky z fond_oprav
    $skutStmt = $db->prepare(
        'SELECT typ, kategorie, SUM(castka) AS suma FROM fond_oprav
         WHERE svj_id = :sid AND YEAR(datum) = :rok
         GROUP BY typ, kategorie'
    );
    $skutStmt->execute([':sid' => $svjId, ':rok' => $rok]);
    $skutMap = [];
    foreach ($skutStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $skutMap[$r['typ'] . '|' . $r['kategorie']] = (float) $r['suma'];
    }

    $polozky = [];
    $celkem = ['plan_prijem' => 0, 'skut_prijem' => 0, 'plan_vydaj' => 0, 'skut_vydaj' => 0];

    foreach ($planRows as $p) {
        $plan = (float) $p['castka'];
        $key = $p['typ'] . '|' . $p['kategorie'];
        $skut = $skutMap[$key] ?? 0;
        $procento = $plan > 0 ? round(($skut / $plan) * 100) : ($skut > 0 ? 999 : 0);

        $polozky[] = [
            'typ'        => $p['typ'],
            'kategorie'  => $p['kategorie'],
            'plan'       => $plan,
            'skutecnost' => $skut,
            'procento'   => $procento,
        ];

        $celkem['plan_' . $p['typ']] += $plan;
        $celkem['skut_' . $p['typ']] += $skut;

        unset($skutMap[$key]);
    }

    // Skutečné bez plánu
    foreach ($skutMap as $key => $suma) {
        $parts = explode('|', $key);
        $polozky[] = [
            'typ'        => $parts[0],
            'kategorie'  => $parts[1],
            'plan'       => 0,
            'skutecnost' => $suma,
            'procento'   => 999,
        ];
        $celkem['skut_' . $parts[0]] += $suma;
    }

    jsonOk([
        'rok'                 => $rok,
        'polozky'             => $polozky,
        'celkem_plan_prijem'  => $celkem['plan_prijem'],
        'celkem_skut_prijem'  => $celkem['skut_prijem'],
        'celkem_plan_vydaj'   => $celkem['plan_vydaj'],
        'celkem_skut_vydaj'   => $celkem['skut_vydaj'],
    ]);
}
