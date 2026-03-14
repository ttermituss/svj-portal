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

        // Pokud ARES základní endpoint nevrátil kodAdresnihoMista, zkusíme VR endpoint
        if (empty($aresData['sidlo']['kodAdresnihoMista'])) {
            $kamFromVr = fetchKamFromVr($ico);
            if ($kamFromVr) {
                $db->prepare('UPDATE svj SET kod_adresniho_mista = :kam WHERE ico = :ico AND kod_adresniho_mista IS NULL')
                   ->execute([':kam' => $kamFromVr, ':ico' => $ico]);
            }
        }

        $stmt = $db->prepare('SELECT * FROM svj WHERE ico = :ico');
        $stmt->execute([':ico' => $ico]);
        $cached = $stmt->fetch();
    }

    return $cached;
}

/**
 * Sdílený HTTP GET helper — timeout 5s, SSL verify, jednotné logování chyb.
 * Vrátí [body, httpCode] nebo null při curl chybě / síťovém selhání.
 */
function curlGet(string $url, array $headers = []): ?array
{
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ];
    if ($headers) $opts[CURLOPT_HTTPHEADER] = $headers;

    $ch = curl_init($url);
    curl_setopt_array($ch, $opts);
    $body     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($err || $httpCode === 0) {
        error_log('curlGet failed: ' . $url . ' — ' . $err);
        return null;
    }

    return [$body, $httpCode];
}

function fetchFromAres(string $ico): ?array
{
    $url    = ARES_BASE_URL . '/ekonomicke-subjekty/' . urlencode($ico);
    $result = curlGet($url, ['Accept: application/json']);
    if ($result === null) return null;

    [$body, $httpCode] = $result;
    if ($httpCode === 404) jsonError('Subjekt s IČO ' . $ico . ' nebyl nalezen v ARES', 404, 'NOT_FOUND');
    if ($httpCode !== 200) return null;

    $data = json_decode($body, true);
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
/**
 * Načte GPS souřadnice a plnou adresu z RÚIAN ArcGIS (zdarma, bez auth).
 * Vstup: kodAdresnihoMista (RÚIAN kód adresního místa).
 * Vrátí: ['lat', 'lon', 'adresa_plna', 'ulice'] nebo null při chybě.
 */
function fetchRuianData(int $kam): ?array
{
    $url    = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/1/query'
            . '?where=' . urlencode('KOD=' . $kam)
            . '&outFields=*&outSR=4326&f=json';
    $result = curlGet($url);
    if ($result === null) return null;

    [$response] = $result;
    if (!$response) return null;

    $data     = json_decode($response, true);
    $features = $data['features'] ?? [];
    if (empty($features)) return null;

    $feature = $features[0];
    $geo     = $feature['geometry']   ?? [];
    $attrs   = $feature['attributes'] ?? [];

    $lon = isset($geo['x']) ? round((float)$geo['x'], 7) : null;
    $lat = isset($geo['y']) ? round((float)$geo['y'], 7) : null;

    return [
        'lat'         => $lat,
        'lon'         => $lon,
        'adresa_plna' => $attrs['adresa'] ?? null,
    ];
}

/**
 * Načte technické info o budově z RÚIAN (layer 3 — StavebniObjekt).
 * Vstup: stavba_id z ČÚZK KN (= isknbudovaid v RÚIAN).
 * Vrátí pole s technickými daty nebo null při chybě/nenalezení.
 */
function fetchRuianBuildingInfo(int $stavbaId): ?array
{
    $fields = 'dokonceni,druhkonstrukcekod,pocetpodlazi,pocetbytu,zastavenaplocha,vybavenivytahemkod,zpusobvytapenikod';
    $url    = 'https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/3/query'
            . '?where=' . urlencode('isknbudovaid=' . $stavbaId)
            . '&outFields=' . $fields . '&f=json';
    $result = curlGet($url);
    if ($result === null) return null;

    [$response] = $result;
    if (!$response) return null;

    $data     = json_decode($response, true);
    $features = $data['features'] ?? [];
    if (empty($features)) return null;

    $a = $features[0]['attributes'] ?? [];

    // Rok dokončení — RÚIAN vrací Unix timestamp v ms
    $rok = null;
    if (!empty($a['dokonceni'])) {
        $rok = (int)date('Y', (int)($a['dokonceni'] / 1000));
    }

    return [
        'rok_dokonceni'    => $rok,
        'konstrukce_kod'   => isset($a['druhkonstrukcekod'])  ? (int)$a['druhkonstrukcekod']  : null,
        'konstrukce_nazev' => ruianKonstrukceNazev($a['druhkonstrukcekod'] ?? null),
        'pocet_podlazi'    => isset($a['pocetpodlazi'])       ? (int)$a['pocetpodlazi']       : null,
        'pocet_bytu_ruian' => isset($a['pocetbytu'])          ? (int)$a['pocetbytu']          : null,
        'zastavena_plocha' => isset($a['zastavenaplocha'])    ? (int)$a['zastavenaplocha']    : null,
        'vytah'            => isset($a['vybavenivytahemkod']) ? ($a['vybavenivytahemkod'] == 1 ? 1 : 0) : null,
        'zpusob_vytapeni'  => ruianVytapeniNazev($a['zpusobvytapenikod'] ?? null),
    ];
}

function ruianKonstrukceNazev(?int $kod): ?string
{
    return match ($kod) {
        1 => 'Zděná',
        2 => 'Monolitická betonová / ŽB',
        3 => 'Montovaná betonová (panel)',
        4 => 'Kovová / skelet',
        5 => 'Dřevěná (hrázděná)',
        6 => 'Smíšená',
        7 => 'Jiná',
        default => null,
    };
}

function ruianVytapeniNazev(?int $kod): ?string
{
    return match ($kod) {
        1 => 'Centrální zdroj v domě',
        2 => 'Dálkové vytápění (CZT)',
        3 => 'Etážové',
        4 => 'Lokální — tuhá paliva',
        5 => 'Lokální — plyn',
        6 => 'Lokální — elektřina',
        7 => 'Jiné',
        default => null,
    };
}

function fetchVrRaw(string $ico): ?array
{
    $url    = ARES_BASE_URL . '/ekonomicke-subjekty-vr/' . urlencode($ico);
    $result = curlGet($url, ['Accept: application/json']);
    if ($result === null) return null;

    [$body, $httpCode] = $result;
    if ($httpCode !== 200) return null;

    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

/**
 * Extrahuje kodAdresnihoMista z VR záznamu (záloha pokud základní ARES ho nevrátí).
 */
function fetchKamFromVr(string $ico): ?int
{
    $data = fetchVrRaw($ico);
    if (!$data) return null;

    foreach ($data['zaznamy'] ?? [] as $zaznam) {
        foreach ($zaznam['adresy'] ?? [] as $adresaItem) {
            $kam = $adresaItem['adresa']['kodAdresnihoMista'] ?? null;
            if ($kam) return (int)$kam;
        }
    }
    return null;
}

function fetchOrManagement(string $ico): ?array
{
    $data = fetchVrRaw($ico);
    if (!$data) return null;
    return parseOrManagement($data);
}

function parseOrManagement(array $data): array
{
    // Top-level identifikátory (reálná ARES VR struktura: { icoId, zaznamy: [...] })
    $ico  = $data['ico'] ?? $data['icoId'] ?? '';
    $name = '';
    $vzniku = null;

    $result = [
        'ico'           => $ico,
        'obchodniJmeno' => $name,
        'datumVzniku'   => $vzniku,
        'clenove'       => [],
    ];

    // ARES VR vrací zaznamy (ověřeno 2026-03-10)
    $zaznamy = $data['zaznamy'] ?? $data['zaznamyVr'] ?? $data['platneZaznamy'] ?? [];

    foreach ($zaznamy as $zaznam) {
        // Doplníme název a datum z prvního záznamu
        if (!$result['obchodniJmeno']) {
            $ojItems = $zaznam['obchodniJmeno'] ?? [];
            if (is_array($ojItems) && isset($ojItems[0]['hodnota'])) {
                $result['obchodniJmeno'] = $ojItems[0]['hodnota'];
            } elseif (is_string($ojItems)) {
                $result['obchodniJmeno'] = $ojItems;
            }
        }
        if (!$result['datumVzniku']) {
            $result['datumVzniku'] = $zaznam['datumZapisu'] ?? null;
        }

        // Statutární orgány — v ARES VR jsou přímo v záznamu jako pole objektů
        $organy = $zaznam['statutarniOrgany'] ?? [];
        if (!is_array($organy)) continue;

        foreach ($organy as $organ) {
            $nazevOrganu = $organ['nazevOrganu'] ?? $organ['nazev'] ?? 'Výbor';

            // Reálná ARES VR struktura: clenoveOrganu[].fyzickaOsoba
            $clenove = $organ['clenoveOrganu'] ?? $organ['clenoveSo'] ?? $organ['clenove'] ?? [];

            foreach ($clenove as $clen) {
                // fyzickaOsoba obsahuje jméno a příjmení
                $fo       = $clen['fyzickaOsoba'] ?? $clen;
                $jmeno    = $fo['jmeno']    ?? '';
                $prijmeni = $fo['prijmeni'] ?? '';
                if (!$jmeno && !$prijmeni) continue;

                // Funkce: clenstvi.funkce.nazev nebo nazevAngazma nebo název orgánu
                $funkce = $clen['clenstvi']['funkce']['nazev']
                    ?? $clen['nazevAngazma']
                    ?? $clen['funkce']
                    ?? $clen['nazevFunkce']
                    ?? $nazevOrganu;

                $narozeni = $fo['datumNarozeni'] ?? $clen['datumNarozeni'] ?? null;

                $result['clenove'][] = [
                    'jmeno'          => $jmeno,
                    'prijmeni'       => $prijmeni,
                    'funkce'         => $funkce,
                    'datum_narozeni' => $narozeni ? substr($narozeni, 0, 10) : null,
                ];
            }
        }
    }

    // Deduplikace
    $seen = [];
    $result['clenove'] = array_values(array_filter($result['clenove'], function ($c) use (&$seen) {
        $key = $c['jmeno'] . '|' . $c['prijmeni'];
        if (isset($seen[$key])) return false;
        $seen[$key] = true;
        return true;
    }));

    return $result;
}
