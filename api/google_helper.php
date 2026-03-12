<?php
/**
 * Google API helper — klient, token store/load, refresh.
 * Reuses AES-256-CBC encryption from settings_crypto.php.
 */

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/settings_crypto.php';

/** Scopy pro OAuth — minimální potřebné */
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.file',
];

/**
 * Načíst Google OAuth credentials z tabulky settings.
 * Vrací [client_id, client_secret, redirect_uri] nebo null pokud nejsou nastaveny.
 */
function loadGoogleCredentials(): ?array
{
    $db = getDb();
    $stmt = $db->prepare("SELECT `key`, value FROM settings WHERE `key` IN ('google_client_id','google_client_secret','google_redirect_uri')");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $creds = [];
    foreach ($rows as $r) {
        $val = $r['value'];
        if (isSecretSettingKey($r['key'])) {
            $val = decryptSetting($val);
        }
        $creds[$r['key']] = $val;
    }

    $clientId = $creds['google_client_id'] ?? '';
    $secret   = $creds['google_client_secret'] ?? '';
    if (!$clientId || !$secret) return null;

    // Redirect URI — pokud prázdné, odvodit automaticky
    $redirect = $creds['google_redirect_uri'] ?? '';
    if (!$redirect) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $redirect = $scheme . '://' . $host . '/api/google_oauth.php?action=callback';
    }

    return ['client_id' => $clientId, 'client_secret' => $secret, 'redirect_uri' => $redirect];
}

/**
 * Vytvořit Google Client (bez tokenu).
 * Vrací null pokud credentials nejsou nastaveny.
 */
function createGoogleClient(): ?Google\Client
{
    $creds = loadGoogleCredentials();
    if (!$creds) return null;

    $client = new Google\Client();
    $client->setApplicationName('SVJ Portal');
    $client->setClientId($creds['client_id']);
    $client->setClientSecret($creds['client_secret']);
    $client->setRedirectUri($creds['redirect_uri']);
    $client->setAccessType('offline');
    $client->setPrompt('consent');
    $client->addScope(GOOGLE_SCOPES);
    return $client;
}

/**
 * Uložit tokeny (upsert, šifrované).
 */
function storeGoogleToken(int $userId, int $svjId, array $token, ?string $googleEmail = null): void
{
    $db = getDb();

    $expiresAt = date('Y-m-d H:i:s', time() + ($token['expires_in'] ?? 3600));
    $encAccess  = encryptSetting($token['access_token'] ?? '');
    $encRefresh = encryptSetting($token['refresh_token'] ?? '');
    $scopes     = $token['scope'] ?? implode(' ', GOOGLE_SCOPES);

    $stmt = $db->prepare("
        INSERT INTO google_tokens
            (user_id, svj_id, access_token, refresh_token, token_expires_at, scopes, google_email)
        VALUES
            (:uid, :sid, :at, :rt, :exp, :sc, :em)
        ON DUPLICATE KEY UPDATE
            access_token     = VALUES(access_token),
            refresh_token    = IF(VALUES(refresh_token) = '', refresh_token, VALUES(refresh_token)),
            token_expires_at = VALUES(token_expires_at),
            scopes           = VALUES(scopes),
            google_email     = COALESCE(VALUES(google_email), google_email)
    ");
    $stmt->execute([
        ':uid' => $userId,
        ':sid' => $svjId,
        ':at'  => $encAccess,
        ':rt'  => $encRefresh,
        ':exp' => $expiresAt,
        ':sc'  => $scopes,
        ':em'  => $googleEmail,
    ]);
}

/**
 * Načíst tokeny (dešifrované) pro uživatele.
 */
function loadGoogleToken(int $userId): ?array
{
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM google_tokens WHERE user_id = :uid");
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();
    if (!$row) return null;

    return [
        'access_token'  => decryptSetting($row['access_token']),
        'refresh_token' => decryptSetting($row['refresh_token']),
        'expires_at'    => $row['token_expires_at'],
        'scopes'        => $row['scopes'],
        'google_email'  => $row['google_email'],
        'connected_at'  => $row['connected_at'],
        'svj_id'        => (int) $row['svj_id'],
    ];
}

/**
 * Smazat tokeny uživatele.
 */
function deleteGoogleToken(int $userId): void
{
    $db = getDb();
    $db->prepare("DELETE FROM google_tokens WHERE user_id = :uid")->execute([':uid' => $userId]);
}

/**
 * Vrátit autentizovaného Google klienta (s auto-refresh).
 * Vrací null pokud uživatel nemá připojený Google účet.
 */
function getAuthenticatedGoogleClient(int $userId, int $svjId): ?Google\Client
{
    $tokenData = loadGoogleToken($userId);
    if (!$tokenData) return null;

    $client = createGoogleClient();
    $client->setAccessToken([
        'access_token'  => $tokenData['access_token'],
        'refresh_token' => $tokenData['refresh_token'],
        'expires_in'    => max(0, strtotime($tokenData['expires_at']) - time()),
        'created'       => time(),
    ]);

    if ($client->isAccessTokenExpired()) {
        $refreshToken = $tokenData['refresh_token'];
        if (!$refreshToken) {
            deleteGoogleToken($userId);
            return null;
        }

        try {
            $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
            if (isset($newToken['error'])) {
                deleteGoogleToken($userId);
                return null;
            }
            storeGoogleToken($userId, $svjId, $newToken);
        } catch (\Exception $e) {
            deleteGoogleToken($userId);
            return null;
        }
    }

    return $client;
}

/**
 * Rychlá kontrola stavu připojení Google účtu.
 */
function isGoogleConnected(int $userId): ?array
{
    $db = getDb();
    $stmt = $db->prepare("
        SELECT google_email, scopes, connected_at
        FROM google_tokens WHERE user_id = :uid
    ");
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Podepsat OAuth state parametr (CSRF ochrana).
 */
function signOAuthState(int $userId): string
{
    $nonce   = bin2hex(random_bytes(16));
    $payload = json_encode(['uid' => $userId, 'n' => $nonce]);
    $sig     = hash_hmac('sha256', $payload, SETTINGS_ENCRYPTION_KEY);
    return base64_encode($sig . '|' . $payload);
}

/**
 * Ověřit OAuth state a vrátit user_id.
 */
function verifyOAuthState(string $state): ?int
{
    $decoded = base64_decode($state, true);
    if (!$decoded) return null;

    $parts = explode('|', $decoded, 2);
    if (count($parts) !== 2) return null;

    [$sig, $payload] = $parts;
    $expected = hash_hmac('sha256', $payload, SETTINGS_ENCRYPTION_KEY);

    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode($payload, true);
    return $data['uid'] ?? null;
}
