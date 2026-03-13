<?php
/**
 * Google Calendar webhook receiver.
 * Google POSTs here when calendar events change (watch channel).
 *
 * Headers from Google:
 *   X-Goog-Channel-ID     — our channel_id
 *   X-Goog-Resource-ID    — resource identifier
 *   X-Goog-Resource-State — "sync" (initial) or "exists" (change)
 *   X-Goog-Message-Number — incremental counter
 *
 * No auth cookies — we validate via channel_id lookup in DB.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/google_helper.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$channelId     = $_SERVER['HTTP_X_GOOG_CHANNEL_ID'] ?? '';
$resourceId    = $_SERVER['HTTP_X_GOOG_RESOURCE_ID'] ?? '';
$resourceState = $_SERVER['HTTP_X_GOOG_RESOURCE_STATE'] ?? '';

if (!$channelId) {
    http_response_code(400);
    exit;
}

$db = getDb();

// Lookup watch record
$stmt = $db->prepare('SELECT svj_id, user_id, sync_token FROM google_calendar_watch WHERE channel_id = ?');
$stmt->execute([$channelId]);
$watch = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$watch) {
    // Unknown channel — tell Google to stop
    http_response_code(404);
    exit;
}

$svjId  = (int) $watch['svj_id'];
$userId = (int) $watch['user_id'];

// "sync" = initial confirmation, just acknowledge
if ($resourceState === 'sync') {
    // Update resource_id if not set
    if ($resourceId) {
        $db->prepare('UPDATE google_calendar_watch SET resource_id = ? WHERE channel_id = ?')
           ->execute([$resourceId, $channelId]);
    }
    http_response_code(200);
    exit;
}

// "exists" = calendar changed — fetch incremental changes
if ($resourceState !== 'exists') {
    http_response_code(200);
    exit;
}

$client = getAuthenticatedGoogleClient($userId, $svjId);
if (!$client) {
    error_log("Calendar webhook: no Google client for user #{$userId}, svj #{$svjId}");
    http_response_code(200);
    exit;
}

$service = new Google\Service\Calendar($client);
$syncToken = $watch['sync_token'];

try {
    $params = ['singleEvents' => false, 'maxResults' => 250];

    if ($syncToken) {
        $params['syncToken'] = $syncToken;
    } else {
        // Full sync: last 30 days + next 90 days
        $params['timeMin'] = date('c', strtotime('-30 days'));
        $params['timeMax'] = date('c', strtotime('+90 days'));
    }

    $events = $service->events->listEvents('primary', $params);
} catch (\Google\Service\Exception $e) {
    if ($e->getCode() === 410) {
        // syncToken expired — clear and do full sync next time
        $db->prepare('UPDATE google_calendar_watch SET sync_token = NULL WHERE channel_id = ?')
           ->execute([$channelId]);
        error_log("Calendar webhook: syncToken expired for svj #{$svjId}, cleared for full sync");
        http_response_code(200);
        exit;
    }
    error_log("Calendar webhook error: " . $e->getMessage());
    http_response_code(200);
    exit;
}

// Process changes
$created = 0;
$updated = 0;
$deleted = 0;

foreach ($events->getItems() as $event) {
    $googleId = $event->getId();
    $status   = $event->getStatus(); // "confirmed", "tentative", "cancelled"

    if ($status === 'cancelled') {
        // Delete local event if it was synced from Google
        $deleted += webhookDeleteLocalEvent($db, $svjId, $googleId);
        continue;
    }

    // Check if this event is already tracked (pushed from portal)
    $syncStmt = $db->prepare('SELECT udalost_id FROM google_calendar_sync WHERE svj_id = ? AND google_event_id = ?');
    $syncStmt->execute([$svjId, $googleId]);
    $existingUdalostId = $syncStmt->fetchColumn();

    if ($existingUdalostId) {
        // Update existing portal event from Google changes
        $updated += webhookUpdateLocalEvent($db, $existingUdalostId, $event);
    } else {
        // New event from Google — create local mirror
        $created += webhookCreateLocalEvent($db, $svjId, $userId, $event);
    }
}

// Store new sync token
$nextSyncToken = $events->getNextSyncToken();
if ($nextSyncToken) {
    $db->prepare('UPDATE google_calendar_watch SET sync_token = ? WHERE channel_id = ?')
       ->execute([$nextSyncToken, $channelId]);
}

error_log("Calendar webhook: svj #{$svjId}: +{$created} ~{$updated} -{$deleted}");
http_response_code(200);

/* ── Webhook helpers ──────────────────────────────── */

function webhookDeleteLocalEvent(PDO $db, int $svjId, string $googleId): int
{
    $stmt = $db->prepare('SELECT udalost_id FROM google_calendar_sync WHERE svj_id = ? AND google_event_id = ?');
    $stmt->execute([$svjId, $googleId]);
    $udalostId = $stmt->fetchColumn();

    if (!$udalostId) return 0;

    $db->prepare('DELETE FROM kalendar_udalosti WHERE id = ? AND svj_id = ?')
       ->execute([$udalostId, $svjId]);
    $db->prepare('DELETE FROM google_calendar_sync WHERE svj_id = ? AND google_event_id = ?')
       ->execute([$svjId, $googleId]);
    return 1;
}

function webhookUpdateLocalEvent(PDO $db, int $udalostId, Google\Service\Calendar\Event $event): int
{
    $data = webhookParseEvent($event);
    if (!$data) return 0;

    $db->prepare(
        'UPDATE kalendar_udalosti SET nazev=?, popis=?, datum_od=?, datum_do=?,
                celodenny=?, cas_od=?, cas_do=?, misto=?
         WHERE id=?'
    )->execute([
        $data['nazev'], $data['popis'], $data['datum_od'], $data['datum_do'],
        $data['celodenny'], $data['cas_od'], $data['cas_do'], $data['misto'],
        $udalostId,
    ]);
    return 1;
}

function webhookCreateLocalEvent(PDO $db, int $svjId, int $userId, Google\Service\Calendar\Event $event): int
{
    $data = webhookParseEvent($event);
    if (!$data) return 0;

    $db->prepare(
        'INSERT INTO kalendar_udalosti (svj_id, nazev, popis, datum_od, datum_do, celodenny, cas_od, cas_do, misto, kategorie, vytvoril_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $svjId, $data['nazev'], $data['popis'], $data['datum_od'], $data['datum_do'],
        $data['celodenny'], $data['cas_od'], $data['cas_do'], $data['misto'],
        'jine', $userId,
    ]);

    $localId = (int) $db->lastInsertId();
    $db->prepare(
        'INSERT INTO google_calendar_sync (svj_id, udalost_id, google_event_id, google_calendar_id, sync_status, last_synced_at)
         VALUES (?, ?, ?, "primary", "synced", NOW())'
    )->execute([$svjId, $localId, $event->getId()]);

    return 1;
}

function webhookParseEvent(Google\Service\Calendar\Event $event): ?array
{
    $summary = $event->getSummary();
    if (!$summary) return null;

    $start = $event->getStart();
    $end   = $event->getEnd();

    $celodenny = !$start->getDateTime();

    if ($celodenny) {
        $datumOd = $start->getDate();
        $datumDo = $end->getDate() ? date('Y-m-d', strtotime($end->getDate() . ' -1 day')) : $datumOd;
        $casOd = null;
        $casDo = null;
    } else {
        $dtStart = new \DateTime($start->getDateTime());
        $dtEnd   = new \DateTime($end->getDateTime());
        $datumOd = $dtStart->format('Y-m-d');
        $datumDo = $dtEnd->format('Y-m-d');
        $casOd   = $dtStart->format('H:i');
        $casDo   = $dtEnd->format('H:i');
    }

    return [
        'nazev'    => mb_substr(strip_tags($summary), 0, 255),
        'popis'    => mb_substr(strip_tags($event->getDescription() ?? ''), 0, 2000),
        'datum_od' => $datumOd,
        'datum_do' => $datumDo !== $datumOd ? $datumDo : null,
        'celodenny' => $celodenny ? 1 : 0,
        'cas_od'   => $casOd,
        'cas_do'   => $casDo,
        'misto'    => mb_substr(strip_tags($event->getLocation() ?? ''), 0, 255),
    ];
}
