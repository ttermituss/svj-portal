<?php
/**
 * Fond oprav — notifikační helper funkce.
 * Volané z fond_oprav.php a fond_zalohy.php po relevantních akcích.
 */

require_once __DIR__ . '/db.php';

/** Threshold defaults */
define('FOND_LOW_BALANCE_THRESHOLD', 50000);
define('FOND_HIGH_EXPENSE_THRESHOLD', 100000);

/**
 * Pokud zůstatek fondu < threshold → notifikace admin/výbor.
 */
function fondNotifyLowBalance(PDO $db, int $svjId): void
{
    $stmt = $db->prepare(
        'SELECT COALESCE(SUM(CASE WHEN typ="prijem" THEN castka ELSE -castka END), 0)
         FROM fond_oprav WHERE svj_id = :sid'
    );
    $stmt->execute([':sid' => $svjId]);
    $zustatek = (float) $stmt->fetchColumn();

    if ($zustatek >= FOND_LOW_BALANCE_THRESHOLD) return;

    $formatted = number_format($zustatek, 0, ',', ' ');
    fondNotifyPrivUsers($db, $svjId,
        'Nízký zůstatek fondu oprav',
        'Aktuální zůstatek: ' . $formatted . ' Kč (limit: ' . number_format(FOND_LOW_BALANCE_THRESHOLD, 0, ',', ' ') . ' Kč)',
        'fond-oprav'
    );
}

/**
 * Pokud výdaj > threshold → notifikace admin/výbor.
 */
function fondNotifyHighExpense(PDO $db, int $svjId, float $castka, string $popis): void
{
    if ($castka < FOND_HIGH_EXPENSE_THRESHOLD) return;

    $formatted = number_format($castka, 0, ',', ' ');
    fondNotifyPrivUsers($db, $svjId,
        'Vysoký výdaj z fondu oprav',
        $popis . ' — ' . $formatted . ' Kč',
        'fond-oprav'
    );
}

/**
 * Nezaplacené zálohy po splatnosti → notifikace admin/výbor.
 */
function fondNotifyUnpaidZalohy(PDO $db, int $svjId, int $mesic, int $rok): void
{
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM fond_zalohy WHERE svj_id = :sid
         AND mesic = :m AND predpis_id IN (SELECT id FROM fond_predpis WHERE rok = :r AND svj_id = :sid2)
         AND zaplaceno < predepsano'
    );
    $stmt->execute([':sid' => $svjId, ':m' => $mesic, ':r' => $rok, ':sid2' => $svjId]);
    $count = (int) $stmt->fetchColumn();

    if ($count === 0) return;

    $mesicNazev = $mesic . '/' . $rok;
    fondNotifyPrivUsers($db, $svjId,
        'Nezaplacené zálohy za ' . $mesicNazev,
        $count . ' jednotek dosud nezaplatilo zálohu.',
        'fond-oprav'
    );
}

/**
 * Vytvoří notifikaci pro admin/výbor uživatele daného SVJ.
 */
function fondNotifyPrivUsers(PDO $db, int $svjId, string $nazev, string $detail, string $hash): void
{
    $stmt = $db->prepare(
        'SELECT id FROM users WHERE svj_id = :sid AND role IN ("admin","vybor") AND notif_fond = 1'
    );
    $stmt->execute([':sid' => $svjId]);
    $users = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($users)) return;

    $ins = $db->prepare(
        'INSERT INTO notifikace (svj_id, user_id, typ, nazev, detail, odkaz_hash)
         VALUES (:sid, :uid, "fond", :nazev, :detail, :hash)'
    );
    foreach ($users as $uid) {
        $ins->execute([
            ':sid' => $svjId, ':uid' => $uid,
            ':nazev' => $nazev, ':detail' => $detail, ':hash' => $hash,
        ]);
    }
}
