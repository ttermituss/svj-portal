<?php
/**
 * Revize — závady zjištěné při revizní zprávě.
 * GET  ?action=list&revize_historie_id=X   → seznam závad pro daný záznam historie
 * GET  ?action=listByRevize&revize_id=X    → všechny závady pro revizi (všechny záznamy historie)
 * POST ?action=save   {revize_historie_id, id?, popis, zavaznost, termin_odstraneni, stav, poznamka}
 * POST ?action=delete {id}
 * POST ?action=updateStav {id, stav, vyreseno_datum?}
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':         handleList();         break;
    case 'listByRevize': handleListByRevize(); break;
    case 'save':         handleSave();         break;
    case 'delete':       handleDeleteZavada(); break;
    case 'updateStav':   handleUpdateStav();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $historieId = (int) getParam('revize_historie_id', 0);
    if (!$historieId) jsonError('Chybí revize_historie_id', 400);

    $db = getDb();
    $svjId = (int) $user['svj_id'];

    // Ověřit, že historie patří tomuto SVJ
    $chk = $db->prepare('SELECT id FROM revize_historie WHERE id = ? AND svj_id = ?');
    $chk->execute([$historieId, $svjId]);
    if (!$chk->fetch()) jsonError('Záznam nenalezen', 404);

    $stmt = $db->prepare(
        'SELECT id, popis, zavaznost, termin_odstraneni, stav, vyreseno_datum, poznamka, created_at
         FROM revize_zavady WHERE revize_historie_id = ? AND svj_id = ?
         ORDER BY FIELD(stav, "nova", "v_reseni", "vyresena"), zavaznost DESC, created_at'
    );
    $stmt->execute([$historieId, $svjId]);
    jsonOk(['zavady' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleListByRevize(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $revizeId = (int) getParam('revize_id', 0);
    if (!$revizeId) jsonError('Chybí revize_id', 400);

    $db = getDb();
    $svjId = (int) $user['svj_id'];

    $stmt = $db->prepare(
        'SELECT rz.id, rz.popis, rz.zavaznost, rz.termin_odstraneni, rz.stav,
                rz.vyreseno_datum, rz.poznamka, rz.created_at,
                rh.datum_revize, rh.vysledek
         FROM revize_zavady rz
         JOIN revize_historie rh ON rh.id = rz.revize_historie_id
         WHERE rh.revize_id = ? AND rz.svj_id = ?
         ORDER BY FIELD(rz.stav, "nova", "v_reseni", "vyresena"), rz.zavaznost DESC'
    );
    $stmt->execute([$revizeId, $svjId]);
    jsonOk(['zavady' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $svjId = (int) $user['svj_id'];
    $db = getDb();

    $id               = (int) ($body['id'] ?? 0);
    $historieId       = (int) ($body['revize_historie_id'] ?? 0);
    $popis            = sanitize($body['popis'] ?? '');
    $zavaznost        = sanitize($body['zavaznost'] ?? 'stredni');
    $terminOdstraneni = sanitize($body['termin_odstraneni'] ?? '') ?: null;
    $stav             = sanitize($body['stav'] ?? 'nova');
    $vyresenoDatum    = sanitize($body['vyreseno_datum'] ?? '') ?: null;
    $poznamka         = sanitize($body['poznamka'] ?? '');

    if (!$popis) jsonError('Popis závady je povinný', 422);
    if (!in_array($zavaznost, ['nizka', 'stredni', 'vysoka', 'kriticka'])) $zavaznost = 'stredni';
    if (!in_array($stav, ['nova', 'v_reseni', 'vyresena'])) $stav = 'nova';

    if ($stav === 'vyresena' && !$vyresenoDatum) {
        $vyresenoDatum = date('Y-m-d');
    }

    if ($id > 0) {
        $chk = $db->prepare('SELECT id FROM revize_zavady WHERE id = ? AND svj_id = ?');
        $chk->execute([$id, $svjId]);
        if (!$chk->fetch()) jsonError('Závada nenalezena', 404);

        $db->prepare(
            'UPDATE revize_zavady SET popis=?, zavaznost=?, termin_odstraneni=?,
                    stav=?, vyreseno_datum=?, poznamka=?
             WHERE id=? AND svj_id=?'
        )->execute([$popis, $zavaznost, $terminOdstraneni, $stav, $vyresenoDatum, $poznamka ?: null, $id, $svjId]);
    } else {
        if (!$historieId) jsonError('Chybí revize_historie_id', 400);
        $chk = $db->prepare('SELECT id FROM revize_historie WHERE id = ? AND svj_id = ?');
        $chk->execute([$historieId, $svjId]);
        if (!$chk->fetch()) jsonError('Záznam historie nenalezen', 404);

        $db->prepare(
            'INSERT INTO revize_zavady (revize_historie_id, svj_id, popis, zavaznost, termin_odstraneni, stav, vyreseno_datum, poznamka)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$historieId, $svjId, $popis, $zavaznost, $terminOdstraneni, $stav, $vyresenoDatum, $poznamka ?: null]);
        $id = (int) $db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

function handleDeleteZavada(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) jsonError('Chybí ID', 400);

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM revize_zavady WHERE id = ? AND svj_id = ?');
    $stmt->execute([$id, (int) $user['svj_id']]);
    if ($stmt->rowCount() === 0) jsonError('Závada nenalezena', 404);

    jsonOk(['deleted' => true]);
}

function handleUpdateStav(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    $stav = sanitize($body['stav'] ?? '');
    if (!$id || !in_array($stav, ['nova', 'v_reseni', 'vyresena'])) {
        jsonError('Neplatné parametry', 422);
    }

    $vyreseno = $stav === 'vyresena' ? (sanitize($body['vyreseno_datum'] ?? '') ?: date('Y-m-d')) : null;

    $db = getDb();
    $db->prepare('UPDATE revize_zavady SET stav=?, vyreseno_datum=? WHERE id=? AND svj_id=?')
       ->execute([$stav, $vyreseno, $id, (int) $user['svj_id']]);

    jsonOk(['stav' => $stav]);
}
