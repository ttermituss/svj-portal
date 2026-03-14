<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/session.php';

function requireAuth(): array
{
    $user = validateSession();
    if (!$user) jsonError('Nepřihlášen', 401, 'UNAUTHORIZED');

    // POST rate limit — přihlášení uživatelé: max 120 POST requestů za minutu
    // Klíč: user_id (ne IP) → izolovaný per-user, odolný vůči NAT
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        requirePostRateLimit((int) $user['id']);
    }

    return $user;
}

function requireRole(string ...$roles): array
{
    $user = requireAuth();
    if (!in_array($user['role'], $roles, true)) jsonError('Nedostatečná oprávnění', 403, 'FORBIDDEN');
    return $user;
}

/**
 * Vyžaduje přiřazené SVJ u přihlášeného uživatele.
 * Vrací svj_id (int) — použít místo opakovaného if (!$user['svj_id']) jsonError(...)
 */
function requireSvj(array $user): int
{
    $svjId = (int) ($user['svj_id'] ?? 0);
    if (!$svjId) jsonError('Není přiřazeno SVJ', 403, 'NO_SVJ');
    return $svjId;
}

/**
 * DB-based POST rate limit pro přihlášené uživatele.
 * Klíč: user_id (ne IP) — izolovaný per-user, odolný vůči shared-IP (NAT).
 * Fixed window: max $max requestů za $windowSec sekund.
 * Reuse stávající tabulky rate_limits (checkRateLimit / recordRateLimit).
 *
 * Automaticky voláno z requireAuth() pro POST requesty.
 */
function requirePostRateLimit(int $userId, int $max = 120, int $windowSec = 60): void
{
    $db   = getDb();
    $slot = (int) floor(time() / $windowSec);
    $key  = 'post_u' . $userId . '_' . $slot;
    $end  = date('Y-m-d H:i:s', ($slot + 1) * $windowSec);

    $stmt = $db->prepare('SELECT attempts FROM rate_limits WHERE `key` = :k AND window_end > NOW()');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch();

    if ($row && (int)$row['attempts'] >= $max) {
        jsonError('Příliš mnoho požadavků, zkuste za chvíli', 429, 'RATE_LIMITED');
    }

    $db->prepare(
        'INSERT INTO rate_limits (`key`, attempts, window_end) VALUES (:k, 1, :e)
         ON DUPLICATE KEY UPDATE attempts = attempts + 1'
    )->execute([':k' => $key, ':e' => $end]);
}

/** Max velikosti uploadů (bytes) */
const UPLOAD_MAX_AVATAR    = 2  * 1024 * 1024;  // 2 MB
const UPLOAD_MAX_PHOTO     = 5  * 1024 * 1024;  // 5 MB (závady)
const UPLOAD_MAX_STANDARD  = 10 * 1024 * 1024;  // 10 MB (revize, fond, PENB, datovka)
const UPLOAD_MAX_DOCUMENT  = 20 * 1024 * 1024;  // 20 MB (dokumenty)
