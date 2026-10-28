<?php
/**
 * Actuators & Relay Control API Endpoint
 * Handles pump, fan, light, and valve switching with feedback loop.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM farm_device_controls ORDER BY device_id ASC");
    echo json_encode([
        'status' => 'success',
        'devices' => $stmt->fetchAll()
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $deviceId = $data['device_id'] ?? null;
    $state = $data['state'] ?? null;
    $autoMode = isset($data['auto_mode']) ? intval($data['auto_mode']) : null;

    if (!$deviceId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'device_id required']);
        exit;
    }

    $updates = [];
    $params = [':device_id' => $deviceId];

    if ($state !== null) {
        $updates[] = "state = :state";
        $updates[] = "feedback_status = :feedback";
        $params[':state'] = $state;
        $params[':feedback'] = $state === 'ON' ? strtoupper($deviceId) . '_ON' : strtoupper($deviceId) . '_OFF';
    }

    if ($autoMode !== null) {
        $updates[] = "auto_mode = :auto_mode";
        $params[':auto_mode'] = $autoMode;
    }

    $updates[] = "last_command_at = CURRENT_TIMESTAMP";

    $sql = "UPDATE farm_device_controls SET " . implode(", ", $updates) . " WHERE device_id = :device_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        'status' => 'success',
        'message' => "Device {$deviceId} updated",
        'device_id' => $deviceId,
        'new_state' => $state
    ]);
    exit;
}
