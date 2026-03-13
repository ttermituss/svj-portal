<?php
/**
 * Vlastníci ext — evidence vlastníků nezaregistrovaných v portálu.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', 'list');

switch ($action) {
    case 'list':   handleList();   break;
    case 'save':   handleSave();   break;
    case 'delete': handleDelete(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user  = requireAuth();
    $svjId = requireSvj($user);

    $isPriv = in_array($user['role'], ['admin', 'vybor'], true);

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT ve.id, ve.jmeno, ve.prijmeni, ve.email, ve.telefon,
                ve.jednotka_id, j.cislo_jednotky, ve.poznamka, ve.created_at
         FROM vlastnici_ext ve
         LEFT JOIN jednotky j ON j.id = ve.jednotka_id
         WHERE ve.svj_id = :svj_id
         ORDER BY ve.prijmeni, ve.jmeno'
    );
    $stmt->execute([':svj_id' => $svjId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['id']          = (int)$r['id'];
        $r['jednotka_id'] = $r['jednotka_id'] !== null ? (int)$r['jednotka_id'] : null;
        // Skrýt kontakty pro neprivilegované uživatele
        if (!$isPriv) {
            $r['email']   = null;
            $r['telefon'] = null;
        }
    }
    unset($r);

    jsonOk(['vlastnici_ext' => $rows]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user  = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body       = getJsonBody();
    $id         = isset($body['id']) ? (int)$body['id'] : 0;
    $jmeno      = sanitize($body['jmeno']    ?? '');
    $prijmeni   = sanitize($body['prijmeni'] ?? '');
    $email      = sanitize($body['email']    ?? '');
    $telefon    = sanitize($body['telefon']  ?? '');
    $poznamka   = sanitize($body['poznamka'] ?? '');
    $jednotkaId = (isset($body['jednotka_id']) && $body['jednotka_id'] !== '' && $body['jednotka_id'] !== null)
        ? (int)$body['jednotka_id'] : null;

    if (!$jmeno && !$prijmeni) {
        jsonError('Vyplňte alespoň jméno nebo příjmení', 422, 'VALIDATION_ERROR');
    }
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Neplatný formát e-mailu', 422, 'VALIDATION_ERROR');
    }

    $db = getDb();

    // Tenant isolation — ověřit že jednotka patří do SVJ
    if ($jednotkaId) {
        $chk = $db->prepare('SELECT id FROM jednotky WHERE id = :id AND svj_id = :svj_id');
        $chk->execute([':id' => $jednotkaId, ':svj_id' => $svjId]);
        if (!$chk->fetch()) jsonError('Neplatná jednotka', 422, 'VALIDATION_ERROR');
    }

    if ($id) {
        // Update — ověřit záznam patří do SVJ
        $chk = $db->prepare('SELECT id FROM vlastnici_ext WHERE id = :id AND svj_id = :svj_id');
        $chk->execute([':id' => $id, ':svj_id' => $svjId]);
        if (!$chk->fetch()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

        $db->prepare(
            'UPDATE vlastnici_ext
             SET jmeno=:jmeno, prijmeni=:prijmeni, email=:email,
                 telefon=:telefon, jednotka_id=:jid, poznamka=:poznamka
             WHERE id=:id AND svj_id=:svj_id'
        )->execute([
            ':jmeno' => $jmeno, ':prijmeni' => $prijmeni,
            ':email'   => $email    ?: null,
            ':telefon' => $telefon  ?: null,
            ':jid'     => $jednotkaId,
            ':poznamka'=> $poznamka ?: null,
            ':id'      => $id, ':svj_id' => $svjId,
        ]);
    } else {
        $db->prepare(
            'INSERT INTO vlastnici_ext (svj_id, jmeno, prijmeni, email, telefon, jednotka_id, poznamka)
             VALUES (:svj_id, :jmeno, :prijmeni, :email, :telefon, :jid, :poznamka)'
        )->execute([
            ':svj_id'  => $svjId,   ':jmeno'   => $jmeno,  ':prijmeni' => $prijmeni,
            ':email'   => $email    ?: null,
            ':telefon' => $telefon  ?: null,
            ':jid'     => $jednotkaId,
            ':poznamka'=> $poznamka ?: null,
        ]);
        $id = (int)$db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user  = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id   = isset($body['id']) ? (int)$body['id'] : 0;
    if (!$id) jsonError('Chybí id', 422, 'VALIDATION_ERROR');

    $db   = getDb();
    $stmt = $db->prepare('DELETE FROM vlastnici_ext WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $svjId]);

    if (!$stmt->rowCount()) jsonError('Záznam nenalezen', 404, 'NOT_FOUND');

    jsonOk(['ok' => true]);
}
