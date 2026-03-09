<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';

$action = getParam('action', '');

switch ($action) {
    case 'listUsers':     handleListUsers();     break;
    case 'updateRole':    handleUpdateRole();    break;
    case 'deleteUser':    handleDeleteUser();    break;
    case 'getSettings':   handleGetSettings();   break;
    case 'updateSetting': handleUpdateSetting(); break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleListUsers(): void
{
    requireMethod('GET');
    requireRole('admin', 'vybor');

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id, email, jmeno, prijmeni, role, svj_id, created_at FROM users ORDER BY created_at DESC'
    );
    $stmt->execute();
    $users = $stmt->fetchAll();

    // Přetypovat id a svj_id na int
    foreach ($users as &$u) {
        $u['id']     = (int)$u['id'];
        $u['svj_id'] = $u['svj_id'] !== null ? (int)$u['svj_id'] : null;
    }
    unset($u);

    jsonResponse(['users' => $users]);
}

function handleUpdateRole(): void
{
    requireMethod('POST');
    $currentUser = requireRole('admin');
    $body = getJsonBody();

    $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;
    $role   = sanitize($body['role'] ?? '');

    if (!$userId) {
        jsonResponse(['error' => ['message' => 'Chybí user_id', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $allowedRoles = ['vlastnik', 'vybor', 'admin'];
    if (!in_array($role, $allowedRoles, true)) {
        jsonResponse(['error' => ['message' => 'Neplatná role', 'code' => 'VALIDATION_ERROR']], 422);
    }

    if ($userId === (int)$currentUser['id']) {
        jsonResponse(['error' => ['message' => 'Nemůžete změnit svou vlastní roli', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => ['message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND']], 404);
    }

    $stmt = $db->prepare('UPDATE users SET role = :role WHERE id = :id');
    $stmt->execute([':role' => $role, ':id' => $userId]);

    jsonResponse(['ok' => true]);
}

function handleDeleteUser(): void
{
    requireMethod('POST');
    $currentUser = requireRole('admin');
    $body = getJsonBody();

    $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;

    if (!$userId) {
        jsonResponse(['error' => ['message' => 'Chybí user_id', 'code' => 'VALIDATION_ERROR']], 422);
    }

    if ($userId === (int)$currentUser['id']) {
        jsonResponse(['error' => ['message' => 'Nemůžete smazat svůj vlastní účet', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => ['message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND']], 404);
    }

    // Smazat sessions uživatele
    $db->prepare('DELETE FROM sessions WHERE user_id = :id')->execute([':id' => $userId]);

    $stmt = $db->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);

    jsonResponse(['ok' => true]);
}

function handleGetSettings(): void
{
    requireMethod('GET');
    requireRole('admin');

    $db = getDb();
    $stmt = $db->prepare('SELECT `key`, value, label FROM settings ORDER BY `key`');
    $stmt->execute();
    $settings = $stmt->fetchAll();

    jsonResponse(['settings' => $settings]);
}

function handleUpdateSetting(): void
{
    requireMethod('POST');
    requireRole('admin');
    $body = getJsonBody();

    $key   = sanitize($body['key']   ?? '');
    $value = $body['value'] ?? '';

    if (!$key) {
        jsonResponse(['error' => ['message' => 'Chybí klíč nastavení', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();
    $stmt = $db->prepare('SELECT `key` FROM settings WHERE `key` = :key');
    $stmt->execute([':key' => $key]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => ['message' => 'Neznámý klíč nastavení', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $stmt = $db->prepare('UPDATE settings SET value = :value WHERE `key` = :key');
    $stmt->execute([':value' => $value, ':key' => $key]);

    jsonResponse(['ok' => true]);
}
