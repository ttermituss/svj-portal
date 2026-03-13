<?php
/**
 * Minimální test runner bez závislostí.
 * Použití: php tests/php/run.php
 */

class TestRunner
{
    private int $passed = 0;
    private int $failed = 0;
    private array $failures = [];
    private string $currentSuite = '';

    public function suite(string $name): void
    {
        $this->currentSuite = $name;
        echo "\n\033[1;34m▶ {$name}\033[0m\n";
    }

    public function assert(string $label, bool $condition): void
    {
        if ($condition) {
            $this->passed++;
            echo "  \033[32m✓\033[0m {$label}\n";
        } else {
            $this->failed++;
            $this->failures[] = "[{$this->currentSuite}] {$label}";
            echo "  \033[31m✗\033[0m {$label}\n";
        }
    }

    public function assertEqual(string $label, mixed $expected, mixed $actual): void
    {
        $ok = $expected === $actual;
        if (!$ok) {
            echo "    expected: " . var_export($expected, true) . "\n";
            echo "    actual:   " . var_export($actual, true) . "\n";
        }
        $this->assert($label, $ok);
    }

    public function summary(): int
    {
        $total = $this->passed + $this->failed;
        echo "\n" . str_repeat('─', 50) . "\n";
        if ($this->failed === 0) {
            echo "\033[1;32m✓ Všechny testy prošly ({$this->passed}/{$total})\033[0m\n";
        } else {
            echo "\033[1;31m✗ Selhalo: {$this->failed}/{$total}\033[0m\n";
            foreach ($this->failures as $f) {
                echo "  - {$f}\n";
            }
        }
        return $this->failed > 0 ? 1 : 0;
    }
}
