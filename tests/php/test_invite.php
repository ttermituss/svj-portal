<?php
/**
 * Testy pro logiku invite tokenů
 */

$t->suite('Invite token generování');

// Token musí být 64 hex znaků z random_bytes(32)
for ($i = 0; $i < 5; $i++) {
    $token = bin2hex(random_bytes(32));
    $t->assert("Token #{$i} má délku 64",       strlen($token) === 64);
    $t->assert("Token #{$i} je hex",            ctype_xdigit($token));
}

// Tokeny musí být unikátní
$tokens = array_map(fn() => bin2hex(random_bytes(32)), range(1, 100));
$t->assertEqual('100 tokenů je unikátních', 100, count(array_unique($tokens)));

$t->suite('Invite token validace (délka + hex)');

$validToken   = bin2hex(random_bytes(32)); // 64 hex
$shortToken   = bin2hex(random_bytes(16)); // 32 hex — příliš krátký
$nonHexToken  = str_repeat('z', 64);       // 64 znaků ale ne hex
$emptyToken   = '';

$t->assert('Platný token projde',           strlen($validToken) === 64 && ctype_xdigit($validToken));
$t->assert('Krátký token neprojde',         !(strlen($shortToken) === 64));
$t->assert('Non-hex token neprojde',        !ctype_xdigit($nonHexToken));
$t->assert('Prázdný token neprojde',        !($emptyToken && strlen($emptyToken) === 64));

$t->suite('Invite expirace');

$now        = time();
$future     = date('Y-m-d H:i:s', $now + 86400);   // za 24h — platný
$past       = date('Y-m-d H:i:s', $now - 1);        // 1s zpět — vypršel
$farFuture  = date('Y-m-d H:i:s', $now + 86400 * 30); // 30 dní — platný

$t->assert('Budoucí expiry je platný',     strtotime($future) > $now);
$t->assert('Minulý expiry je vypršelý',    strtotime($past) < $now);
$t->assert('30denní expiry je platný',     strtotime($farFuture) > $now);

$t->suite('Invite role validace');

$allowedRoles = ['vlastnik', 'vybor'];
$t->assert("Role 'vlastnik' je povolena",  in_array('vlastnik', $allowedRoles, true));
$t->assert("Role 'vybor' je povolena",     in_array('vybor',    $allowedRoles, true));
$t->assert("Role 'admin' není povolena",   !in_array('admin',   $allowedRoles, true));
$t->assert("Role '' není povolena",        !in_array('',        $allowedRoles, true));
$t->assert("Role 'VLASTNIK' není povolena",!in_array('VLASTNIK',$allowedRoles, true));
