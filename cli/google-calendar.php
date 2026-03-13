#!/usr/bin/env php
<?php
/**
 * CLI: Google Calendar — list, push, pull, watch, status.
 *
 * Usage:
 *   php cli/google-calendar.php list [--month=M] [--year=Y] [--svj=ID]
 *   php cli/google-calendar.php push [--all] [--id=N] [--svj=ID]
 *   php cli/google-calendar.php pull [--month=M] [--year=Y] [--svj=ID]
 *   php cli/google-calendar.php status [--svj=ID]
 *   php cli/google-calendar.php watch [--svj=ID]
 *   php cli/google-calendar.php unwatch [--svj=ID]
 *   php cli/google-calendar.php watch-renew
 */

require_once __DIR__ . '/bootstrap.php';

$args = cliParseArgs($argv);
$command = $args['_'][0] ?? '';
$svjId = isset($args['svj']) ? (int) $args['svj'] : null;

match ($command) {
    'list'        => cmdList($args, $svjId),
    'push'        => cmdPush($args, $svjId),
    'pull'        => cmdPull($args, $svjId),
    'status'      => cmdCalStatus($svjId),
    'watch'       => cmdWatch($svjId),
    'unwatch'     => cmdUnwatch($svjId),
    'watch-renew' => cmdWatchRenew(),
    default       => cliUsage('cli/google-calendar.php', [
        'list [--month=M] [--year=Y]'     => 'Zobrazit události z Google Calendar',
        'push [--all] [--id=N]'            => 'Push událostí do Google Calendar',
        'pull [--month=M] [--year=Y]'      => 'Pull událostí z Google Calendar',
        'status'                           => 'Stav synchronizace',
        'watch'                            => 'Zapnout webhook (push notifikace)',
        'unwatch'                          => 'Vypnout webhook',
        'watch-renew'                      => 'Obnovit expirující watch kanály (cron)',
    ]),
};

/* ── LIST ─────────────────────────────────────────── */

function cmdList(array $args, ?int $svjId): void
{
    [$client, $user] = cliGetGoogleClient($svjId);

    $year  = (int) ($args['year'] ?? date('Y'));
    $month = (int) ($args['month'] ?? date('n'));

    $timeMin = sprintf('%04d-%02d-01T00:00:00+01:00', $year, $month);
    $timeMax = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $month))) . 'T23:59:59+01:00';

    $service = new Google\Service\Calendar($client);

    try {
        $events = $service->events->listEvents('primary', [
            'timeMin'      => $timeMin,
            'timeMax'      => $timeMax,
            'singleEvents' => true,
            'orderBy'      => 'startTime',
            'maxResults'   => 250,
        ]);
    } catch (\Exception $e) {
        cliError('Calendar API: ' . $e->getMessage());
        exit(1);
    }

    cliHeader("Google Calendar — {$month}/{$year}");

    $rows = [];
    foreach ($events->getItems() as $event) {
        $start = $event->getStart()->getDateTime() ?: $event->getStart()->getDate();
        $allDay = !$event->getStart()->getDateTime();
        $rows[] = [
            $event->getId(),
            substr($start, 0, $allDay ? 10 : 16),
            $allDay ? 'celý den' : 'čas',
            mb_substr($event->getSummary() ?? '(bez názvu)', 0, 40),
            mb_substr($event->getLocation() ?? '', 0, 20),
        ];
    }

    if (empty($rows)) {
        cliPrint('Žádné události v tomto měsíci.');
        return;
    }

    cliTable(['ID', 'Začátek', 'Typ', 'Název', 'Místo'], $rows);
    cliPrint("Celkem: " . count($rows) . " událostí");
}

/* ── PUSH ─────────────────────────────────────────── */

function cmdPush(array $args, ?int $svjId): void
{
    [$client, $user] = cliGetGoogleClient($svjId);
    $thisSvjId = (int) $user['svj_id'];
    $db = getDb();

    // Load pushEventToGoogle from google_calendar.php
    require_once dirname(__DIR__) . '/api/google_calendar.php';

    if (isset($args['id'])) {
        $id = (int) $args['id'];
        cliPrint("Push události #{$id}...");
        try {
            $result = pushEventToGoogle($client, $thisSvjId, $id);
            cliSuccess("Událost #{$id}: {$result['action']} (GCal ID: {$result['google_event_id']})");
        } catch (\Exception $e) {
            cliError("Chyba: " . $e->getMessage());
        }
        return;
    }

    // Push all unsynced
    $stmt = $db->prepare(
        'SELECT ku.id, ku.nazev FROM kalendar_udalosti ku
         LEFT JOIN google_calendar_sync gcs ON gcs.udalost_id = ku.id
         WHERE ku.svj_id = ? AND gcs.id IS NULL'
    );
    $stmt->execute([$thisSvjId]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) {
        cliSuccess('Všechny události jsou synchronizovány.');
        return;
    }

    cliHeader("Push " . count($events) . " událostí do Google Calendar");

    $synced = 0;
    $errors = 0;
    foreach ($events as $ev) {
        try {
            $result = pushEventToGoogle($client, $thisSvjId, (int) $ev['id']);
            cliSuccess("#{$ev['id']} {$ev['nazev']} → {$result['action']}");
            $synced++;
        } catch (\Exception $e) {
            cliError("#{$ev['id']} {$ev['nazev']}: " . $e->getMessage());
            $errors++;
        }
    }

    cliPrint("\nHotovo: {$synced} synchronizováno, {$errors} chyb");
}

/* ── PULL ─────────────────────────────────────────── */

function cmdPull(array $args, ?int $svjId): void
{
    [$client, $user] = cliGetGoogleClient($svjId);

    $year  = (int) ($args['year'] ?? date('Y'));
    $month = (int) ($args['month'] ?? date('n'));

    $timeMin = sprintf('%04d-%02d-01T00:00:00+01:00', $year, $month);
    $timeMax = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $month))) . 'T23:59:59+01:00';

    $service = new Google\Service\Calendar($client);

    try {
        $events = $service->events->listEvents('primary', [
            'timeMin'      => $timeMin,
            'timeMax'      => $timeMax,
            'singleEvents' => true,
            'orderBy'      => 'startTime',
            'maxResults'   => 250,
        ]);
    } catch (\Exception $e) {
        cliError('Calendar API: ' . $e->getMessage());
        exit(1);
    }

    cliHeader("Pull z Google Calendar — {$month}/{$year}");

    $items = $events->getItems();
    if (empty($items)) {
        cliPrint('Žádné události.');
        return;
    }

    foreach ($items as $event) {
        $start = $event->getStart()->getDateTime() ?: $event->getStart()->getDate();
        $allDay = !$event->getStart()->getDateTime();
        $type = $allDay ? 'celý den' : 'čas';
        cliPrint("  [{$type}] " . substr($start, 0, $allDay ? 10 : 16) . " — " . ($event->getSummary() ?? '(bez názvu)'));
    }

    cliPrint("\nCelkem: " . count($items) . " událostí");
}

/* ── STATUS ───────────────────────────────────────── */

function cmdCalStatus(?int $svjId): void
{
    $user = cliFindGoogleUser($svjId);
    if (!$user) {
        cliError('Žádný uživatel s Google účtem.');
        exit(1);
    }

    $thisSvjId = (int) $user['svj_id'];
    $scopes = $user['scopes'] ?? '';
    $hasCal = str_contains($scopes, 'calendar');

    $db = getDb();

    $syncCount = $db->prepare('SELECT COUNT(*) FROM google_calendar_sync WHERE svj_id = ?');
    $syncCount->execute([$thisSvjId]);

    $unsyncedCount = $db->prepare(
        'SELECT COUNT(*) FROM kalendar_udalosti ku
         LEFT JOIN google_calendar_sync gcs ON gcs.udalost_id = ku.id
         WHERE ku.svj_id = ? AND gcs.id IS NULL'
    );
    $unsyncedCount->execute([$thisSvjId]);

    cliHeader('Calendar status');
    cliPrint("Uživatel:       {$user['jmeno']} {$user['prijmeni']} ({$user['google_email']})");
    cliPrint("Calendar scope: " . ($hasCal ? '✓' : '✕'));
    cliPrint("Sync záznamů:   " . $syncCount->fetchColumn());
    cliPrint("Nesyncovaných:  " . $unsyncedCount->fetchColumn());

    // Watch status
    $watch = $db->prepare('SELECT channel_id, expiration, sync_token FROM google_calendar_watch WHERE svj_id = ?');
    $watch->execute([$thisSvjId]);
    $w = $watch->fetch(PDO::FETCH_ASSOC);

    if ($w) {
        $exp = $w['expiration'];
        $expired = strtotime($exp) < time();
        cliPrint("Watch kanál:    {$w['channel_id']} " . ($expired ? '(EXPIROVAL)' : "(do {$exp})"));
        cliPrint("Sync token:     " . ($w['sync_token'] ? 'ano' : 'ne'));
    } else {
        cliPrint("Watch kanál:    neaktivní");
    }
}

/* ── WATCH ────────────────────────────────────────── */

function cmdWatch(?int $svjId): void
{
    [$client, $user] = cliGetGoogleClient($svjId);
    $thisSvjId = (int) $user['svj_id'];
    $db = getDb();

    // Check for existing watch
    $existing = $db->prepare('SELECT channel_id, expiration FROM google_calendar_watch WHERE svj_id = ?');
    $existing->execute([$thisSvjId]);
    $old = $existing->fetch(PDO::FETCH_ASSOC);

    if ($old && strtotime($old['expiration']) > time()) {
        cliWarn("Watch kanál už existuje: {$old['channel_id']} (do {$old['expiration']})");
        cliPrint("Pro obnovení nejdřív spusťte: php cli/google-calendar.php unwatch");
        return;
    }

    // Load webhook URL from settings
    $webhookUrl = calendarGetWebhookUrl();
    if (!$webhookUrl) {
        cliError("Webhook URL není nastavena. Nastavte 'google_calendar_webhook_url' v admin settings.");
        cliPrint("URL musí být HTTPS, veřejně dostupná, např: https://svj.example.com/api/google_calendar_webhook.php");
        exit(1);
    }

    $channelId = bin2hex(random_bytes(16));
    $service = new Google\Service\Calendar($client);

    $channel = new Google\Service\Calendar\Channel([
        'id'      => $channelId,
        'type'    => 'web_hook',
        'address' => $webhookUrl,
    ]);

    try {
        $response = $service->events->watch('primary', $channel);
    } catch (\Exception $e) {
        cliError('Watch API: ' . $e->getMessage());
        exit(1);
    }

    $resourceId = $response->getResourceId();
    $expMs = $response->getExpiration();
    $expDt = date('Y-m-d H:i:s', (int) ($expMs / 1000));

    $db->prepare(
        'INSERT INTO google_calendar_watch (svj_id, user_id, channel_id, resource_id, expiration)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), channel_id=VALUES(channel_id),
                                 resource_id=VALUES(resource_id), expiration=VALUES(expiration)'
    )->execute([$thisSvjId, $user['id'], $channelId, $resourceId, $expDt]);

    cliSuccess("Watch kanál vytvořen");
    cliPrint("Channel ID:  {$channelId}");
    cliPrint("Resource ID: {$resourceId}");
    cliPrint("Expirace:    {$expDt}");
    cliPrint("Webhook URL: {$webhookUrl}");
}

function cmdUnwatch(?int $svjId): void
{
    $svjId = $svjId ?: resolveSvjIdFromDb();
    $db = getDb();

    $stmt = $db->prepare('SELECT channel_id, resource_id, user_id FROM google_calendar_watch WHERE svj_id = ?');
    $stmt->execute([$svjId]);
    $watch = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$watch) {
        cliPrint('Žádný aktivní watch kanál.');
        return;
    }

    // Try to stop on Google side
    $client = getAuthenticatedGoogleClient((int) $watch['user_id'], $svjId);
    if ($client && $watch['resource_id']) {
        $service = new Google\Service\Calendar($client);
        $channel = new Google\Service\Calendar\Channel([
            'id'         => $watch['channel_id'],
            'resourceId' => $watch['resource_id'],
        ]);
        try {
            $service->channels->stop($channel);
        } catch (\Exception $e) {
            cliWarn('Google stop: ' . $e->getMessage());
        }
    }

    $db->prepare('DELETE FROM google_calendar_watch WHERE svj_id = ?')->execute([$svjId]);
    cliSuccess("Watch kanál {$watch['channel_id']} zastaven a smazán.");
}

/* ── WATCH RENEW (cron) ──────────────────────────── */

function cmdWatchRenew(): void
{
    $db = getDb();
    $threshold = date('Y-m-d H:i:s', time() + 3600); // expire within 1 hour

    $stmt = $db->prepare('SELECT svj_id, user_id, channel_id, resource_id FROM google_calendar_watch WHERE expiration < ?');
    $stmt->execute([$threshold]);
    $watches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($watches)) {
        cliPrint('Žádné watch kanály k obnovení.');
        return;
    }

    cliHeader("Obnovení " . count($watches) . " watch kanálů");

    foreach ($watches as $w) {
        $thisSvjId = (int) $w['svj_id'];
        cliPrint("SVJ #{$thisSvjId}: obnovuji...");

        // Stop old channel
        $client = getAuthenticatedGoogleClient((int) $w['user_id'], $thisSvjId);
        if (!$client) {
            cliError("SVJ #{$thisSvjId}: Google klient nedostupný, přeskakuji.");
            continue;
        }

        $service = new Google\Service\Calendar($client);

        if ($w['resource_id']) {
            $oldChannel = new Google\Service\Calendar\Channel([
                'id'         => $w['channel_id'],
                'resourceId' => $w['resource_id'],
            ]);
            try {
                $service->channels->stop($oldChannel);
            } catch (\Exception $e) {
                // Old channel may already be expired
            }
        }

        // Create new watch
        $webhookUrl = calendarGetWebhookUrl();
        if (!$webhookUrl) {
            cliError("SVJ #{$thisSvjId}: webhook URL nenastavena, přeskakuji.");
            continue;
        }

        $newChannelId = bin2hex(random_bytes(16));
        $channel = new Google\Service\Calendar\Channel([
            'id'      => $newChannelId,
            'type'    => 'web_hook',
            'address' => $webhookUrl,
        ]);

        try {
            $response = $service->events->watch('primary', $channel);
        } catch (\Exception $e) {
            cliError("SVJ #{$thisSvjId}: " . $e->getMessage());
            continue;
        }

        $resourceId = $response->getResourceId();
        $expDt = date('Y-m-d H:i:s', (int) ($response->getExpiration() / 1000));

        $db->prepare(
            'UPDATE google_calendar_watch SET channel_id = ?, resource_id = ?, expiration = ?, user_id = ?
             WHERE svj_id = ?'
        )->execute([$newChannelId, $resourceId, $expDt, $w['user_id'], $thisSvjId]);

        cliSuccess("SVJ #{$thisSvjId}: obnoveno, expirace {$expDt}");
    }
}

/* ── HELPERS ──────────────────────────────────────── */

function calendarGetWebhookUrl(): ?string
{
    $db = getDb();
    require_once dirname(__DIR__) . '/api/settings_crypto.php';
    $stmt = $db->prepare("SELECT val FROM settings WHERE klic = 'google_calendar_webhook_url'");
    $stmt->execute();
    $val = $stmt->fetchColumn();
    return $val ?: null;
}

function resolveSvjIdFromDb(): int
{
    $user = cliFindGoogleUser();
    if ($user && $user['svj_id']) return (int) $user['svj_id'];

    $db = getDb();
    $id = $db->query('SELECT id FROM svj LIMIT 1')->fetchColumn();
    if ($id) return (int) $id;

    cliError('Nelze určit SVJ. Použijte --svj=ID.');
    exit(1);
}
