<?php
/**
 * Šifrování / dešifrování citlivých hodnot v tabulce settings.
 * Algoritmus: AES-256-CBC, klíč z config.php SETTINGS_ENCRYPTION_KEY.
 *
 * Formát v DB: "enc:<base64(iv . ciphertext)>"
 * Plaintext hodnoty (legacy / nezašifrované) jsou vráceny beze změny.
 */

const SETTINGS_CIPHER     = 'AES-256-CBC';
const SETTINGS_ENC_PREFIX = 'enc:';

/** Klíče, které se šifrují automaticky při uložení. */
const SETTINGS_SECRET_KEYS = ['smtp_heslo', 'cuzk_api_klic', 'google_client_secret'];

function encryptSetting(string $value): string
{
    if ($value === '') return '';

    $key = hex2bin(SETTINGS_ENCRYPTION_KEY);
    $iv  = random_bytes(openssl_cipher_iv_length(SETTINGS_CIPHER));
    $enc = openssl_encrypt($value, SETTINGS_CIPHER, $key, OPENSSL_RAW_DATA, $iv);

    if ($enc === false) {
        throw new \RuntimeException('Šifrování selhalo: ' . openssl_error_string());
    }

    return SETTINGS_ENC_PREFIX . base64_encode($iv . $enc);
}

function decryptSetting(string $stored): string
{
    if ($stored === '' || !str_starts_with($stored, SETTINGS_ENC_PREFIX)) {
        return $stored; // plaintext (legacy nebo prázdné)
    }

    $key  = hex2bin(SETTINGS_ENCRYPTION_KEY);
    $raw  = base64_decode(substr($stored, strlen(SETTINGS_ENC_PREFIX)), true);
    if ($raw === false) return $stored;

    $ivLen = openssl_cipher_iv_length(SETTINGS_CIPHER);
    $iv    = substr($raw, 0, $ivLen);
    $enc   = substr($raw, $ivLen);

    $plain = openssl_decrypt($enc, SETTINGS_CIPHER, $key, OPENSSL_RAW_DATA, $iv);
    return $plain !== false ? $plain : $stored;
}

function isSecretSettingKey(string $key): bool
{
    return in_array($key, SETTINGS_SECRET_KEYS, true);
}
