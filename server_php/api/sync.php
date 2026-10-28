<?php
/**
 * Smart Farm Sync Endpoint
 * Accepts batch sensor records synced from Raspberry Pi Gateway.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

// Method check
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed. Use POST.']);
    exit;
}

// Read JSON input
$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload.']);
    exit;
}

// API Key Verification
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

$sql = "INSERT INTO farm_sensor_logs (
    rpi_doc_id, node_id, node_ts, s_temp, s_hmd, w_temp, a_hmd, p_water, 
    e_water, l_int, s_temp_s, w_speed, w_level, f_rate, c_stat, f_stat, 
    rssi, snr, rpi_received_at
) VALUES (
    :rpi_doc_id, :node_id, :node_ts, :s_temp, :s_hmd, :w_temp, :a_hmd, :p_water,
    :e_water, :l_int, :s_temp_s, :w_speed, :w_level, :f_rate, :c_stat, :f_stat,
    :rssi, :snr, :rpi_received_at
)";

$stmt = $pdo->prepare($sql);
$insertedCount = 0;

try {
    $pdo->beginTransaction();

    foreach ($records as $item) {
        $data = $item['data'] ?? [];

        $stmt->execute([
            ':rpi_doc_id'     => $item['rpi_doc_id'] ?? null,
            ':node_id'        => $item['node_id'] ?? 'UNKNOWN',
            ':node_ts'        => $item['node_ts'] ?? time(),
            ':s_temp'         => isset($data['s_temp']) ? floatval($data['s_temp']) : null,
            ':s_hmd'          => isset($data['s_hmd']) ? floatval($data['s_hmd']) : null,
            ':w_temp'         => isset($data['w_temp']) ? floatval($data['w_temp']) : null,
            ':a_hmd'          => isset($data['a_hmd']) ? floatval($data['a_hmd']) : null,
            ':p_water'        => isset($data['p_water']) ? floatval($data['p_water']) : null,
            ':e_water'        => isset($data['e_water']) ? floatval($data['e_water']) : null,
            ':l_int'          => isset($data['l_int']) ? floatval($data['l_int']) : null,
            ':s_temp_s'       => isset($data['s_temp_s']) ? floatval($data['s_temp_s']) : null,
            ':w_speed'        => isset($data['w_speed']) ? floatval($data['w_speed']) : null,
            ':w_level'        => isset($data['w_level']) ? floatval($data['w_level']) : null,
            ':f_rate'         => isset($data['f_rate']) ? floatval($data['f_rate']) : null,
            ':c_stat'         => $data['c_stat'] ?? 'NORMAL',
            ':f_stat'         => $data['f_stat'] ?? 'IDLE',
            ':rssi'           => isset($item['rssi']) ? intval($item['rssi']) : null,
            ':snr'            => isset($item['snr']) ? floatval($item['snr']) : null,
            ':rpi_received_at'=> $item['received_at'] ?? null
        ]);
        $insertedCount++;
    }

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => "Successfully synced {$insertedCount} records.",
        'synced_count' => $insertedCount
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Sync failed: ' . $e->getMessage()
    ]);
}
