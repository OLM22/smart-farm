<?php
/**
 * Alerts & Thresholds API Endpoint
 * Manages sensor alert rules and historical notifications.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();
$type = $_GET['type'] ?? 'logs';

try {
    if ($type === 'rules') {
        $stmt = $pdo->query("SELECT * FROM farm_alert_rules ORDER BY rule_key ASC");
        echo json_encode([
            'status' => 'success',
            'rules' => $stmt->fetchAll()
        ]);

    } elseif ($type === 'update_rule') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['rule_key'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing rule_key']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE farm_alert_rules SET min_val = :min_val, max_val = :max_val, is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE rule_key = :rule_key");
        $stmt->execute([
            ':rule_key'   => $data['rule_key'],
            ':min_val'    => isset($data['min_val']) ? floatval($data['min_val']) : null,
            ':max_val'    => isset($data['max_val']) ? floatval($data['max_val']) : null,
            ':is_active'  => isset($data['is_active']) ? intval($data['is_active']) : 1
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Alert rule updated']);

    } elseif ($type === 'logs') {
        $limit = isset($_GET['limit']) ? min(100, intval($_GET['limit'])) : 50;
        $stmt = $pdo->prepare("SELECT * FROM farm_alert_logs ORDER BY id DESC LIMIT :limit");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            'status' => 'success',
            'logs' => $stmt->fetchAll()
        ]);

    } elseif ($type === 'mark_read') {
        $data = json_decode(file_get_contents('php://input'), true);
        $alertId = $data['id'] ?? null;

        if ($alertId === 'all') {
            $pdo->exec("UPDATE farm_alert_logs SET is_read = 1 WHERE is_read = 0");
        } elseif ($alertId) {
            $stmt = $pdo->prepare("UPDATE farm_alert_logs SET is_read = 1 WHERE id = ?");
            $stmt->execute([$alertId]);
        }

        echo json_encode(['status' => 'success', 'message' => 'Alert(s) marked as read']);

    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
