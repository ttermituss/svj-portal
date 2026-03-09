<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ratelimit.php';

define('LOGIN_MAX_ATTEMPTS',    10);
define('REGISTER_MAX_ATTEMPTS',  5);

$action = getParam('action', '');

switch ($action) {
    case 'register': handleRegister(); break;
    case 'login':    handleLogin();    break;
    case 'logout':   handleLogout();   break;
    case 'check':    handleCheck();    break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleRegister(): void
{
    requireMethod('POST');

    if (validateSession()) {
        jsonError('Již jste přihlášeni', 400, 'ALREADY_AUTHENTICATED');
    }

    // Rate limiting registrace (5 účtů / 5 min z jedné IP)
    checkRateLimit('rl_register_', REGISTER_MAX_ATTEMPTS,
        'Příliš mnoho registrací. Zkuste to za 5 minut.');

    $body = getJsonBody();

    $email    = sanitize($body['email']    ?? '');
    $password = $body['password']          ?? '';
    $jmeno    = sanitize($body['jmeno']    ?? '');
    $prijmeni = sanitize($body['prijmeni'] ?? '');
    $svjId    = isset($body['svj_id']) ? (int)$body['svj_id'] : null;

    if (strlen($email) > 255 || strlen($password) > 128 ||
        strlen($jmeno) > 100 || strlen($prijmeni) > 100) {
        jsonError('Vstup je příliš dlouhý', 400, 'VALIDATION_ERROR');
    }

    $errors = [];
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = ['Zadejte platný e-mail'];
    }
    if (strlen($password) < 8) {
        $errors['password'] = ['Heslo musí mít alespoň 8 znaků'];
    }
    if (!$jmeno) {
        $errors['jmeno'] = ['Zadejte jméno'];
    }

    if ($errors) {
        jsonResponse(['error' => ['message' => 'Chyby ve formuláři', 'code' => 'VALIDATION_ERROR', 'fields' => $errors]], 422);
    }

    if ($svjId !== null) {
        $db   = getDb();
        $stmt = $db->prepare('SELECT id FROM svj WHERE id = :id');
        $stmt->execute([':id' => $svjId]);
        if (!$stmt->fetch()) {
            $svjId = null;
        }
    }

    $db   = getDb();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => strtolower($email)]);
    if ($stmt->fetch()) {
        // Zaznamenat jako neúspěšný pokus (email už existuje = potenciální enumeration spam)
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
        ':role'     => 'vlastnik',
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
            'role'     => 'vlastnik',
            'svj_id'   => $svjId,
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
    if (strlen($email) > 255 || strlen($password) > 128) {
        jsonError('Neplatný e-mail nebo heslo', 401, 'INVALID_CREDENTIALS');
    }

    // Rate limiting přihlášení (10 pokusů / 5 min z jedné IP)
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

    // Úspěch — smaž počítadlo pro tuto IP
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

/* ===== Rate limiting — FIXED window =====
 *
 * window_end se nastavuje POUZE při prvním záznamu (INSERT).
 * Při každém dalším pokusu se jen inkrementuje attempts — okno se NEPOSOUVÁ.
 * Útočník tedy nemůže donekonečna resetovat okno tím, že čeká 4:59 minut.
 */

