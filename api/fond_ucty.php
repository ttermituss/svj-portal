<?php
/**
 * Fond oprav — bankovní účty SVJ (list, save, delete).
 * Vyčleněno z fond_oprav.php pro dodržení limitu 500 řádků.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':   handleUctyList();   break;
    case 'save':   handleUctySave();   break;
    case 'delete': handleUctyDelete(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleUctyList(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $stmt = getDb()->prepare('SELECT * FROM fond_ucty WHERE svj_id = :sid ORDER BY nazev');
    $stmt->execute([':sid' => $svjId]);
    jsonOk(['ucty' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleUctySave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

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
        ':poz' => $poznamka ?: null, ':sid' => $svjId,
    ];

    if ($id > 0) {
        $stmt = $db->prepare('SELECT id FROM fond_ucty WHERE id = :id AND svj_id = :sid');
        $stmt->execute([':id' => $id, ':sid' => $svjId]);
        if (!$stmt->fetch()) jsonError('Účet nenalezen', 404, 'NOT_FOUND');

        $db->prepare(
            'UPDATE fond_ucty SET nazev=:nazev, cislo_uctu=:cislo, banka=:banka, typ=:typ,
                    zustatek=:zust, urokova_sazba=:sazba, poznamka=:poz WHERE id=:id AND svj_id=:sid'
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
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) jsonError('Neplatné ID', 422, 'VALIDATION_ERROR');

    $stmt = getDb()->prepare('DELETE FROM fond_ucty WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $svjId]);
    if ($stmt->rowCount() === 0) jsonError('Účet nenalezen', 404, 'NOT_FOUND');
    jsonOk(['deleted' => true]);
}
