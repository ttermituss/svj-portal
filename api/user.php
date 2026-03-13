<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';

$action = getParam('action', '');

switch ($action) {
    case 'profile':        handleProfile();        break;
    case 'updateProfile':  handleUpdateProfile();  break;
    case 'changePassword': handleChangePassword(); break;
    case 'updateNotifPrefs': handleUpdateNotifPrefs(); break;
    case 'getNotifPrefs':    handleGetNotifPrefs();    break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleProfile(): void
{
    requireMethod('GET');
    $user = requireAuth();

    $svjInfo = null;
    if ($user['svj_id']) {
        $db = getDb();
        $stmt = $db->prepare('SELECT * FROM svj WHERE id = :id');
        $stmt->execute([':id' => $user['svj_id']]);
        $svjInfo = $stmt->fetch() ?: null;
    }

    jsonResponse(['user' => $user, 'svj' => $svjInfo]);
}

function handleUpdateProfile(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $body = getJsonBody();

    $jmeno    = sanitize($body['jmeno']    ?? '');
    $prijmeni = sanitize($body['prijmeni'] ?? '');
    $email    = sanitize($body['email']    ?? '');
    $telefon  = sanitize($body['telefon']  ?? '');

    if (!$jmeno) {
        jsonResponse(['error' => ['message' => 'Jméno nesmí být prázdné', 'code' => 'VALIDATION_ERROR']], 422);
    }
    if (strlen($jmeno) > 100 || strlen($prijmeni) > 100) {
        jsonResponse(['error' => ['message' => 'Jméno nebo příjmení je příliš dlouhé', 'code' => 'VALIDATION_ERROR']], 422);
    }
    if (strlen($telefon) > 20) {
        jsonResponse(['error' => ['message' => 'Telefon je příliš dlouhý (max 20 znaků)', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();

    // Změna e-mailu (volitelná)
    if ($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
            jsonResponse(['error' => ['message' => 'Neplatný formát e-mailu', 'code' => 'VALIDATION_ERROR']], 422);
        }
        $emailLower = strtolower($email);
        // Ověřit že e-mail nepoužívá jiný uživatel
        $stmt = $db->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
        $stmt->execute([':email' => $emailLower, ':id' => $user['id']]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => ['message' => 'Tento e-mail je již použit', 'code' => 'EMAIL_EXISTS']], 409);
        }
        $db->prepare('UPDATE users SET jmeno=:jmeno, prijmeni=:prijmeni, email=:email, telefon=:telefon WHERE id=:id')
           ->execute([':jmeno' => $jmeno, ':prijmeni' => $prijmeni, ':email' => $emailLower,
                      ':telefon' => $telefon ?: null, ':id' => $user['id']]);
    } else {
        $db->prepare('UPDATE users SET jmeno=:jmeno, prijmeni=:prijmeni, telefon=:telefon WHERE id=:id')
           ->execute([':jmeno' => $jmeno, ':prijmeni' => $prijmeni,
                      ':telefon' => $telefon ?: null, ':id' => $user['id']]);
    }

    jsonResponse(['ok' => true]);
}

function handleChangePassword(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $body = getJsonBody();

    $oldPassword = $body['old_password'] ?? '';
    $newPassword = $body['new_password'] ?? '';

    if (!$oldPassword || !$newPassword) {
        jsonResponse(['error' => ['message' => 'Vyplňte všechna pole', 'code' => 'VALIDATION_ERROR']], 422);
    }
    if (strlen($newPassword) < 8) {
        jsonResponse(['error' => ['message' => 'Nové heslo musí mít alespoň 8 znaků', 'code' => 'VALIDATION_ERROR']], 422);
    }
    if (strlen($newPassword) > 128) {
        jsonResponse(['error' => ['message' => 'Nové heslo je příliš dlouhé (max 128 znaků)', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = :id');
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($oldPassword, $row['password_hash'])) {
        jsonResponse(['error' => ['message' => 'Stávající heslo není správné', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $stmt = $db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $stmt->execute([':hash' => $newHash, ':id' => $user['id']]);

    jsonResponse(['ok' => true]);
}

function handleGetNotifPrefs(): void
{
    requireMethod('GET');
    $user = requireAuth();

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT notif_udalosti, notif_zavady, notif_hlasovani, notif_revize, notif_fond FROM users WHERE id = :id'
    );
    $stmt->execute([':id' => $user['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    jsonOk([
        'notif_udalosti'  => (int) $row['notif_udalosti'],
        'notif_zavady'    => (int) $row['notif_zavady'],
        'notif_hlasovani' => (int) $row['notif_hlasovani'],
        'notif_revize'    => (int) $row['notif_revize'],
        'notif_fond'      => (int) $row['notif_fond'],
    ]);
}

function handleUpdateNotifPrefs(): void
{
    requireMethod('POST');
    $user = requireAuth();
    $body = getJsonBody();

    $fields = ['notif_udalosti', 'notif_zavady', 'notif_hlasovani', 'notif_revize', 'notif_fond'];
    $updates = [];
    $params = [':id' => $user['id']];

    foreach ($fields as $f) {
        if (isset($body[$f])) {
            $updates[] = "$f = :$f";
            $params[":$f"] = $body[$f] ? 1 : 0;
        }
    }

    if (empty($updates)) jsonError('Žádné změny', 422, 'VALIDATION_ERROR');

    $db = getDb();
    $db->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :id')
       ->execute($params);

    jsonOk(['ok' => true]);
}

// updateSvj záměrně odstraněno — přiřazení SVJ probíhá výhradně přes invite tokeny.
// Přímá změna svj_id uživatelem byla security hole (tenant isolation bypass).
