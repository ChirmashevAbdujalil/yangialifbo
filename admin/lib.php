<?php
/*
 * Yangi Alifbo — umumiy funksiyalar: reklama statistikasi ombori.
 *
 * Statistika admin/data/ads-stats.php faylida kunlar bo'yicha saqlanadi:
 *   { "ads": { "<id>": { "2026-11-02": [ko'rishlar, bosishlar], ... } }, "names": { "<id>": "Nomi" } }
 * Fayl boshida PHP "himoya" qatori bor — uni brauzer orqali ochib bo'lmaydi.
 * Ma'lumotlar bazasi (MySQL) talab qilinmaydi.
 */
declare(strict_types=1);

if (function_exists('date_default_timezone_set')) {
    date_default_timezone_set('Asia/Tashkent');
}

const YA_ADS_FILE   = __DIR__ . '/../ads.json';
const YA_DATA_DIR   = __DIR__ . '/data';
const YA_STATS_FILE = YA_DATA_DIR . '/ads-stats.php';
const YA_GUARD      = "<?php http_response_code(404); exit; ?>\n";
const YA_KEEP_DAYS  = 730; // 2 yildan eski kunlar o'chiriladi

function ya_read_ads(): array
{
    $d = is_file(YA_ADS_FILE) ? json_decode((string)@file_get_contents(YA_ADS_FILE), true) : null;
    return (is_array($d) && isset($d['ads']) && is_array($d['ads'])) ? $d : ['ads' => []];
}

function ya_stats_decode(string $raw): array
{
    if (strpos($raw, YA_GUARD) === 0) $raw = substr($raw, strlen(YA_GUARD));
    $d = json_decode($raw, true);
    if (!is_array($d)) $d = [];
    if (!isset($d['ads']) || !is_array($d['ads'])) $d['ads'] = [];
    if (!isset($d['names']) || !is_array($d['names'])) $d['names'] = [];
    return $d;
}

function ya_stats_read(): array
{
    if (!is_file(YA_STATS_FILE)) return ['ads' => [], 'names' => []];
    $fh = @fopen(YA_STATS_FILE, 'r');
    if (!$fh) return ['ads' => [], 'names' => []];
    flock($fh, LOCK_SH);
    $raw = (string)stream_get_contents($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return ya_stats_decode($raw);
}

/* Faylni qulflab o'qish-o'zgartirish-yozish (bir vaqtdagi so'rovlar xavfsiz) */
function ya_stats_update(callable $fn): bool
{
    if (!is_dir(YA_DATA_DIR) && !@mkdir(YA_DATA_DIR, 0755, true)) return false;
    $fh = @fopen(YA_STATS_FILE, 'c+');
    if (!$fh) return false;
    if (!flock($fh, LOCK_EX)) { fclose($fh); return false; }
    $data = $fn(ya_stats_decode((string)stream_get_contents($fh)));
    $out = YA_GUARD . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ftruncate($fh, 0);
    rewind($fh);
    $ok = fwrite($fh, $out) !== false;
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

function ya_stats_add(string $id, string $event): bool
{
    $day = date('Y-m-d');
    $i = $event === 'c' ? 1 : 0;
    return ya_stats_update(static function (array $d) use ($id, $day, $i): array {
        if (!isset($d['ads'][$id]) || !is_array($d['ads'][$id])) $d['ads'][$id] = [];
        $row = $d['ads'][$id][$day] ?? [0, 0];
        $row[$i] = (int)($row[$i] ?? 0) + 1;
        $d['ads'][$id][$day] = [(int)$row[0], (int)$row[1]];
        // Kuniga bir marta eski ma'lumotlarni tozalash
        if (($d['pruned'] ?? '') !== $day) {
            $limit = date('Y-m-d', time() - YA_KEEP_DAYS * 86400);
            foreach ($d['ads'] as $k => $days) {
                foreach ($days as $dd => $_) if ($dd < $limit) unset($d['ads'][$k][$dd]);
            }
            $d['pruned'] = $day;
        }
        return $d;
    });
}

/* Reklama nomlarini saqlab qo'yish (reklama o'chirilsa ham statistikada nomi qoladi) */
function ya_stats_names(array $ads): void
{
    ya_stats_update(static function (array $d) use ($ads): array {
        foreach ($ads as $a) {
            if (!empty($a['id'])) $d['names'][$a['id']] = (string)($a['name'] ?? '');
        }
        return $d;
    });
}
