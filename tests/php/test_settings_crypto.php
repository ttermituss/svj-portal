<?php
/**
 * Testy pro api/settings_crypto.php — AES-256-CBC šifrování
 * Nevyžaduje DB ani config.php — definuje testovací klíč lokálně.
 */

// Testovací šifrovací klíč (64 hex = 32 bytes)
define('SETTINGS_ENCRYPTION_KEY', bin2hex(random_bytes(32)));

require_once __DIR__ . '/../../api/settings_crypto.php';

$t->suite('encryptSetting / decryptSetting — round-trip');

$cases = [
    'Krátký string'          => 'heslo123',
    'Dlouhý string'          => str_repeat('abc', 100),
    'České znaky'            => 'žluťoučký kůň přeskočil',
    'Speciální znaky'        => '!@#$%^&*()_+-=[]{}|;:,.<>?',
    'Čísla a mezery'         => '  1234 5678  ',
    'JSON string'            => '{"key":"value","num":42}',
];

foreach ($cases as $label => $plaintext) {
    $encrypted = encryptSetting($plaintext);
    $decrypted = decryptSetting($encrypted);
    $t->assertEqual("Round-trip: {$label}", $plaintext, $decrypted);
}

$t->suite('encryptSetting — vlastnosti šifrovaného výstupu');

$plain = 'testovaci_hodnota';
$enc   = encryptSetting($plain);

$t->assert('Výstup začíná prefixem enc:', str_starts_with($enc, 'enc:'));
$t->assert('Výstup není plaintext',       $enc !== $plain);
$t->assert('Výstup je delší než plain',   strlen($enc) > strlen($plain));

// Dvě šifrování stejného textu musí dávat různé ciphertext (náhodné IV)
$enc2 = encryptSetting($plain);
$t->assert('Dvě šifrování = různý výstup (random IV)', $enc !== $enc2);

// Ale oba se dešifrují na stejnou hodnotu
$t->assertEqual('Oba ciphertexty se dešifrují správně', $plain, decryptSetting($enc2));

$t->suite('encryptSetting — edge cases');

$t->assertEqual('Prázdný string → prázdný (no encrypt)', '', encryptSetting(''));
$t->assertEqual('Prázdný enc → prázdný dec', '', decryptSetting(''));

$t->suite('decryptSetting — legacy / nezašifrované hodnoty');

// Plaintext bez prefixu enc: je vrácen beze změny (backward compat)
$t->assertEqual('Legacy plaintext projde beze změny', 'legacyValue', decryptSetting('legacyValue'));
$t->assertEqual('Číslo jako string projde',            '12345',       decryptSetting('12345'));

$t->suite('isSecretSettingKey');

$t->assert("'smtp_heslo' je secret klíč",           isSecretSettingKey('smtp_heslo'));
$t->assert("'cuzk_api_klic' je secret klíč",        isSecretSettingKey('cuzk_api_klic'));
$t->assert("'google_client_secret' je secret klíč", isSecretSettingKey('google_client_secret'));
$t->assert("'nazev' není secret klíč",              !isSecretSettingKey('nazev'));
$t->assert("'' není secret klíč",                   !isSecretSettingKey(''));
$t->assert("'SMTP_HESLO' (velká) není klíč",        !isSecretSettingKey('SMTP_HESLO'));
