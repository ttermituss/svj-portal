<?php
/**
 * Počasí — proxy pro OpenMeteo (zdarma, bez API klíče).
 * Používá GPS souřadnice budovy SVJ uložené po importu z RÚIAN/ČÚZK KN.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

$user  = requireAuth();
$svjId = requireSvj($user);

$db  = getDb();
$row = $db->prepare('SELECT lat, lon, adresa_plna FROM svj WHERE id = :id');
$row->execute([':id' => $svjId]);
$svj = $row->fetch();

if (!$svj || !$svj['lat'] || !$svj['lon']) {
    jsonError('GPS souřadnice nejsou k dispozici. Proveďte import z ČÚZK KN.', 404, 'NO_GPS');
}

$lat = (float)$svj['lat'];
$lon = (float)$svj['lon'];

// File-based cache (30 min TTL)
$cacheFile = sys_get_temp_dir() . '/svj_weather_' . $svjId . '.json';
$cacheTtl  = 1800;

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if ($cached) {
        header('Cache-Control: private, max-age=' . $cacheTtl);
        header('X-Cache: HIT');
        jsonOk($cached);
    }
}

$url = 'https://api.open-meteo.com/v1/forecast'
     . '?latitude='  . $lat
     . '&longitude=' . $lon
     . '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation'
     . '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum'
     . '&timezone=Europe%2FPrague'
     . '&forecast_days=7';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr || $httpCode !== 200) {
    jsonError('Nepodařilo se načíst data o počasí.', 502);
}

$data = json_decode($response, true);
if (!is_array($data)) jsonError('Neplatná odpověď ze služby počasí.', 502);

$result = [
    'adresa'  => $svj['adresa_plna'] ?? '',
    'current' => $data['current'] ?? null,
    'daily'   => $data['daily']   ?? null,
];
file_put_contents($cacheFile, json_encode($result));
header('Cache-Control: private, max-age=' . $cacheTtl);
header('X-Cache: MISS');
jsonOk($result);
