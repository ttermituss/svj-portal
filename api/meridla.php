<?php
/**
 * Měřidla a odečty
 * Actions: list, save, delete, odectyList, odectySave, odectyDelete, statsSpotreба
 */
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user   = requireAuth();
$svjId  = requireSvj($user);
$action = getParam('action', 'list');

switch ($action) {
    case 'list':         handleList($svjId, $user); break;
    case 'save':         handleSave($user, $svjId); break;
    case 'delete':       handleDelete($user, $svjId); break;
    case 'odectyList':   handleOdectyList($svjId, $user); break;
    case 'odectySave':   handleOdectySave($user, $svjId); break;
    case 'odectyDelete': handleOdectyDelete($user, $svjId); break;
    case 'spotreba':     handleSpotreba($svjId); break;
    default: jsonError('Neznámá akce', 400);
}

/* ── List měřidel ─────────────────────────────────── */
function handleList(int $svjId, array $user): void
{
    $db = getDb();
    $st = $db->prepare('
        SELECT m.id, m.typ, m.vyrobni_cislo, m.umisteni_typ, m.jednotka_id,
               m.misto, m.jednotka_mereni, m.datum_instalace, m.datum_cejchu,
               m.interval_cejchu_mesice, m.datum_pristi_cejch, m.aktivni, m.poznamka,
               j.cislo_jednotky,
               last_o.hodnota AS posledni_hodnota,
               last_o.datum   AS posledni_datum,
               COALESCE(cnt.pocet, 0) AS odectu_pocet
        FROM meridla m
        LEFT JOIN jednotky j ON j.id = m.jednotka_id
        LEFT JOIN (
            SELECT meridlo_id, hodnota, datum
            FROM (
                SELECT meridlo_id, hodnota, datum,
                       ROW_NUMBER() OVER (PARTITION BY meridlo_id ORDER BY datum DESC, id DESC) AS rn
                FROM odecty
                WHERE svj_id = ?
            ) ranked
            WHERE rn = 1
        ) last_o ON last_o.meridlo_id = m.id
        LEFT JOIN (
            SELECT meridlo_id, COUNT(*) AS pocet
            FROM odecty
            WHERE svj_id = ?
            GROUP BY meridlo_id
        ) cnt ON cnt.meridlo_id = m.id
        WHERE m.svj_id = ?
        ORDER BY m.umisteni_typ DESC, m.typ, j.cislo_jednotky, m.vyrobni_cislo
    ');
    $st->execute([$svjId, $svjId, $svjId]);
    $meridla = $st->fetchAll(PDO::FETCH_ASSOC);

    // Vlastník vidí jen svá měřidla (jednotka) + společná
    if ($user['role'] === 'vlastnik' && $user['jednotka_id']) {
        $jId = (int) $user['jednotka_id'];
        $meridla = array_values(array_filter($meridla, function($m) use ($jId) {
            return $m['umisteni_typ'] === 'spolecne' || (int) $m['jednotka_id'] === $jId;
        }));
    }

    jsonOk(['meridla' => $meridla]);
}

/* ── Save měřidlo ─────────────────────────────────── */
function handleSave(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');
    requireMethod('POST');

    $body = getJsonBody();
    $id              = intval($body['id'] ?? 0);
    $typ             = trim($body['typ'] ?? 'jine');
    $vyrobniCislo    = trim(strip_tags($body['vyrobni_cislo'] ?? ''));
    $umisteniTyp     = ($body['umisteni_typ'] ?? 'jednotka') === 'spolecne' ? 'spolecne' : 'jednotka';
    $jednotkaId      = !empty($body['jednotka_id']) ? intval($body['jednotka_id']) : null;
    $misto           = trim(strip_tags($body['misto'] ?? ''));
    $jednotkaMereni  = trim(strip_tags($body['jednotka_mereni'] ?? 'm3'));
    $datumInstalace  = trim($body['datum_instalace'] ?? '') ?: null;
    $datumCejchu     = trim($body['datum_cejchu'] ?? '') ?: null;
    $intervalCejchu  = !empty($body['interval_cejchu_mesice']) ? intval($body['interval_cejchu_mesice']) : null;
    $aktivni         = isset($body['aktivni']) ? (int) $body['aktivni'] : 1;
    $poznamka        = trim(strip_tags($body['poznamka'] ?? ''));

    $validTypy = ['voda_studena','voda_tepla','plyn','elektrina','teplo','jine'];
    if (!in_array($typ, $validTypy, true)) $typ = 'jine';

    if ($umisteniTyp === 'spolecne') $jednotkaId = null;

    // Datum příštího cejchu
    $datumPristiCejch = null;
    if ($datumCejchu && $intervalCejchu) {
        $dt = DateTime::createFromFormat('Y-m-d', $datumCejchu);
        if ($dt) {
            $dt->modify("+{$intervalCejchu} months");
            $datumPristiCejch = $dt->format('Y-m-d');
        }
    }

    $db = getDb();

    if ($id > 0) {
        $db->prepare('
            UPDATE meridla SET typ=?, vyrobni_cislo=?, umisteni_typ=?, jednotka_id=?,
                misto=?, jednotka_mereni=?, datum_instalace=?, datum_cejchu=?,
                interval_cejchu_mesice=?, datum_pristi_cejch=?, aktivni=?, poznamka=?
            WHERE id=? AND svj_id=?
        ')->execute([
            $typ, $vyrobniCislo, $umisteniTyp, $jednotkaId,
            $misto, $jednotkaMereni, $datumInstalace, $datumCejchu,
            $intervalCejchu, $datumPristiCejch, $aktivni, $poznamka ?: null,
            $id, $svjId,
        ]);
    } else {
        $db->prepare('
            INSERT INTO meridla (svj_id, typ, vyrobni_cislo, umisteni_typ, jednotka_id,
                misto, jednotka_mereni, datum_instalace, datum_cejchu,
                interval_cejchu_mesice, datum_pristi_cejch, aktivni, poznamka)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $svjId, $typ, $vyrobniCislo, $umisteniTyp, $jednotkaId,
            $misto, $jednotkaMereni, $datumInstalace, $datumCejchu,
            $intervalCejchu, $datumPristiCejch, $aktivni, $poznamka ?: null,
        ]);
        $id = (int) $db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

/* ── Delete měřidlo ───────────────────────────────── */
function handleDelete(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');
    requireMethod('POST');
    $body = getJsonBody();
    $id = intval($body['id'] ?? 0);
    if ($id <= 0) jsonError('Chybí ID', 400);

    $db = getDb();
    $db->prepare('DELETE FROM meridla WHERE id = ? AND svj_id = ?')->execute([$id, $svjId]);
    jsonOk();
}

/* ── Odečty: List ─────────────────────────────────── */
function handleOdectyList(int $svjId, array $user): void
{
    $meridloId = (int) getParam('meridlo_id', 0);
    if (!$meridloId) jsonError('Chybí meridlo_id', 400);

    // Ověříme přístup k měřidlu
    $db = getDb();
    $chk = $db->prepare('SELECT id, jednotka_id, umisteni_typ FROM meridla WHERE id = ? AND svj_id = ?');
    $chk->execute([$meridloId, $svjId]);
    $meridlo = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$meridlo) jsonError('Měřidlo nenalezeno', 404);

    // Vlastník: jen svoje jednotky + společné
    if ($user['role'] === 'vlastnik') {
        if ($meridlo['umisteni_typ'] !== 'spolecne'
            && (int) $meridlo['jednotka_id'] !== (int) ($user['jednotka_id'] ?? 0)) {
            jsonError('Nemáte přístup', 403);
        }
    }

    $st = $db->prepare('
        SELECT o.id, o.datum, o.hodnota, o.poznamka, o.created_at,
               u.jmeno, u.prijmeni
        FROM odecty o
        LEFT JOIN users u ON u.id = o.odecetl_id
        WHERE o.meridlo_id = ? AND o.svj_id = ?
        ORDER BY o.datum DESC, o.id DESC
    ');
    $st->execute([$meridloId, $svjId]);
    jsonOk(['odecty' => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ── Odečty: Save ─────────────────────────────────── */
function handleOdectySave(array $user, int $svjId): void
{
    requireMethod('POST');
    $body = getJsonBody();

    $meridloId = intval($body['meridlo_id'] ?? 0);
    $id        = intval($body['id'] ?? 0);
    $datum     = trim($body['datum'] ?? '');
    $hodnota   = isset($body['hodnota']) ? (float) $body['hodnota'] : null;
    $poznamka  = trim(strip_tags($body['poznamka'] ?? ''));

    if (!$meridloId) jsonError('Chybí meridlo_id', 400);
    $dt = DateTime::createFromFormat('Y-m-d', $datum);
    if (!$dt || $dt->format('Y-m-d') !== $datum) jsonError('Neplatný formát data (YYYY-MM-DD)', 422);
    $datum = $dt->format('Y-m-d');
    if ($hodnota === null) jsonError('Chybí hodnota', 400);

    $db = getDb();

    // Ověříme měřidlo + přístup
    $chk = $db->prepare('SELECT id, jednotka_id, umisteni_typ FROM meridla WHERE id = ? AND svj_id = ?');
    $chk->execute([$meridloId, $svjId]);
    $meridlo = $chk->fetch(PDO::FETCH_ASSOC);
    if (!$meridlo) jsonError('Měřidlo nenalezeno', 404);

    // Vlastník může přidávat odečty jen ke svým měřidlům
    $isPriv = $user['role'] === 'admin' || $user['role'] === 'vybor';
    if (!$isPriv) {
        if ($meridlo['umisteni_typ'] !== 'spolecne'
            && (int) $meridlo['jednotka_id'] !== (int) ($user['jednotka_id'] ?? 0)) {
            jsonError('Nemáte přístup', 403);
        }
        // Vlastník nemůže editovat cizí odečty
        if ($id > 0) {
            $ex = $db->prepare('SELECT odecetl_id FROM odecty WHERE id=? AND svj_id=?');
            $ex->execute([$id, $svjId]);
            $row = $ex->fetch(PDO::FETCH_ASSOC);
            if (!$row || (int) $row['odecetl_id'] !== (int) $user['id']) {
                jsonError('Nemáte oprávnění upravit tento odečet', 403);
            }
        }
    }

    if ($id > 0) {
        $db->prepare('
            UPDATE odecty SET datum=?, hodnota=?, poznamka=?
            WHERE id=? AND svj_id=?
        ')->execute([$datum, $hodnota, $poznamka ?: null, $id, $svjId]);
    } else {
        $db->prepare('
            INSERT INTO odecty (meridlo_id, svj_id, datum, hodnota, odecetl_id, poznamka)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([$meridloId, $svjId, $datum, $hodnota, $user['id'], $poznamka ?: null]);
        $id = (int) $db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

/* ── Odečty: Delete ───────────────────────────────── */
function handleOdectyDelete(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');
    requireMethod('POST');
    $body = getJsonBody();
    $id = intval($body['id'] ?? 0);
    if ($id <= 0) jsonError('Chybí ID', 400);

    $db = getDb();
    $db->prepare('DELETE FROM odecty WHERE id = ? AND svj_id = ?')->execute([$id, $svjId]);
    jsonOk();
}

/* ── Spotřeba (statistika pro graf) ───────────────── */
function handleSpotreba(int $svjId): void
{
    $meridloId = (int) getParam('meridlo_id', 0);
    if (!$meridloId) jsonError('Chybí meridlo_id', 400);

    $db = getDb();
    $st = $db->prepare('
        SELECT datum, hodnota FROM odecty
        WHERE meridlo_id = ? AND svj_id = ?
        ORDER BY datum ASC
    ');
    $st->execute([$meridloId, $svjId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    // Výpočet spotřeby mezi po sobě jdoucími odečty
    $spotreba = [];
    for ($i = 1; $i < count($rows); $i++) {
        $spotreba[] = [
            'od'       => $rows[$i - 1]['datum'],
            'do'       => $rows[$i]['datum'],
            'spotreba' => round((float) $rows[$i]['hodnota'] - (float) $rows[$i - 1]['hodnota'], 3),
        ];
    }

    jsonOk(['spotreba' => $spotreba, 'odecty' => $rows]);
}
