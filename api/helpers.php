<?php
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function jsonOk(array $data = []): never
{
    jsonResponse(array_merge(['ok' => true], $data));
}

function jsonResponse($data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    // Default no-store pro mutable API; endpointy jako weather/okoli
    // mohou nastavit vlastní Cache-Control PŘED voláním jsonOk()
    $hasCache = false;
    foreach (headers_list() as $h) {
        if (stripos($h, 'Cache-Control:') === 0) { $hasCache = true; break; }
    }
    if (!$hasCache) header('Cache-Control: no-store');
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

/**
 * Bezpečný WHERE builder — vynucuje parametrizaci.
 * Zabraňuje náhodné SQL interpolaci: podmínky se přidávají POUZE přes addWhere().
 *
 * Použití:
 *   $qb = new WhereBuilder('t.svj_id', $svjId);
 *   $qb->addWhere('t.typ = ?', $typ);                // podmíněně (nepřidá pokud $typ empty)
 *   $qb->addWhereAlways('t.aktivni = ?', 1);         // vždy
 *   $stmt = $db->prepare("SELECT * FROM t WHERE " . $qb->sql() . " ORDER BY id");
 *   $qb->bind($stmt);
 *   $stmt->execute();
 */
/**
 * Validuje uploadovaný soubor: MIME type + extension double check.
 * Vrací extension string nebo volá jsonError.
 *
 * @param array $file $_FILES entry
 * @param array $allowedMime ['mime/type' => 'ext', ...]
 * @param int $maxSize Max velikost v bytes (UPLOAD_MAX_* konstanta)
 * @param string $errorMsg Chybová hláška pro neplatný formát
 */
function validateUpload(array $file, array $allowedMime, int $maxSize, string $errorMsg): string
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Chyba při nahrávání souboru', 400, 'UPLOAD_ERROR');
    }
    if ($file['size'] > $maxSize) {
        $mb = round($maxSize / 1024 / 1024);
        jsonError("Soubor je příliš velký (max {$mb} MB)", 413, 'FILE_TOO_LARGE');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $origExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!isset($allowedMime[$mime])) {
        jsonError($errorMsg, 415, 'INVALID_MIME');
    }

    $expectedExt = $allowedMime[$mime];

    // Defense-in-depth: extension musí odpovídat MIME typu
    // Blokuje např. shell.php.jpg (MIME ok, ale přípona .php skrytá)
    $extParts = explode('.', $file['name']);
    if (count($extParts) > 2) {
        // Více než jedna tečka → podezřelé (double extension attack)
        $innerExt = strtolower($extParts[count($extParts) - 2]);
        $dangerous = ['php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'phps'];
        if (in_array($innerExt, $dangerous, true)) {
            jsonError('Soubor s podezřelou příponou odmítnut', 415, 'SUSPICIOUS_EXT');
        }
    }

    return is_array($expectedExt) ? ($expectedExt[$origExt] ?? reset($expectedExt)) : $expectedExt;
}

/**
 * Odešle soubor klientovi s příslušnými hlavičkami.
 */
function serveFile(string $path, string $filename, string $mimeType, string $disposition = 'attachment'): never
{
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: ' . $disposition . '; filename="' . rawurlencode($filename) . '"');
    header('Content-Length: ' . filesize($path));
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

class WhereBuilder
{
    private array $conditions = [];
    private array $params = [];
    private int $seq = 0;

    /** Konstruktor — první podmínka je vždy svj_id (tenant isolation). */
    public function __construct(string $column, int $svjId)
    {
        $this->addWhereAlways($column . ' = ?', $svjId);
    }

    /** Přidá podmínku JEN pokud $value je truthy (neprázdný string, > 0, atd.) */
    public function addWhere(string $condition, mixed $value): self
    {
        if ($value === null || $value === '' || $value === false) return $this;
        $this->conditions[] = $condition;
        $this->params[] = $value;
        return $this;
    }

    /** Přidá podmínku VŽDY. */
    public function addWhereAlways(string $condition, mixed $value): self
    {
        $this->conditions[] = $condition;
        $this->params[] = $value;
        return $this;
    }

    /**
     * Přidá podmínku BEZ parametru (např. IS NULL, IS NOT NULL).
     * @internal Používat POUZE s hardcoded stringy, NIKDY s user inputem!
     */
    public function addRawUnsafe(string $condition): self
    {
        $this->conditions[] = $condition;
        return $this;
    }

    /** Přidá LIKE podmínku (auto-wrapping %). */
    public function addLike(string $column, ?string $value): self
    {
        if (!$value) return $this;
        $this->conditions[] = $column . ' LIKE ?';
        $this->params[] = '%' . $value . '%';
        return $this;
    }

    /** Vrátí SQL WHERE string (bez klíčového slova WHERE). */
    public function sql(): string
    {
        return implode(' AND ', $this->conditions);
    }

    /** Nabinduje parametry na statement (positional). */
    public function bind(\PDOStatement $stmt): void
    {
        foreach ($this->params as $i => $val) {
            $stmt->bindValue($i + 1, $val, is_int($val) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
        }
    }

    /** Vrátí pole parametrů (pro execute()). */
    public function params(): array
    {
        return $this->params;
    }
}
