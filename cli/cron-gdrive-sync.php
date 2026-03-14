#!/usr/bin/env php
<?php
/**
 * Cron: Google Drive background sync — spustit každou hodinu.
 *
 * Iteruje přes všechna SVJ s gdrive_enabled = 1, pro každé synchronizuje
 * nesyncované soubory (dávka max. 20 souborů). Pokud zbývají další soubory,
 * zaloguje výzvu ke spuštění znovu (nebo nastavte menší interval cronu).
 *
 * Doporučený cron:
 *   0 * * * * php /path/to/svj-portal/cli/cron-gdrive-sync.php >> /var/log/svj-gdrive-sync.log 2>&1
 *
 * Usage:
 *   php cli/cron-gdrive-sync.php [--limit=N] [--dry-run]
 */

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/api/storage_helper.php';

$args   = cliParseArgs($argv);
$limit  = min((int) ($args['limit'] ?? 20), 100);
$dryRun = isset($args['dry-run']);

$ts = date('Y-m-d H:i:s');
cliHeader("GDrive Sync — {$ts}" . ($dryRun ? ' [DRY RUN]' : ''));

$db = getDb();
$stmt = $db->query(
    'SELECT id, nazev FROM svj WHERE gdrive_enabled = 1 ORDER BY id'
);
$svjList = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($svjList)) {
    cliPrint('Žádné SVJ nemá GDrive aktivní. Konec.');
    exit(0);
}

$totalSynced    = 0;
$totalRemaining = 0;
$errors         = 0;

foreach ($svjList as $svj) {
    $svjId = (int) $svj['id'];
    $name  = $svj['nazev'];

    if (!storageIsGdriveActive($svjId)) {
        cliWarn("[SVJ #{$svjId} {$name}] GDrive není aktivní (token chybí nebo složka chybí) — přeskakuji.");
        continue;
    }

    if ($dryRun) {
        $status    = storageSyncStatus($svjId);
        $pending   = array_sum(array_column($status, 'total')) - array_sum(array_column($status, 'synced'));
        cliPrint("[SVJ #{$svjId} {$name}] {$pending} souborů čeká na sync (dry-run, žádná akce).");
        continue;
    }

    try {
        $result = storageSync($svjId, 'all', $limit);
        $synced    = (int) ($result['synced']    ?? 0);
        $remaining = (int) ($result['remaining'] ?? 0);
        $totalSynced    += $synced;
        $totalRemaining += $remaining;

        if ($synced > 0 || $remaining > 0) {
            $msg = "[SVJ #{$svjId} {$name}] synchronizováno: {$synced}";
            if ($remaining > 0) {
                $msg .= ", zbývá: {$remaining}";
            }
            cliSuccess($msg);
        } else {
            cliPrint("[SVJ #{$svjId} {$name}] vše synchronizováno.");
        }
    } catch (Throwable $e) {
        cliError("[SVJ #{$svjId} {$name}] chyba: " . $e->getMessage());
        $errors++;
    }
}

if (!$dryRun) {
    cliPrint('');
    cliPrint("Celkem synchronizováno: {$totalSynced} souborů.");
    if ($totalRemaining > 0) {
        cliWarn("Zbývá: {$totalRemaining} souborů — cron se postará v příštím běhu.");
    }
    if ($errors > 0) {
        cliError("{$errors} SVJ selhalo — viz výstup výše.");
        exit(1);
    }
}

exit(0);
