<?php
/**
 * AES-256-GCM encrypt/decrypt pro citlivá nastavení.
 * Šifrovací klíč se načítá z .env (nikdy z DB ani kódu).
 */

function loadEncryptionKey(): string
{
    static $key = null;
    if ($key !== null) return $key;

    $envFile = dirname(__DIR__) . '/.env';
    if (!file_exists($envFile)) {
        throw new RuntimeException('Chybí .env soubor se šifrovacím klíčem.');
    }

    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), 'SETTINGS_ENCRYPT_KEY=')) {
            $raw = trim(substr($line, strlen('SETTINGS_ENCRYPT_KEY=')));
            $key = hex2bin($raw);
            if (strlen($key) !== 32) {
                throw new RuntimeException('SETTINGS_ENCRYPT_KEY musí být 64 hex znaků (256 bit).');
            }
            return $key;
        }
    }

    throw new RuntimeException('SETTINGS_ENCRYPT_KEY nenalezen v .env');
}

function encryptValue(string $plaintext): string
{
    $key   = loadEncryptionKey();
    $iv    = random_bytes(12); // 96 bit pro GCM
    $tag   = '';
    $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($cipher === false) throw new RuntimeException('Šifrování selhalo.');
    // formát: base64( iv(12) + tag(16) + ciphertext )
    return base64_encode($iv . $tag . $cipher);
}

function decryptValue(string $encoded): string
{
    $key  = loadEncryptionKey();
    $raw  = base64_decode($encoded, true);
    if ($raw === false || strlen($raw) < 28) throw new RuntimeException('Neplatná šifrovaná hodnota.');
    $iv         = substr($raw, 0, 12);
    $tag        = substr($raw, 12, 16);
    $ciphertext = substr($raw, 28);
    $plain = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($plain === false) throw new RuntimeException('Dešifrování selhalo — špatný klíč nebo poškozená data.');
    return $plain;
}
