<?php
/**
 * Vlastníci — seznam uživatelů přiřazených k SVJ přihlášeného uživatele.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user  = requireAuth();
$svjId = (int)($user['svj_id'] ?? 0);
if (!$svjId) jsonError('SVJ není přiřazeno', 403);

$db   = getDb();
$stmt = $db->prepare(
    'SELECT id, jmeno, prijmeni, email, role, created_at
     FROM users
     WHERE svj_id = :svj_id
     ORDER BY prijmeni, jmeno'
);
$stmt->execute([':svj_id' => $svjId]);
$rows = $stmt->fetchAll();

jsonOk(['vlastnici' => $rows]);
