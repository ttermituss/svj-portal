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
