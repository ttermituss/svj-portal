<?php
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

    $stmt = getDb()->prepare(
        'SELECT id, cislo, typ, cislo_jednotky, najemce, poznamka
         FROM parkovani WHERE svj_id = :svj_id
         ORDER BY cislo + 0, cislo'
    );
    $stmt->execute([':svj_id' => $svjId]);
    jsonOk(['stani' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $id           = (int) ($_POST['id'] ?? 0);
    $cislo        = sanitize($_POST['cislo'] ?? '');
    $typ          = sanitize($_POST['typ'] ?? '');
    $cisloJednotky = sanitize($_POST['cislo_jednotky'] ?? '');
    $najemce      = sanitize($_POST['najemce'] ?? '');
    $poznamka     = sanitize($_POST['poznamka'] ?? '');

    $allowedTypy = ['garaz', 'stani', 'venkovni', 'moto', 'jine'];
    if (!$cislo) jsonError('Číslo stání je povinné', 400, 'MISSING_CISLO');
    if (!in_array($typ, $allowedTypy, true)) jsonError('Neplatný typ', 400, 'INVALID_TYP');

    $db = getDb();

    if ($id) {
        $chk = $db->prepare('SELECT id FROM parkovani WHERE id = :id AND svj_id = :svj_id');
        $chk->execute([':id' => $id, ':svj_id' => $svjId]);
        if (!$chk->fetch()) jsonError('Stání nenalezeno', 404, 'NOT_FOUND');

        $db->prepare(
            'UPDATE parkovani SET cislo = :c, typ = :t, cislo_jednotky = :cj,
             najemce = :n, poznamka = :p WHERE id = :id'
        )->execute([
            ':c' => $cislo, ':t' => $typ,
            ':cj' => $cisloJednotky ?: null, ':n' => $najemce ?: null,
            ':p' => $poznamka ?: null, ':id' => $id,
        ]);
    } else {
        $db->prepare(
            'INSERT INTO parkovani (svj_id, cislo, typ, cislo_jednotky, najemce, poznamka)
             VALUES (:svj_id, :c, :t, :cj, :n, :p)'
        )->execute([
            ':svj_id' => $svjId,
            ':c' => $cislo, ':t' => $typ,
            ':cj' => $cisloJednotky ?: null, ':n' => $najemce ?: null,
            ':p' => $poznamka ?: null,
        ]);
    }

    jsonOk(['message' => 'Stání uloženo']);
}

function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $svjId = requireSvj($user);

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $stmt = getDb()->prepare('SELECT id FROM parkovani WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $svjId]);
    if (!$stmt->fetch()) jsonError('Stání nenalezeno', 404, 'NOT_FOUND');

    getDb()->prepare('DELETE FROM parkovani WHERE id = :id')->execute([':id' => $id]);
    jsonOk();
}
