#!/usr/bin/env php
<?php
/**
 * CLI: Google Gmail — inbox, read, send.
 *
 * Usage:
 *   php cli/google-gmail.php inbox [--limit=N] [--query=Q] [--svj=ID]
 *   php cli/google-gmail.php read <message-id> [--svj=ID]
 *   php cli/google-gmail.php send <to> <subject> <body> [--svj=ID]
 *   php cli/google-gmail.php status [--svj=ID]
 */

require_once __DIR__ . '/bootstrap.php';

$args = cliParseArgs($argv);
$command = $args['_'][0] ?? '';
$svjId = isset($args['svj']) ? (int) $args['svj'] : null;

match ($command) {
    'inbox'  => cmdInbox($args, $svjId),
    'read'   => cmdRead($args, $svjId),
    'send'   => cmdSend($args, $svjId),
    'status' => cmdStatus($svjId),
    default  => cliUsage('cli/google-gmail.php', [
        'inbox [--limit=N] [--query=Q]'   => 'Zobrazit doručenou poštu',
        'read <message-id>'               => 'Přečíst zprávu',
        'send <to> <subject> <body>'      => 'Odeslat e-mail',
        'status'                          => 'Stav připojení Gmailu',
    ]),
};

function cmdInbox(array $args, ?int $svjId): void
{
    [$client, $user] = cliGetGoogleClient($svjId);
    $limit = min((int) ($args['limit'] ?? 20), 50);
    $query = $args['query'] ?? '';

    $service = new Google\Service\Gmail($client);
    $params = ['maxResults' => $limit, 'labelIds' => ['INBOX']];
    if ($query) $params['q'] = $query;

    try {
        $list = $service->users_messages->listUsersMessages('me', $params);
    } catch (\Exception $e) {
        cliError('Gmail API: ' . $e->getMessage());
        exit(1);
    }

    cliHeader("Gmail inbox ({$user['google_email']})");

    $rows = [];
    foreach ($list->getMessages() ?? [] as $ref) {
        $msg = $service->users_messages->get('me', $ref->getId(), [
            'format'          => 'metadata',
            'metadataHeaders' => ['From', 'Subject', 'Date'],
        ]);

        $headers = [];
        foreach ($msg->getPayload()->getHeaders() as $h) {
            $headers[$h->getName()] = $h->getValue();
        }

        $labels = $msg->getLabelIds() ?? [];
        $unread = in_array('UNREAD', $labels) ? '*' : ' ';

        $rows[] = [
            $unread,
            $msg->getId(),
            mb_substr($headers['From'] ?? '', 0, 30),
            mb_substr($headers['Subject'] ?? '(bez předmětu)', 0, 40),
            $headers['Date'] ?? '',
        ];
    }

    if (empty($rows)) {
        cliPrint('Žádné zprávy.');
        return;
    }

    cliTable(['', 'ID', 'Od', 'Předmět', 'Datum'], $rows);
    cliPrint("Celkem: " . ($list->getResultSizeEstimate() ?? '?') . " zpráv");
}

function cmdRead(array $args, ?int $svjId): void
{
    $msgId = $args['_'][1] ?? '';
    if (!$msgId) {
        cliError('Chybí message ID. Použití: php cli/google-gmail.php read <id>');
        exit(1);
    }

    [$client] = cliGetGoogleClient($svjId);
    $service = new Google\Service\Gmail($client);

    try {
        $msg = $service->users_messages->get('me', $msgId, ['format' => 'full']);
    } catch (\Exception $e) {
        cliError('Zpráva nenalezena: ' . $e->getMessage());
        exit(1);
    }

    $headers = [];
    foreach ($msg->getPayload()->getHeaders() as $h) {
        $headers[$h->getName()] = $h->getValue();
    }

    cliHeader('E-mail');
    cliPrint("Od:      " . ($headers['From'] ?? ''));
    cliPrint("Komu:    " . ($headers['To'] ?? ''));
    if (!empty($headers['Cc'])) cliPrint("Kopie:   " . $headers['Cc']);
    cliPrint("Předmět: " . ($headers['Subject'] ?? ''));
    cliPrint("Datum:   " . ($headers['Date'] ?? ''));
    cliPrint(str_repeat('─', 60));

    $body = gmailExtractBody($msg->getPayload());
    cliPrint(strip_tags($body));
}

function cmdSend(array $args, ?int $svjId): void
{
    $to      = $args['_'][1] ?? '';
    $subject = $args['_'][2] ?? '';
    $body    = $args['_'][3] ?? '';

    if (!$to || !$subject) {
        cliError('Použití: php cli/google-gmail.php send <to> <subject> <body>');
        exit(1);
    }

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        cliError("Neplatná e-mailová adresa: {$to}");
        exit(1);
    }

    [$client] = cliGetGoogleClient($svjId);
    $service = new Google\Service\Gmail($client);

    $raw = "To: {$to}\r\n"
        . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "\r\n"
        . $body;

    $msg = new Google\Service\Gmail\Message();
    $msg->setRaw(rtrim(strtr(base64_encode($raw), '+/', '-_'), '='));

    try {
        $sent = $service->users_messages->send('me', $msg);
        cliSuccess("E-mail odeslán (ID: {$sent->getId()})");
    } catch (\Exception $e) {
        cliError('Chyba při odesílání: ' . $e->getMessage());
        exit(1);
    }
}

function cmdStatus(?int $svjId): void
{
    $user = cliFindGoogleUser($svjId);
    if (!$user) {
        cliError('Žádný uživatel s Google účtem.');
        exit(1);
    }

    $scopes = $user['scopes'] ?? '';
    $hasGmail = str_contains($scopes, 'gmail');

    cliHeader('Gmail status');
    cliPrint("Uživatel:  {$user['jmeno']} {$user['prijmeni']} ({$user['role']})");
    cliPrint("Google:    {$user['google_email']}");
    cliPrint("Gmail:     " . ($hasGmail ? '✓ připojeno' : '✕ nepřipojeno'));
    cliPrint("SVJ ID:    {$user['svj_id']}");
}

function gmailExtractBody(Google\Service\Gmail\MessagePart $payload): string
{
    if ($payload->getBody() && $payload->getBody()->getSize() > 0) {
        return base64_decode(strtr($payload->getBody()->getData(), '-_', '+/'));
    }

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
        foreach ($part->getParts() ?? [] as $sub) {
            $subData = $sub->getBody() ? $sub->getBody()->getData() : '';
            if ($subData) {
                $decoded = base64_decode(strtr($subData, '-_', '+/'));
                if ($sub->getMimeType() === 'text/html') $html = $decoded;
                if ($sub->getMimeType() === 'text/plain' && !$plain) $plain = $decoded;
            }
        }
    }

    return $plain ?: $html;
}
