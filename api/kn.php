<?php
/**
 * ČÚZK API KN — Katastr nemovitostí
 * Akce: status, findBuilding, importUnits
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/settings_crypto.php';
require_once __DIR__ . '/svj_helper.php';

requireRole('admin', 'vybor');

$action = $_GET['action'] ?? '';

match ($action) {
    'status'       => handleStatus(),
    'findBuilding' => handleFindBuilding(),
    'importUnits'  => handleImportUnits(),
    default        => jsonError('Neznámá akce', 400),
};

/* ===== STATUS ===== */

function handleStatus(): void
{
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonOk(['jednotky' => 0, 'parcely' => 0, 'plomby' => 0, 'stavba_id' => null, 'last_updated' => null]);

    $db = getDb();

    $svjRow = $db->prepare('SELECT stavba_id, lat, lon, adresa_plna,
                                   rok_dokonceni, konstrukce_nazev, pocet_podlazi,
                                   pocet_bytu_ruian, zastavena_plocha, vytah, zpusob_vytapeni
                            FROM svj WHERE id = :id');
    $svjRow->execute([':id' => $svjId]);
    $svj = $svjRow->fetch();

    $jStat = $db->prepare(
        'SELECT COUNT(*) AS cnt, SUM(plomba_aktivni) AS plomby, MAX(updated_at) AS last_updated
         FROM jednotky WHERE svj_id = :id'
    );
    $jStat->execute([':id' => $svjId]);
    $jRow = $jStat->fetch();

    $pStat = $db->prepare('SELECT COUNT(*) AS cnt FROM parcely WHERE svj_id = :id');
    $pStat->execute([':id' => $svjId]);
    $pRow = $pStat->fetch();

    jsonOk([
        'jednotky'          => (int)$jRow['cnt'],
        'parcely'           => (int)$pRow['cnt'],
        'plomby'            => (int)$jRow['plomby'],
        'last_updated'      => $jRow['last_updated'],
        'stavba_id'         => $svj['stavba_id']        ?? null,
        'lat'               => $svj['lat']              ?? null,
        'lon'               => $svj['lon']              ?? null,
        'adresa_plna'       => $svj['adresa_plna']      ?? null,
        'rok_dokonceni'     => $svj['rok_dokonceni']    ?? null,
        'konstrukce_nazev'  => $svj['konstrukce_nazev'] ?? null,
        'pocet_podlazi'     => $svj['pocet_podlazi']    ?? null,
        'pocet_bytu_ruian'  => $svj['pocet_bytu_ruian'] ?? null,
        'zastavena_plocha'  => $svj['zastavena_plocha'] ?? null,
        'vytah'             => isset($svj['vytah']) ? (bool)$svj['vytah'] : null,
        'zpusob_vytapeni'   => $svj['zpusob_vytapeni']  ?? null,
    ]);
}

/* ===== FIND BUILDING ===== */

function handleFindBuilding(): void
{
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $db  = getDb();
    $row = $db->prepare('SELECT kod_adresniho_mista, stavba_id FROM svj WHERE id = :id');
    $row->execute([':id' => $svjId]);
    $row = $row->fetch();

    $kam = $row['kod_adresniho_mista'] ?? null;

    if (!$kam) {
        $svjStmt = $db->prepare('SELECT ico FROM svj WHERE id = :id');
        $svjStmt->execute([':id' => $svjId]);
        $svjRow = $svjStmt->fetch();
        if (!$svjRow) jsonError('SVJ nenalezeno', 404);
        getOrFetchSvj($svjRow['ico']);
        $refetch = $db->prepare('SELECT kod_adresniho_mista FROM svj WHERE id = :id');
        $refetch->execute([':id' => $svjId]);
        $kam = $refetch->fetch()['kod_adresniho_mista'] ?? null;

        if (!$kam) {
            $kam = fetchKamFromVr($svjRow['ico']);
            if ($kam) {
                $db->prepare('UPDATE svj SET kod_adresniho_mista = :kam WHERE id = :id')
                   ->execute([':kam' => $kam, ':id' => $svjId]);
            }
        }
    }

    if (!$kam) {
        jsonError('Kód adresního místa (RÚIAN) není znám. Zadejte ho ručně v nastavení SVJ.', 422, 'NO_KAM');
    }

    $apiKey  = getKnApiKey();
    $building = knGetStavbaByAdresniMisto($apiKey, (int)$kam);

    // Ulož stavba_id
    if (!empty($building['stavba_id'])) {
        $db->prepare('UPDATE svj SET stavba_id = :sid WHERE id = :id')
           ->execute([':sid' => (int)$building['stavba_id'], ':id' => $svjId]);
    }

    // 1. RÚIAN — GPS + plná adresa (zdarma)
    $ruian = fetchRuianData((int)$kam);
    if ($ruian) {
        $db->prepare(
            'UPDATE svj SET lat = :lat, lon = :lon, adresa_plna = :adr WHERE id = :id'
        )->execute([
            ':lat' => $ruian['lat'],
            ':lon' => $ruian['lon'],
            ':adr' => $ruian['adresa_plna'],
            ':id'  => $svjId,
        ]);
    }

    // 2. RÚIAN — technické info o budově (stavební objekt)
    $buildingInfo = null;
    if (!empty($building['stavba_id'])) {
        $buildingInfo = fetchRuianBuildingInfo((int)$building['stavba_id']);
        if ($buildingInfo) {
            $db->prepare(
                'UPDATE svj SET rok_dokonceni = :rok, konstrukce_kod = :kkod, konstrukce_nazev = :knaz,
                                pocet_podlazi = :pp, pocet_bytu_ruian = :pb, zastavena_plocha = :zp,
                                vytah = :vytah, zpusob_vytapeni = :zvyt WHERE id = :id'
            )->execute([
                ':rok'  => $buildingInfo['rok_dokonceni'],
                ':kkod' => $buildingInfo['konstrukce_kod'],
                ':knaz' => $buildingInfo['konstrukce_nazev'],
                ':pp'   => $buildingInfo['pocet_podlazi'],
                ':pb'   => $buildingInfo['pocet_bytu_ruian'],
                ':zp'   => $buildingInfo['zastavena_plocha'],
                ':vytah'=> $buildingInfo['vytah'],
                ':zvyt' => $buildingInfo['zpusob_vytapeni'],
                ':id'   => $svjId,
            ]);
        }
    }

    // 3. Parcely — z raw stavby, fetch detail každé
    $parcely = [];
    $parcelaIds = [];
    foreach ($building['raw']['parcely'] ?? [] as $p) {
        if (!empty($p['id'])) $parcelaIds[] = (int)$p['id'];
    }
    if ($parcelaIds) {
        $parcely = knImportParcely($apiKey, $db, $svjId, $parcelaIds);
    }

    jsonOk([
        'building'     => $building,
        'ruian'        => $ruian,
        'building_info'=> $buildingInfo,
        'parcely'      => $parcely,
        'kod_adresniho_mista' => $kam,
    ]);
}

/* ===== IMPORT UNITS ===== */

function handleImportUnits(): void
{
    $user  = requireRole('admin', 'vybor');
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $input       = json_decode(file_get_contents('php://input'), true) ?? [];
    $jednotkaIds = $input['jednotka_ids'] ?? [];

    if (empty($jednotkaIds) || !is_array($jednotkaIds)) {
        jsonError('Chybí seznam ID jednotek', 400);
    }

    $apiKey   = getKnApiKey();
    $db       = getDb();
    $imported = 0;
    $skipped  = 0;
    $plomby   = 0;

    $stmt = $db->prepare(
        'INSERT INTO jednotky
           (svj_id, kn_id, cislo_jednotky, typ_jednotky, typ_jednotky_kod,
            zpusob_vyuziti, zpusob_vyuziti_kod, podil_citatel, podil_jmenovatel,
            lv, lv_id, katastralni_uzemi, plomba_aktivni)
         VALUES
           (:svj_id, :kn_id, :cj, :typ, :typ_kod,
            :zu, :zu_kod, :pc, :pj,
            :lv, :lv_id, :ku, :plomba)
         ON DUPLICATE KEY UPDATE
           kn_id=VALUES(kn_id),
           typ_jednotky=VALUES(typ_jednotky), typ_jednotky_kod=VALUES(typ_jednotky_kod),
           zpusob_vyuziti=VALUES(zpusob_vyuziti), zpusob_vyuziti_kod=VALUES(zpusob_vyuziti_kod),
           podil_citatel=VALUES(podil_citatel), podil_jmenovatel=VALUES(podil_jmenovatel),
           lv=VALUES(lv), lv_id=VALUES(lv_id), katastralni_uzemi=VALUES(katastralni_uzemi),
           plomba_aktivni=VALUES(plomba_aktivni)'
    );

    foreach ($jednotkaIds as $kId) {
        $kId = (int)$kId;
        if (!$kId) { $skipped++; continue; }

        $resp = knGet($apiKey, '/api/v1/Jednotky/' . $kId);
        if (!$resp || !isset($resp['data'])) { $skipped++; continue; }

        $d = $resp['data'];

        $cisloRaw = (string)($d['cisloJednotky'] ?? $kId);
        $cislo    = strlen($cisloRaw) > 4 ? (string)(int)substr($cisloRaw, -4) : $cisloRaw;

        $podil  = $d['podilNaSpolecnychCastechDomu'] ?? null;
        $lv     = $d['lv']                           ?? null;
        $ku     = $lv['katastralniUzemi']['nazev']    ?? $d['vymezenaVeStavbe']['castObce']['nazev'] ?? '';
        $plomba = !empty($d['rizeniPlomby']) ? 1 : 0;
        if ($plomba) $plomby++;

        try {
            $stmt->execute([
                ':svj_id'  => $svjId,
                ':kn_id'   => $d['id']                          ?? $kId,
                ':cj'      => $cislo,
                ':typ'     => $d['typJednotky']['nazev']         ?? '',
                ':typ_kod' => $d['typJednotky']['kod']           ?? null,
                ':zu'      => $d['zpusobVyuziti']['nazev']       ?? '',
                ':zu_kod'  => $d['zpusobVyuziti']['kod']         ?? null,
                ':pc'      => is_array($podil) ? ($podil['citatel']    ?? null) : null,
                ':pj'      => is_array($podil) ? ($podil['jmenovatel'] ?? null) : null,
                ':lv'      => is_array($lv)    ? ($lv['cislo']         ?? null) : null,
                ':lv_id'   => is_array($lv)    ? ($lv['id']            ?? null) : null,
                ':ku'      => $ku,
                ':plomba'  => $plomba,
            ]);
            $imported++;
        } catch (\PDOException $e) {
            $skipped++;
        }
    }

    jsonOk([
        'imported' => $imported,
        'skipped'  => $skipped,
        'total'    => count($jednotkaIds),
        'plomby'   => $plomby,
    ]);
}

/* ===== PARCELY HELPER ===== */

/**
 * Fetchuje detail parcel z KN API, ukládá do DB, vrací seznam pro frontend.
 */
function knImportParcely(string $apiKey, \PDO $db, int $svjId, array $parcelaIds): array
{
    $stmt = $db->prepare(
        'INSERT INTO parcely (svj_id, kn_id, cislo_parcely, vymera, druh_pozemku, zpusob_vyuziti, katastralni_uzemi)
         VALUES (:svj_id, :kn_id, :cislo, :vymera, :druh, :zu, :ku)
         ON DUPLICATE KEY UPDATE
           cislo_parcely=VALUES(cislo_parcely), vymera=VALUES(vymera),
           druh_pozemku=VALUES(druh_pozemku), zpusob_vyuziti=VALUES(zpusob_vyuziti),
           katastralni_uzemi=VALUES(katastralni_uzemi)'
    );

    $result = [];
    foreach ($parcelaIds as $pId) {
        $resp = knGet($apiKey, '/api/v1/Parcely/' . $pId);
        if (!$resp || !isset($resp['data'])) continue;

        $p = $resp['data'];

        $kmenove = $p['kmenoveCisloParcely']   ?? '';
        $podil   = $p['poddeleniCislaParcely'] ?? null;
        $cislo   = $podil ? $kmenove . '/' . $podil : (string)$kmenove;
        $ku      = $p['katastralniUzemi']['nazev'] ?? '';

        try {
            $stmt->execute([
                ':svj_id' => $svjId,
                ':kn_id'  => $p['id'],
                ':cislo'  => $cislo,
                ':vymera' => $p['vymera'] ?? null,
                ':druh'   => $p['druhPozemku']['nazev']     ?? '',
                ':zu'     => $p['zpusobVyuziti']['nazev']   ?? '',
                ':ku'     => $ku,
            ]);
        } catch (\PDOException $e) { /* skip duplicate */ }

        $result[] = [
            'cislo'  => $cislo,
            'vymera' => $p['vymera'] ?? null,
            'druh'   => $p['druhPozemku']['nazev']   ?? '',
            'ku'     => $ku,
        ];
    }
    return $result;
}

/* ===== KN API ===== */

function getKnApiKey(): string
{
    $db  = getDb();
    $stmt = $db->prepare("SELECT value FROM settings WHERE `key` = :k LIMIT 1");
    $stmt->execute([':k' => 'cuzk_api_klic']);
    $row = $stmt->fetch();
    $key = trim(decryptSetting($row['value'] ?? ''));
    if (!$key) jsonError('API klíč ČÚZK není nastaven v systémových nastaveních.', 503, 'NO_API_KEY');
    return $key;
}

function knGet(string $apiKey, string $path): ?array
{
    $url = 'https://api-kn.cuzk.gov.cz' . $path;
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'ApiKey: ' . $apiKey],
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr || $httpCode === 0) jsonError('Chyba spojení s KN API: ' . $curlErr, 502);
    if ($httpCode === 401 || $httpCode === 403) jsonError('Neplatný API klíč ČÚZK.', 401, 'KN_AUTH');
    if ($httpCode === 404) return null;
    if ($httpCode !== 200) jsonError('KN API vrátilo HTTP ' . $httpCode, 502);

    $data = json_decode($response, true);
    return is_array($data) ? $data : null;
}

function knGetStavbaByAdresniMisto(string $apiKey, int $kam): array
{
    $resp = knGet($apiKey, '/api/v1/Stavby/AdresniMisto/' . $kam);
    if ($resp === null) jsonError('Stavba nebyla nalezena v KN (kód adresního místa: ' . $kam . ').', 404, 'KN_NOT_FOUND');

    $stavba = $resp['data'] ?? (isset($resp[0]) ? $resp[0] : $resp);
    $lv     = $stavba['lv'] ?? null;
    $pocet  = isset($stavba['jednotky']) ? count($stavba['jednotky']) : ($stavba['pocetJednotek'] ?? null);

    return [
        'stavba_id'       => $stavba['id']                               ?? null,
        'cislo_popisne'   => $stavba['cislaDomovni'][0]                  ?? $stavba['cisloPopisne'] ?? null,
        'cislo_evidencni' => $stavba['cisloEvidencni']                   ?? null,
        'obec'            => $stavba['obec']['nazev']                    ?? null,
        'cast_obce'       => $stavba['castObce']['nazev']                ?? null,
        'ulice'           => $stavba['ulice']['nazev']                   ?? $stavba['ulice'] ?? null,
        'lv'              => is_array($lv) ? ($lv['cislo'] ?? null)      : $lv,
        'pocet_jednotek'  => $pocet,
        'plomby_stavba'   => count($stavba['rizeniPlomby'] ?? []),
        'raw'             => $stavba,
    ];
}
