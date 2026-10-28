<?php
/**
 * Sensors Data API Endpoint
 * Serves real-time readings, historical series, and summary stats to Frontend.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();
$type = $_GET['type'] ?? 'latest';

try {
    if ($type === 'latest') {
        $stmt = $pdo->query("SELECT * FROM farm_sensor_logs ORDER BY id DESC LIMIT 1");
        $latest = $stmt->fetch();

        $countStmt = $pdo->query("SELECT COUNT(*) FROM farm_sensor_logs");
        $totalLogs = $countStmt->fetchColumn();

        $unreadAlerts = $pdo->query("SELECT COUNT(*) FROM farm_alert_logs WHERE is_read = 0")->fetchColumn();

        echo json_encode([
            'status' => 'success',
            'latest' => $latest ?: null,
            'total_logs' => intval($totalLogs),
            'unread_alerts' => intval($unreadAlerts),
            'server_time' => date('Y-m-d H:i:s')
        ]);

    } elseif ($type === 'history') {
        $hours = isset($_GET['hours']) ? max(1, min(168, intval($_GET['hours']))) : 24;
        $limit = isset($_GET['limit']) ? min(300, intval($_GET['limit'])) : 100;

        $stmt = $pdo->prepare("SELECT id, node_id, s_temp, s_hmd, w_temp, a_hmd, p_water, e_water, l_int, s_temp_s, w_speed, w_level, f_rate, rssi, synced_at 
            FROM farm_sensor_logs 
            ORDER BY id DESC LIMIT :limit");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = array_reverse($stmt->fetchAll());

        echo json_encode([
            'status' => 'success',
            'hours' => $hours,
            'count' => count($rows),
            'records' => $rows
        ]);

    } elseif ($type === 'stats') {
        // Daily min/max/average statistics
        $stmt = $pdo->query("SELECT 
            AVG(s_temp) as avg_s_temp, MIN(s_temp) as min_s_temp, MAX(s_temp) as max_s_temp,
            AVG(s_hmd) as avg_s_hmd, MIN(s_hmd) as min_s_hmd, MAX(s_hmd) as max_s_hmd,
            AVG(w_temp) as avg_w_temp, MIN(w_temp) as min_w_temp, MAX(w_temp) as max_w_temp,
            AVG(p_water) as avg_p_water, MIN(p_water) as min_p_water, MAX(p_water) as max_p_water,
            AVG(e_water) as avg_e_water, MIN(e_water) as min_e_water, MAX(e_water) as max_e_water
        FROM farm_sensor_logs");
        $stats = $stmt->fetch();

        echo json_encode([
            'status' => 'success',
            'stats' => $stats
        ]);

    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown type parameter']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
