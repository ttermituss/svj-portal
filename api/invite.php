<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ratelimit.php';

$action = getParam('action', '');

switch ($action) {
    case 'validate': handleValidate(); break;
    case 'create':   handleCreate();   break;
    case 'list':     handleList();     break;
    case 'revoke':   handleRevoke();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/** Veřejné ověření tokenu — vrátí název SVJ a roli, nebo chybu */
function handleValidate(): void
{
    requireMethod('GET');

    $token = sanitize(getParam('token', '') ?? '');
    if (!$token || strlen($token) !== 64 || !ctype_xdigit($token)) {
        jsonError('Neplatný token', 400, 'INVALID_TOKEN');
    }

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT i.id, i.role, i.expires_at, i.used_at,
                s.nazev, s.obec
         FROM invitations i
         JOIN svj s ON s.id = i.svj_id
         WHERE i.token = :token'
    );
    $stmt->execute([':token' => $token]);
    $inv = $stmt->fetch();

    if (!$inv)               jsonError('Pozvánka nenalezena', 404, 'NOT_FOUND');
    if ($inv['used_at'])     jsonError('Pozvánka již byla použita', 410, 'ALREADY_USED');
    if (strtotime($inv['expires_at']) < time()) jsonError('Platnost pozvánky vypršela', 410, 'EXPIRED');

    jsonResponse([
        'valid' => true,
        'role'  => $inv['role'],
        'svj'   => [
            'nazev' => $inv['nazev'],
            'obec'  => $inv['obec'],
        ],
    ]);
}

/** Vytvoří novou pozvánku — jen pro vybor/admin */
function handleCreate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');

    if (!$user['svj_id']) {
        jsonError('Váš účet není přiřazen k žádnému SVJ', 400, 'NO_SVJ');
    }

    $body    = getJsonBody();
    $role    = sanitize($body['role'] ?? 'vlastnik');
    $expDays = min(max((int)($body['expires_days'] ?? 7), 1), 30);

    if (!in_array($role, ['vlastnik', 'vybor'], true)) {
        jsonError('Neplatná role', 400, 'INVALID_ROLE');
    }
    // Vybor smí pozvat pouze vlastníky
    if ($user['role'] === 'vybor' && $role === 'vybor') {
        jsonError('Výbor může pozvat pouze vlastníky', 403, 'FORBIDDEN');
    }

    $token     = bin2hex(random_bytes(32)); // 64 hex znaků
    $expiresAt = date('Y-m-d H:i:s', time() + $expDays * 86400);

    $db = getDb();
    $db->prepare(
        'INSERT INTO invitations (svj_id, token, role, created_by, expires_at)
         VALUES (:svj, :token, :role, :by, :exp)'
    )->execute([
        ':svj'   => $user['svj_id'],
        ':token' => $token,
        ':role'  => $role,
        ':by'    => $user['id'],
        ':exp'   => $expiresAt,
    ]);

    jsonResponse([
        'id'         => (int)$db->lastInsertId(),
        'token'      => $token,
        'expires_at' => $expiresAt,
    ], 201);
}

/** Vypíše pozvánky pro SVJ přihlášeného uživatele */
function handleList(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');

    if (!$user['svj_id']) jsonError('Váš účet není přiřazen k žádnému SVJ', 400, 'NO_SVJ');

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT i.id, i.token, i.role, i.expires_at, i.used_at, i.created_at,
                TRIM(CONCAT(u.jmeno, " ", u.prijmeni)) AS created_by_name
         FROM invitations i
         JOIN users u ON u.id = i.created_by
         WHERE i.svj_id = :svj
         ORDER BY i.created_at DESC
         LIMIT 100'
    );
    $stmt->execute([':svj' => $user['svj_id']]);
    $invs = $stmt->fetchAll();

    foreach ($invs as &$inv) {
        $inv['id']      = (int)$inv['id'];
        $inv['expired'] = strtotime($inv['expires_at']) < time() && !$inv['used_at'];
    }
    unset($inv);

    jsonResponse(['invitations' => $invs]);
}

/** Zruší nepoužitou pozvánku */
function handleRevoke(): void
{
    requireMethod('POST');
    $user  = requireRole('admin', 'vybor');
    $body  = getJsonBody();
    $invId = (int)($body['invite_id'] ?? 0);

    if (!$invId) jsonError('Chybí invite_id', 400, 'MISSING_ID');

    $db   = getDb();
    $stmt = $db->prepare('SELECT id, used_at, svj_id FROM invitations WHERE id = :id');
    $stmt->execute([':id' => $invId]);
    $inv = $stmt->fetch();

    if (!$inv) jsonError('Pozvánka nenalezena', 404, 'NOT_FOUND');
    // Tenant isolation
    if ((int)$inv['svj_id'] !== (int)$user['svj_id']) jsonError('Přístup odepřen', 403, 'FORBIDDEN');
    if ($inv['used_at']) jsonError('Pozvánka již byla použita, nelze zrušit', 400, 'ALREADY_USED');

    $db->prepare('DELETE FROM invitations WHERE id = :id')->execute([':id' => $invId]);

    jsonResponse(['ok' => true]);
}
