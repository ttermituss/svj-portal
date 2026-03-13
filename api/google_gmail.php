<?php
/**
 * Google Gmail API — čtení inboxu, odeslání emailu, detail zprávy.
 *
 * GET  ?action=inbox&limit=20&q=...      → seznam zpráv
 * GET  ?action=message&id=MSG_ID         → detail zprávy (tělo)
 * POST ?action=send {to, subject, body}  → odeslání emailu
 * GET  ?action=status                    → stav připojení Gmail
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/google_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'inbox':   handleInbox();   break;
    case 'message': handleMessage(); break;
    case 'send':    handleSend();    break;
    case 'status':  handleGmailStatus(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== INBOX ===== */

function handleInbox(): never
{
    requireMethod('GET');
    $user = requireAuth();
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $limit = min((int) (getParam('limit', '20') ?: 20), 50);
    $query = getParam('q', '');
    $pageToken = getParam('pageToken', '');

    $service = new Google\Service\Gmail($client);

    $params = ['maxResults' => $limit, 'labelIds' => ['INBOX']];
    if ($query) $params['q'] = $query;
    if ($pageToken) $params['pageToken'] = $pageToken;

    try {
        $list = $service->users_messages->listUsersMessages('me', $params);
    } catch (\Exception $e) {
        error_log('Gmail inbox error: ' . $e->getMessage());
        jsonError('Chyba při čtení Gmailu.', 502, 'GMAIL_ERROR');
    }

    $messages = [];
    foreach ($list->getMessages() ?? [] as $ref) {
        $msg = $service->users_messages->get('me', $ref->getId(), [
            'format' => 'metadata',
            'metadataHeaders' => ['From', 'To', 'Subject', 'Date'],
        ]);

        $headers = [];
        foreach ($msg->getPayload()->getHeaders() as $h) {
            $headers[$h->getName()] = $h->getValue();
        }

        $labels = $msg->getLabelIds() ?? [];
        $messages[] = [
            'id'      => $msg->getId(),
            'from'    => $headers['From'] ?? '',
            'to'      => $headers['To'] ?? '',
            'subject' => $headers['Subject'] ?? '(bez předmětu)',
            'date'    => $headers['Date'] ?? '',
            'snippet' => $msg->getSnippet(),
            'unread'  => in_array('UNREAD', $labels),
        ];
    }

    jsonOk([
        'messages'      => $messages,
        'nextPageToken' => $list->getNextPageToken(),
        'total'         => $list->getResultSizeEstimate(),
    ]);
}

/* ===== DETAIL ZPRÁVY ===== */

function handleMessage(): never
{
    requireMethod('GET');
    $user = requireAuth();
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $msgId = getParam('id', '');
    if (!$msgId) jsonError('Chybí ID zprávy', 422, 'VALIDATION_ERROR');

    $service = new Google\Service\Gmail($client);

    try {
        $msg = $service->users_messages->get('me', $msgId, ['format' => 'full']);
    } catch (\Exception $e) {
        jsonError('Zpráva nenalezena', 404, 'NOT_FOUND');
    }

    $headers = [];
    foreach ($msg->getPayload()->getHeaders() as $h) {
        $headers[$h->getName()] = $h->getValue();
    }

    $body = extractBody($msg->getPayload());
    $labels = $msg->getLabelIds() ?? [];

    // Označit jako přečtené
    if (in_array('UNREAD', $labels)) {
        try {
            $mod = new Google\Service\Gmail\ModifyMessageRequest();
            $mod->setRemoveLabelIds(['UNREAD']);
            $service->users_messages->modify('me', $msgId, $mod);
        } catch (\Exception $e) {
            // ignorovat
        }
    }

    jsonOk([
        'id'      => $msg->getId(),
        'from'    => $headers['From'] ?? '',
        'to'      => $headers['To'] ?? '',
        'cc'      => $headers['Cc'] ?? '',
        'subject' => $headers['Subject'] ?? '(bez předmětu)',
        'date'    => $headers['Date'] ?? '',
        'body'    => $body,
        'unread'  => in_array('UNREAD', $labels),
    ]);
}

/* ===== ODESLÁNÍ ===== */

function handleSend(): never
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) jsonError('Google účet není propojen.', 400, 'NOT_CONNECTED');

    $body = getJsonBody();
    $to      = sanitize($body['to'] ?? '');
    $subject = sanitize($body['subject'] ?? '');
    $text    = $body['body'] ?? '';

    if (!$to) jsonError('Příjemce je povinný', 422, 'VALIDATION_ERROR');
    if (!$subject) jsonError('Předmět je povinný', 422, 'VALIDATION_ERROR');
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) jsonError('Neplatná e-mailová adresa', 422, 'VALIDATION_ERROR');

    $service = new Google\Service\Gmail($client);

    $raw = "To: {$to}\r\n"
        . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "\r\n"
        . $text;

    $msg = new Google\Service\Gmail\Message();
    $msg->setRaw(rtrim(strtr(base64_encode($raw), '+/', '-_'), '='));

    try {
        $sent = $service->users_messages->send('me', $msg);
    } catch (\Exception $e) {
        error_log('Gmail send error: ' . $e->getMessage());
        jsonError('Chyba při odesílání e-mailu.', 502, 'GMAIL_SEND_ERROR');
    }

    jsonOk(['id' => $sent->getId(), 'message' => 'E-mail byl odeslán.']);
}

/* ===== STATUS ===== */

function handleGmailStatus(): never
{
    requireMethod('GET');
    $user = requireAuth();
    $info = isGoogleConnected($user['id']);
    $hasGmail = $info && strpos($info['scopes'] ?? '', 'gmail') !== false;
    jsonOk(['connected' => (bool) $hasGmail, 'email' => $info['google_email'] ?? null]);
}

/* ===== HELPERS ===== */

function extractBody(Google\Service\Gmail\MessagePart $payload): string
{
    // Jednoduchý email
    if ($payload->getBody() && $payload->getBody()->getSize() > 0) {
        return base64_decode(strtr($payload->getBody()->getData(), '-_', '+/'));
    }

    // Multipart — hledej text/plain nebo text/html
    $html = '';
    $plain = '';
    foreach ($payload->getParts() ?? [] as $part) {
        $mime = $part->getMimeType();
        $data = $part->getBody() ? $part->getBody()->getData() : '';
        if ($data) {
            $decoded = base64_decode(strtr($data, '-_', '+/'));
            if ($mime === 'text/html') $html = $decoded;
            if ($mime === 'text/plain' && !$plain) $plain = $decoded;
        }
        // Vnořený multipart
        foreach ($part->getParts() ?? [] as $sub) {
            $subMime = $sub->getMimeType();
            $subData = $sub->getBody() ? $sub->getBody()->getData() : '';
            if ($subData) {
                $decoded = base64_decode(strtr($subData, '-_', '+/'));
                if ($subMime === 'text/html') $html = $decoded;
                if ($subMime === 'text/plain' && !$plain) $plain = $decoded;
            }
        }
    }

    return $html ? sanitizeEmailHtml($html) : nl2br(htmlspecialchars($plain, ENT_QUOTES, 'UTF-8'));
}

/**
 * Sanitizuje HTML z emailu — odstraní skripty, event handlery, nebezpečné tagy.
 */
function sanitizeEmailHtml(string $html): string
{
    // Odstranit <script>, <style>, <iframe>, <object>, <embed>, <form>, <link> tagy i s obsahem
    $html = preg_replace('#<(script|style|iframe|object|embed|form|link)\b[^>]*>.*?</\\1>#si', '', $html);
    $html = preg_replace('#<(script|style|iframe|object|embed|form|link)\b[^>]*/?\s*>#si', '', $html);

    // Odstranit všechny on* event handlery (onclick, onerror, onload, ...)
    $html = preg_replace('#\s+on\w+\s*=\s*"[^"]*"#si', '', $html);
    $html = preg_replace("#\s+on\w+\s*=\s*'[^']*'#si", '', $html);
    $html = preg_replace('#\s+on\w+\s*=\s*\S+#si', '', $html);

    // Odstranit javascript: a data: URL v href/src/action atributech
    $html = preg_replace('#(href|src|action)\s*=\s*"[^"]*javascript:[^"]*"#si', '$1=""', $html);
    $html = preg_replace("#(href|src|action)\s*=\s*'[^']*javascript:[^']*'#si", "$1=''", $html);
    $html = preg_replace('#(href|src|action)\s*=\s*"[^"]*data:[^"]*"#si', '$1=""', $html);
    $html = preg_replace("#(href|src|action)\s*=\s*'[^']*data:[^']*'#si", "$1=''", $html);

    return $html;
}
