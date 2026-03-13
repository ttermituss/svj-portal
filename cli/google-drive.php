#!/usr/bin/env php
<?php
/**
 * CLI: Google Drive — status, list, sync, upload.
 *
 * Usage:
 *   php cli/google-drive.php status [--svj=ID]
 *   php cli/google-drive.php list [--module=M] [--svj=ID]
 *   php cli/google-drive.php sync [--module=M] [--limit=N] [--svj=ID]
 *   php cli/google-drive.php upload <module> <file> [--svj=ID]
 */

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/api/storage_helper.php';

$args = cliParseArgs($argv);
$command = $args['_'][0] ?? '';
$svjId = isset($args['svj']) ? (int) $args['svj'] : null;

match ($command) {
    'status' => cmdStatus($svjId),
    'list'   => cmdList($args, $svjId),
    'sync'   => cmdSync($args, $svjId),
    'upload' => cmdUpload($args, $svjId),
    default  => cliUsage('cli/google-drive.php', [
        'status'                           => 'Stav GDrive (enabled, soubory, sync)',
        'list [--module=M]'                => 'Seznam trackovaných souborů',
        'sync [--module=M] [--limit=N]'    => 'Synchronizovat nesyncované soubory',
        'upload <module> <file>'           => 'Nahrát soubor do modulu',
    ]),
};

function cmdStatus(?int $svjId): void
{
    $svjId = resolveSvjId($svjId);
    $db = getDb();

    $stmt = $db->prepare('SELECT nazev, ico, gdrive_enabled, gdrive_folder_id FROM svj WHERE id = ?');
    $stmt->execute([$svjId]);
    $svj = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$svj) {
        cliError("SVJ ID {$svjId} nenalezeno.");
        exit(1);
    }

    cliHeader("Google Drive — {$svj['nazev']}");
    cliPrint("GDrive:    " . ($svj['gdrive_enabled'] ? '✓ aktivní' : '✕ neaktivní'));
    cliPrint("Folder ID: " . ($svj['gdrive_folder_id'] ?: '(nevytvořena)'));

    $modules = storageSyncStatus($svjId);

    $total = $db->prepare('SELECT COUNT(*) FROM gdrive_files WHERE svj_id = ?');
    $total->execute([$svjId]);
    $totalCount = (int) $total->fetchColumn();

    $synced = $db->prepare('SELECT COUNT(*) FROM gdrive_files WHERE svj_id = ? AND gdrive_file_id IS NOT NULL');
    $synced->execute([$svjId]);
    $syncedCount = (int) $synced->fetchColumn();

    cliPrint("Soubory:   {$totalCount} celkem, {$syncedCount} synchronizováno, " . ($totalCount - $syncedCount) . " nesync");

    if (!empty($modules)) {
        cliPrint('');
        $rows = [];
        foreach ($modules as $m) {
            $t = (int) $m['total'];
            $s = (int) $m['synced'];
            $pct = $t > 0 ? round($s / $t * 100) : 100;
            $rows[] = [
                STORAGE_GDRIVE_NAMES[$m['module']] ?? $m['module'],
                "{$s}/{$t}",
                "{$pct}%",
                $t - $s > 0 ? ($t - $s) . ' čeká' : '✓',
            ];
        }
        cliTable(['Modul', 'Sync', '%', 'Stav'], $rows);
    }
}

function cmdList(array $args, ?int $svjId): void
{
    $svjId = resolveSvjId($svjId);
    $module = $args['module'] ?? '';
    $db = getDb();

    $where = 'svj_id = ?';
    $params = [$svjId];
    if ($module) {
        $where .= ' AND module = ?';
        $params[] = $module;
    }

    $stmt = $db->prepare("SELECT module, local_path, gdrive_name, gdrive_file_id, size_bytes, synced_at FROM gdrive_files WHERE {$where} ORDER BY module, local_path");
    $stmt->execute($params);
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    cliHeader('Trackované soubory' . ($module ? " ({$module})" : ''));

    if (empty($files)) {
        cliPrint('Žádné soubory.');
        return;
    }

    $rows = [];
    foreach ($files as $f) {
        $size = $f['size_bytes'] ? round($f['size_bytes'] / 1024) . ' KB' : '?';
        $synced = $f['gdrive_file_id'] ? '✓' : '✕';
        $rows[] = [
            STORAGE_GDRIVE_NAMES[$f['module']] ?? $f['module'],
            basename($f['local_path']),
            $f['gdrive_name'] ?? '',
            $size,
            $synced,
            $f['synced_at'] ?? '',
        ];
    }

    cliTable(['Modul', 'Soubor', 'Originál', 'Velikost', 'Sync', 'Datum sync'], $rows);
    cliPrint("Celkem: " . count($files) . " souborů");
}

function cmdSync(array $args, ?int $svjId): void
{
    $svjId = resolveSvjId($svjId);
    $module = $args['module'] ?? 'all';
    $limit = min((int) ($args['limit'] ?? 20), 100);

    if ($module !== 'all' && !isset(STORAGE_MODULES[$module])) {
        cliError("Neznámý modul: {$module}. Povolené: " . implode(', ', array_keys(STORAGE_MODULES)));
        exit(1);
    }

    if (!storageIsGdriveActive($svjId)) {
        cliError('GDrive není aktivní pro toto SVJ.');
        exit(1);
    }

    cliHeader("Synchronizace" . ($module !== 'all' ? " ({$module})" : ' všech modulů'));

    $result = storageSync($svjId, $module, $limit);
    cliSuccess("Synchronizováno: {$result['synced']} souborů");
    if ($result['remaining'] > 0) {
        cliWarn("Zbývá: {$result['remaining']} souborů (spusťte znovu pro další dávku)");
    } else {
        cliSuccess('Vše synchronizováno.');
    }
}

function cmdUpload(array $args, ?int $svjId): void
{
    $module = $args['_'][1] ?? '';
    $filePath = $args['_'][2] ?? '';

    if (!$module || !$filePath) {
        cliError('Použití: php cli/google-drive.php upload <module> <file>');
        exit(1);
    }

    if (!isset(STORAGE_MODULES[$module])) {
        cliError("Neznámý modul: {$module}. Povolené: " . implode(', ', array_keys(STORAGE_MODULES)));
        exit(1);
    }

    if (!file_exists($filePath)) {
        cliError("Soubor neexistuje: {$filePath}");
        exit(1);
    }

    $svjId = resolveSvjId($svjId);
    $originalName = basename($filePath);
    $filename = $svjId . '_' . bin2hex(random_bytes(8)) . '.' . pathinfo($filePath, PATHINFO_EXTENSION);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($filePath);

    // Copy to local storage
    $localDir = storageLocalDir($module);
    copy($filePath, $localDir . '/' . $filename);

    $relPath = storageRelPath($module, $filename);
    $result = storageTrackAndSync($svjId, $module, $relPath, $originalName, $mime, filesize($filePath));

    if ($result['gdrive_file_id']) {
        cliSuccess("Nahráno: {$originalName} → local + GDrive ({$result['gdrive_file_id']})");
    } elseif ($result['gdrive_error']) {
        cliWarn("Nahráno lokálně, GDrive selhalo: {$result['gdrive_error']}");
    } else {
        cliSuccess("Nahráno lokálně: {$originalName}");
    }
}

function resolveSvjId(?int $svjId): int
{
    if ($svjId) return $svjId;

    $user = cliFindGoogleUser();
    if ($user && $user['svj_id']) return (int) $user['svj_id'];

    $db = getDb();
    $stmt = $db->query('SELECT id FROM svj LIMIT 1');
    $id = $stmt->fetchColumn();
    if ($id) return (int) $id;

    cliError('Nelze určit SVJ. Použijte --svj=ID.');
    exit(1);
}
