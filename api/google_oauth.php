<?php
/**
 * Google OAuth — auth URL, callback, status, disconnect.
 *
 * GET  ?action=authUrl    → vrací {url} pro přesměrování na Google
 * GET  ?action=callback   → Google callback (redirect zpět do SPA)
 * GET  ?action=status     → {connected, google_email, scopes, connected_at}
 * POST ?action=disconnect → odpojí Google účet
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/google_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'authUrl':    handleAuthUrl();    break;
    case 'callback':   handleCallback();   break;
    case 'status':     handleStatus();     break;
    case 'disconnect': handleDisconnect(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ===== AUTH URL ===== */

function handleAuthUrl(): never
{
    $user = requireAuth();
    $client = createGoogleClient();
    if (!$client) {
        jsonError('Google OAuth není nastaven. Administrátor musí vyplnit Client ID a Secret ve Správě portálu → Systémová nastavení.', 400, 'GOOGLE_NOT_CONFIGURED');
    }
    $state = signOAuthState($user['id']);
    $client->setState($state);
    jsonOk(['url' => $client->createAuthUrl()]);
}

/* ===== CALLBACK (browser redirect z Google) ===== */

function handleCallback(): never
{
    $code  = $_GET['code']  ?? '';
    $state = $_GET['state'] ?? '';
    $error = $_GET['error'] ?? '';

    if ($error) {
        redirectToSpa('google_error=' . urlencode($error));
    }
    if (!$code || !$state) {
        redirectToSpa('google_error=missing_params');
    }

    // Ověřit HMAC state
    $stateUserId = verifyOAuthState($state);
    if (!$stateUserId) {
        redirectToSpa('google_error=invalid_state');
    }

    // Ověřit že uživatel je stále přihlášen
    require_once __DIR__ . '/session.php';
    $sessionUser = validateSession();
    if (!$sessionUser || $sessionUser['id'] !== $stateUserId) {
        redirectToSpa('google_error=session_expired');
    }

    // Vyměnit code za tokeny
    $client = createGoogleClient();
    if (!$client) {
        redirectToSpa('google_error=not_configured');
    }
    try {
        $token = $client->fetchAccessTokenWithAuthCode($code);
    } catch (\Exception $e) {
        redirectToSpa('google_error=token_exchange_failed');
    }

    if (isset($token['error'])) {
        redirectToSpa('google_error=' . urlencode($token['error']));
    }

    // Získat email z Google
    $googleEmail = fetchGoogleEmail($client);

    // Uložit tokeny
    storeGoogleToken($sessionUser['id'], $sessionUser['svj_id'], $token, $googleEmail);

    redirectToSpa('google=connected');
}

/* ===== STATUS ===== */

function handleStatus(): never
{
    $user = requireAuth();
    $info = isGoogleConnected($user['id']);

    if (!$info) {
        jsonOk(['connected' => false]);
    }

    jsonOk([
        'connected'    => true,
        'google_email' => $info['google_email'],
        'scopes'       => $info['scopes'],
        'connected_at' => $info['connected_at'],
    ]);
}

/* ===== DISCONNECT ===== */

function handleDisconnect(): never
{
    requireMethod('POST');
    $user = requireAuth();

    // Pokusit se revokovat token na straně Google
    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if ($client) {
        try {
            $client->revokeToken();
        } catch (\Exception $e) {
            // Ignorovat — token mohl být už neplatný
        }
    }

    deleteGoogleToken($user['id']);

    // Vyčistit calendar sync záznamy
    $db = getDb();
    $db->prepare("DELETE FROM google_calendar_sync WHERE svj_id = :sid")
       ->execute([':sid' => $user['svj_id']]);

    jsonOk(['message' => 'Google účet byl odpojen.']);
}

/* ===== HELPERS ===== */

function redirectToSpa(string $query): never
{
    header('Location: /#nastaveni?' . $query);
    exit;
}

function fetchGoogleEmail(Google\Client $client): ?string
{
    try {
        $oauth2 = new Google\Service\Oauth2($client);
        $userInfo = $oauth2->userinfo->get();
        return $userInfo->getEmail();
    } catch (\Exception $e) {
        return null;
    }
}
