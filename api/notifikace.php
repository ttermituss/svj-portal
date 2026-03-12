<?php
/**
 * Notifikace — čtení, označení jako přečtené.
 * GET  ?action=count               → nepřečtené (číslo pro badge)
 * GET  ?action=list&offset=0       → posledních 20 notifikací
 * POST ?action=read {id}           → označit jednu jako přečtenou
 * POST ?action=readAll             → označit všechny jako přečtené
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'count':   handleCount();   break;
    case 'list':    handleList();    break;
    case 'read':    handleRead();    break;
    case 'readAll': handleReadAll(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleCount(): void
{
    requireMethod('GET');
    $user = requireAuth();

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM notifikace WHERE user_id = :uid AND precteno = 0'
    );
    $stmt->execute([':uid' => $user['id']]);

    jsonOk(['count' => (int) $stmt->fetchColumn()]);
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();

    $offset = max(0, (int) getParam('offset', 0));
    $limit = 20;

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id, typ, nazev, detail, odkaz_hash, precteno, created_at
         FROM notifikace
         WHERE user_id = :uid
         ORDER BY created_at DESC
         LIMIT :lim OFFSET :off'
    );
    $stmt->bindValue(':uid', $user['id'], PDO::PARAM_INT);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();

    jsonOk(['notifikace' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleRead(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $body = getJsonBody();

    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) jsonError('Neplatné ID', 422, 'VALIDATION_ERROR');

    $db = getDb();
    $db->prepare('UPDATE notifikace SET precteno = 1 WHERE id = :id AND user_id = :uid')
       ->execute([':id' => $id, ':uid' => $user['id']]);

    jsonOk(['ok' => true]);
}

function handleReadAll(): void
{
    requireMethod('POST');
    $user = requireAuth();

    $db = getDb();
    $db->prepare('UPDATE notifikace SET precteno = 1 WHERE user_id = :uid AND precteno = 0')
       ->execute([':uid' => $user['id']]);

    jsonOk(['ok' => true]);
}
