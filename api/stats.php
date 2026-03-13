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

$db = getDb();

$vlastnici = $db->prepare('SELECT COUNT(*) FROM users WHERE svj_id = :id');
$vlastnici->execute([':id' => $svjId]);

$jednotky = $db->prepare('SELECT COUNT(*) FROM jednotky WHERE svj_id = :id');
$jednotky->execute([':id' => $svjId]);

$plomby = $db->prepare('SELECT COUNT(*) FROM jednotky WHERE svj_id = :id AND plomba_aktivni = 1');
$plomby->execute([':id' => $svjId]);

$hasGps = $db->prepare('SELECT lat FROM svj WHERE id = :id AND lat IS NOT NULL');
$hasGps->execute([':id' => $svjId]);

jsonOk([
    'vlastnici' => (int)$vlastnici->fetchColumn(),
    'jednotky'  => (int)$jednotky->fetchColumn(),
    'plomby'    => (int)$plomby->fetchColumn(),
    'has_gps'   => (bool)$hasGps->fetchColumn(),
]);
