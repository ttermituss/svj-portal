<?php
/**
 * Testy pro api/helpers.php — sanitize, validateEmail, IČO normalizace
 */

require_once __DIR__ . '/../../api/helpers.php';

$t->suite('sanitize()');

$t->assertEqual('Trim whitespace',      'hello',        sanitize('  hello  '));
$t->assertEqual('Strip HTML tags',      'hello world',  sanitize('<b>hello</b> world'));
$t->assertEqual('Strip script tag',     'alert(1)',     sanitize('<script>alert(1)</script>'));
$t->assertEqual('Preserve Czech chars', 'žluťoučký kůň', sanitize('žluťoučký kůň'));
$t->assertEqual('Empty string',         '',             sanitize(''));

$t->suite('filter_var EMAIL validation');

$t->assert('Valid email',               (bool) filter_var('test@example.com', FILTER_VALIDATE_EMAIL));
$t->assert('Valid email with +',        (bool) filter_var('test+tag@domain.cz', FILTER_VALIDATE_EMAIL));
$t->assert('Invalid — missing @',       !filter_var('testexample.com', FILTER_VALIDATE_EMAIL));
$t->assert('Invalid — missing domain',  !filter_var('test@', FILTER_VALIDATE_EMAIL));
$t->assert('Empty string',              !filter_var('', FILTER_VALIDATE_EMAIL));

$t->suite('IČO normalizace');

$cases = [
    ['27838749',   '27838749'],  // přesně 8 číslic
    ['2783874',    '02783874'],  // 7 číslic → doplnit nulu
    ['27 838 749', '27838749'],  // mezery
    ['abc12345',   '00012345'],  // nečíselné znaky pryč
];

foreach ($cases as [$input, $expected]) {
    $ico = str_pad(preg_replace('/\D/', '', $input), 8, '0', STR_PAD_LEFT);
    $t->assertEqual("IČO '{$input}' → '{$expected}'", $expected, $ico);
}

$t->assert('IČO 8 číslic je validní',      (bool) preg_match('/^\d{8}$/', '27838749'));
$t->assert('IČO 7 číslic není validní raw', !(bool) preg_match('/^\d{8}$/', '2783874'));
$t->assert('IČO s písmeny není validní',   !(bool) preg_match('/^\d{8}$/', 'abcd1234'));
