<?php
/*
 * Yangi Alifbo — reklama ko'rishlar va bosishlarni hisoblash.
 *   POST ads/track.php   ad=<reklama id>   e=v (ko'rish) | c (bosish)
 * Faqat PHP'li hostingda ishlaydi. Shaxsiy ma'lumot (IP, cookie) saqlanmaydi —
 * faqat kunlik umumiy sonlar.
 */
declare(strict_types=1);

require __DIR__ . '/../admin/lib.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function done(int $code): void
{
    http_response_code($code);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') done(405);

// Qidiruv robotlari va avtomatik dasturlar hisoblanmaydi
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|telegram|whatsapp|curl|wget|python|java\//i', $ua)) {
    done(204);
}

$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', substr((string)($_POST['ad'] ?? ''), 0, 40));
$event = (string)($_POST['e'] ?? '');
if ($id === '' || ($event !== 'v' && $event !== 'c')) done(400);

// Bir IP manzildan daqiqasiga ko'pi bilan 60 ta hodisa (sun'iy oshirishdan himoya)
$ipKey = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__);
$rateFile = rtrim(sys_get_temp_dir(), '/\\') . '/ya_track_' . substr($ipKey, 0, 32);
$minute = (int)floor(time() / 60);
$rate = is_file($rateFile) ? json_decode((string)@file_get_contents($rateFile), true) : null;
$rate = (is_array($rate) && ($rate['m'] ?? 0) === $minute) ? $rate : ['m' => $minute, 'n' => 0];
if ($rate['n'] >= 60) done(429);
$rate['n']++;
@file_put_contents($rateFile, json_encode($rate), LOCK_EX);

// Faqat mavjud va faol reklamalar hisoblanadi
$known = false;
foreach (ya_read_ads()['ads'] as $a) {
    if (is_array($a) && ($a['id'] ?? '') === $id && !empty($a['enabled'])) { $known = true; break; }
}
if (!$known) done(404);

done(ya_stats_add($id, $event) ? 204 : 500);
