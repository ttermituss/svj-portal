<?php
function jsonOk(array $data = []): never
{
    jsonResponse(array_merge(['ok' => true], $data));
}

function jsonResponse($data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400, string $code = 'ERROR'): never
{
    jsonResponse(['error' => ['message' => $message, 'code' => $code]], $status);
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) jsonError('Chybějící tělo požadavku', 400, 'MISSING_BODY');
    $data = json_decode($raw, true);
    if (!is_array($data)) jsonError('Neplatný JSON', 400, 'INVALID_JSON');
    return $data;
}

function sanitize(string $value): string
{
    return trim(strip_tags($value));
}

function requireMethod(string ...$methods): void
{
    $current = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($current === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if (!in_array($current, $methods, true)) {
        jsonError('Metoda není povolena', 405, 'METHOD_NOT_ALLOWED');
    }
}

function getParam(string $name, ?string $default = null): ?string
{
    return isset($_GET[$name]) ? sanitize($_GET[$name]) : $default;
}
