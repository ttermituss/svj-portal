<?php
/**
 * Testy logiky rate limit klíčů a time-window výpočtů.
 * Nevyžaduje DB — testuje čistou logiku bez side-effectů.
 */

$t->suite('Rate limit — klíč generování (auth endpointy)');

// Simulace getRateLimitKey() logiky
function testRateLimitKey(string $prefix, string $ip): string
{
    return $prefix . md5($ip);
}

$key1 = testRateLimitKey('login_', '1.2.3.4');
$key2 = testRateLimitKey('login_', '1.2.3.4');
$key3 = testRateLimitKey('login_', '5.6.7.8');
$key4 = testRateLimitKey('register_', '1.2.3.4');

$t->assert('Stejný prefix+IP → stejný klíč',        $key1 === $key2);
$t->assert('Jiná IP → jiný klíč',                   $key1 !== $key3);
$t->assert('Jiný prefix → jiný klíč',               $key1 !== $key4);
$t->assert('Klíč má délku prefix+32 (md5)',          strlen($key1) === strlen('login_') + 32);
$t->assert('Klíč je string',                         is_string($key1));

$t->suite('Rate limit — POST klíč (user_id based)');

// Simulace requirePostRateLimit() key logiky
function testPostRlKey(int $userId, int $windowSec = 60): string
{
    $slot = (int) floor(time() / $windowSec);
    return 'post_u' . $userId . '_' . $slot;
}

$keyA = testPostRlKey(42);
$keyB = testPostRlKey(42);
$keyC = testPostRlKey(99);
$keyD = testPostRlKey(42, 300);  // jiné okno

$t->assert('Stejný user → stejný klíč',         $keyA === $keyB);
$t->assert('Jiný user → jiný klíč',             $keyA !== $keyC);
$t->assert('Jiné okno → jiný klíč',             $keyA !== $keyD);
$t->assert('Klíč začíná post_u',                str_starts_with($keyA, 'post_u'));
$t->assert('Klíč obsahuje user_id',             str_contains($keyA, '42'));
$t->assert('Klíč vejde do VARCHAR(64)',          strlen($keyA) <= 64);

$t->suite('Rate limit — window výpočty');

$now       = time();
$windowSec = 60;
$slot      = (int) floor($now / $windowSec);
$windowEnd = ($slot + 1) * $windowSec;

$t->assert('window_end je v budoucnosti',        $windowEnd > $now);
$t->assert('window_end je max 60s v budoucnosti', ($windowEnd - $now) <= $windowSec);
$t->assert('window_end je na hranici minuty',    $windowEnd % $windowSec === 0);

// Dva requesty ve stejném okně musí mít stejný slot
// Vypočti kolik sekund zbývá do konce aktuálního okna
$remaining = $windowSec - ($now % $windowSec) - 1;  // 0..58
$slot1     = (int) floor($now / $windowSec);
$slot2     = (int) floor(($now + $remaining) / $windowSec);  // stále v okně
$slot3     = (int) floor(($now + $windowSec) / $windowSec);  // příští okno

$t->assert('Stejné okno → stejný slot', $slot1 === $slot2);
$t->assert('Příští okno → jiný slot',   $slot1 !== $slot3);

$t->suite('Rate limit — NAT isolation (user_id vs IP)');

// Uživatelé za stejnou IP (NAT) jsou odděleni user_id klíčem
$userA  = testPostRlKey(1);
$userB  = testPostRlKey(2);
$sameIp = testRateLimitKey('login_', '10.0.0.1');

$t->assert('User A a B mají různé klíče (NAT-safe)', $userA !== $userB);
$t->assert('User A klíč neobsahuje IP adresu',       !str_contains($userA, '10.0.0.1'));
$t->assert('User A klíč neobsahuje IP adresu',       !str_contains($userA, '1.2.3.4'));

$t->suite('Rate limit — bezpečnostní vlastnosti');

// Fixed window: klíč závisí na time slotu, ne na čase requestu
$slot      = (int) floor($now / 60);
$rem       = 60 - ($now % 60) - 1;            // sekund do konce okna (0..58)
$sameSlot  = (int) floor(($now + $rem) / 60); // poslední sekunda téhož okna
$nextSlot  = (int) floor(($now + 60) / 60);   // nové okno

$t->assertEqual('Celé okno → stejný slot',    $slot, $sameSlot);
$t->assert('Nové okno → nový slot',           $slot !== $nextSlot);

// Klíč nesmí překročit VARCHAR(64) ani pro velké user_id
$bigUserKey = testPostRlKey(PHP_INT_MAX);
$t->assert('Klíč s MAX user_id vejde do 64 znaků', strlen($bigUserKey) <= 64);
