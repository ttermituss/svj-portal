<?php
/**
 * Jednotky — seznam pro přihlášeného uživatele (jeho SVJ).
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
    'SELECT cislo_jednotky, typ_jednotky, zpusob_vyuziti, podil_citatel, podil_jmenovatel,
            lv, katastralni_uzemi, plomba_aktivni
     FROM jednotky
     WHERE svj_id = :svj_id
     ORDER BY cislo_jednotky + 0'
);
$stmt->execute([':svj_id' => $svjId]);
$rows = $stmt->fetchAll();

jsonOk(['jednotky' => $rows]);
