<?php
/* ===== Rate limiting — FIXED window =====
 *
 * window_end se nastavuje POUZE při prvním záznamu.
 * Při každém dalším pokusu se jen inkrementuje attempts — okno se NEPOSOUVÁ.
 * Útočník nemůže reset okna čekáním těsně pod limitem.
 */

function getRateLimitKey(string $prefix): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return $prefix . md5($ip);
}

function checkRateLimit(string $prefix, int $maxAttempts, string $message): void
{
    $db  = getDb();
    $key = getRateLimitKey($prefix);

    $stmt = $db->prepare(
        'SELECT attempts FROM rate_limits WHERE `key` = :key AND window_end > NOW()'
    );
    $stmt->execute([':key' => $key]);
    $row = $stmt->fetch();

    if ($row && (int)$row['attempts'] >= $maxAttempts) {
        jsonError($message, 429, 'RATE_LIMITED');
    }
}

function recordRateLimit(string $prefix): void
{
    $db        = getDb();
    $key       = getRateLimitKey($prefix);
    $windowEnd = date('Y-m-d H:i:s', time() + 300); // 5 min fixed window

    // ON DUPLICATE KEY: inkrementuj attempts, ale window_end NEMENJ
    $db->prepare(
        'INSERT INTO rate_limits (`key`, attempts, window_end)
         VALUES (:key, 1, :end)
         ON DUPLICATE KEY UPDATE attempts = attempts + 1'
    )->execute([':key' => $key, ':end' => $windowEnd]);
}

function clearRateLimit(string $prefix): void
{
    getDb()->prepare('DELETE FROM rate_limits WHERE `key` = :key')
           ->execute([':key' => getRateLimitKey($prefix)]);
}
