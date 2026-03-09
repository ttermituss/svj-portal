<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ratelimit.php'; // pro checkRateLimit / recordRateLimit

$action = getParam('action', '');

switch ($action) {
    case 'lookup': handleLookup(); break;
    case 'link':   handleLink();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleLookup(): void
{
    requireMethod('GET');

    // Rate limiting: 20 ARES lookupů / 5 min z jedné IP
    checkRateLimit('rl_ares_', 20, 'Příliš mnoho vyhledávání. Zkuste to za 5 minut.');

    $ico = str_replace(' ', '', getParam('ico', '') ?? '');
    $ico = str_pad(preg_replace('/\D/', '', $ico), 8, '0', STR_PAD_LEFT);

    if (!preg_match('/^\d{8}$/', $ico)) {
        jsonError('IČO musí být 8 číslic', 400, 'INVALID_ICO');
    }

    // Cache z DB (ARES data se mění zřídka)
    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM svj WHERE ico = :ico');
    $stmt->execute([':ico' => $ico]);
    $cached = $stmt->fetch();

    $needsFetch = !$cached || (
        isset($cached['updated_at']) &&
        strtotime($cached['updated_at']) < time() - 86400
    );

    if ($needsFetch) {
        $aresData = fetchFromAres($ico);
        if ($aresData === null) {
            if ($cached) jsonResponse(buildResponseFromDb($cached));
            jsonError('Chyba spojení s ARES', 502, 'ARES_ERROR');
        }
        upsertSvj($db, $aresData);

        $stmt = $db->prepare('SELECT * FROM svj WHERE ico = :ico');
        $stmt->execute([':ico' => $ico]);
        $cached = $stmt->fetch();
    }

    jsonResponse(buildResponseFromDb($cached));
}

function fetchFromAres(string $ico): ?array
{
    $url = ARES_BASE_URL . '/ekonomicke-subjekty/' . urlencode($ico);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr || $httpCode === 0) return null;
    if ($httpCode === 404) jsonError('Subjekt s ICO ' . $ico . ' nebyl nalezen', 404, 'NOT_FOUND');
    if ($httpCode !== 200) jsonError('ARES vratil chybu ' . $httpCode, 502, 'ARES_ERROR');

    $data = json_decode($response, true);
    if (!is_array($data) || !isset($data['ico'])) {
        jsonError('Neplatna odpoved z ARES', 502, 'ARES_INVALID');
    }

    return $data;
}

function upsertSvj(\PDO $db, array $data): void
{
    $stmt = $db->prepare(
        'INSERT INTO svj (ico, nazev, ulice, cislo_domovni, cislo_orientacni, obec, psc, pravni_forma, datum_vzniku, datum_zaniku)
         VALUES (:ico, :nazev, :ulice, :cd, :co, :obec, :psc, :pf, :dv, :dz)
         ON DUPLICATE KEY UPDATE
           nazev=VALUES(nazev), ulice=VALUES(ulice), cislo_domovni=VALUES(cislo_domovni),
           cislo_orientacni=VALUES(cislo_orientacni), obec=VALUES(obec), psc=VALUES(psc),
           pravni_forma=VALUES(pravni_forma), datum_vzniku=VALUES(datum_vzniku), datum_zaniku=VALUES(datum_zaniku)'
    );
    $stmt->execute([
        ':ico'   => $data['ico'],
        ':nazev' => $data['obchodniJmeno']              ?? '',
        ':ulice' => $data['sidlo']['nazevUlice']        ?? '',
        ':cd'    => (string)($data['sidlo']['cisloDomovni']    ?? ''),
        ':co'    => (string)($data['sidlo']['cisloOrientacni'] ?? ''),
        ':obec'  => $data['sidlo']['nazevObce']         ?? '',
        ':psc'   => (string)($data['sidlo']['psc']      ?? ''),
        ':pf'    => $data['pravniForma']['nazev']       ?? '',
        ':dv'    => $data['datumVzniku']                ?? null,
        ':dz'    => $data['datumZaniku']                ?? null,
    ]);
}

function buildResponseFromDb(array $row): array
{
    return [
        'svj_id'        => (int)$row['id'],
        'ico'           => $row['ico'],
        'obchodniJmeno' => $row['nazev'],
        'sidlo'         => [
            'nazevUlice'      => $row['ulice'],
            'cisloDomovni'    => $row['cislo_domovni'],
            'cisloOrientacni' => $row['cislo_orientacni'],
            'nazevObce'       => $row['obec'],
            'psc'             => $row['psc'],
        ],
        'pravniForma'   => ['nazev' => $row['pravni_forma']],
        'datumVzniku'   => $row['datum_vzniku'],
        'datumZaniku'   => $row['datum_zaniku'],
    ];
}

function handleLink(): void
{
    requireMethod('POST');
    $user  = requireAuth();
    $body  = getJsonBody();
    $svjId = (int)($body['svj_id'] ?? 0);

    if (!$svjId) jsonError('Chybi svj_id', 400, 'MISSING_SVJ_ID');

    $db   = getDb();
    $stmt = $db->prepare('SELECT id FROM svj WHERE id = :id');
    $stmt->execute([':id' => $svjId]);
    if (!$stmt->fetch()) jsonError('SVJ nenalezeno', 404, 'SVJ_NOT_FOUND');

    $db->prepare('UPDATE users SET svj_id = :svj WHERE id = :uid')
       ->execute([':svj' => $svjId, ':uid' => $user['id']]);

    jsonResponse(['ok' => true, 'svj_id' => $svjId]);
}
