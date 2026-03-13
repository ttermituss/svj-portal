<?php
/**
 * Správa portálu — uživatelé, role, systémová nastavení.
 *
 * GET  ?action=listUsers                    → seznam uživatelů SVJ
 * POST ?action=updateRole {user_id, role}   → změna role (admin)
 * POST ?action=updateUserUnit {user_id, jednotka_id} → přiřazení jednotky
 * POST ?action=deleteUser {user_id}         → smazání uživatele (admin)
 * GET  ?action=getSettings                  → systémová nastavení (admin)
 * POST ?action=updateSetting {key, value}   → uložení nastavení (admin)
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/settings_crypto.php';

$action = getParam('action', '');

switch ($action) {
    case 'listUsers':       handleListUsers();       break;
    case 'updateRole':      handleUpdateRole();      break;
    case 'updateUserUnit':  handleUpdateUserUnit();  break;
    case 'deleteUser':      handleDeleteUser();      break;
    case 'getSettings':     handleGetSettings();     break;
    case 'updateSetting':   handleUpdateSetting();   break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleListUsers(): void
{
    requireMethod('GET');
    $currentUser = requireRole('admin', 'vybor');
    $svjId = requireSvj($currentUser);

    $db   = getDb();
    $stmt = $db->prepare(
        'SELECT u.id, u.email, u.jmeno, u.prijmeni, u.role, u.svj_id,
                u.telefon, u.jednotka_id, u.created_at,
                j.cislo_jednotky
         FROM users u
         LEFT JOIN jednotky j ON j.id = u.jednotka_id
         WHERE u.svj_id = :svj_id
         ORDER BY u.created_at DESC'
    );
    $stmt->execute([':svj_id' => $svjId]);
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['id']          = (int)$u['id'];
        $u['svj_id']      = $u['svj_id']     !== null ? (int)$u['svj_id']     : null;
        $u['jednotka_id'] = $u['jednotka_id'] !== null ? (int)$u['jednotka_id'] : null;
    }
    unset($u);

    jsonResponse(['users' => $users]);
}

function handleUpdateUserUnit(): void
{
    requireMethod('POST');
    $currentUser = requireRole('admin', 'vybor');
    $svjId       = requireSvj($currentUser);

    $body       = getJsonBody();
    $userId     = isset($body['user_id']) ? (int)$body['user_id'] : 0;
    $jednotkaId = (isset($body['jednotka_id']) && $body['jednotka_id'] !== '' && $body['jednotka_id'] !== null)
        ? (int)$body['jednotka_id'] : null;

    if (!$userId) jsonError('Chybí user_id', 422, 'VALIDATION_ERROR');

    $db = getDb();

    // Tenant isolation — user musí patřit do SVJ
    $chk = $db->prepare('SELECT id FROM users WHERE id = :id AND svj_id = :svj_id');
    $chk->execute([':id' => $userId, ':svj_id' => $svjId]);
    if (!$chk->fetch()) jsonError('Uživatel nenalezen', 404, 'NOT_FOUND');

    // Tenant isolation — jednotka musí patřit do SVJ
    if ($jednotkaId !== null) {
        $chk = $db->prepare('SELECT id FROM jednotky WHERE id = :id AND svj_id = :svj_id');
        $chk->execute([':id' => $jednotkaId, ':svj_id' => $svjId]);
        if (!$chk->fetch()) jsonError('Jednotka nenalezena', 404, 'NOT_FOUND');
    }

    $db->prepare('UPDATE users SET jednotka_id = :jid WHERE id = :id')
       ->execute([':jid' => $jednotkaId, ':id' => $userId]);

    jsonResponse(['ok' => true]);
}

function handleUpdateRole(): void
{
    requireMethod('POST');
    $currentUser = requireRole('admin');
    $svjId = requireSvj($currentUser);

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
    $stmt = $db->prepare('SELECT id FROM users WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $userId, ':svj_id' => $svjId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => ['message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND']], 404);
    }

    $stmt = $db->prepare('UPDATE users SET role = :role WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':role' => $role, ':id' => $userId, ':svj_id' => $svjId]);

    jsonResponse(['ok' => true]);
}

function handleDeleteUser(): void
{
    requireMethod('POST');
    $currentUser = requireRole('admin');
    $svjId = requireSvj($currentUser);

    $body = getJsonBody();

    $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;

    if (!$userId) {
        jsonResponse(['error' => ['message' => 'Chybí user_id', 'code' => 'VALIDATION_ERROR']], 422);
    }

    if ($userId === (int)$currentUser['id']) {
        jsonResponse(['error' => ['message' => 'Nemůžete smazat svůj vlastní účet', 'code' => 'VALIDATION_ERROR']], 422);
    }

    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM users WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $userId, ':svj_id' => $svjId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => ['message' => 'Uživatel nenalezen', 'code' => 'NOT_FOUND']], 404);
    }

    // Smazat sessions uživatele
    $db->prepare('DELETE FROM sessions WHERE user_id = :id')->execute([':id' => $userId]);

    $stmt = $db->prepare('DELETE FROM users WHERE id = :id AND svj_id = :svj_id');
    $stmt->execute([':id' => $userId, ':svj_id' => $svjId]);

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

    foreach ($settings as &$s) {
        if (isSecretSettingKey($s['key'])) {
            $s['value'] = decryptSetting($s['value'] ?? '');
        }
    }
    unset($s);

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

    $storeValue = isSecretSettingKey($key) ? encryptSetting($value) : $value;

    $stmt = $db->prepare('UPDATE settings SET value = :value WHERE `key` = :key');
    $stmt->execute([':value' => $storeValue, ':key' => $key]);

    jsonResponse(['ok' => true]);
}
