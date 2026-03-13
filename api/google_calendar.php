<?php
/**
 * Google Calendar sync — push/pull událostí mezi portálem a Google Calendar.
 *
 * POST ?action=syncPush   {udalost_id}       → push jedné události do Google Calendar
 * POST ?action=syncPushAll                    → push všech nesynchronizovaných
 * POST ?action=syncPull   {rok, mesic}        → pull událostí z Google Calendar
 * POST ?action=deleteSynced {udalost_id}      → smaže z Google Calendar
 * GET  ?action=status                         → stav sync
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/google_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'syncPush':    handleSyncPush();    break;
    case 'syncPushAll': handleSyncPushAll(); break;
    case 'syncPull':    handleSyncPull();    break;
    case 'deleteSynced': handleDeleteSynced(); break;
    case 'status':      handleCalStatus();   break;
    case 'watchStart':  handleWatchStart();  break;
    case 'watchStop':   handleWatchStop();   break;
    case 'watchStatus': handleWatchStatus(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== PUSH jedné události do Google Calendar ===== */

function handleSyncPush(): never
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $body = getJsonBody();
    $udalostId = (int) ($body['udalost_id'] ?? 0);
    if (!$udalostId) jsonError('Chybí udalost_id', 422, 'VALIDATION_ERROR');

    $result = pushEventToGoogle($client, $user['svj_id'], $udalostId);
    jsonOk($result);
}

/* ===== PUSH všech nesynchronizovaných ===== */

function handleSyncPushAll(): never
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $db = getDb();
    $svjId = $user['svj_id'];

    // Najdi události bez sync záznamu
    $stmt = $db->prepare(
        'SELECT ku.id FROM kalendar_udalosti ku
         LEFT JOIN google_calendar_sync gcs ON gcs.udalost_id = ku.id
         WHERE ku.svj_id = :sid AND gcs.id IS NULL'
    );
    $stmt->execute([':sid' => $svjId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $synced = 0;
    $errors = 0;
    foreach ($ids as $id) {
        try {
            pushEventToGoogle($client, $svjId, (int) $id);
            $synced++;
        } catch (\Exception $e) {
            $errors++;
        }
    }

    jsonOk(['synced' => $synced, 'errors' => $errors, 'total' => count($ids)]);
}

/* ===== PULL událostí z Google Calendar ===== */

function handleSyncPull(): never
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $body = getJsonBody();
    $rok   = (int) ($body['rok'] ?? date('Y'));
    $mesic = (int) ($body['mesic'] ?? date('n'));

    $timeMin = sprintf('%04d-%02d-01T00:00:00+01:00', $rok, $mesic);
    $timeMax = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $rok, $mesic))) . 'T23:59:59+01:00';

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
        jsonError('Chyba při čtení Google Calendar: ' . $e->getMessage(), 502, 'GCAL_ERROR');
    }

    $items = [];
    foreach ($events->getItems() as $event) {
        $start = $event->getStart()->getDateTime() ?: $event->getStart()->getDate();
        $end   = $event->getEnd()->getDateTime() ?: $event->getEnd()->getDate();
        $items[] = [
            'google_id'   => $event->getId(),
            'summary'     => $event->getSummary() ?? '(bez názvu)',
            'description' => $event->getDescription() ?? '',
            'start'       => $start,
            'end'         => $end,
            'location'    => $event->getLocation() ?? '',
            'htmlLink'    => $event->getHtmlLink(),
            'allDay'      => !$event->getStart()->getDateTime(),
        ];
    }

    jsonOk(['events' => $items, 'count' => count($items)]);
}

/* ===== SMAZÁNÍ synced události z Google ===== */

function handleDeleteSynced(): never
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');

    $body = getJsonBody();
    $udalostId = (int) ($body['udalost_id'] ?? 0);
    if (!$udalostId) jsonError('Chybí udalost_id', 422, 'VALIDATION_ERROR');

    $db = getDb();
    $svjId = $user['svj_id'];

    $stmt = $db->prepare(
        'SELECT google_event_id, google_calendar_id FROM google_calendar_sync
         WHERE udalost_id = :uid AND svj_id = :sid'
    );
    $stmt->execute([':uid' => $udalostId, ':sid' => $svjId]);
    $sync = $stmt->fetch();

    if ($sync) {
        $client = getAuthenticatedGoogleClient($user['id'], $svjId);
        if ($client) {
            $service = new Google\Service\Calendar($client);
            try {
                $service->events->delete($sync['google_calendar_id'], $sync['google_event_id']);
            } catch (\Exception $e) {
                // Ignorovat — událost mohla být smazána na straně Google
            }
        }

        $db->prepare('DELETE FROM google_calendar_sync WHERE udalost_id = :uid AND svj_id = :sid')
           ->execute([':uid' => $udalostId, ':sid' => $svjId]);
    }

    jsonOk(['deleted' => true]);
}

/* ===== STATUS ===== */

function handleCalStatus(): never
{
    requireMethod('GET');
    $user = requireAuth();
    $info = isGoogleConnected($user['id']);
    $hasCal = $info && strpos($info['scopes'] ?? '', 'calendar') !== false;

    $syncCount = 0;
    if ($hasCal && $user['svj_id']) {
        $db = getDb();
        $stmt = $db->prepare('SELECT COUNT(*) FROM google_calendar_sync WHERE svj_id = :sid');
        $stmt->execute([':sid' => $user['svj_id']]);
        $syncCount = (int) $stmt->fetchColumn();
    }

    // Watch status
    $watchInfo = null;
    if ($user['svj_id']) {
        $wStmt = $db->prepare('SELECT channel_id, expiration FROM google_calendar_watch WHERE svj_id = ?');
        $wStmt->execute([$user['svj_id']]);
        $w = $wStmt->fetch(PDO::FETCH_ASSOC);
        if ($w) {
            $watchInfo = [
                'active'     => strtotime($w['expiration']) > time(),
                'expiration' => $w['expiration'],
            ];
        }
    }

    jsonOk([
        'connected'    => (bool) $hasCal,
        'synced_count' => $syncCount,
        'watch'        => $watchInfo,
    ]);
}

/* ===== WATCH START ===== */

function handleWatchStart(): never
{
    requireMethod('POST');
    $user = requireRole('admin');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $db = getDb();

    // Check existing
    $existing = $db->prepare('SELECT channel_id, expiration FROM google_calendar_watch WHERE svj_id = ?');
    $existing->execute([$svjId]);
    $old = $existing->fetch(PDO::FETCH_ASSOC);
    if ($old && strtotime($old['expiration']) > time()) {
        jsonError('Watch kanál už existuje (expirace: ' . $old['expiration'] . '). Nejdříve zastavte.', 409, 'ALREADY_EXISTS');
    }

    // Get webhook URL
    $webhookUrl = getCalendarWebhookUrl();
    if (!$webhookUrl) {
        jsonError('Webhook URL není nastavena v systémových nastaveních.', 400, 'NO_WEBHOOK_URL');
    }

    $client = getAuthenticatedGoogleClient($user['id'], $svjId);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $service = new Google\Service\Calendar($client);
    $channelId = bin2hex(random_bytes(16));

    $channel = new Google\Service\Calendar\Channel([
        'id'      => $channelId,
        'type'    => 'web_hook',
        'address' => $webhookUrl,
    ]);

    try {
        $response = $service->events->watch('primary', $channel);
    } catch (\Exception $e) {
        jsonError('Google Watch API: ' . $e->getMessage(), 502, 'WATCH_ERROR');
    }

    $resourceId = $response->getResourceId();
    $expDt = date('Y-m-d H:i:s', (int) ($response->getExpiration() / 1000));

    $db->prepare(
        'INSERT INTO google_calendar_watch (svj_id, user_id, channel_id, resource_id, expiration)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), channel_id=VALUES(channel_id),
                                 resource_id=VALUES(resource_id), expiration=VALUES(expiration)'
    )->execute([$svjId, $user['id'], $channelId, $resourceId, $expDt]);

    jsonOk([
        'channel_id'  => $channelId,
        'expiration'  => $expDt,
        'webhook_url' => $webhookUrl,
    ]);
}

/* ===== WATCH STOP ===== */

function handleWatchStop(): never
{
    requireMethod('POST');
    $user = requireRole('admin');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $db = getDb();

    $stmt = $db->prepare('SELECT channel_id, resource_id FROM google_calendar_watch WHERE svj_id = ?');
    $stmt->execute([$svjId]);
    $watch = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$watch) {
        jsonOk(['message' => 'Žádný aktivní watch kanál.']);
        exit;
    }

    $client = getAuthenticatedGoogleClient($user['id'], $svjId);
    if ($client && $watch['resource_id']) {
        $service = new Google\Service\Calendar($client);
        $ch = new Google\Service\Calendar\Channel([
            'id'         => $watch['channel_id'],
            'resourceId' => $watch['resource_id'],
        ]);
        try {
            $service->channels->stop($ch);
        } catch (\Exception $e) {
            // Channel may already be expired
        }
    }

    $db->prepare('DELETE FROM google_calendar_watch WHERE svj_id = ?')->execute([$svjId]);
    jsonOk(['message' => 'Watch kanál zastaven.']);
}

/* ===== WATCH STATUS ===== */

function handleWatchStatus(): never
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();
    $stmt = $db->prepare('SELECT channel_id, expiration, sync_token, created_at FROM google_calendar_watch WHERE svj_id = ?');
    $stmt->execute([$user['svj_id']]);
    $watch = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$watch) {
        jsonOk(['active' => false]);
        exit;
    }

    jsonOk([
        'active'     => strtotime($watch['expiration']) > time(),
        'channel_id' => $watch['channel_id'],
        'expiration' => $watch['expiration'],
        'has_token'  => (bool) $watch['sync_token'],
        'created_at' => $watch['created_at'],
    ]);
}

function getCalendarWebhookUrl(): ?string
{
    $db = getDb();
    $stmt = $db->prepare("SELECT val FROM settings WHERE klic = 'google_calendar_webhook_url'");
    $stmt->execute();
    return $stmt->fetchColumn() ?: null;
}

/* ===== PUSH HELPER ===== */

function pushEventToGoogle(Google\Client $client, int $svjId, int $udalostId): array
{
    $db = getDb();

    $stmt = $db->prepare(
        'SELECT * FROM kalendar_udalosti WHERE id = :id AND svj_id = :sid'
    );
    $stmt->execute([':id' => $udalostId, ':sid' => $svjId]);
    $event = $stmt->fetch();
    if (!$event) throw new \RuntimeException('Událost nenalezena');

    $service = new Google\Service\Calendar($client);

    // Sestavit Google Event
    $startArr = [];
    $endArr = [];
    if ($event['celodenny']) {
        $startArr['date'] = $event['datum_od'];
        $endDate = $event['datum_do'] ?: $event['datum_od'];
        // Google celodenní události: end date je exclusive → +1 den
        $endArr['date'] = date('Y-m-d', strtotime($endDate . ' +1 day'));
    } else {
        $casOd = $event['cas_od'] ?: '00:00';
        $casDo = $event['cas_do'] ?: '23:59';
        $startArr['dateTime'] = $event['datum_od'] . 'T' . $casOd . ':00';
        $startArr['timeZone'] = 'Europe/Prague';
        $endDate = $event['datum_do'] ?: $event['datum_od'];
        $endArr['dateTime'] = $endDate . 'T' . $casDo . ':00';
        $endArr['timeZone'] = 'Europe/Prague';
    }

    $gEvent = new Google\Service\Calendar\Event([
        'summary'     => $event['nazev'],
        'description' => $event['popis'] ?? '',
        'location'    => $event['misto'] ?? '',
        'start'       => $startArr,
        'end'         => $endArr,
    ]);

    // Zkontrolovat jestli už existuje sync záznam (update vs insert)
    $stmt = $db->prepare(
        'SELECT google_event_id FROM google_calendar_sync WHERE udalost_id = :uid AND svj_id = :sid'
    );
    $stmt->execute([':uid' => $udalostId, ':sid' => $svjId]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        // Update
        try {
            $updated = $service->events->update('primary', $existing, $gEvent);
        } catch (\Google\Service\Exception $e) {
            if ($e->getCode() === 404) {
                // Smazáno na Google → vytvořit znovu
                $created = $service->events->insert('primary', $gEvent);
                $existing = $created->getId();
                $db->prepare('UPDATE google_calendar_sync SET google_event_id = :gid, sync_status = "synced", last_synced_at = NOW() WHERE udalost_id = :uid AND svj_id = :sid')
                   ->execute([':gid' => $existing, ':uid' => $udalostId, ':sid' => $svjId]);
                return ['google_event_id' => $existing, 'action' => 'recreated'];
            }
            throw $e;
        }
        $db->prepare('UPDATE google_calendar_sync SET sync_status = "synced", last_synced_at = NOW() WHERE udalost_id = :uid AND svj_id = :sid')
           ->execute([':uid' => $udalostId, ':sid' => $svjId]);
        return ['google_event_id' => $existing, 'action' => 'updated'];
    } else {
        // Insert
        $created = $service->events->insert('primary', $gEvent);
        $googleId = $created->getId();

        $db->prepare(
            'INSERT INTO google_calendar_sync (svj_id, udalost_id, google_event_id, google_calendar_id, sync_status, last_synced_at)
             VALUES (:sid, :uid, :gid, "primary", "synced", NOW())'
        )->execute([':sid' => $svjId, ':uid' => $udalostId, ':gid' => $googleId]);

        return ['google_event_id' => $googleId, 'action' => 'created'];
    }
}
