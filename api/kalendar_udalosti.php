<?php
/**
 * Vlastní události v kalendáři — CRUD (jen admin/výbor).
 * GET  ?action=list&rok=2026&mesic=3
 * POST ?action=save  {id?, nazev, popis, datum_od, datum_do, celodenny, cas_od, cas_do, misto, kategorie, opakovani, pripomenout_dni}
 * POST ?action=delete {id}
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':   handleList();   break;
    case 'save':   handleSave();   break;
    case 'delete': handleDelete(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $rok   = (int) getParam('rok', date('Y'));
    $mesic = (int) getParam('mesic', date('n'));
    if ($rok < 2000 || $rok > 2100) $rok = (int) date('Y');
    if ($mesic < 1 || $mesic > 12) $mesic = (int) date('n');

    $od = sprintf('%04d-%02d-01', $rok, $mesic);
    $do = date('Y-m-t', strtotime($od));

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT ku.*, u.jmeno, u.prijmeni
         FROM kalendar_udalosti ku
         JOIN users u ON u.id = ku.vytvoril_id
         WHERE ku.svj_id = :sid
           AND (ku.datum_od BETWEEN :od AND :do
                OR ku.datum_do BETWEEN :od AND :do
                OR (ku.datum_od <= :od AND ku.datum_do >= :do))
         ORDER BY ku.datum_od'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);

    jsonOk(['udalosti' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();

    $id             = (int) ($body['id'] ?? 0);
    $nazev          = sanitize($body['nazev'] ?? '');
    $popis          = sanitize($body['popis'] ?? '');
    $datumOd        = sanitize($body['datum_od'] ?? '');
    $datumDo        = sanitize($body['datum_do'] ?? '');
    $celodenny      = (int) ($body['celodenny'] ?? 1);
    $casOd          = sanitize($body['cas_od'] ?? '');
    $casDo          = sanitize($body['cas_do'] ?? '');
    $misto          = sanitize($body['misto'] ?? '');
    $kategorie      = sanitize($body['kategorie'] ?? 'jine');
    $opakovani      = sanitize($body['opakovani'] ?? 'none');
    $pripomenoutDni = ($body['pripomenout_dni'] ?? null);

    if (!$nazev) jsonError('Název je povinný', 422, 'VALIDATION_ERROR');
    if (!$datumOd) jsonError('Datum začátku je povinné', 422, 'VALIDATION_ERROR');
    if (strlen($nazev) > 255) jsonError('Název je příliš dlouhý', 422, 'VALIDATION_ERROR');

    $validKat = ['schuzka', 'udrzba', 'kontrola', 'spolecenska', 'jine'];
    if (!in_array($kategorie, $validKat, true)) $kategorie = 'jine';

    $validOpak = ['none', 'tyden', 'mesic', 'rok'];
    if (!in_array($opakovani, $validOpak, true)) $opakovani = 'none';

    $db = getDb();

    if ($id > 0) {
        // Update — ověřit tenant
        $stmt = $db->prepare('SELECT id FROM kalendar_udalosti WHERE id = :id AND svj_id = :sid');
        $stmt->execute([':id' => $id, ':sid' => $svjId]);
        if (!$stmt->fetch()) jsonError('Událost nenalezena', 404, 'NOT_FOUND');

        $stmt = $db->prepare(
            'UPDATE kalendar_udalosti SET nazev=:nazev, popis=:popis, datum_od=:dod, datum_do=:ddo,
                    celodenny=:celo, cas_od=:cod, cas_do=:cdo, misto=:misto, kategorie=:kat,
                    opakovani=:opak, pripomenout_dni=:prip
             WHERE id=:id AND svj_id=:sid'
        );
        $stmt->execute([
            ':nazev' => $nazev, ':popis' => $popis ?: null,
            ':dod' => $datumOd, ':ddo' => $datumDo ?: null,
            ':celo' => $celodenny, ':cod' => $casOd ?: null, ':cdo' => $casDo ?: null,
            ':misto' => $misto ?: null, ':kat' => $kategorie, ':opak' => $opakovani,
            ':prip' => $pripomenoutDni !== null && $pripomenoutDni !== '' ? (int) $pripomenoutDni : null,
            ':id' => $id, ':sid' => $svjId,
        ]);
    } else {
        // Insert
        $stmt = $db->prepare(
            'INSERT INTO kalendar_udalosti
                (svj_id, nazev, popis, datum_od, datum_do, celodenny, cas_od, cas_do, misto, kategorie, opakovani, pripomenout_dni, vytvoril_id)
             VALUES (:sid, :nazev, :popis, :dod, :ddo, :celo, :cod, :cdo, :misto, :kat, :opak, :prip, :uid)'
        );
        $stmt->execute([
            ':sid' => $svjId, ':nazev' => $nazev, ':popis' => $popis ?: null,
            ':dod' => $datumOd, ':ddo' => $datumDo ?: null,
            ':celo' => $celodenny, ':cod' => $casOd ?: null, ':cdo' => $casDo ?: null,
            ':misto' => $misto ?: null, ':kat' => $kategorie, ':opak' => $opakovani,
            ':prip' => $pripomenoutDni !== null && $pripomenoutDni !== '' ? (int) $pripomenoutDni : null,
            ':uid' => $user['id'],
        ]);
        $id = (int) $db->lastInsertId();

        // Vytvořit notifikace pro členy SVJ kteří mají zapnuté notif_udalosti
        notifyNewEvent($db, $svjId, $id, $nazev, $datumOd, $user['id']);
    }

    jsonOk(['id' => $id]);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) jsonError('Neplatné ID', 422, 'VALIDATION_ERROR');

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM kalendar_udalosti WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $svjId]);

    if ($stmt->rowCount() === 0) jsonError('Událost nenalezena', 404, 'NOT_FOUND');

    // Smazat i notifikace k této události
    $db->prepare('DELETE FROM notifikace WHERE svj_id = :sid AND typ = "udalost" AND odkaz_hash = :hash')
       ->execute([':sid' => $svjId, ':hash' => 'kalendar#' . $id]);

    jsonOk(['deleted' => true]);
}

function notifyNewEvent(PDO $db, int $svjId, int $eventId, string $nazev, string $datum, int $authorId): void
{
    $stmt = $db->prepare(
        'SELECT id FROM users WHERE svj_id = :sid AND id != :uid AND notif_udalosti = 1'
    );
    $stmt->execute([':sid' => $svjId, ':uid' => $authorId]);
    $users = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($users)) return;

    $ins = $db->prepare(
        'INSERT INTO notifikace (svj_id, user_id, typ, nazev, detail, odkaz_hash)
         VALUES (:sid, :uid, "udalost", :nazev, :detail, :hash)'
    );
    $detail = 'Datum: ' . $datum;
    $hash = 'kalendar#' . $eventId;

    foreach ($users as $uid) {
        $ins->execute([
            ':sid' => $svjId, ':uid' => $uid,
            ':nazev' => $nazev, ':detail' => $detail, ':hash' => $hash,
        ]);
    }
}
