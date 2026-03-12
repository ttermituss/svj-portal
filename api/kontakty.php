<?php
/**
 * Kontakty — servisní firmy a řemeslníci SVJ
 * Actions: list, save, delete
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/middleware.php';

$user   = requireAuth();
$svjId  = $user['svj_id'];
$action = getParam('action', 'list');

if (!$svjId) jsonError('Není přiřazeno SVJ', 403);

switch ($action) {
    case 'list':   handleList($svjId); break;
    case 'save':   handleSave($user, $svjId); break;
    case 'delete': handleDelete($user, $svjId); break;
    default:       jsonError('Neznámá akce', 400);
}

/* ── List ─────────────────────────────────────────── */
function handleList(int $svjId): void
{
    $db = getDb();
    $st = $db->prepare('
        SELECT id, nazev, kategorie, telefon, email, web, adresa, poznamka,
               created_at, updated_at
        FROM kontakty
        WHERE svj_id = ?
        ORDER BY kategorie, nazev
    ');
    $st->execute([$svjId]);
    jsonOk(['kontakty' => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

/* ── Save (insert / update) ───────────────────────── */
function handleSave(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');
    requireMethod('POST');

    $body = getJsonBody();
    $id       = intval($body['id'] ?? 0);
    $nazev    = trim(strip_tags($body['nazev'] ?? ''));
    $kat      = trim($body['kategorie'] ?? 'jine');
    $telefon  = trim(strip_tags($body['telefon'] ?? ''));
    $email    = trim(strip_tags($body['email'] ?? ''));
    $web      = trim(strip_tags($body['web'] ?? ''));
    $adresa   = trim(strip_tags($body['adresa'] ?? ''));
    $poznamka = trim(strip_tags($body['poznamka'] ?? ''));

    if ($nazev === '') jsonError('Název je povinný', 400);

    $validKat = ['spravce','vytah','elektro','plyn','voda','topeni',
                 'klicova_sluzba','uklid','zahradnik','pojistovna','ucetni','jine'];
    if (!in_array($kat, $validKat)) $kat = 'jine';

    $db = getDb();

    if ($id > 0) {
        // update — ověříme tenant
        $st = $db->prepare('
            UPDATE kontakty
            SET nazev = ?, kategorie = ?, telefon = ?, email = ?, web = ?, adresa = ?, poznamka = ?
            WHERE id = ? AND svj_id = ?
        ');
        $st->execute([$nazev, $kat, $telefon, $email, $web, $adresa, $poznamka, $id, $svjId]);
    } else {
        $st = $db->prepare('
            INSERT INTO kontakty (svj_id, nazev, kategorie, telefon, email, web, adresa, poznamka)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $st->execute([$svjId, $nazev, $kat, $telefon, $email, $web, $adresa, $poznamka]);
        $id = (int) $db->lastInsertId();
    }

    jsonOk(['id' => $id]);
}

/* ── Delete ───────────────────────────────────────── */
function handleDelete(array $user, int $svjId): void
{
    requireRole('admin', 'vybor');
    requireMethod('POST');

    $body = getJsonBody();
    $id   = intval($body['id'] ?? 0);
    if ($id <= 0) jsonError('Chybí ID', 400);

    $db = getDb();
    $st = $db->prepare('DELETE FROM kontakty WHERE id = ? AND svj_id = ?');
    $st->execute([$id, $svjId]);

    jsonOk(['deleted' => $st->rowCount()]);
}
