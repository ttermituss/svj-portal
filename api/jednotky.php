<?php
/**
 * Jednotky — seznam + update (pronájem, poznámka).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', 'list');

switch ($action) {
    case 'list':   handleList();   break;
    case 'update': handleUpdate(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user  = requireAuth();
    $svjId = (int)($user['svj_id'] ?? 0);
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $isPriv = in_array($user['role'], ['admin', 'vybor'], true);

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT j.id, j.cislo_jednotky, j.typ_jednotky, j.zpusob_vyuziti,
                j.podil_citatel, j.podil_jmenovatel, j.lv, j.katastralni_uzemi, j.plomba_aktivni,
                j.pronajem, j.najemce_jmeno, j.najemce_prijmeni, j.najemce_email,
                j.najemce_telefon, j.poznamka,
                u.id   AS vlastnik_user_id,
                u.jmeno      AS vlastnik_jmeno,
                u.prijmeni   AS vlastnik_prijmeni,
                u.telefon    AS vlastnik_telefon,
                ve.id  AS vlastnik_ext_id,
                ve.jmeno     AS vlastnik_ext_jmeno,
                ve.prijmeni  AS vlastnik_ext_prijmeni,
                ve.telefon   AS vlastnik_ext_telefon
         FROM jednotky j
         LEFT JOIN users u
               ON u.id = (SELECT id FROM users WHERE jednotka_id = j.id LIMIT 1)
         LEFT JOIN vlastnici_ext ve
               ON ve.id = (SELECT id FROM vlastnici_ext WHERE jednotka_id = j.id LIMIT 1)
         WHERE j.svj_id = :svj_id
         ORDER BY j.cislo_jednotky + 0'
    );
    $stmt->execute([':svj_id' => $svjId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['id']             = (int)$r['id'];
        $r['plomba_aktivni'] = (bool)$r['plomba_aktivni'];
        $r['pronajem']       = (bool)$r['pronajem'];
        if ($r['vlastnik_user_id'] !== null) $r['vlastnik_user_id'] = (int)$r['vlastnik_user_id'];
        if ($r['vlastnik_ext_id']  !== null) $r['vlastnik_ext_id']  = (int)$r['vlastnik_ext_id'];
        // Kontaktní údaje nájemce + vlastníka jen pro výbor/admin
        if (!$isPriv) {
            $r['najemce_jmeno']      = null;
            $r['najemce_prijmeni']   = null;
            $r['najemce_email']      = null;
            $r['najemce_telefon']    = null;
            $r['vlastnik_telefon']     = null;
            $r['vlastnik_ext_telefon'] = null;
        }
    }
    unset($r);

    jsonOk(['jednotky' => $rows]);
}

function handleUpdate(): void
{
    requireMethod('POST');
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)($user['svj_id'] ?? 0);
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $body = getJsonBody();
    $id   = isset($body['id']) ? (int)$body['id'] : 0;
    if (!$id) jsonError('Chybí id jednotky', 422, 'VALIDATION_ERROR');

    // Tenant isolation
    $db  = getDb();
    $chk = $db->prepare('SELECT id FROM jednotky WHERE id = :id AND svj_id = :svj_id');
    $chk->execute([':id' => $id, ':svj_id' => $svjId]);
    if (!$chk->fetch()) jsonError('Jednotka nenalezena', 404, 'NOT_FOUND');

    $pronajem        = !empty($body['pronajem']) ? 1 : 0;
    $najemceJmeno    = sanitize($body['najemce_jmeno']    ?? '');
    $najemcePrijmeni = sanitize($body['najemce_prijmeni'] ?? '');
    $najemceEmail    = sanitize($body['najemce_email']    ?? '');
    $najemceTelefon  = sanitize($body['najemce_telefon']  ?? '');
    $poznamka        = sanitize($body['poznamka']         ?? '');

    if ($najemceEmail && !filter_var($najemceEmail, FILTER_VALIDATE_EMAIL)) {
        jsonError('Neplatný formát e-mailu nájemce', 422, 'VALIDATION_ERROR');
    }

    $db->prepare(
        'UPDATE jednotky
         SET pronajem=:pronajem,
             najemce_jmeno=:njmeno,    najemce_prijmeni=:nprijmeni,
             najemce_email=:nemail,    najemce_telefon=:ntelefon,
             poznamka=:poznamka
         WHERE id=:id AND svj_id=:svj_id'
    )->execute([
        ':pronajem'   => $pronajem,
        ':njmeno'     => $najemceJmeno    ?: null,
        ':nprijmeni'  => $najemcePrijmeni ?: null,
        ':nemail'     => $najemceEmail    ?: null,
        ':ntelefon'   => $najemceTelefon  ?: null,
        ':poznamka'   => $poznamka        ?: null,
        ':id'         => $id,
        ':svj_id'     => $svjId,
    ]);

    jsonOk(['ok' => true]);
}
