<?php
/**
 * Hlasování — CRUD + hlasování členů SVJ.
 * Akce: list, get, create, vote, close, delete, setExterni
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user   = requireAuth();
$svjId  = requireSvj($user);

$action = getParam('action', '');

match ($action) {
    'list'   => handleList($user, $svjId),
    'get'    => handleGet($user, $svjId),
    'create' => handleCreate($user, $svjId),
    'vote'   => handleVote($user, $svjId),
    'close'       => handleClose($svjId),
    'delete'      => handleDelete($svjId),
    'setExterni'  => handleSetExterni($svjId),
    default       => jsonError('Neznámá akce', 400),
};

/* ===== LIST ===== */

function handleList(array $user, int $svjId): void
{
    $db = getDb();

    $cStmt = $db->prepare('SELECT COUNT(*) FROM users WHERE svj_id = :id');
    $cStmt->execute([':id' => $svjId]);
    $pocetClenů = (int)$cStmt->fetchColumn();

    $stmt = $db->prepare(
        'SELECT h.id, h.nazev, h.popis, h.moznosti, h.externi_hlasy, h.deadline, h.vaha_hlasu, h.stav,
                h.created_at, u.jmeno, u.prijmeni,
                (SELECT COUNT(*) FROM hlasy WHERE hlasovani_id = h.id) AS pocet_hlasu,
                (SELECT moznost_index FROM hlasy WHERE hlasovani_id = h.id AND user_id = :uid) AS muj_hlas
         FROM hlasovani h
         JOIN users u ON u.id = h.vytvoril
         WHERE h.svj_id = :svj_id
         ORDER BY h.created_at DESC'
    );
    $stmt->execute([':svj_id' => $svjId, ':uid' => (int)$user['id']]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['moznosti']      = json_decode($r['moznosti'], true);
        $r['externi_hlasy'] = $r['externi_hlasy'] ? json_decode($r['externi_hlasy'], true) : null;
        $r['muj_hlas']      = $r['muj_hlas'] !== null ? (int)$r['muj_hlas'] : null;
        $r['pocet_hlasu']   = (int)$r['pocet_hlasu'];
    }

    jsonOk(['hlasovani' => $rows, 'pocet_clenu' => $pocetClenů]);
}

/* ===== GET (detail + výsledky) ===== */

function handleGet(array $user, int $svjId): void
{
    $id = (int)(getParam('id', '0'));
    if (!$id) jsonError('Chybí ID hlasování', 400);

    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM hlasovani WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $id, ':svj_id' => $svjId]);
    $h = $stmt->fetch();
    if (!$h) jsonError('Hlasování nenalezeno', 404);

    $cStmt = $db->prepare('SELECT COUNT(*) FROM users WHERE svj_id = :id');
    $cStmt->execute([':id' => $svjId]);
    $h['pocet_clenu'] = (int)$cStmt->fetchColumn();

    $h['moznosti']      = json_decode($h['moznosti'], true);
    $h['externi_hlasy'] = $h['externi_hlasy'] ? json_decode($h['externi_hlasy'], true) : null;

    // Výsledky — počty per možnost
    $rStmt = $db->prepare(
        'SELECT moznost_index, COUNT(*) AS pocet FROM hlasy WHERE hlasovani_id = :id GROUP BY moznost_index'
    );
    $rStmt->execute([':id' => $id]);
    $counts = array_fill(0, count($h['moznosti']), 0);
    foreach ($rStmt->fetchAll() as $row) {
        $idx = (int)$row['moznost_index'];
        if (isset($counts[$idx])) $counts[$idx] = (int)$row['pocet'];
    }

    // Váhové výsledky (podíl) — jen pokud vaha_hlasu = podil
    $vahovane = null;
    if ($h['vaha_hlasu'] === 'podil') {
        $vahovane = array_fill(0, count($h['moznosti']), ['citatel' => 0, 'jmenovatel' => 0]);
        $vStmt2 = $db->prepare(
            'SELECT hl.moznost_index,
                    COALESCE(j.podil_citatel, 1)    AS pc,
                    COALESCE(j.podil_jmenovatel, 1) AS pj
             FROM hlasy hl
             LEFT JOIN jednotky j ON j.svj_id = :svj_id
                 AND j.svj_id = (SELECT svj_id FROM users WHERE id = hl.user_id LIMIT 1)
             WHERE hl.hlasovani_id = :id
             GROUP BY hl.user_id'
        );
        $vStmt2->execute([':svj_id' => $svjId, ':id' => $id]);
        foreach ($vStmt2->fetchAll() as $row) {
            $idx = (int)$row['moznost_index'];
            if (isset($vahovane[$idx])) {
                $vahovane[$idx]['citatel']    += (int)$row['pc'];
                $vahovane[$idx]['jmenovatel'] += (int)$row['pj'];
            }
        }
    }

    // Hlasoval přihlášený uživatel?
    $myStmt = $db->prepare('SELECT moznost_index FROM hlasy WHERE hlasovani_id = :id AND user_id = :uid');
    $myStmt->execute([':id' => $id, ':uid' => (int)$user['id']]);
    $myVote = $myStmt->fetchColumn();

    jsonOk([
        'hlasovani' => $h,
        'vysledky'  => $counts,
        'vahovane'  => $vahovane,
        'muj_hlas'  => $myVote !== false ? (int)$myVote : null,
    ]);
}

/* ===== CREATE ===== */

function handleCreate(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');

    $input   = getJsonBody();
    $nazev   = trim(strip_tags($input['nazev']   ?? ''));
    $popis   = trim(strip_tags($input['popis']   ?? ''));
    $moznosti = $input['moznosti'] ?? [];
    $deadline = $input['deadline'] ?? null;
    $vaha    = in_array($input['vaha_hlasu'] ?? '', ['rovny', 'podil'], true) ? $input['vaha_hlasu'] : 'podil';

    if (!$nazev) jsonError('Název hlasování je povinný', 400);
    if (count($moznosti) < 2 || count($moznosti) > 10) jsonError('Zadejte 2–10 možností', 400);

    $moznosti = array_values(array_map(fn($m) => trim(strip_tags($m)), $moznosti));
    foreach ($moznosti as $m) {
        if (!$m) jsonError('Prázdná možnost není povolena', 400);
    }

    if ($deadline) {
        $dt = DateTime::createFromFormat('Y-m-d', $deadline)
           ?: DateTime::createFromFormat('Y-m-d H:i:s', $deadline)
           ?: DateTime::createFromFormat('Y-m-d\TH:i', $deadline);
        if (!$dt) jsonError('Neplatný formát data (YYYY-MM-DD)', 422, 'INVALID_DATE');
        if ($dt->getTimestamp() <= time()) jsonError('Deadline musí být v budoucnosti', 400);
        $deadline = $dt->format('Y-m-d H:i:s');
    }

    $db   = getDb();
    $stmt = $db->prepare(
        'INSERT INTO hlasovani (svj_id, nazev, popis, moznosti, deadline, vaha_hlasu, vytvoril)
         VALUES (:svj_id, :nazev, :popis, :moznosti, :deadline, :vaha, :uid)'
    );
    $stmt->execute([
        ':svj_id'  => $svjId,
        ':nazev'   => $nazev,
        ':popis'   => $popis ?: null,
        ':moznosti'=> json_encode($moznosti, JSON_UNESCAPED_UNICODE),
        ':deadline'=> $deadline,
        ':vaha'    => $vaha,
        ':uid'     => (int)$user['id'],
    ]);

    jsonOk(['id' => (int)$db->lastInsertId()]);
}

/* ===== VOTE ===== */

function handleVote(array $user, int $svjId): void
{
    $input = getJsonBody();
    $hid   = (int)($input['hlasovani_id'] ?? 0);
    $idx   = $input['moznost_index'] ?? null;

    if (!$hid || $idx === null) jsonError('Chybí parametry', 400);
    $idx = (int)$idx;

    $db   = getDb();
    $stmt = $db->prepare('SELECT moznosti, stav, deadline FROM hlasovani WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $hid, ':svj_id' => $svjId]);
    $h = $stmt->fetch();

    if (!$h)                               jsonError('Hlasování nenalezeno', 404);
    if ($h['stav'] !== 'aktivni')          jsonError('Hlasování je ukončeno', 409);
    if ($h['deadline'] && strtotime($h['deadline']) < time()) jsonError('Hlasování vypršelo', 409);

    $moznosti = json_decode($h['moznosti'], true);
    if ($idx < 0 || $idx >= count($moznosti)) jsonError('Neplatná možnost', 400);

    try {
        $db->prepare('INSERT INTO hlasy (hlasovani_id, user_id, moznost_index) VALUES (:hid, :uid, :idx)')
           ->execute([':hid' => $hid, ':uid' => (int)$user['id'], ':idx' => $idx]);
    } catch (\PDOException $e) {
        jsonError('Již jste hlasoval/a v tomto hlasování', 409);
    }

    jsonOk(['voted' => true]);
}

/* ===== CLOSE ===== */

function handleClose(int $svjId): void
{
    requireRole('admin', 'vybor');
    $input = getJsonBody();
    $id    = (int)($input['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400);

    $db = getDb();
    $db->prepare('UPDATE hlasovani SET stav = "ukonceno" WHERE id = :id AND svj_id = :svj_id')
       ->execute([':id' => $id, ':svj_id' => $svjId]);

    jsonOk(['closed' => true]);
}

/* ===== DELETE ===== */

function handleDelete(int $svjId): void
{
    requireRole('admin');
    $input = getJsonBody();
    $id    = (int)($input['id'] ?? 0);
    if (!$id) jsonError('Chybí ID', 400);

    $db = getDb();
    $db->prepare('DELETE FROM hlasovani WHERE id = :id AND svj_id = :svj_id')
       ->execute([':id' => $id, ':svj_id' => $svjId]);

    jsonOk(['deleted' => true]);
}

/* ===== SET EXTERNI HLASY ===== */

function handleSetExterni(int $svjId): void
{
    requireRole('admin', 'vybor');

    $input = getJsonBody();
    $id    = (int)($input['id']             ?? 0);
    $ext   = $input['externi_hlasy']         ?? [];

    if (!$id)                      jsonError('Chybí ID hlasování', 400);
    if (!is_array($ext))           jsonError('Neplatný formát externích hlasů', 400);

    // Ověř že hlasování patří tomuto SVJ a načti počet možností
    $db   = getDb();
    $hStmt = $db->prepare('SELECT moznosti FROM hlasovani WHERE id = :id AND svj_id = :svj_id');
    $hStmt->execute([':id' => $id, ':svj_id' => $svjId]);
    $h = $hStmt->fetch();
    if (!$h) jsonError('Hlasování nenalezeno', 404);

    $moznosti = json_decode($h['moznosti'], true);
    if (count($ext) !== count($moznosti)) {
        jsonError('Počet hodnot musí odpovídat počtu možností (' . count($moznosti) . ')', 400);
    }

    // Sanitizace — jen nezáporná celá čísla
    $ext = array_map(fn($v) => max(0, (int)$v), $ext);

    $db->prepare('UPDATE hlasovani SET externi_hlasy = :ext WHERE id = :id AND svj_id = :svj_id')
       ->execute([
           ':ext'    => json_encode($ext),
           ':id'     => $id,
           ':svj_id' => $svjId,
       ]);

    jsonOk(['updated' => true, 'externi_hlasy' => $ext]);
}
