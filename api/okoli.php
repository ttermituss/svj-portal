<?php
/**
 * Okolí budovy — proxy pro Overpass API (OpenStreetMap, zdarma, bez klíče).
 * Vrací POI v okruhu 500 m od GPS souřadnic budovy SVJ.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';

requireMethod('GET');
$user  = requireAuth();
$svjId = requireSvj($user);

$row = getDb()->prepare('SELECT lat, lon FROM svj WHERE id = :id');
$row->execute([':id' => $svjId]);
$svj = $row->fetch();

if (!$svj || !$svj['lat'] || !$svj['lon']) {
    jsonError('GPS souřadnice nejsou k dispozici. Proveďte import z ČÚZK KN.', 404, 'NO_GPS');
}

$lat = (float) $svj['lat'];
$lon = (float) $svj['lon'];

// File-based cache (24h TTL)
$cacheFile = sys_get_temp_dir() . '/svj_okoli_' . $svjId . '.json';
$cacheTtl  = 86400;

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if ($cached) {
        header('Cache-Control: private, max-age=' . $cacheTtl);
        header('X-Cache: HIT');
        jsonOk($cached);
    }
}

$query = <<<EOQ
[out:json][timeout:12];
(
  node["highway"="bus_stop"](around:600,{$lat},{$lon});
  node["railway"~"tram_stop|station|halt"](around:600,{$lat},{$lon});
  node["amenity"~"pharmacy|doctors|hospital|clinic"](around:600,{$lat},{$lon});
  node["shop"~"supermarket|convenience|grocery|bakery|butcher|greengrocer"](around:600,{$lat},{$lon});
  node["amenity"~"bank|atm"](around:600,{$lat},{$lon});
  node["amenity"="post_office"](around:600,{$lat},{$lon});
  node["amenity"="parking"](around:600,{$lat},{$lon});
  way["amenity"="parking"](around:600,{$lat},{$lon});
);
out center 80;
EOQ;

$url = 'https://overpass-api.de/api/interpreter';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => 'data=' . rawurlencode($query),
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT      => 'SVJPortal/1.0',
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr || $httpCode !== 200) {
    jsonError('Nepodařilo se načíst data z OpenStreetMap.', 502, 'OVERPASS_ERROR');
}

$data = json_decode($response, true);
if (!is_array($data) || !isset($data['elements'])) {
    jsonError('Neplatná odpověď ze služby OpenStreetMap.', 502, 'INVALID_RESPONSE');
}

// Vrátíme jen nezbytná data (id, lat, lon, tags)
$elements = array_map(function ($el) {
    return [
        'id'   => $el['id'],
        'lat'  => $el['lat']  ?? ($el['center']['lat'] ?? null),
        'lon'  => $el['lon']  ?? ($el['center']['lon'] ?? null),
        'tags' => $el['tags'] ?? [],
    ];
}, $data['elements']);

$result = ['lat' => $lat, 'lon' => $lon, 'elements' => $elements];
$written = @file_put_contents($cacheFile, json_encode($result));
if ($written === false) {
    error_log('Cache write failed: ' . $cacheFile);
}
header('Cache-Control: private, max-age=' . $cacheTtl);
header('X-Cache: MISS');
jsonOk($result);
