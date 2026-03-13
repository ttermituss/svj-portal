<?php
/**
 * CLI bootstrap — shared initialization for all CLI scripts.
 * Sets up autoload, DB, helpers, and Google client.
 */

if (PHP_SAPI !== 'cli') {
    echo "Only CLI execution allowed.\n";
    exit(1);
}

set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
    fwrite(STDERR, "[ERROR] {$errstr} in {$errfile}:{$errline}\n");
    return true;
});

$projectRoot = dirname(__DIR__);
require_once $projectRoot . '/api/config.php';
require_once $projectRoot . '/api/db.php';
require_once $projectRoot . '/api/helpers.php';
require_once $projectRoot . '/api/google_helper.php';

/* ── CLI output helpers ───────────────────────────── */

function cliPrint(string $msg): void
{
    echo $msg . "\n";
}

function cliSuccess(string $msg): void
{
    echo "\033[32m✓ {$msg}\033[0m\n";
}

function cliError(string $msg): void
{
    fwrite(STDERR, "\033[31m✕ {$msg}\033[0m\n");
}

function cliWarn(string $msg): void
{
    echo "\033[33m⚠ {$msg}\033[0m\n";
}

function cliHeader(string $msg): void
{
    echo "\n\033[1;36m{$msg}\033[0m\n";
    echo str_repeat('─', min(strlen($msg) + 4, 60)) . "\n";
}

function cliTable(array $headers, array $rows): void
{
    $widths = array_map('strlen', $headers);
    foreach ($rows as $row) {
        foreach ($row as $i => $val) {
            $widths[$i] = max($widths[$i] ?? 0, mb_strlen((string) $val));
        }
    }

    $line = '+' . implode('+', array_map(fn($w) => str_repeat('-', $w + 2), $widths)) . '+';
    echo $line . "\n";
    echo '|';
    foreach ($headers as $i => $h) {
        echo ' ' . str_pad($h, $widths[$i]) . ' |';
    }
    echo "\n" . $line . "\n";

    foreach ($rows as $row) {
        echo '|';
        foreach ($row as $i => $val) {
            echo ' ' . cliMbPad((string) $val, $widths[$i]) . ' |';
        }
        echo "\n";
    }
    echo $line . "\n";
}

function cliMbPad(string $str, int $padLen, string $padStr = ' ', int $padType = STR_PAD_RIGHT): string
{
    $diff = $padLen - mb_strlen($str);
    if ($diff <= 0) return $str;
    return match ($padType) {
        STR_PAD_LEFT  => str_repeat($padStr, $diff) . $str,
        STR_PAD_BOTH  => str_repeat($padStr, (int) floor($diff / 2)) . $str . str_repeat($padStr, (int) ceil($diff / 2)),
        default       => $str . str_repeat($padStr, $diff),
    };
}

/* ── Google client for CLI ────────────────────────── */

/**
 * Find first admin/vybor user with Google connected for given SVJ.
 * If no svjId, find any admin with Google connected.
 */
function cliFindGoogleUser(?int $svjId = null): ?array
{
    $db = getDb();

    if ($svjId) {
        $stmt = $db->prepare("
            SELECT u.id, u.jmeno, u.prijmeni, u.role, u.svj_id, gt.google_email, gt.scopes
            FROM google_tokens gt
            JOIN users u ON u.id = gt.user_id
            WHERE gt.svj_id = ? AND u.role IN ('admin', 'vybor')
            ORDER BY u.role = 'admin' DESC
            LIMIT 1
        ");
        $stmt->execute([$svjId]);
    } else {
        $stmt = $db->query("
            SELECT u.id, u.jmeno, u.prijmeni, u.role, u.svj_id, gt.google_email, gt.scopes
            FROM google_tokens gt
            JOIN users u ON u.id = gt.user_id
            WHERE u.role IN ('admin', 'vybor')
            ORDER BY u.role = 'admin' DESC
            LIMIT 1
        ");
    }

    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get authenticated Google client for CLI use.
 * Returns [client, user] or exits with error.
 */
function cliGetGoogleClient(?int $svjId = null): array
{
    $user = cliFindGoogleUser($svjId);
    if (!$user) {
        cliError('Nebyl nalezen uživatel s propojeným Google účtem.');
        exit(1);
    }

    $client = getAuthenticatedGoogleClient($user['id'], $user['svj_id']);
    if (!$client) {
        cliError("Google klient se nepodařilo inicializovat pro {$user['google_email']}.");
        exit(1);
    }

    return [$client, $user];
}

/**
 * Parse CLI arguments: --key=value or --flag
 */
function cliParseArgs(array $argv): array
{
    $args = ['_' => []];
    for ($i = 1; $i < count($argv); $i++) {
        $a = $argv[$i];
        if (str_starts_with($a, '--')) {
            $eq = strpos($a, '=');
            if ($eq !== false) {
                $args[substr($a, 2, $eq - 2)] = substr($a, $eq + 1);
            } else {
                $args[substr($a, 2)] = true;
            }
        } else {
            $args['_'][] = $a;
        }
    }
    return $args;
}

function cliUsage(string $script, array $commands): never
{
    cliPrint("Použití: php {$script} <příkaz> [volby]\n");
    cliPrint("Příkazy:");
    foreach ($commands as $cmd => $desc) {
        cliPrint("  " . str_pad($cmd, 30) . $desc);
    }
    echo "\n";
    exit(0);
}
