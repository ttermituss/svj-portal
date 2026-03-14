<?php
/**
 * Statistiky pro dashboard — počty vlastníků, jednotek, přítomnost GPS.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user  = requireAuth();
$svjId = requireSvj($user);

$db   = getDb();
$stmt = $db->prepare(
    'SELECT
        (SELECT COUNT(*) FROM users    WHERE svj_id = ?) AS vlastnici,
        (SELECT COUNT(*) FROM jednotky WHERE svj_id = ?) AS jednotky,
        (SELECT COALESCE(SUM(plomba_aktivni = 1), 0) FROM jednotky WHERE svj_id = ?) AS plomby,
        (SELECT lat IS NOT NULL FROM svj WHERE id = ? LIMIT 1) AS has_gps'
);
$stmt->execute([$svjId, $svjId, $svjId, $svjId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

jsonOk([
    'vlastnici' => (int)$row['vlastnici'],
    'jednotky'  => (int)$row['jednotky'],
    'plomby'    => (int)$row['plomby'],
    'has_gps'   => (bool)$row['has_gps'],
]);
