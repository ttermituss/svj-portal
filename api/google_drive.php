<?php
/**
 * Google Drive storage — API endpoint.
 * Actions: status, enable, disable, syncStart, syncStatus, folderUrl
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'status':     handleStatus();     break;
    case 'enable':     handleEnable();     break;
    case 'disable':    handleDisable();    break;
    case 'syncStart':  handleSyncStart();  break;
    case 'syncStatus': handleSyncStatus(); break;
    case 'folderUrl':  handleFolderUrl();  break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

function handleStatus(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $db = getDb();

    // GDrive storage enabled?
    $stmt = $db->prepare('SELECT gdrive_enabled FROM svj WHERE id = ?');
    $stmt->execute([$svjId]);
    $enabled = (bool) (int) $stmt->fetchColumn();

    // Google connected?
    require_once __DIR__ . '/google_helper.php';
    $googleUser = storageFindGdriveUser($svjId);
    $googleConnected = ($googleUser !== null);

    // SVJ folder created?
    $stmt2 = $db->prepare('SELECT gdrive_folder_id FROM svj WHERE id = ?');
    $stmt2->execute([$svjId]);
    $svjFolderId = $stmt2->fetchColumn() ?: null;

    // Per-module stats
    $modules = storageSyncStatus($svjId);

    // Total files tracked
    $totalStmt = $db->prepare('SELECT COUNT(*) FROM gdrive_files WHERE svj_id = ?');
    $totalStmt->execute([$svjId]);
    $totalFiles = (int) $totalStmt->fetchColumn();

    $syncedStmt = $db->prepare('SELECT COUNT(*) FROM gdrive_files WHERE svj_id = ? AND gdrive_file_id IS NOT NULL');
    $syncedStmt->execute([$svjId]);
    $syncedFiles = (int) $syncedStmt->fetchColumn();

    jsonOk([
        'enabled'          => $enabled,
        'google_connected' => $googleConnected,
        'folder_created'   => (bool) $svjFolderId,
        'svj_folder_id'    => $svjFolderId,
        'total_files'      => $totalFiles,
        'synced_files'     => $syncedFiles,
        'modules'          => $modules,
    ]);
}

function handleEnable(): void
{
    requireMethod('POST');
    $user = requireRole('admin');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];

    // Verify Google is connected
    require_once __DIR__ . '/google_helper.php';
    $googleUser = storageFindGdriveUser($svjId);
    if (!$googleUser) {
        jsonError('Nejdříve připojte Google účet (OAuth)', 400, 'NO_GOOGLE');
    }

    $db = getDb();

    // Enable flag on SVJ
    $db->prepare('UPDATE svj SET gdrive_enabled = 1 WHERE id = ?')->execute([$svjId]);

    // Create root + SVJ folder
    $service = getGdriveService($googleUser, $svjId);
    if ($service) {
        storageEnsureSvjFolder($db, $svjId, $service);
    }

    // Clear cache
    storageIsGdriveActive($svjId);

    jsonOk(['message' => 'Google Drive úložiště aktivováno']);
}

function handleDisable(): void
{
    requireMethod('POST');
    $user = requireRole('admin');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $db = getDb();

    $db->prepare('UPDATE svj SET gdrive_enabled = 0 WHERE id = ?')->execute([$svjId]);

    jsonOk(['message' => 'Google Drive úložiště deaktivováno (soubory zůstávají na obou místech)']);
}

function handleSyncStart(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $body = getJsonBody();
    $module = sanitize($body['module'] ?? 'all');
    $limit = min((int) ($body['limit'] ?? 10), 50);

    if ($module !== 'all' && !isset(STORAGE_MODULES[$module])) {
        jsonError('Neznámý modul', 400, 'INVALID_MODULE');
    }

    $result = storageSync($svjId, $module, $limit);
    jsonOk($result);
}

function handleSyncStatus(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $modules = storageSyncStatus((int) $user['svj_id']);
    jsonOk(['modules' => $modules]);
}

function handleFolderUrl(): void
{
    requireMethod('GET');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $svjId = (int) $user['svj_id'];
    $module = sanitize(getParam('module', ''));

    $db = getDb();

    if ($module && isset(STORAGE_MODULES[$module])) {
        $stmt = $db->prepare('SELECT gdrive_folder_id FROM gdrive_folders WHERE svj_id = ? AND folder_type = ?');
        $stmt->execute([$svjId, $module]);
        $folderId = $stmt->fetchColumn();
    } else {
        $stmt = $db->prepare('SELECT gdrive_folder_id FROM svj WHERE id = ?');
        $stmt->execute([$svjId]);
        $folderId = $stmt->fetchColumn();
    }

    if (!$folderId) {
        jsonError('Složka nebyla vytvořena', 404, 'NO_FOLDER');
    }

    jsonOk(['url' => 'https://drive.google.com/drive/folders/' . $folderId]);
}
