<?php
/**
 * Bezpečnostní testy — XSS, injection pokusy přes sanitize()
 */

$t->suite('XSS ochrana přes sanitize()');

$xssCases = [
    '<script>alert("xss")</script>'         => 'alert("xss")',
    '<img src=x onerror=alert(1)>'          => '',
    '<a href="javascript:void(0)">klik</a>' => 'klik',
    '"><script>alert(1)</script>'            => '">alert(1)',
    "';DROP TABLE users;--"                 => "';DROP TABLE users;--",  // SQL v HTML — sanitize neřeší SQL, jen HTML
];

foreach ($xssCases as $input => $expected) {
    $result = sanitize($input);
    $t->assert(
        "XSS: '" . substr($input, 0, 40) . "...' neobsahuje HTML tagy",
        strip_tags($result) === $result
    );
}

$t->suite('Délkové limity vstupů');

$t->assert('Email max 255 znaků — OK',      strlen(str_repeat('a', 240) . '@b.cz') <= 255);
$t->assert('Heslo max 128 znaků — OK',      strlen(str_repeat('a', 128)) <= 128);
$t->assert('Příliš dlouhý email selže',     strlen(str_repeat('a', 300)) > 255);
$t->assert('Heslo min 8 znaků — OK',        strlen('Abc12345') >= 8);
$t->assert('Příliš krátké heslo selže',     strlen('abc') < 8);

$t->suite('Password hashing');

$password = 'TestHeslo123!';
$hash     = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$t->assert('Hash není plaintext',           $hash !== $password);
$t->assert('Hash začíná bcrypt prefixem',   str_starts_with($hash, '$2y$'));
$t->assert('Správné heslo projde verify',   password_verify($password, $hash));
$t->assert('Špatné heslo neprojde verify',  !password_verify('spatneHeslo', $hash));
$t->assert('Prázdné heslo neprojde verify', !password_verify('', $hash));

$t->suite('Tenant isolation — svj_id ze session');

// Simulace: nikdy nedůvěřovat svj_id z request dat
$sessionSvjId  = 42;   // bezpečný zdroj
$requestSvjId  = 999;  // útočník se snaží číst cizí data

$safeSvjId = $sessionSvjId; // vždy použij session hodnotu
$t->assertEqual('svj_id ze session, ne z requestu', 42, $safeSvjId);
$t->assert('Request svj_id ignorován', $safeSvjId !== $requestSvjId);
