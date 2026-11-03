<?php
/**
 * Smart Farm Sync Endpoint
 * Accepts batch sensor records synced from Raspberry Pi Gateway.
 * Automatically checks alert thresholds and logs notifications.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed. Use POST.']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload.']);
    exit;
}

$apiKeyHeader = $_SERVER['HTTP_X_FARM_API_KEY'] ?? '';
$apiKeyBody = $payload['api_key'] ?? '';

if ($apiKeyHeader !== API_SECRET_KEY && $apiKeyBody !== API_SECRET_KEY) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Invalid API Key.']);
    exit;
}

$records = $payload['records'] ?? [];
if (empty($records) || !is_array($records)) {
    echo json_encode(['status' => 'success', 'message' => 'No records to sync.', 'synced_count' => 0]);
    exit;
}

$pdo = getDbConnection();

// Fetch active alert rules for real-time threshold check
$rules = $pdo->query("SELECT * FROM farm_alert_rules WHERE is_active = 1")->fetchAll();
$ruleMap = [];
foreach ($rules as $r) {
    $ruleMap[$r['rule_key']] = $r;
}

$sql = "INSERT INTO farm_sensor_logs (
    rpi_doc_id, node_id, node_ts, s_temp, s_hmd, w_temp, a_hmd, p_water, 
    e_water, l_int, s_temp_s, w_speed, w_level, f_rate, c_stat, f_stat, 
    rssi, snr, rpi_received_at
) VALUES (
    :rpi_doc_id, :node_id, :node_ts, :s_temp, :s_hmd, :w_temp, :a_hmd, :p_water,
    :e_water, :l_int, :s_temp_s, :w_speed, :w_level, :f_rate, :c_stat, :f_stat,
    :rssi, :snr, :rpi_received_at
)";

$alertStmt = $pdo->prepare("INSERT INTO farm_alert_logs (rule_key, node_id, message, current_val, threshold_val, severity) VALUES (?, ?, ?, ?, ?, ?)");

$stmt = $pdo->prepare($sql);
$insertedCount = 0;
$alertTriggered = 0;
$lineMessages = [];

try {
    $pdo->beginTransaction();

    foreach ($records as $item) {
        $data = $item['data'] ?? [];
        $nodeId = $item['node_id'] ?? 'ESP32_NODE_01';

        $stmt->execute([
            ':rpi_doc_id'     => $item['rpi_doc_id'] ?? null,
            ':node_id'        => $nodeId,
            ':node_ts'        => $item['node_ts'] ?? time(),
            ':s_temp'         => isset($data['s_temp']) ? round(floatval($data['s_temp']), 2) : null,
            ':s_hmd'          => isset($data['s_hmd']) ? round(floatval($data['s_hmd']), 2) : null,
            ':w_temp'         => isset($data['w_temp']) ? round(floatval($data['w_temp']), 2) : null,
            ':a_hmd'          => isset($data['a_hmd']) ? round(floatval($data['a_hmd']), 2) : null,
            ':p_water'        => isset($data['p_water']) ? round(floatval($data['p_water']), 2) : null,
            ':e_water'        => isset($data['e_water']) ? round(floatval($data['e_water']), 2) : null,
            ':l_int'          => isset($data['l_int']) ? round(floatval($data['l_int']), 1) : null,
            ':s_temp_s'       => isset($data['s_temp_s']) ? round(floatval($data['s_temp_s']), 2) : null,
            ':w_speed'        => isset($data['w_speed']) ? round(floatval($data['w_speed']), 2) : null,
            ':w_level'        => isset($data['w_level']) ? round(floatval($data['w_level']), 2) : null,
            ':f_rate'         => isset($data['f_rate']) ? round(floatval($data['f_rate']), 2) : null,
            ':c_stat'         => $data['c_stat'] ?? 'NORMAL',
            ':f_stat'         => $data['f_stat'] ?? 'IDLE',
            ':rssi'           => isset($item['rssi']) ? intval($item['rssi']) : null,
            ':snr'            => isset($item['snr']) ? round(floatval($item['snr']), 2) : null,
            ':rpi_received_at'=> $item['received_at'] ?? null
        ]);
        $insertedCount++;

        // Threshold evaluation
        foreach ($ruleMap as $key => $rule) {
            if (isset($data[$key])) {
                $val = round(floatval($data[$key]), 2);
                if ($rule['min_val'] !== null && $val < $rule['min_val']) {
                    $msg = "{$rule['label']} ต่ำกว่าเกณฑ์ ({$val} < {$rule['min_val']} {$rule['unit']})";
                    $alertStmt->execute([$key, $nodeId, $msg, $val, $rule['min_val'], 'WARNING']);
                    $alertTriggered++;
                    $lineMessages[$key] = "⚠️ [WARNING] {$nodeId}\n• {$msg}";
                } elseif ($rule['max_val'] !== null && $val > $rule['max_val']) {
                    $msg = "{$rule['label']} สูงกว่าเกณฑ์ ({$val} > {$rule['max_val']} {$rule['unit']})";
                    $alertStmt->execute([$key, $nodeId, $msg, $val, $rule['max_val'], 'DANGER']);
                    $alertTriggered++;
                    $lineMessages[$key] = "🚨 [DANGER] {$nodeId}\n• {$msg}";
                }
            }
        }

        // Auto-Control Evaluation (เฉพาะอุปกรณ์ที่เปิดโหมด AUTO MODE = 1)
        $autoDevices = $pdo->query("SELECT device_id, state, threshold_val FROM farm_device_controls WHERE auto_mode = 1")->fetchAll();
        if (!empty($autoDevices)) {
            $updateDevStmt = $pdo->prepare("UPDATE farm_device_controls SET state = ?, feedback_status = ?, last_command_at = CURRENT_TIMESTAMP WHERE device_id = ? AND state != ?");
            foreach ($autoDevices as $dev) {
                $devId = $dev['device_id'];
                $newState = null;

                if ($devId === 'pump_1' && isset($data['s_hmd'])) {
                    $limit = floatval($dev['threshold_val'] ?: 65.0);
                    $newState = (floatval($data['s_hmd']) < $limit) ? 'ON' : 'OFF';
                } elseif ($devId === 'fan_1' && isset($data['s_temp_s'])) {
                    $limit = floatval($dev['threshold_val'] ?: 32.0);
                    $newState = (floatval($data['s_temp_s']) > $limit) ? 'ON' : 'OFF';
                } elseif ($devId === 'light_1' && isset($data['l_int'])) {
                    $limit = floatval($dev['threshold_val'] ?: 30000.0);
                    $newState = (floatval($data['l_int']) < $limit) ? 'ON' : 'OFF';
                } elseif ($devId === 'valve_1' && isset($data['e_water'])) {
                    $limit = floatval($dev['threshold_val'] ?: 1.5);
                    $newState = (floatval($data['e_water']) < $limit) ? 'ON' : 'OFF';
                }

                if ($newState !== null && $newState !== $dev['state']) {
                    $fb = strtoupper($devId) . '_' . $newState . '_AUTO';
                    $updateDevStmt->execute([$newState, $fb, $devId, $newState]);
                }
            }
        }
    }

    $pdo->commit();

    // หากมีการแจ้งเตือน ให้ส่งเข้า LINE อัตโนมัติ (มีระบบ Cooldown กันสแปม)
    $lineResult = null;
    if (!empty($lineMessages)) {
        $timeStr = date('Y-m-d H:i:s');
        $fullText = "🌱 แจ้งเตือนระบบ CRU Smart Farm\n"
                  . "━━━━━━━━━━━━━━\n"
                  . implode("\n", array_values($lineMessages)) . "\n"
                  . "━━━━━━━━━━━━━━\n"
                  . "🕒 เวลา: {$timeStr}\n"
                  . "📊 แดชบอร์ด: http://olmy.duckdns.org:5173";
        $lineResult = sendLineAlertMessage($pdo, $fullText, false);
    }

    // ดึงสถานะคำสั่งควบคุมอุปกรณ์ทั้ง 4 ช่องส่งกลับไปพร้อม sync response
    $ctrlStmt = $pdo->query("SELECT device_id, command_state, auto_mode FROM farm_device_controls");
    $controlsMap = [];
    foreach ($ctrlStmt->fetchAll() as $cRow) {
        $controlsMap[$cRow['device_id']] = $cRow['command_state'];
    }

    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced {$insertedCount} records.",
        'synced_count' => $insertedCount,
        'alerts_triggered' => $alertTriggered,
        'line_notification' => $lineResult,
        'controls' => $controlsMap
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Sync failed: ' . $e->getMessage()]);
}
