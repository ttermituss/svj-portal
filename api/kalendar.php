<?php
/**
 * Kalendář — agregovaný endpoint pro události ze všech modulů.
 * GET ?action=events&rok=2026&mesic=3  → události pro daný měsíc
 * GET ?action=events&od=2026-03-01&do=2026-03-31  → rozsah
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$action = getParam('action', '');

switch ($action) {
    case 'events': handleEvents(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleEvents(): void
{
    requireMethod('GET');
    $user = requireAuth();
    $svjId = requireSvj($user);

    $svjId = $user['svj_id'];
    $isPriv = in_array($user['role'], ['admin', 'vybor'], true);

    $rok   = (int) getParam('rok', date('Y'));
    $mesic = (int) getParam('mesic', date('n'));
    if ($rok < 2000 || $rok > 2100) $rok = (int) date('Y');
    if ($mesic < 1 || $mesic > 12) $mesic = (int) date('n');

    $od = sprintf('%04d-%02d-01', $rok, $mesic);
    $do = date('Y-m-t', strtotime($od));

    $db = getDb();
    $events = [];

    // 1. Revize — datum_pristi
    $events = array_merge($events, fetchRevize($db, $svjId, $od, $do));

    // 2. PENB — datum_platnosti
    $events = array_merge($events, fetchPenb($db, $svjId, $od, $do));

    // 3. Hlasování — deadline
    $events = array_merge($events, fetchHlasovani($db, $svjId, $od, $do));

    // 4. Dokumenty — datum_platnosti
    $events = array_merge($events, fetchDokumenty($db, $svjId, $od, $do));

    // 5. Závady — created_at (nové), uzavreno_at (vyřešené)
    $events = array_merge($events, fetchZavady($db, $svjId, $od, $do));

    // 6. Fond oprav — datum (jen priv)
    if ($isPriv) {
        $events = array_merge($events, fetchFondOprav($db, $svjId, $od, $do));
    }

    // 7. Vlastní události (kalendar_udalosti)
    $events = array_merge($events, fetchVlastniUdalosti($db, $svjId, $od, $do));

    jsonOk(['events' => $events, 'rok' => $rok, 'mesic' => $mesic]);
}

function fetchRevize(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT id, nazev, typ, datum_pristi FROM revize
         WHERE svj_id = :sid AND datum_pristi BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'revize',
            'datum'  => $r['datum_pristi'],
            'nazev'  => 'Revize: ' . $r['nazev'],
            'detail' => $r['typ'],
            'id'     => (int) $r['id'],
            'barva'  => 'danger',
        ];
    }
    return $out;
}

function fetchPenb(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT id, energeticka_trida, datum_platnosti FROM penb
         WHERE svj_id = :sid AND datum_platnosti BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'penb',
            'datum'  => $r['datum_platnosti'],
            'nazev'  => 'PENB expirace (t\u0159\u00edda ' . $r['energeticka_trida'] . ')',
            'detail' => 'Platnost průkazu energetické náročnosti',
            'id'     => (int) $r['id'],
            'barva'  => 'danger',
        ];
    }
    return $out;
}

function fetchHlasovani(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT id, nazev, deadline, stav FROM hlasovani
         WHERE svj_id = :sid AND deadline IS NOT NULL AND DATE(deadline) BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'hlasovani',
            'datum'  => date('Y-m-d', strtotime($r['deadline'])),
            'nazev'  => 'Hlasování: ' . $r['nazev'],
            'detail' => $r['stav'] === 'aktivni' ? 'Aktivní' : 'Ukončeno',
            'id'     => (int) $r['id'],
            'barva'  => 'blue',
        ];
    }
    return $out;
}

function fetchDokumenty(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT id, nazev, kategorie, datum_platnosti FROM dokumenty
         WHERE svj_id = :sid AND datum_platnosti IS NOT NULL AND datum_platnosti BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'dokumenty',
            'datum'  => $r['datum_platnosti'],
            'nazev'  => 'Dokument: ' . $r['nazev'],
            'detail' => $r['kategorie'] ?? '',
            'id'     => (int) $r['id'],
            'barva'  => 'blue',
        ];
    }
    return $out;
}

function fetchZavady(PDO $db, int $svjId, string $od, string $do): array
{
    // Nahlášené závady
    $stmt = $db->prepare(
        'SELECT z.id, z.nazev, z.stav, z.priorita, DATE(z.created_at) AS datum
         FROM zavady z
         WHERE z.svj_id = :sid AND DATE(z.created_at) BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    $stavLabel = ['nova' => 'Nová', 'v_reseni' => 'V řešení', 'vyreseno' => 'Vyřešeno', 'zamitnuto' => 'Zamítnuto'];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'zavady',
            'datum'  => $r['datum'],
            'nazev'  => 'Závada: ' . $r['nazev'],
            'detail' => $stavLabel[$r['stav']] ?? $r['stav'],
            'id'     => (int) $r['id'],
            'barva'  => 'orange',
        ];
    }

    // Vyřešené závady
    $stmt2 = $db->prepare(
        'SELECT z.id, z.nazev, DATE(z.uzavreno_at) AS datum
         FROM zavady z
         WHERE z.svj_id = :sid AND z.uzavreno_at IS NOT NULL AND DATE(z.uzavreno_at) BETWEEN :od AND :do'
    );
    $stmt2->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $out[] = [
            'typ'    => 'zavady_uzavreno',
            'datum'  => $r['datum'],
            'nazev'  => 'Vyřešeno: ' . $r['nazev'],
            'detail' => '',
            'id'     => (int) $r['id'],
            'barva'  => 'success',
        ];
    }

    return $out;
}

function fetchFondOprav(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT id, typ, kategorie, castka, datum FROM fond_oprav
         WHERE svj_id = :sid AND datum BETWEEN :od AND :do'
    );
    $stmt->execute([':sid' => $svjId, ':od' => $od, ':do' => $do]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $label = $r['typ'] === 'prijem' ? 'Příjem' : 'Výdaj';
        $out[] = [
            'typ'    => 'fond_oprav',
            'datum'  => $r['datum'],
            'nazev'  => $label . ': ' . ($r['kategorie'] ?? ''),
            'detail' => number_format((float)$r['castka'], 0, ',', ' ') . ' Kč',
            'id'     => (int) $r['id'],
            'barva'  => 'muted',
        ];
    }
    return $out;
}

function fetchVlastniUdalosti(PDO $db, int $svjId, string $od, string $do): array
{
    $stmt = $db->prepare(
        'SELECT ku.id, ku.nazev, ku.popis, ku.datum_od, ku.datum_do, ku.celodenny,
                ku.cas_od, ku.misto, ku.kategorie, u.jmeno, u.prijmeni
         FROM kalendar_udalosti ku
         JOIN users u ON u.id = ku.vytvoril_id
         WHERE ku.svj_id = :sid
           AND (ku.datum_od BETWEEN :od1 AND :do1
                OR ku.datum_do BETWEEN :od2 AND :do2
                OR (ku.datum_od <= :od3 AND COALESCE(ku.datum_do, ku.datum_od) >= :do3))'
    );
    $stmt->execute([
        ':sid' => $svjId,
        ':od1' => $od, ':do1' => $do,
        ':od2' => $od, ':do2' => $do,
        ':od3' => $od, ':do3' => $do,
    ]);
    $out = [];
    $katLabel = [
        'schuzka' => 'Schůzka', 'udrzba' => 'Údržba', 'kontrola' => 'Kontrola',
        'spolecenska' => 'Společenská', 'jine' => 'Jiné',
    ];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $detail = $katLabel[$r['kategorie']] ?? $r['kategorie'];
        if ($r['misto']) $detail .= ' · ' . $r['misto'];
        if (!$r['celodenny'] && $r['cas_od']) $detail .= ' · ' . substr($r['cas_od'], 0, 5);

        $start = max($od, $r['datum_od']);
        $end   = $r['datum_do'] ? min($do, $r['datum_do']) : $start;
        $cur = $start;
        while ($cur <= $end) {
            $out[] = [
                'typ'    => 'vlastni',
                'datum'  => $cur,
                'nazev'  => $r['nazev'],
                'detail' => $detail,
                'id'     => (int) $r['id'],
                'barva'  => 'purple',
                'autor'  => trim($r['jmeno'] . ' ' . $r['prijmeni']),
            ];
            $cur = date('Y-m-d', strtotime($cur . ' +1 day'));
        }
    }
    return $out;
}
