#!/usr/bin/env php
<?php
/**
 * Spustit: php tests/php/run.php
 * Načte všechny test_*.php soubory v tests/php/
 */

require_once __DIR__ . '/TestRunner.php';

$t = new TestRunner();

// helpers.php definuje jsonResponse/jsonError bez guardu — načíst ho první,
// pak přepsat chování pro testy pomocí runkit nebo prostě helpers v testech nepoužívat.
// Zde helpers.php načteme (funkce jsou definovány), v testech je volat nebudeme přímo.
require_once __DIR__ . '/../../api/helpers.php';

// Načíst všechny testovací soubory
$files = glob(__DIR__ . '/test_*.php');
sort($files);

if (empty($files)) {
    echo "Žádné testy nenalezeny (tests/php/test_*.php)\n";
    exit(0);
}

foreach ($files as $file) {
    require $file;
}

exit($t->summary());
