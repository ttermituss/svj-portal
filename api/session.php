<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

function createSession(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

    $db = getDb();
    $stmt = $db->prepare(
        'INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
         VALUES (:token, :user_id, :expires_at, :ip, :ua)'
    );
    $stmt->execute([':token' => $token, ':user_id' => $userId, ':expires_at' => $expiresAt, ':ip' => $ip, ':ua' => $ua]);

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie(SESSION_COOKIE_NAME, $token, [
        'expires' => time() + SESSION_LIFETIME, 'path' => '/',
        'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
    ]);

    return $token;
}

function validateSession(): ?array
{
    $token = $_COOKIE[SESSION_COOKIE_NAME] ?? '';
    if (!$token || strlen($token) !== 64) return null;

    $db = getDb();
    $stmt = $db->prepare(
        'SELECT s.id AS session_id, s.expires_at, s.user_id,
                u.id, u.email, u.jmeno, u.prijmeni, u.role, u.svj_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = :token AND s.expires_at > NOW()'
    );
    $stmt->execute([':token' => $token]);
    $row = $stmt->fetch();

    if (!$row) {
        setcookie(SESSION_COOKIE_NAME, '', ['expires' => time() - 3600, 'path' => '/']);
        return null;
    }

    // Sliding expiry
    $remaining = strtotime($row['expires_at']) - time();
    if ($remaining < SESSION_SLIDING_WINDOW) {
        $newExpiry = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
        $db->prepare('UPDATE sessions SET expires_at = :e WHERE id = :id')
           ->execute([':e' => $newExpiry, ':id' => $row['session_id']]);
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        setcookie(SESSION_COOKIE_NAME, $token, [
            'expires' => time() + SESSION_LIFETIME, 'path' => '/',
            'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
        ]);
    }

    return [
        'id' => (int)$row['user_id'], 'email' => $row['email'],
        'jmeno' => $row['jmeno'], 'prijmeni' => $row['prijmeni'],
        'role' => $row['role'], 'svj_id' => $row['svj_id'] ? (int)$row['svj_id'] : null,
    ];
}

function destroySession(): void
{
    $token = $_COOKIE[SESSION_COOKIE_NAME] ?? '';
    if ($token) {
        getDb()->prepare('DELETE FROM sessions WHERE token = :t')->execute([':t' => $token]);
    }
    setcookie(SESSION_COOKIE_NAME, '', ['expires' => time() - 3600, 'path' => '/']);
}

function cleanExpiredSessions(): void
{
    getDb()->query('DELETE FROM sessions WHERE expires_at < NOW()');
}
