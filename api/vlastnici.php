<?php
/**
 * Vlastníci — seznam registrovaných uživatelů SVJ + číslo jejich jednotky.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user  = requireAuth();
$svjId = (int)($user['svj_id'] ?? 0);
if (!$svjId) jsonError('SVJ není přiřazeno', 403);

$isPriv = in_array($user['role'], ['admin', 'vybor'], true);

$db   = getDb();
$stmt = $db->prepare(
    'SELECT u.id, u.jmeno, u.prijmeni, u.email, u.telefon, u.role, u.created_at,
            u.jednotka_id, j.cislo_jednotky
     FROM users u
     LEFT JOIN jednotky j ON j.id = u.jednotka_id
     WHERE u.svj_id = :svj_id
     ORDER BY u.prijmeni, u.jmeno'
);
$stmt->execute([':svj_id' => $svjId]);
$rows = $stmt->fetchAll();

foreach ($rows as &$r) {
    $r['id']          = (int)$r['id'];
    $r['jednotka_id'] = $r['jednotka_id'] !== null ? (int)$r['jednotka_id'] : null;
    // Kontaktní údaje pouze pro výbor/admin
    if (!$isPriv) {
        $r['email']   = null;
        $r['telefon'] = null;
    }
}
unset($r);

jsonOk(['vlastnici' => $rows]);
