<?php
/**
 * Autentizace — přihlášení, registrace, odhlášení, session info.
 *
 * POST ?action=login {email, password}      → přihlášení (vrací session cookie)
 * POST ?action=register {ico, email, ...}   → registrace admina přes IČO (ARES)
 * POST ?action=registerInvite {token, ...}  → registrace přes invite token
 * POST ?action=logout                       → odhlášení (smaže session)
 * GET  ?action=me                           → aktuální uživatel + SVJ data
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/svj_helper.php';

define('LOGIN_MAX_ATTEMPTS',    10);
define('REGISTER_MAX_ATTEMPTS',  5);

const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 100;

$action = getParam('action', '');

switch ($action) {
    case 'register':      handleRegister();      break;
    case 'registerAdmin': handleRegisterAdmin(); break;
    case 'login':         handleLogin();         break;
    case 'logout':        handleLogout();        break;
    case 'check':         handleCheck();         break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/**
 * Registrace vlastníka přes pozvánkový token.
 * Token je povinný — žádné volné přiřazení k SVJ.
 */
function handleRegister(): void
{
    requireMethod('POST');

    if (validateSession()) {
        jsonError('Již jste přihlášeni', 400, 'ALREADY_AUTHENTICATED');
    }

    checkRateLimit('rl_register_', REGISTER_MAX_ATTEMPTS,
        'Příliš mnoho registrací. Zkuste to za 5 minut.');

    $body = getJsonBody();

    $email        = sanitize($body['email']        ?? '');
    $password     = $body['password']              ?? '';
    $jmeno        = sanitize($body['jmeno']        ?? '');
    $prijmeni     = sanitize($body['prijmeni']     ?? '');
    $inviteToken  = sanitize($body['invite_token'] ?? '');

    if (strlen($email) > MAX_EMAIL_LENGTH || strlen($password) > 128 ||
        strlen($jmeno) > MAX_NAME_LENGTH || strlen($prijmeni) > MAX_NAME_LENGTH) {
        jsonError('Vstup je příliš dlouhý', 400, 'VALIDATION_ERROR');
    }

    $errors = [];
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = ['Zadejte platný e-mail'];
    }
    if (strlen($password) < MIN_PASSWORD_LENGTH) {
        $errors['password'] = ['Heslo musí mít alespoň ' . MIN_PASSWORD_LENGTH . ' znaků'];
    }
    if (!$jmeno) {
        $errors['jmeno'] = ['Zadejte jméno'];
    }
    if (!$inviteToken || strlen($inviteToken) !== 64 || !ctype_xdigit($inviteToken)) {
        $errors['invite_token'] = ['Neplatný pozvánkový token'];
    }

    if ($errors) {
        jsonResponse(['error' => ['message' => 'Chyby ve formuláři', 'code' => 'VALIDATION_ERROR', 'fields' => $errors]], 422);
    }

    // Ověřit token
    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT id, svj_id, role, expires_at, used_at
         FROM invitations WHERE token = :token'
    );
    $stmt->execute([':token' => $inviteToken]);
    $invite = $stmt->fetch();

    if (!$invite) {
        recordRateLimit('rl_register_');
        jsonError('Pozvánka nenalezena nebo neplatná', 404, 'INVALID_TOKEN');
    }
    if ($invite['used_at']) {
        jsonError('Pozvánka již byla použita', 410, 'TOKEN_USED');
    }
    if (strtotime($invite['expires_at']) < time()) {
        jsonError('Platnost pozvánky vypršela', 410, 'TOKEN_EXPIRED');
    }

    // Email uniqueness
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => strtolower($email)]);
    if ($stmt->fetch()) {
        recordRateLimit('rl_register_');
        jsonResponse(['error' => ['message' => 'Účet s tímto e-mailem již existuje', 'code' => 'EMAIL_EXISTS']], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $stmt = $db->prepare(
        'INSERT INTO users (email, password_hash, jmeno, prijmeni, role, svj_id)
         VALUES (:email, :hash, :jmeno, :prijmeni, :role, :svj_id)'
    );
    $stmt->execute([
        ':email'    => strtolower($email),
        ':hash'     => $hash,
        ':jmeno'    => $jmeno,
        ':prijmeni' => $prijmeni,
        ':role'     => $invite['role'],
        ':svj_id'   => (int)$invite['svj_id'],
    ]);

    $userId = (int)$db->lastInsertId();

    // Označit token jako použitý
    $db->prepare(
        'UPDATE invitations SET used_at = NOW(), used_by = :uid WHERE id = :id'
    )->execute([':uid' => $userId, ':id' => (int)$invite['id']]);

    createSession($userId);
    cleanExpiredSessions();

    jsonResponse([
        'user' => [
            'id'       => $userId,
            'email'    => strtolower($email),
            'jmeno'    => $jmeno,
            'prijmeni' => $prijmeni,
            'role'     => $invite['role'],
            'svj_id'   => (int)$invite['svj_id'],
        ],
    ], 201);
}

/**
 * Registrace zakladatele SVJ.
 * IČO → ARES → vytvoří SVJ (pokud neexistuje) + user s rolí vybor.
 */
function handleRegisterAdmin(): void
{
    requireMethod('POST');

    if (validateSession()) {
        jsonError('Již jste přihlášeni', 400, 'ALREADY_AUTHENTICATED');
    }

    checkRateLimit('rl_register_', REGISTER_MAX_ATTEMPTS,
        'Příliš mnoho registrací. Zkuste to za 5 minut.');

    $body = getJsonBody();

    $email    = sanitize($body['email']    ?? '');
    $password = $body['password']          ?? '';
    $jmeno    = sanitize($body['jmeno']    ?? '');
    $prijmeni = sanitize($body['prijmeni'] ?? '');
    $ico      = str_pad(preg_replace('/\D/', '', $body['ico'] ?? ''), 8, '0', STR_PAD_LEFT);

    if (strlen($email) > MAX_EMAIL_LENGTH || strlen($password) > 128 ||
        strlen($jmeno) > MAX_NAME_LENGTH || strlen($prijmeni) > MAX_NAME_LENGTH) {
        jsonError('Vstup je příliš dlouhý', 400, 'VALIDATION_ERROR');
    }

    $errors = [];
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = ['Zadejte platný e-mail'];
    }
    if (strlen($password) < MIN_PASSWORD_LENGTH) {
        $errors['password'] = ['Heslo musí mít alespoň ' . MIN_PASSWORD_LENGTH . ' znaků'];
    }
    if (!$jmeno) {
        $errors['jmeno'] = ['Zadejte jméno'];
    }
    if (!preg_match('/^\d{8}$/', $ico)) {
        $errors['ico'] = ['Zadejte platné IČO (8 číslic)'];
    }

    if ($errors) {
        jsonResponse(['error' => ['message' => 'Chyby ve formuláři', 'code' => 'VALIDATION_ERROR', 'fields' => $errors]], 422);
    }

    // ARES lookup + upsert SVJ
    $svjRow = getOrFetchSvj($ico);
    $svjId  = (int)$svjRow['id'];

    // Kontrola: má toto SVJ už správce?
    $db   = getDb();
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM users WHERE svj_id = :svj AND role IN ('vybor','admin')"
    );
    $stmt->execute([':svj' => $svjId]);
    if ((int)$stmt->fetchColumn() > 0) {
        jsonError(
            'Toto SVJ již má registrovaného správce. Požádejte ho o pozvánku.',
            409, 'SVJ_HAS_ADMIN'
        );
    }

    // Email uniqueness
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => strtolower($email)]);
    if ($stmt->fetch()) {
        recordRateLimit('rl_register_');
        jsonResponse(['error' => ['message' => 'Účet s tímto e-mailem již existuje', 'code' => 'EMAIL_EXISTS']], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $stmt = $db->prepare(
        'INSERT INTO users (email, password_hash, jmeno, prijmeni, role, svj_id)
         VALUES (:email, :hash, :jmeno, :prijmeni, :role, :svj_id)'
    );
    $stmt->execute([
        ':email'    => strtolower($email),
        ':hash'     => $hash,
        ':jmeno'    => $jmeno,
        ':prijmeni' => $prijmeni,
        ':role'     => 'admin',   // zakladatel SVJ = plný správce
        ':svj_id'   => $svjId,
    ]);

    $userId = (int)$db->lastInsertId();
    createSession($userId);
    cleanExpiredSessions();

    jsonResponse([
        'user' => [
            'id'       => $userId,
            'email'    => strtolower($email),
            'jmeno'    => $jmeno,
            'prijmeni' => $prijmeni,
            'role'     => 'admin',
            'svj_id'   => $svjId,
        ],
        'svj' => [
            'ico'   => $svjRow['ico'],
            'nazev' => $svjRow['nazev'],
        ],
    ], 201);
}

function handleLogin(): void
{
    requireMethod('POST');

    $existing = validateSession();
    if ($existing) {
        jsonResponse(['user' => $existing]);
    }

    $body     = getJsonBody();
    $email    = sanitize($body['email']    ?? '');
    $password = $body['password']          ?? '';

    if (!$email || !$password) {
        jsonError('Neplatný e-mail nebo heslo', 401, 'INVALID_CREDENTIALS');
    }
    if (strlen($email) > MAX_EMAIL_LENGTH || strlen($password) > 128) {
        jsonError('Neplatný e-mail nebo heslo', 401, 'INVALID_CREDENTIALS');
    }

    checkRateLimit('rl_login_', LOGIN_MAX_ATTEMPTS,
        'Příliš mnoho neúspěšných pokusů. Zkuste to za 5 minut.');

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT id, email, password_hash, jmeno, prijmeni, role, svj_id
         FROM users WHERE email = :email'
    );
    $stmt->execute([':email' => strtolower($email)]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        recordRateLimit('rl_login_');
        jsonError('Neplatný e-mail nebo heslo', 401, 'INVALID_CREDENTIALS');
    }

    clearRateLimit('rl_login_');
    createSession((int)$user['id']);
    cleanExpiredSessions();

    jsonResponse([
        'user' => [
            'id'       => (int)$user['id'],
            'email'    => $user['email'],
            'jmeno'    => $user['jmeno'],
            'prijmeni' => $user['prijmeni'],
            'role'     => $user['role'],
            'svj_id'   => $user['svj_id'] ? (int)$user['svj_id'] : null,
        ],
    ]);
}

function handleLogout(): void
{
    requireMethod('POST');
    destroySession();
    jsonResponse(['ok' => true]);
}

function handleCheck(): void
{
    requireMethod('GET');
    $user = validateSession();

    if (!$user) {
        jsonResponse(['authenticated' => false, 'user' => null]);
    }

    $svjInfo = null;
    if ($user['svj_id']) {
        $db   = getDb();
        $stmt = $db->prepare('SELECT ico, nazev FROM svj WHERE id = :id');
        $stmt->execute([':id' => $user['svj_id']]);
        $svjInfo = $stmt->fetch() ?: null;
    }

    jsonResponse(['authenticated' => true, 'user' => $user, 'svj' => $svjInfo]);
}
