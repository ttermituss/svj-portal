<?php
/**
 * Správa nastavení portálu (API klíče, konfigurace).
 * Přístup pouze pro adminy. Citlivé hodnoty jsou šifrované (AES-256-GCM).
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/encryption.php';

// Povolené klíče a jejich metadata
const ALLOWED_SETTINGS = [
    'cuzk_api_key' => ['label' => 'ČÚZK KN API klíč', 'sensitive' => true],
];

$action = getParam('action', '');

switch ($action) {
    case 'get':    handleGet();    break;
    case 'set':    handleSet();    break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleGet(): void
{
    requireMethod('GET');
    $user = requireAuth();
    requireAdmin($user);

    $db   = getDb();
    $rows = $db->query('SELECT `key`, value, label FROM settings')->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $key  = $row['key'];
        $meta = ALLOWED_SETTINGS[$key] ?? ['label' => $row['label'], 'sensitive' => false];
        $val  = null;

        if (!empty($row['value'])) {
            if ($meta['sensitive']) {
                try {
                    $decrypted = decryptValue($row['value']);
                    // Vrátíme jen hvězdičky — frontend nikdy nedostane plaintext
                    $val = str_repeat('*', max(8, strlen($decrypted)));
                } catch (RuntimeException) {
                    $val = null;
                }
            } else {
                $val = $row['value'];
            }
        }

        $result[] = [
            'key'       => $key,
            'label'     => $meta['label'],
            'sensitive' => $meta['sensitive'],
            'set'       => !empty($row['value']),
            'preview'   => $val,
        ];
    }

    // Přidej povolené klíče co ještě nejsou v DB
    $existingKeys = array_column($result, 'key');
    foreach (ALLOWED_SETTINGS as $key => $meta) {
        if (!in_array($key, $existingKeys, true)) {
            $result[] = [
                'key'       => $key,
                'label'     => $meta['label'],
                'sensitive' => $meta['sensitive'],
                'set'       => false,
                'preview'   => null,
            ];
        }
    }

    jsonResponse(['settings' => $result]);
}

function handleSet(): void
{
    requireMethod('POST');
    $user = requireAuth();
    requireAdmin($user);

    $body  = getJsonBody();
    $key   = trim($body['key']   ?? '');
    $value = trim($body['value'] ?? '');

    if (!isset(ALLOWED_SETTINGS[$key])) {
        jsonError('Nepovolený klíč nastavení', 400, 'INVALID_KEY');
    }
    if ($value === '') {
        jsonError('Hodnota nesmí být prázdná', 400, 'EMPTY_VALUE');
    }

    $meta    = ALLOWED_SETTINGS[$key];
    $toStore = $meta['sensitive'] ? encryptValue($value) : $value;
    $label   = $meta['label'];

    $db   = getDb();
    $stmt = $db->prepare(
        'INSERT INTO settings (`key`, value, label) VALUES (:k, :v, :l)
         ON DUPLICATE KEY UPDATE value = :v, label = :l'
    );
    $stmt->execute([':k' => $key, ':v' => $toStore, ':l' => $label]);

    jsonResponse(['ok' => true, 'key' => $key]);
}

function requireAdmin(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        jsonError('Přístup odepřen', 403, 'FORBIDDEN');
    }
}
