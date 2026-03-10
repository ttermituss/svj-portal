<?php
/**
 * ČÚZK API KN — Katastr nemovitostí
 * Akce: findBuilding, importUnits
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_helper.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/settings_crypto.php';

requireLogin();
requireRole(['admin', 'vybor']);

$action = $_GET['action'] ?? '';

match ($action) {
    'findBuilding' => handleFindBuilding(),
    'importUnits'  => handleImportUnits(),
    default        => jsonError('Neznámá akce', 400),
};

/* ===== FIND BUILDING ===== */

function handleFindBuilding(): void
{
    $user  = getSessionUser();
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $db  = getDb();
    $row = $db->query("SELECT kod_adresniho_mista, stavba_id FROM svj WHERE id = $svjId")->fetch();

    $kam     = $row['kod_adresniho_mista'] ?? null;
    $stavbaId = $row['stavba_id'] ?? null;

    // Pokud nemáme kód, zkusíme načíst z ARES
    if (!$kam) {
        require_once __DIR__ . '/svj_helper.php';
        $svjRow = $db->query("SELECT ico FROM svj WHERE id = $svjId")->fetch();
        if (!$svjRow) jsonError('SVJ nenalezeno', 404);
        // getOrFetchSvj updatuje DB včetně kodAdresnihoMista
        getOrFetchSvj($svjRow['ico']);
        $row = $db->query("SELECT kod_adresniho_mista, stavba_id FROM svj WHERE id = $svjId")->fetch();
        $kam  = $row['kod_adresniho_mista'] ?? null;
    }

    if (!$kam) {
        jsonError('Kód adresního místa (RÚIAN) není znám — ARES nemá tuto hodnotu pro vaše SVJ.', 422, 'NO_KAM');
    }

    $apiKey = getKnApiKey();
    $result = knGetStavbaByAdresniMisto($apiKey, (int)$kam);

    // Ulož stavba_id do DB pro příště
    if (!empty($result['stavba_id'])) {
        $db->prepare('UPDATE svj SET stavba_id = :sid WHERE id = :id')
           ->execute([':sid' => (int)$result['stavba_id'], ':id' => $svjId]);
    }

    jsonOk(['building' => $result, 'kod_adresniho_mista' => $kam]);
}

/* ===== IMPORT UNITS ===== */

function handleImportUnits(): void
{
    $user  = getSessionUser();
    $svjId = (int)$user['svj_id'];
    if (!$svjId) jsonError('SVJ není přiřazeno', 403);

    $input    = json_decode(file_get_contents('php://input'), true) ?? [];
    $stavbaId = isset($input['stavba_id']) ? (int)$input['stavba_id'] : 0;
    if (!$stavbaId) jsonError('Chybí stavba_id', 400);

    $apiKey   = getKnApiKey();
    $jednotky = knGetJednotkyByStavba($apiKey, $stavbaId);

    if (empty($jednotky)) {
        jsonOk(['imported' => 0, 'skipped' => 0]);
    }

    $db       = getDb();
    $imported = 0;
    $skipped  = 0;

    $stmt = $db->prepare(
        'INSERT INTO jednotky (svj_id, kn_id, cislo_jednotky, typ_jednotky, zpusob_vyuziti, podil_citatel, podil_jmenovatel, lv)
         VALUES (:svj_id, :kn_id, :cj, :typ, :zu, :pc, :pj, :lv)
         ON DUPLICATE KEY UPDATE
           kn_id=VALUES(kn_id), typ_jednotky=VALUES(typ_jednotky),
           zpusob_vyuziti=VALUES(zpusob_vyuziti),
           podil_citatel=VALUES(podil_citatel), podil_jmenovatel=VALUES(podil_jmenovatel),
           lv=VALUES(lv)'
    );

    foreach ($jednotky as $j) {
        try {
            $stmt->execute([
                ':svj_id' => $svjId,
                ':kn_id'  => $j['kn_id']  ?? null,
                ':cj'     => $j['cislo']   ?? '',
                ':typ'    => $j['typ']     ?? '',
                ':zu'     => $j['vyuziti'] ?? '',
                ':pc'     => $j['podil_citatel']    ?? null,
                ':pj'     => $j['podil_jmenovatel'] ?? null,
                ':lv'     => $j['lv']      ?? null,
            ]);
            $imported++;
        } catch (\PDOException $e) {
            $skipped++;
        }
    }

    jsonOk(['imported' => $imported, 'skipped' => $skipped, 'total' => count($jednotky)]);
}

/* ===== KN API HELPERS ===== */

function getKnApiKey(): string
{
    $db  = getDb();
    $row = $db->query("SELECT value FROM settings WHERE `key` = 'cuzk_api_klic' LIMIT 1")->fetch();
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
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'ApiKey: ' . $apiKey,
        ],
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

/**
 * Najde stavbu dle kódu adresního místa (RÚIAN).
 * Endpoint: GET /api/v1/Stavby/AdresniMisto/{kod}
 */
function knGetStavbaByAdresniMisto(string $apiKey, int $kam): array
{
    $data = knGet($apiKey, '/api/v1/Stavby/AdresniMisto/' . $kam);
    if ($data === null) jsonError('Stavba s kódem adresního místa ' . $kam . ' nebyla nalezena v KN.', 404, 'KN_NOT_FOUND');

    // API může vrátit pole nebo jeden objekt
    $stavba = isset($data[0]) ? $data[0] : $data;

    return [
        'stavba_id'       => $stavba['id']           ?? $stavba['stavbaId']       ?? null,
        'cislo_popisne'   => $stavba['cisloPopisne']  ?? null,
        'cislo_evidencni' => $stavba['cisloEvidencni'] ?? null,
        'obec'            => $stavba['obec']['nazev'] ?? $stavba['obec']           ?? null,
        'cast_obce'       => $stavba['castObce']['nazev'] ?? $stavba['castObce']   ?? null,
        'ulice'           => $stavba['ulice']['nazev'] ?? $stavba['ulice']         ?? null,
        'lv'              => $stavba['lv']             ?? null,
        'pocet_jednotek'  => $stavba['pocetJednotek'] ?? null,
        'raw'             => $stavba,
    ];
}

/**
 * Načte jednotky pro danou stavbu.
 * Endpoint: GET /api/v1/Stavby/{stavbaId}/Jednotky
 */
function knGetJednotkyByStavba(string $apiKey, int $stavbaId): array
{
    $data = knGet($apiKey, '/api/v1/Stavby/' . $stavbaId . '/Jednotky');
    if (!is_array($data)) return [];

    // Normalizuj — API může vracet přímo pole nebo { items: [...] }
    $items = isset($data['items']) ? $data['items'] : (isset($data[0]) ? $data : []);

    $result = [];
    foreach ($items as $j) {
        $podil = parsePodil($j['spoluvlastnickyPodil'] ?? $j['podil'] ?? null);
        $result[] = [
            'kn_id'              => $j['id']              ?? $j['jednotkaId']    ?? null,
            'cislo'              => $j['cisloJednotky']   ?? $j['cislo']         ?? '',
            'typ'                => $j['typJednotky']['nazev']   ?? $j['typJednotky']   ?? $j['typ']    ?? '',
            'vyuziti'            => $j['zpusobVyuziti']['nazev'] ?? $j['zpusobVyuziti'] ?? $j['vyuziti'] ?? '',
            'podil_citatel'      => $podil[0],
            'podil_jmenovatel'   => $podil[1],
            'lv'                 => $j['lv']              ?? null,
        ];
    }
    return $result;
}

function parsePodil(mixed $raw): array
{
    if ($raw === null) return [null, null];
    if (is_array($raw)) {
        return [
            isset($raw['citatel'])    ? (int)$raw['citatel']    : null,
            isset($raw['jmenovatel']) ? (int)$raw['jmenovatel'] : null,
        ];
    }
    if (is_string($raw) && str_contains($raw, '/')) {
        [$c, $j] = explode('/', $raw, 2);
        return [(int)$c ?: null, (int)$j ?: null];
    }
    return [null, null];
}
