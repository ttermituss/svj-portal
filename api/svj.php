<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/svj_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'lookup':    handleLookup();    break;
    case 'link':      handleLink();      break;
    case 'fetchOr':   handleFetchOr();   break;
    case 'getIsds':   handleGetIsds();   break;
    case 'updateIsds':handleUpdateIsds();break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleLookup(): void
{
    requireMethod('GET');

    // Rate limiting: 20 ARES lookupů / 5 min z jedné IP
    checkRateLimit('rl_ares_', 20, 'Příliš mnoho vyhledávání. Zkuste to za 5 minut.');

    $ico = str_replace(' ', '', getParam('ico', '') ?? '');
    $ico = str_pad(preg_replace('/\D/', '', $ico), 8, '0', STR_PAD_LEFT);

    if (!preg_match('/^\d{8}$/', $ico)) {
        jsonError('IČO musí být 8 číslic', 400, 'INVALID_ICO');
    }

    $row = getOrFetchSvj($ico);
    jsonResponse(buildSvjResponse($row));
}

function handleLink(): void
{
    requireMethod('POST');
    // Pouze admin/vybor může ručně přiřazovat SVJ (vlastníci přes pozvánky)
    $user  = requireRole('admin', 'vybor');
    $body  = getJsonBody();
    $svjId = (int)($body['svj_id'] ?? 0);

    if (!$svjId) jsonError('Chybí svj_id', 400, 'MISSING_SVJ_ID');

    $db   = getDb();
    $stmt = $db->prepare('SELECT id FROM svj WHERE id = :id');
    $stmt->execute([':id' => $svjId]);
    if (!$stmt->fetch()) jsonError('SVJ nenalezeno', 404, 'SVJ_NOT_FOUND');

    $db->prepare('UPDATE users SET svj_id = :svj WHERE id = :uid')
       ->execute([':svj' => $svjId, ':uid' => $user['id']]);

    jsonResponse(['ok' => true, 'svj_id' => $svjId]);
}

function handleFetchOr(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');

    if (!$user['svj_id']) {
        jsonError('Váš účet není přiřazen k SVJ', 400, 'NO_SVJ');
    }

    $db   = getDb();
    $stmt = $db->prepare('SELECT ico FROM svj WHERE id = :id');
    $stmt->execute([':id' => $user['svj_id']]);
    $svj  = $stmt->fetch();

    if (!$svj || !$svj['ico']) {
        jsonError('SVJ nemá IČO', 400, 'NO_ICO');
    }

    $orData = fetchOrManagement($svj['ico']);

    if ($orData === null) {
        jsonError('Nepodařilo se načíst data z ARES/OR. Zkuste to znovu.', 502, 'OR_ERROR');
    }

    jsonResponse(['or' => $orData]);
}

function handleGetIsds(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Účet není přiřazen k SVJ', 400, 'NO_SVJ');

    $db   = getDb();
    $stmt = $db->prepare('SELECT isds_id FROM svj WHERE id = :id');
    $stmt->execute([':id' => $user['svj_id']]);
    $row  = $stmt->fetch();

    jsonResponse(['isds_id' => $row['isds_id'] ?? null]);
}

function handleUpdateIsds(): void
{
    requireMethod('POST');
    $user = requireRole('admin');
    if (!$user['svj_id']) jsonError('Účet není přiřazen k SVJ', 400, 'NO_SVJ');

    $body   = getJsonBody();
    $isdsId = sanitize($body['isds_id'] ?? '');
    // ISDS ID: max 7 alfanumerických znaků (nebo prázdný = smazat)
    if ($isdsId !== '' && !preg_match('/^[a-z0-9]{4,7}$/i', $isdsId)) {
        jsonError('Neplatný formát ID datové schránky (4–7 alfanumerických znaků)', 422, 'INVALID_ISDS');
    }

    $db   = getDb();
    $stmt = $db->prepare('UPDATE svj SET isds_id = :isds WHERE id = :id');
    $stmt->execute([':isds' => $isdsId !== '' ? $isdsId : null, ':id' => $user['svj_id']]);

    jsonResponse(['ok' => true]);
}
