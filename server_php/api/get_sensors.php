<?php
/**
 * Smart Farm Sensor Retrieval API
 * Returns latest telemetry and historical records.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();

$limit = isset($_GET['limit']) ? min(intval($_GET['limit']), 100) : 20;
$nodeId = $_GET['node_id'] ?? null;

try {
    if ($nodeId) {
        $stmt = $pdo->prepare("SELECT * FROM farm_sensor_logs WHERE node_id = :node_id ORDER BY id DESC LIMIT :limit");
        $stmt->bindValue(':node_id', $nodeId, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM farm_sensor_logs ORDER BY id DESC LIMIT :limit");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    }

    $stmt->execute();
    $rows = $stmt->fetchAll();

    $latest = !empty($rows) ? $rows[0] : null;

    echo json_encode([
        'status' => 'success',
        'count' => count($rows),
        'latest' => $latest,
        'records' => $rows
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
