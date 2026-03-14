<?php
/**
 * Testy pro třídu WhereBuilder z api/helpers.php
 * Nevyžaduje DB — testuje logiku tvorby SQL podmínek.
 */

$t->suite('WhereBuilder — základní fungování');

$wb = new WhereBuilder('t.svj_id', 42);
$t->assert('SQL obsahuje svj_id podmínku',   str_contains($wb->sql(), 't.svj_id = ?'));
$t->assertEqual('Params obsahuje svj_id',    [42], $wb->params());

$t->suite('WhereBuilder — addWhere (podmíněné)');

$wb = new WhereBuilder('t.svj_id', 1);
$wb->addWhere('rok = ?', 2024);
$t->assert('Rok přidán', str_contains($wb->sql(), 'rok = ?'));
$t->assertEqual('Params má svj_id + rok', [1, 2024], $wb->params());

// Prázdné hodnoty se nepřidají
$wb2 = new WhereBuilder('t.svj_id', 1);
$wb2->addWhere('typ = ?', '');
$wb2->addWhere('kat = ?', null);
$wb2->addWhere('rok = ?', false);
$t->assert('Prázdný string → nepřidán', !str_contains($wb2->sql(), 'typ = ?'));
$t->assert('Null → nepřidán',           !str_contains($wb2->sql(), 'kat = ?'));
$t->assert('False → nepřidán',          !str_contains($wb2->sql(), 'rok = ?'));
$t->assertEqual('Jen svj_id v params',  [1], $wb2->params());

$t->suite('WhereBuilder — addWhereAlways');

$wb = new WhereBuilder('t.svj_id', 1);
$wb->addWhereAlways('deleted_at IS NULL', null);  // null jako value, ale podmínka se přidá
// Pozor: addWhereAlways přidává i null hodnotu do params — pro IS NULL lépe addRawUnsafe
$wb3 = new WhereBuilder('t.svj_id', 1);
$wb3->addRawUnsafe('deleted_at IS NULL');
$t->assert('IS NULL přidáno přes addRawUnsafe', str_contains($wb3->sql(), 'deleted_at IS NULL'));
$t->assertEqual('Jen svj_id v params (bez IS NULL)',  [1], $wb3->params());

$t->suite('WhereBuilder — addLike');

$wb = new WhereBuilder('t.svj_id', 5);
$wb->addLike('popis', 'oprava');
$t->assert('LIKE podmínka přidána',       str_contains($wb->sql(), 'popis LIKE ?'));
$t->assert('LIKE value má %% kolem',      in_array('%oprava%', $wb->params(), true));

// Prázdný string → nepřidá
$wb2 = new WhereBuilder('t.svj_id', 5);
$wb2->addLike('popis', '');
$t->assert('Prázdný LIKE → nepřidán',    !str_contains($wb2->sql(), 'LIKE'));
$t->assert('LIKE null → nepřidán',       !str_contains((new WhereBuilder('t.svj_id', 5))->addLike('col', null)->sql(), 'LIKE'));

$t->suite('WhereBuilder — kombinovaný WHERE');

$wb = new WhereBuilder('f.svj_id', 10);
$wb->addWhere('typ = ?', 'vydaj')
   ->addWhere('rok = ?', 2023)
   ->addLike('popis', 'střecha')
   ->addRawUnsafe('deleted_at IS NULL');

$sql = $wb->sql();
$t->assert('Obsahuje svj_id',    str_contains($sql, 'f.svj_id = ?'));
$t->assert('Obsahuje typ',       str_contains($sql, 'typ = ?'));
$t->assert('Obsahuje rok',       str_contains($sql, 'rok = ?'));
$t->assert('Obsahuje LIKE',      str_contains($sql, 'popis LIKE ?'));
$t->assert('Obsahuje IS NULL',   str_contains($sql, 'deleted_at IS NULL'));
$t->assert('Podmínky spojeny AND', str_contains($sql, ' AND '));
$t->assertEqual('Počet params (svj_id, typ, rok, %střecha%)', 4, count($wb->params()));

$t->suite('WhereBuilder — fluent interface (method chaining)');

$wb = (new WhereBuilder('t.svj_id', 1))
    ->addWhere('a = ?', 'x')
    ->addLike('b', 'y')
    ->addRawUnsafe('c IS NULL');
$t->assert('Chaining vrátí self a SQL funguje', str_contains($wb->sql(), 'a = ?'));
