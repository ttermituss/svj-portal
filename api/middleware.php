<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/session.php';

function requireAuth(): array
{
    $user = validateSession();
    if (!$user) jsonError('Nepřihlášen', 401, 'UNAUTHORIZED');
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

/** Max velikosti uploadů (bytes) */
const UPLOAD_MAX_AVATAR    = 2  * 1024 * 1024;  // 2 MB
const UPLOAD_MAX_PHOTO     = 5  * 1024 * 1024;  // 5 MB (závady)
const UPLOAD_MAX_STANDARD  = 10 * 1024 * 1024;  // 10 MB (revize, fond, PENB, datovka)
const UPLOAD_MAX_DOCUMENT  = 20 * 1024 * 1024;  // 20 MB (dokumenty)
