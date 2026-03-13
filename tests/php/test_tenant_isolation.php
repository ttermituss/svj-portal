<?php
/**
 * Testy tenant isolation a odstraněných security holes
 */

$t->suite('updateSvj endpoint — musí být odstraněn');

// Ověřit že action 'updateSvj' není v user.php switch
$userPhp = file_get_contents(__DIR__ . '/../../api/user.php');

$t->assert(
    "action 'updateSvj' není v switch (endpoint odstraněn)",
    !str_contains($userPhp, "case 'updateSvj'")
);
$t->assert(
    "handleUpdateSvj() funkce neexistuje",
    !str_contains($userPhp, 'function handleUpdateSvj')
);
$t->assert(
    "requireAuth() se nepoužívá pro SVJ assignment",
    !preg_match('/handleUpdateSvj.*requireAuth/s', $userPhp)
);

$t->suite('XSS ochrana — innerHTML zakázáno v nastavení');

$nastaveniJs = file_get_contents(__DIR__ . '/../../js/pages/nastaveni.js');

// innerHTML smí být jen v komentářích
$lines = explode("\n", $nastaveniJs);
$innerHtmlInCode = array_filter($lines, function($line) {
    $trimmed = ltrim($line);
    return str_contains($line, 'innerHTML') && !str_starts_with($trimmed, '//');
});

$t->assert(
    'nastaveni.js nepoužívá innerHTML v kódu (jen v komentářích)',
    empty($innerHtmlInCode)
);

$t->suite('invite.php — tenant isolation při revoke');

$invitePhp = file_get_contents(__DIR__ . '/../../api/invite.php');

$t->assert(
    'handleRevoke kontroluje svj_id ownership',
    str_contains($invitePhp, "(int)\$inv['svj_id'] !== (int)\$user['svj_id']")
);
$t->assert(
    'handleRevoke vrací 403 při narušení tenant isolation',
    str_contains($invitePhp, "403")
);

$t->suite('auth.php — svj_id z invite, ne z user inputu');

$authPhp = file_get_contents(__DIR__ . '/../../api/auth.php');

$t->assert(
    'register() bere svj_id z invite tokenu, ne z body',
    str_contains($authPhp, "\$invite['svj_id']")
);
$t->assert(
    'register() nekontroluje body[svj_id] přímo',
    !str_contains($authPhp, "\$body['svj_id']")
);

$t->suite('svj.php — handleLink vyžaduje admin/vybor');

$svjPhp = file_get_contents(__DIR__ . '/../../api/svj.php');

$t->assert(
    "handleLink() vyžaduje roli admin nebo vybor",
    str_contains($svjPhp, "requireRole('admin', 'vybor')")
);
$t->assert(
    "handleLink() nepoužívá jen requireAuth()",
    !preg_match('/function handleLink.*?requireAuth\(\)/s', $svjPhp)
);
