<?php
/**
 * Revize — evidence revizí a kontrol
 * Actions: list, save, delete, download, historieList, historieSave, historieDelete, historieDownload
 */
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/storage_helper.php';

$action = getParam('action', '');

switch ($action) {
    case 'list':            handleList();            break;
    case 'save':            handleSave();            break;
    case 'delete':          handleDelete();          break;
    case 'download':        handleDownload();        break;
    case 'historieList':    handleHistorieList();    break;
    case 'historieSave':    handleHistorieSave();    break;
    case 'historieDelete':  handleHistorieDelete();  break;
    case 'historieDownload':handleHistorieDownload();break;
    default: jsonError('Neznámá akce', 400, 'UNKNOWN_ACTION');
}

/* ── List ─────────────────────────────────────────── */
function handleList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $db = getDb();

    // Revize + kontakt jméno + počet záznamů v historii
    $stmt = $db->prepare('
        SELECT r.id, r.typ, r.nazev, r.datum_posledni, r.interval_mesice, r.datum_pristi,
               r.soubor_nazev, r.poznamka, r.kontakt_id, r.naklady, r.pripomenout_dni,
               k.nazev AS kontakt_nazev,
               (SELECT COUNT(*) FROM revize_historie rh WHERE rh.revize_id = r.id) AS historie_pocet
        FROM revize r
        LEFT JOIN kontakty k ON k.id = r.kontakt_id AND k.svj_id = r.svj_id
        WHERE r.svj_id = ?
        ORDER BY r.datum_pristi ASC, r.nazev ASC
    ');
    $stmt->execute([$user['svj_id']]);
    jsonOk(['revize' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ── Save (insert / update) ───────────────────────── */
function handleSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id             = (int) ($_POST['id'] ?? 0);
    $typ            = sanitize($_POST['typ'] ?? '');
    $nazev          = sanitize($_POST['nazev'] ?? '');
    $datumPosledni  = sanitize($_POST['datum_posledni'] ?? '');
    $intervalMesice = isset($_POST['interval_mesice']) && $_POST['interval_mesice'] !== ''
                      ? (int) $_POST['interval_mesice'] : null;
    $datumPristi    = sanitize($_POST['datum_pristi'] ?? '');
    $poznamka       = sanitize($_POST['poznamka'] ?? '');
    $kontaktId      = isset($_POST['kontakt_id']) && $_POST['kontakt_id'] !== ''
                      ? (int) $_POST['kontakt_id'] : null;
    $naklady        = isset($_POST['naklady']) && $_POST['naklady'] !== ''
                      ? (float) $_POST['naklady'] : null;
    $pripomenoutDni = isset($_POST['pripomenout_dni']) && $_POST['pripomenout_dni'] !== ''
                      ? (int) $_POST['pripomenout_dni'] : null;

    $allowedTypy = ['vytah', 'elektro', 'plyn', 'hromosvod', 'hasici', 'jine'];
    if (!in_array($typ, $allowedTypy, true)) jsonError('Neplatný typ revize', 400, 'INVALID_TYP');
    if (!$nazev) jsonError('Název je povinný', 400, 'MISSING_NAZEV');
    if (!$datumPosledni || !strtotime($datumPosledni)) jsonError('Neplatné datum poslední revize', 400, 'INVALID_DATE');

    if ($datumPristi && !strtotime($datumPristi)) jsonError('Neplatné datum příští revize', 400, 'INVALID_DATE');
    if (!$datumPristi && $intervalMesice) {
        $dt = new DateTime($datumPosledni);
        $dt->modify("+{$intervalMesice} months");
        $datumPristi = $dt->format('Y-m-d');
    }

    $db = getDb();

    if ($id) {
        $chk = $db->prepare('SELECT id, soubor_cesta FROM revize WHERE id = ? AND svj_id = ?');
        $chk->execute([$id, $user['svj_id']]);
        $existing = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$existing) jsonError('Revize nenalezena', 404, 'NOT_FOUND');
    }

    $souborNazev = $id ? ($existing['soubor_nazev'] ?? null) : null;
    $souborCesta = $id ? ($existing['soubor_cesta'] ?? null) : null;

    // Upload PDF protokolu
    $gdriveWarning = null;
    if (!empty($_FILES['soubor']) && $_FILES['soubor']['error'] !== UPLOAD_ERR_NO_FILE) {
        $result = revizeUploadPdf($_FILES['soubor'], $user['svj_id'], $souborCesta);
        $souborNazev = $result['nazev'];
        $souborCesta = $result['cesta'];
        $gdriveWarning = $result['gdrive_warning'] ?? null;
    }

    if ($id) {
        $db->prepare('
            UPDATE revize SET typ=?, nazev=?, datum_posledni=?, interval_mesice=?,
                datum_pristi=?, soubor_nazev=?, soubor_cesta=?, poznamka=?,
                kontakt_id=?, naklady=?, pripomenout_dni=?
            WHERE id=?
        ')->execute([
            $typ, $nazev, $datumPosledni, $intervalMesice,
            $datumPristi ?: null, $souborNazev, $souborCesta, $poznamka ?: null,
            $kontaktId, $naklady, $pripomenoutDni, $id,
        ]);
    } else {
        $db->prepare('
            INSERT INTO revize (svj_id, typ, nazev, datum_posledni, interval_mesice,
                datum_pristi, soubor_nazev, soubor_cesta, poznamka, kontakt_id, naklady, pripomenout_dni)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $user['svj_id'], $typ, $nazev, $datumPosledni, $intervalMesice,
            $datumPristi ?: null, $souborNazev, $souborCesta, $poznamka ?: null,
            $kontaktId, $naklady, $pripomenoutDni,
        ]);
    }

    // Notifikace při blížící se revizi
    if ($pripomenoutDni && $datumPristi) {
        revizeScheduleNotif($db, $user['svj_id'], $nazev, $datumPristi, $pripomenoutDni);
    }

    $resp = ['message' => 'Revize uložena'];
    if ($gdriveWarning) $resp['gdrive_warning'] = $gdriveWarning;
    jsonOk($resp);
}

/* ── Delete ───────────────────────────────────────── */
function handleDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $db  = getDb();
    $row = $db->prepare('SELECT id, soubor_cesta FROM revize WHERE id = ? AND svj_id = ?');
    $row->execute([$id, $user['svj_id']]);
    $row = $row->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Revize nenalezena', 404, 'NOT_FOUND');

    // Smazat soubory historie
    $svjId = (int) $user['svj_id'];
    $hist = $db->prepare('SELECT soubor_cesta FROM revize_historie WHERE revize_id = ?');
    $hist->execute([$id]);
    while ($h = $hist->fetch(PDO::FETCH_ASSOC)) {
        if ($h['soubor_cesta']) {
            storageDelete($svjId, 'uploads/revize/' . basename($h['soubor_cesta']));
        }
    }

    if ($row['soubor_cesta']) {
        storageDelete($svjId, 'uploads/revize/' . basename($row['soubor_cesta']));
    }

    $db->prepare('DELETE FROM revize WHERE id = ?')->execute([$id]);
    jsonOk();
}

/* ── Download PDF ─────────────────────────────────── */
function handleDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400, 'MISSING_ID');

    $stmt = getDb()->prepare('SELECT soubor_cesta, soubor_nazev FROM revize WHERE id = ? AND svj_id = ?');
    $stmt->execute([$id, $user['svj_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !$row['soubor_cesta']) jsonError('Soubor nenalezen', 404, 'NOT_FOUND');
    servePdf($row['soubor_cesta'], $row['soubor_nazev'], (int) $user['svj_id']);
}

/* ── Historie: List ───────────────────────────────── */
function handleHistorieList(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $revizeId = (int) getParam('revize_id', 0);
    if (!$revizeId) jsonError('Chybí revize_id', 400);

    $db = getDb();
    $st = $db->prepare('
        SELECT rh.id, rh.datum_revize, rh.vysledek, rh.naklady, rh.kontakt_id,
               rh.soubor_nazev, rh.poznamka, rh.created_at,
               k.nazev AS kontakt_nazev
        FROM revize_historie rh
        LEFT JOIN kontakty k ON k.id = rh.kontakt_id AND k.svj_id = rh.svj_id
        WHERE rh.revize_id = ? AND rh.svj_id = ?
        ORDER BY rh.datum_revize DESC
    ');
    $st->execute([$revizeId, $user['svj_id']]);
    jsonOk(['historie' => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ── Historie: Save ───────────────────────────────── */
function handleHistorieSave(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $revizeId    = (int) ($_POST['revize_id'] ?? 0);
    $id          = (int) ($_POST['id'] ?? 0);
    $datumRevize = sanitize($_POST['datum_revize'] ?? '');
    $vysledek    = sanitize($_POST['vysledek'] ?? 'ok');
    $naklady     = isset($_POST['naklady']) && $_POST['naklady'] !== '' ? (float) $_POST['naklady'] : null;
    $kontaktId   = isset($_POST['kontakt_id']) && $_POST['kontakt_id'] !== '' ? (int) $_POST['kontakt_id'] : null;
    $poznamka    = sanitize($_POST['poznamka'] ?? '');

    if (!$revizeId) jsonError('Chybí revize_id', 400);
    if (!$datumRevize || !strtotime($datumRevize)) jsonError('Neplatné datum', 400);

    $validVysledky = ['ok', 'zavady', 'nezpusobile'];
    if (!in_array($vysledek, $validVysledky)) $vysledek = 'ok';

    $db = getDb();

    // Ověříme vlastnictví revize
    $chk = $db->prepare('SELECT id FROM revize WHERE id = ? AND svj_id = ?');
    $chk->execute([$revizeId, $user['svj_id']]);
    if (!$chk->fetch()) jsonError('Revize nenalezena', 404);

    $souborNazev = null;
    $souborCesta = null;

    if ($id > 0) {
        $ex = $db->prepare('SELECT soubor_cesta FROM revize_historie WHERE id = ? AND svj_id = ?');
        $ex->execute([$id, $user['svj_id']]);
        $existing = $ex->fetch(PDO::FETCH_ASSOC);
        if (!$existing) jsonError('Záznam nenalezen', 404);
        $souborCesta = $existing['soubor_cesta'];
    }

    $histGdriveWarning = null;
    if (!empty($_FILES['soubor']) && $_FILES['soubor']['error'] !== UPLOAD_ERR_NO_FILE) {
        $result = revizeUploadPdf($_FILES['soubor'], $user['svj_id'], $souborCesta);
        $souborNazev = $result['nazev'];
        $souborCesta = $result['cesta'];
        $histGdriveWarning = $result['gdrive_warning'] ?? null;
    }

    if ($id > 0) {
        $db->prepare('
            UPDATE revize_historie SET datum_revize=?, vysledek=?, naklady=?,
                kontakt_id=?, soubor_nazev=?, soubor_cesta=?, poznamka=?
            WHERE id=? AND svj_id=?
        ')->execute([
            $datumRevize, $vysledek, $naklady,
            $kontaktId, $souborNazev, $souborCesta, $poznamka ?: null,
            $id, $user['svj_id'],
        ]);
    } else {
        $db->prepare('
            INSERT INTO revize_historie (revize_id, svj_id, datum_revize, vysledek, naklady,
                kontakt_id, soubor_nazev, soubor_cesta, poznamka)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $revizeId, $user['svj_id'], $datumRevize, $vysledek, $naklady,
            $kontaktId, $souborNazev, $souborCesta, $poznamka ?: null,
        ]);
    }

    $resp = ['message' => 'Záznam uložen'];
    if ($histGdriveWarning) $resp['gdrive_warning'] = $histGdriveWarning;
    jsonOk($resp);
}

/* ── Historie: Delete ─────────────────────────────── */
function handleHistorieDelete(): void
{
    requireMethod('POST');
    $user = requireRole('admin', 'vybor');
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400);

    $db  = getDb();
    $row = $db->prepare('SELECT soubor_cesta FROM revize_historie WHERE id = ? AND svj_id = ?');
    $row->execute([$id, $user['svj_id']]);
    $row = $row->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Záznam nenalezen', 404);

    if ($row['soubor_cesta']) {
        storageDelete((int) $user['svj_id'], 'uploads/revize/' . basename($row['soubor_cesta']));
    }

    $db->prepare('DELETE FROM revize_historie WHERE id = ?')->execute([$id]);
    jsonOk();
}

/* ── Historie: Download PDF ───────────────────────── */
function handleHistorieDownload(): void
{
    requireMethod('GET');
    $user = requireAuth();
    if (!$user['svj_id']) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');

    $id = (int) getParam('id', 0);
    if (!$id) jsonError('Chybí ID', 400);

    $st = getDb()->prepare('SELECT soubor_cesta, soubor_nazev FROM revize_historie WHERE id = ? AND svj_id = ?');
    $st->execute([$id, $user['svj_id']]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if (!$row || !$row['soubor_cesta']) jsonError('Soubor nenalezen', 404);
    servePdf($row['soubor_cesta'], $row['soubor_nazev'], (int) $user['svj_id']);
}

/* ── Helpers ──────────────────────────────────────── */

function revizeUploadPdf(array $file, int $svjId, ?string $oldCesta): array
{
    if ($file['error'] !== UPLOAD_ERR_OK) jsonError('Chyba při nahrávání souboru', 400);
    if ($file['size'] > 10 * 1024 * 1024) jsonError('Soubor je příliš velký (max 10 MB)', 413);

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if ($mime !== 'application/pdf') jsonError('Povoleny jsou pouze soubory PDF', 415);

    if ($oldCesta) {
        storageDelete($svjId, 'uploads/revize/' . basename($oldCesta));
    }

    $filename = $svjId . '_' . bin2hex(random_bytes(8)) . '.pdf';
    $storage = storageUpload($svjId, 'revize', $file, $filename, $file['name']);

    return [
        'nazev'          => basename($file['name']),
        'cesta'          => $filename,
        'gdrive_warning' => $storage['gdrive_error'] ?? null,
    ];
}

function servePdf(string $cesta, ?string $nazev, int $svjId = 0): never
{
    $relPath = 'uploads/revize/' . basename($cesta);
    $path = $svjId > 0 ? storageDownload($svjId, $relPath) : (__DIR__ . '/../' . $relPath);
    if (!file_exists($path)) jsonError('Soubor nenalezen na disku', 404);

    $nazev = $nazev ?: 'revize.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . rawurlencode($nazev) . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function revizeScheduleNotif(PDO $db, int $svjId, string $nazev, string $datumPristi, int $dni): void
{
    $notifDatum = (new DateTime($datumPristi))->modify("-{$dni} days")->format('Y-m-d');
    $dnes = date('Y-m-d');
    if ($notifDatum < $dnes) return; // Již prošlo

    // Najdi uživatele s notif_revize = 1
    $st = $db->prepare('SELECT id FROM users WHERE svj_id = ? AND notif_revize = 1');
    $st->execute([$svjId]);
    $users = $st->fetchAll(PDO::FETCH_COLUMN);

    $msg = "Revize \"{$nazev}\" vyprší " . date('j.n.Y', strtotime($datumPristi))
         . " (za {$dni} dní)";

    foreach ($users as $userId) {
        // Zkontroluj duplicitu
        $dup = $db->prepare('SELECT id FROM notifikace WHERE user_id=? AND zprava=? AND typ=?');
        $dup->execute([$userId, $msg, 'revize']);
        if ($dup->fetch()) continue;

        $db->prepare('
            INSERT INTO notifikace (user_id, svj_id, typ, zprava, odkaz_hash)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([$userId, $svjId, 'revize', $msg, '#admin']);
    }
}
