<?php
/**
 * Jednotky — seznam pro přihlášeného uživatele (jeho SVJ).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/db.php';

requireLogin();

$user  = getSessionUser();
$svjId = (int)($user['svj_id'] ?? 0);
if (!$svjId) jsonError('SVJ není přiřazeno', 403);

$db   = getDb();
$stmt = $db->prepare(
    'SELECT cislo_jednotky, typ_jednotky, zpusob_vyuziti, podil_citatel, podil_jmenovatel, lv
     FROM jednotky
     WHERE svj_id = :svj_id
     ORDER BY cislo_jednotky'
);
$stmt->execute([':svj_id' => $svjId]);
$rows = $stmt->fetchAll();

jsonOk(['jednotky' => $rows]);
