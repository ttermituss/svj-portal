<?php
/**
 * Fond oprav — předpisy a zálohy vlastníků.
 *
 * GET  ?action=predpisList&rok=2026                → předpisy pro rok
 * POST ?action=predpisSave {rok,jednotka_id,mesicni_castka,poznamka}
 * POST ?action=predpisGenerate {rok,celkova_castka} → auto z podílů
 * POST ?action=predpisDelete {id}
 * GET  ?action=zalohyList&rok=2026&mesic=3         → zálohy za měsíc
 * POST ?action=zalohyGenerate {rok,mesic}          → vygenerovat z předpisů
 * POST ?action=zalohySave {id,zaplaceno,datum_platby,poznamka}
 * GET  ?action=zalohyStats&rok=2026                → souhrnné statistiky
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/fond_notif_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'predpisList':     handlePredpisList();     break;
    case 'predpisSave':     handlePredpisSave();     break;
    case 'predpisGenerate': handlePredpisGenerate(); break;
    case 'predpisDelete':   handlePredpisDelete();   break;
    case 'zalohyList':      handleZalohyList();      break;
    case 'zalohyGenerate':  handleZalohyGenerate();  break;
    case 'zalohySave':      handleZalohySave();      break;
    case 'zalohyStats':     handleZalohyStats();     break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== PŘEDPISY ===== */

function handlePredpisList(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $rok = (int) getParam('rok', date('Y'));
    $db = getDb();

    $stmt = $db->prepare(
        'SELECT p.id, p.jednotka_id, p.mesicni_castka, p.poznamka,
                j.cislo_jednotky, j.typ_kod,
                COALESCE(u.jmeno, ve.jmeno, "") AS vlastnik_jmeno,
                COALESCE(u.prijmeni, ve.prijmeni, "") AS vlastnik_prijmeni,
                j.podil_citatel, j.podil_jmenovatel
         FROM fond_predpis p
         JOIN jednotky j ON j.id = p.jednotka_id
         LEFT JOIN users u ON u.jednotka_id = j.id AND u.svj_id = p.svj_id
         LEFT JOIN vlastnici_ext ve ON ve.jednotka_id = j.id AND ve.svj_id = p.svj_id
         WHERE p.svj_id = :sid AND p.rok = :rok
         ORDER BY j.cislo_jednotky ASC'
    );
    $stmt->execute([':sid' => $user['svj_id'], ':rok' => $rok]);

    jsonOk(['rok' => $rok, 'predpisy' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handlePredpisSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $rok          = (int) ($body['rok'] ?? date('Y'));
    $jednotkaId   = (int) ($body['jednotka_id'] ?? 0);
    $mesicniCastka = str_replace(',', '.', $body['mesicni_castka'] ?? '');
    $poznamka     = sanitize($body['poznamka'] ?? '');

    if (!$jednotkaId) jsonError('Chybí jednotka', 400, 'MISSING_JEDNOTKA');
    if (!is_numeric($mesicniCastka) || (float) $mesicniCastka < 0) {
        jsonError('Neplatná částka', 400, 'INVALID_CASTKA');
    }

    $db = getDb();

    // Verify jednotka belongs to SVJ
    $jStmt = $db->prepare('SELECT id FROM jednotky WHERE id = :jid AND svj_id = :sid');
    $jStmt->execute([':jid' => $jednotkaId, ':sid' => $user['svj_id']]);
    if (!$jStmt->fetch()) jsonError('Jednotka nenalezena', 404, 'NOT_FOUND');

    $db->prepare(
        'INSERT INTO fond_predpis (svj_id, rok, jednotka_id, mesicni_castka, poznamka)
         VALUES (:sid, :rok, :jid, :castka, :poz)
         ON DUPLICATE KEY UPDATE mesicni_castka = VALUES(mesicni_castka), poznamka = VALUES(poznamka)'
    )->execute([
        ':sid'    => $user['svj_id'],
        ':rok'    => $rok,
        ':jid'    => $jednotkaId,
        ':castka' => round((float) $mesicniCastka, 2),
        ':poz'    => $poznamka ?: null,
    ]);

    jsonOk(['message' => 'Předpis uložen']);
}

function handlePredpisGenerate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $rok = (int) ($body['rok'] ?? date('Y'));
    $celkovaCastka = str_replace(',', '.', $body['celkova_castka'] ?? '');

    if (!is_numeric($celkovaCastka) || (float) $celkovaCastka <= 0) {
        jsonError('Zadejte celkovou měsíční částku', 400, 'INVALID_CASTKA');
    }
    $total = (float) $celkovaCastka;

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id, podil_citatel, podil_jmenovatel FROM jednotky WHERE svj_id = :sid'
    );
    $stmt->execute([':sid' => $user['svj_id']]);
    $jednotky = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($jednotky)) jsonError('Žádné jednotky v SVJ', 404, 'NO_UNITS');

    // Calculate total shares
    $totalShare = 0;
    foreach ($jednotky as $j) {
        $cit = (int) ($j['podil_citatel'] ?? 0);
        $jmen = (int) ($j['podil_jmenovatel'] ?? 1);
        $totalShare += $jmen > 0 ? ($cit / $jmen) : 0;
    }

    if ($totalShare <= 0) {
        // Fallback: equal split
        $totalShare = count($jednotky);
        $equalSplit = true;
    } else {
        $equalSplit = false;
    }

    $ins = $db->prepare(
        'INSERT INTO fond_predpis (svj_id, rok, jednotka_id, mesicni_castka)
         VALUES (:sid, :rok, :jid, :castka)
         ON DUPLICATE KEY UPDATE mesicni_castka = VALUES(mesicni_castka)'
    );

    $generated = 0;
    foreach ($jednotky as $j) {
        if ($equalSplit) {
            $share = 1;
        } else {
            $cit = (int) ($j['podil_citatel'] ?? 0);
            $jmen = (int) ($j['podil_jmenovatel'] ?? 1);
            $share = $jmen > 0 ? ($cit / $jmen) : 0;
        }
        $castka = round(($share / $totalShare) * $total, 2);

        $ins->execute([
            ':sid'    => $user['svj_id'],
            ':rok'    => $rok,
            ':jid'    => $j['id'],
            ':castka' => $castka,
        ]);
        $generated++;
    }

    jsonOk(['message' => 'Vygenerováno ' . $generated . ' předpisů', 'count' => $generated]);
}

function handlePredpisDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db = getDb();
    $stmt = $db->prepare('DELETE FROM fond_predpis WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    if ($stmt->rowCount() === 0) jsonError('Předpis nenalezen', 404, 'NOT_FOUND');

    jsonOk(['deleted' => true]);
}

/* ===== ZÁLOHY ===== */

function handleZalohyList(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $rok   = (int) getParam('rok', date('Y'));
    $mesic = (int) getParam('mesic', date('n'));
    if ($mesic < 1 || $mesic > 12) jsonError('Neplatný měsíc', 400, 'INVALID_MONTH');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT z.id, z.predpis_id, z.predepsano, z.zaplaceno, z.datum_platby, z.poznamka,
                p.jednotka_id, p.mesicni_castka,
                j.cislo_jednotky,
                COALESCE(u.jmeno, ve.jmeno, "") AS vlastnik_jmeno,
                COALESCE(u.prijmeni, ve.prijmeni, "") AS vlastnik_prijmeni
         FROM fond_zalohy z
         JOIN fond_predpis p ON p.id = z.predpis_id
         JOIN jednotky j ON j.id = p.jednotka_id
         LEFT JOIN users u ON u.jednotka_id = j.id AND u.svj_id = z.svj_id
         LEFT JOIN vlastnici_ext ve ON ve.jednotka_id = j.id AND ve.svj_id = z.svj_id
         WHERE z.svj_id = :sid AND p.rok = :rok AND z.mesic = :m
         ORDER BY j.cislo_jednotky ASC'
    );
    $stmt->execute([':sid' => $user['svj_id'], ':rok' => $rok, ':m' => $mesic]);

    jsonOk([
        'rok'    => $rok,
        'mesic'  => $mesic,
        'zalohy' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
}

function handleZalohyGenerate(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $rok   = (int) ($body['rok'] ?? date('Y'));
    $mesic = (int) ($body['mesic'] ?? 0);
    if ($mesic < 1 || $mesic > 12) jsonError('Neplatný měsíc', 400, 'INVALID_MONTH');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id, mesicni_castka FROM fond_predpis WHERE svj_id = :sid AND rok = :rok'
    );
    $stmt->execute([':sid' => $user['svj_id'], ':rok' => $rok]);
    $predpisy = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($predpisy)) jsonError('Žádné předpisy pro rok ' . $rok, 404, 'NO_PREDPISY');

    $ins = $db->prepare(
        'INSERT INTO fond_zalohy (svj_id, predpis_id, mesic, predepsano)
         VALUES (:sid, :pid, :m, :pred)
         ON DUPLICATE KEY UPDATE predepsano = VALUES(predepsano)'
    );

    $count = 0;
    foreach ($predpisy as $p) {
        $ins->execute([
            ':sid'  => $user['svj_id'],
            ':pid'  => $p['id'],
            ':m'    => $mesic,
            ':pred' => $p['mesicni_castka'],
        ]);
        $count++;
    }

    jsonOk(['message' => 'Vygenerováno ' . $count . ' záloh', 'count' => $count]);
}

function handleZalohySave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $body = getJsonBody();
    $id         = (int) ($body['id'] ?? 0);
    $zaplaceno  = str_replace(',', '.', $body['zaplaceno'] ?? '');
    $datumPlatby = sanitize($body['datum_platby'] ?? '');
    $poznamka   = sanitize($body['poznamka'] ?? '');

    if (!$id) jsonError('Chybí ID zálohy', 400, 'MISSING_ID');
    if (!is_numeric($zaplaceno) || (float) $zaplaceno < 0) {
        jsonError('Neplatná částka', 400, 'INVALID_CASTKA');
    }

    $db = getDb();

    // Verify ownership
    $stmt = $db->prepare('SELECT id FROM fond_zalohy WHERE id = :id AND svj_id = :sid');
    $stmt->execute([':id' => $id, ':sid' => $user['svj_id']]);
    if (!$stmt->fetch()) jsonError('Záloha nenalezena', 404, 'NOT_FOUND');

    $db->prepare(
        'UPDATE fond_zalohy SET zaplaceno = :zap, datum_platby = :dp, poznamka = :poz WHERE id = :id'
    )->execute([
        ':zap' => round((float) $zaplaceno, 2),
        ':dp'  => ($datumPlatby && strtotime($datumPlatby)) ? $datumPlatby : null,
        ':poz' => $poznamka ?: null,
        ':id'  => $id,
    ]);

    jsonOk(['message' => 'Záloha aktualizována']);
}

/* ===== STATISTIKY ===== */

function handleZalohyStats(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $rok = (int) getParam('rok', date('Y'));
    $db = getDb();

    $stmt = $db->prepare(
        'SELECT z.mesic,
                COUNT(*) AS pocet,
                SUM(z.predepsano) AS predepsano_celkem,
                SUM(z.zaplaceno) AS zaplaceno_celkem,
                SUM(CASE WHEN z.zaplaceno >= z.predepsano THEN 1 ELSE 0 END) AS zaplaceno_pocet,
                SUM(CASE WHEN z.zaplaceno > 0 AND z.zaplaceno < z.predepsano THEN 1 ELSE 0 END) AS castecne_pocet,
                SUM(CASE WHEN z.zaplaceno = 0 THEN 1 ELSE 0 END) AS nezaplaceno_pocet
         FROM fond_zalohy z
         JOIN fond_predpis p ON p.id = z.predpis_id
         WHERE z.svj_id = :sid AND p.rok = :rok
         GROUP BY z.mesic
         ORDER BY z.mesic ASC'
    );
    $stmt->execute([':sid' => $user['svj_id'], ':rok' => $rok]);

    jsonOk(['rok' => $rok, 'mesice' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}
