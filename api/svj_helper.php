<?php
/**
 * Sdílené funkce pro práci s SVJ a ARES API.
 * Includováno z svj.php i auth.php.
 */

/**
 * Načte SVJ z DB (cache) nebo ARES. Vrátí DB řádek nebo null.
 * Při chybě ARES a prázdné cache zavolá jsonError.
 */
function getOrFetchSvj(string $ico): array
{
    $ico = str_pad(preg_replace('/\D/', '', $ico), 8, '0', STR_PAD_LEFT);

    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM svj WHERE ico = :ico');
    $stmt->execute([':ico' => $ico]);
    $cached = $stmt->fetch();

    $stale = !$cached || (
        isset($cached['updated_at']) &&
        strtotime($cached['updated_at']) < time() - 86400
    );

    if ($stale) {
        $aresData = fetchFromAres($ico);
        if ($aresData === null) {
            if ($cached) return $cached;
            jsonError('Chyba spojení s ARES', 502, 'ARES_ERROR');
        }
        upsertSvj($db, $aresData);
        $stmt = $db->prepare('SELECT * FROM svj WHERE ico = :ico');
        $stmt->execute([':ico' => $ico]);
        $cached = $stmt->fetch();
    }

    return $cached;
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
    if ($httpCode === 404) jsonError('Subjekt s IČO ' . $ico . ' nebyl nalezen v ARES', 404, 'NOT_FOUND');
    if ($httpCode !== 200) return null;

    $data = json_decode($response, true);
    if (!is_array($data) || !isset($data['ico'])) return null;

    return $data;
}

function upsertSvj(\PDO $db, array $data): void
{
    $stmt = $db->prepare(
        'INSERT INTO svj (ico, nazev, ulice, cislo_domovni, cislo_orientacni, obec, psc, pravni_forma, datum_vzniku, datum_zaniku, kod_adresniho_mista)
         VALUES (:ico, :nazev, :ulice, :cd, :co, :obec, :psc, :pf, :dv, :dz, :kam)
         ON DUPLICATE KEY UPDATE
           nazev=VALUES(nazev), ulice=VALUES(ulice), cislo_domovni=VALUES(cislo_domovni),
           cislo_orientacni=VALUES(cislo_orientacni), obec=VALUES(obec), psc=VALUES(psc),
           pravni_forma=VALUES(pravni_forma), datum_vzniku=VALUES(datum_vzniku),
           datum_zaniku=VALUES(datum_zaniku),
           kod_adresniho_mista=COALESCE(VALUES(kod_adresniho_mista), kod_adresniho_mista)'
    );
    $stmt->execute([
        ':ico'   => $data['ico'],
        ':nazev' => $data['obchodniJmeno']                  ?? '',
        ':ulice' => $data['sidlo']['nazevUlice']            ?? '',
        ':cd'    => (string)($data['sidlo']['cisloDomovni']    ?? ''),
        ':co'    => (string)($data['sidlo']['cisloOrientacni'] ?? ''),
        ':obec'  => $data['sidlo']['nazevObce']             ?? '',
        ':psc'   => (string)($data['sidlo']['psc']          ?? ''),
        ':pf'    => $data['pravniForma']['nazev']           ?? '',
        ':dv'    => $data['datumVzniku']                    ?? null,
        ':dz'    => $data['datumZaniku']                    ?? null,
        ':kam'   => isset($data['sidlo']['kodAdresnihoMista'])
                        ? (int)$data['sidlo']['kodAdresnihoMista']
                        : null,
    ]);
}

function buildSvjResponse(array $row): array
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

/**
 * Načte statutární orgán SVJ z ARES výpisu z veřejného rejstříku.
 * Vrátí pole s klíčem 'clenove' nebo null při chybě.
 */
function fetchOrManagement(string $ico): ?array
{
    $url = ARES_BASE_URL . '/ekonomicke-subjekty-vr/' . urlencode($ico);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr || $httpCode === 0 || $httpCode !== 200) return null;

    $data = json_decode($response, true);
    if (!is_array($data)) return null;

    return parseOrManagement($data);
}

function parseOrManagement(array $data): array
{
    $result = [
        'ico'           => $data['ico']           ?? '',
        'obchodniJmeno' => $data['obchodniJmeno'] ?? '',
        'datumVzniku'   => $data['datumVzniku']   ?? null,
        'clenove'       => [],
    ];

    // ARES VR může mít různou strukturu — zkoušíme všechny známé cesty
    $zaznamy = $data['zaznamyVr'] ?? $data['zaznamy'] ?? $data['platneZaznamy'] ?? [];

    foreach ($zaznamy as $zaznam) {
        // Různé cesty ke statutárnímu orgánu
        $organyPaths = [
            $zaznam['statutarniOrgany']                    ?? [],
            $zaznam['dalsiUdaje']['statutarniOrgany']      ?? [],
            $zaznam['organ']['statutarniOrgany']           ?? [],
        ];

        foreach ($organyPaths as $organy) {
            if (!is_array($organy)) continue;
            foreach ($organy as $organ) {
                $nazevOrganu = $organ['nazevOrganu'] ?? $organ['nazev'] ?? 'Výbor';
                $clenove     = $organ['clenoveSo']  ?? $organ['clenove'] ?? [];

                foreach ($clenove as $clen) {
                    $jmeno    = $clen['jmeno']    ?? '';
                    $prijmeni = $clen['prijmeni'] ?? '';
                    if (!$jmeno && !$prijmeni) continue;

                    $result['clenove'][] = [
                        'jmeno'          => $jmeno,
                        'prijmeni'       => $prijmeni,
                        'funkce'         => $clen['funkce'] ?? $clen['nazevFunkce'] ?? $nazevOrganu,
                        'datum_narozeni' => isset($clen['datumNarozeni'])
                            ? substr($clen['datumNarozeni'], 0, 10)
                            : null,
                    ];
                }
            }
        }
    }

    // Deduplikace
    $seen = [];
    $result['clenove'] = array_values(array_filter($result['clenove'], function($c) use (&$seen) {
        $key = $c['jmeno'] . '|' . $c['prijmeni'];
        if (isset($seen[$key])) return false;
        $seen[$key] = true;
        return true;
    }));

    return $result;
}
