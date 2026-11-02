<?php
/*
 * Yangi Alifbo — admin panel API (ixtiyoriy, faqat PHP'li hostingda ishlaydi).
 *
 *   GET  save.php?action=ping    — holat (PHP bormi, parol o'rnatilganmi, kirilganmi)
 *   POST save.php?action=login   — kirish (password)
 *   POST save.php?action=logout  — chiqish
 *   POST save.php?action=save    — ads.json ni saqlash (JSON tanasi, X-CSRF-Token)
 *   POST save.php?action=upload  — reklama rasmini yuklash (image, X-CSRF-Token)
 *   GET  save.php?action=stats   — reklama statistikasi (ko'rishlar, bosishlar)
 *   POST save.php?action=stats_reset — statistikani tozalash (id — bitta reklama, bo'sh — hammasi)
 */
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

const ADS_FILE   = __DIR__ . '/../ads.json';
const UPLOAD_DIR = __DIR__ . '/../ads/uploads';
const UPLOAD_URL = 'ads/uploads/';
const MAX_JSON   = 3 * 1024 * 1024;
const MAX_IMAGE  = 2 * 1024 * 1024;
const MAX_FAILS  = 5;
const LOCK_TIME  = 900;   // 15 daqiqa
const SESSION_TTL = 8 * 3600;

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_name('ya_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function configured(): bool
{
    return defined('ADMIN_PASSWORD')
        && is_string(ADMIN_PASSWORD)
        && ADMIN_PASSWORD !== 'PAROLNI_OZGARTIRING'
        && strlen(ADMIN_PASSWORD) >= 10;
}

function logged_in(): bool
{
    return !empty($_SESSION['ok']) && (int)($_SESSION['t'] ?? 0) > time() - SESSION_TTL;
}

function csrf_ok(): bool
{
    $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return is_string($t) && !empty($_SESSION['csrf']) && hash_equals((string)$_SESSION['csrf'], $t);
}

function require_auth(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['ok' => false, 'error' => 'method'], 405);
    if (!logged_in()) out(['ok' => false, 'error' => 'auth'], 401);
    if (!csrf_ok()) out(['ok' => false, 'error' => 'csrf'], 403);
    $_SESSION['t'] = time();
}

function require_login(): void
{
    if (!logged_in()) out(['ok' => false, 'error' => 'auth'], 401);
}

/* Noto'g'ri parol urinishlarini IP bo'yicha cheklash */
function throttle_file(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return rtrim(sys_get_temp_dir(), '/\\') . '/ya_admin_' . hash('sha256', $ip . __DIR__);
}
function throttle_get(): array
{
    $f = throttle_file();
    $d = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
    return is_array($d) ? $d : ['n' => 0, 't' => 0];
}
function throttle_set(array $d): void
{
    @file_put_contents(throttle_file(), json_encode($d), LOCK_EX);
}

/* ads.json tuzilishini tekshirish va tozalash */
function clean_ads(array $data): array
{
    $allowedSlots = ['top', 'bottom'];
    $allowedTypes = ['image', 'text', 'html'];
    $allowedPages = ['all', 'converter', 'editor', 'trainer', 'alphabet'];
    $allowedDevices = ['all', 'desktop', 'mobile'];
    $str = static function ($v, int $max): string {
        if (!is_string($v)) return '';
        return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
    };
    $date = static function ($v): string {
        return (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) ? $v : '';
    };
    $ads = [];
    foreach (($data['ads'] ?? []) as $a) {
        if (!is_array($a)) continue;
        $pages = array_values(array_intersect(is_array($a['pages'] ?? null) ? $a['pages'] : [], $allowedPages));
        $ads[] = [
            'id'          => preg_replace('/[^a-zA-Z0-9_\-]/', '', $str($a['id'] ?? '', 40)) ?: ('ad_' . bin2hex(random_bytes(4))),
            'name'        => $str($a['name'] ?? '', 120),
            'enabled'     => !empty($a['enabled']),
            'slot'        => in_array($a['slot'] ?? '', $allowedSlots, true) ? $a['slot'] : 'top',
            'pages'       => $pages ?: ['all'],
            'device'      => in_array($a['device'] ?? '', $allowedDevices, true) ? $a['device'] : 'all',
            'start'       => $date($a['start'] ?? ''),
            'end'         => $date($a['end'] ?? ''),
            'closable'    => !empty($a['closable']),
            'type'        => in_array($a['type'] ?? '', $allowedTypes, true) ? $a['type'] : 'image',
            'image'       => $str($a['image'] ?? '', 1500000),
            'imageMobile' => $str($a['imageMobile'] ?? '', 1500000),
            'alt'         => $str($a['alt'] ?? '', 200),
            'link'        => $str($a['link'] ?? '', 2000),
            'title'       => $str($a['title'] ?? '', 200),
            'text'        => $str($a['text'] ?? '', 1000),
            'button'      => $str($a['button'] ?? '', 60),
            'html'        => $str($a['html'] ?? '', 50000),
        ];
        if (count($ads) >= 100) break;
    }
    // tracking: true — saytdagi reklamalar ko'rishlar va bosishlarni ads/track.php ga yuboradi
    return ['version' => 1, 'updated' => date('c'), 'tracking' => true, 'ads' => $ads];
}

$action = (string)($_GET['action'] ?? 'ping');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($action) {
    case 'ping':
        $writable = is_file(ADS_FILE) ? is_writable(ADS_FILE) : is_writable(dirname(ADS_FILE));
        out([
            'ok'         => true,
            'mode'       => 'php',
            'configured' => configured(),
            'logged'     => logged_in(),
            'csrf'       => logged_in() ? ($_SESSION['csrf'] ?? null) : null,
            'writable'   => $writable,
        ]);

    case 'login':
        if ($method !== 'POST') out(['ok' => false, 'error' => 'method'], 405);
        if (!configured()) out(['ok' => false, 'error' => 'not_configured'], 403);
        $th = throttle_get();
        if ($th['n'] >= MAX_FAILS && $th['t'] > time() - LOCK_TIME) out(['ok' => false, 'error' => 'locked'], 429);
        $password = (string)($_POST['password'] ?? '');
        if (!hash_equals((string)ADMIN_PASSWORD, $password)) {
            $th = ($th['t'] > time() - LOCK_TIME) ? $th : ['n' => 0, 't' => 0];
            throttle_set(['n' => $th['n'] + 1, 't' => time()]);
            sleep(1);
            out(['ok' => false, 'error' => 'wrong'], 401);
        }
        throttle_set(['n' => 0, 't' => 0]);
        session_regenerate_id(true);
        $_SESSION = ['ok' => true, 't' => time(), 'csrf' => bin2hex(random_bytes(32))];
        out(['ok' => true, 'csrf' => $_SESSION['csrf']]);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);

    case 'save':
        require_auth();
        $raw = file_get_contents('php://input', false, null, 0, MAX_JSON + 1);
        if ($raw === false || strlen($raw) > MAX_JSON) out(['ok' => false, 'error' => 'too_large'], 413);
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['ads']) || !is_array($data['ads'])) out(['ok' => false, 'error' => 'invalid'], 400);
        $clean = clean_ads($data);
        $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
        $tmp = ADS_FILE . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (@file_put_contents($tmp, $json, LOCK_EX) === false || !@rename($tmp, ADS_FILE)) {
            @unlink($tmp);
            out(['ok' => false, 'error' => 'write'], 500);
        }
        ya_stats_names($clean['ads']);
        out(['ok' => true]);

    case 'upload':
        require_auth();
        $f = $_FILES['image'] ?? null;
        if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) out(['ok' => false, 'error' => 'no_file'], 400);
        if ((int)$f['size'] > MAX_IMAGE) out(['ok' => false, 'error' => 'too_large'], 413);
        $info = @getimagesize($f['tmp_name']);
        $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
        if (!$info || !isset($types[$info['mime']])) out(['ok' => false, 'error' => 'bad_type'], 400);
        if (!is_dir(UPLOAD_DIR) && !@mkdir(UPLOAD_DIR, 0755, true)) out(['ok' => false, 'error' => 'write'], 500);
        $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $types[$info['mime']];
        if (!@move_uploaded_file($f['tmp_name'], UPLOAD_DIR . '/' . $name)) out(['ok' => false, 'error' => 'write'], 500);
        @chmod(UPLOAD_DIR . '/' . $name, 0644);
        out(['ok' => true, 'url' => UPLOAD_URL . $name]);

    case 'stats':
        require_login();
        $st = ya_stats_read();
        out([
            'ok'       => true,
            'today'    => date('Y-m-d'),
            'ads'      => (object)$st['ads'],
            'names'    => (object)$st['names'],
            'writable' => is_dir(YA_DATA_DIR) ? is_writable(YA_DATA_DIR) : is_writable(__DIR__),
        ]);

    case 'stats_reset':
        require_auth();
        $id = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($_POST['id'] ?? ''));
        $ok = ya_stats_update(static function (array $d) use ($id): array {
            if ($id === '') $d['ads'] = [];
            else unset($d['ads'][$id]);
            return $d;
        });
        out(['ok' => $ok], $ok ? 200 : 500);

    default:
        out(['ok' => false, 'error' => 'unknown_action'], 404);
}
