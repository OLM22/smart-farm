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

    } elseif ($type === 'line_settings') {
        $cfg = $pdo->query("SELECT * FROM farm_line_settings WHERE id = 1")->fetch();
        echo json_encode([
            'status' => 'success',
            'settings' => [
                'line_enabled'  => intval($cfg['line_enabled'] ?? 1),
                'channel_token' => $cfg['channel_token'] ?? '',
                'target_id'     => $cfg['target_id'] ?? '',
                'cooldown_sec'  => intval($cfg['cooldown_sec'] ?? 60),
                'last_sent_ts'  => intval($cfg['last_sent_ts'] ?? 0)
            ]
        ]);

    } elseif ($type === 'save_line_settings') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE farm_line_settings SET line_enabled = :enabled, channel_token = :token, target_id = :target, cooldown_sec = :cooldown, updated_at = CURRENT_TIMESTAMP WHERE id = 1");
        $stmt->execute([
            ':enabled'  => isset($data['line_enabled']) ? intval($data['line_enabled']) : 1,
            ':token'    => trim($data['channel_token'] ?? ''),
            ':target'   => trim($data['target_id'] ?? ''),
            ':cooldown' => isset($data['cooldown_sec']) ? intval($data['cooldown_sec']) : 60
        ]);

        echo json_encode(['status' => 'success', 'message' => 'บันทึกการตั้งค่าแจ้งเตือน LINE เรียบร้อยแล้ว']);

    } elseif ($type === 'test_line') {
        $data = json_decode(file_get_contents('php://input'), true);
        // หากส่ง token มาพร้อมปุ่มทดสอบ ให้บันทึกก่อนทดสอบทันที
        if (isset($data['channel_token'])) {
            $stmt = $pdo->prepare("UPDATE farm_line_settings SET line_enabled = :enabled, channel_token = :token, target_id = :target, cooldown_sec = :cooldown, updated_at = CURRENT_TIMESTAMP WHERE id = 1");
            $stmt->execute([
                ':enabled'  => isset($data['line_enabled']) ? intval($data['line_enabled']) : 1,
                ':token'    => trim($data['channel_token'] ?? ''),
                ':target'   => trim($data['target_id'] ?? ''),
                ':cooldown' => isset($data['cooldown_sec']) ? intval($data['cooldown_sec']) : 60
            ]);
        }

        $timeStr = date('Y-m-d H:i:s');
        $testMsg = "🌱 [ทดสอบการแจ้งเตือน CRU Smart Farm]\n"
                 . "━━━━━━━━━━━━━━\n"
                 . "✅ ระบบแจ้งเตือน LINE Messaging API เชื่อมต่อสำเร็จ!\n"
                 . "📡 โหนด: ESP32_NODE_01 (LoRa 433MHz)\n"
                 . "🕒 เวลา: {$timeStr}\n"
                 . "🌐 แดชบอร์ด: http://olmy.duckdns.org:5173";

        $res = sendLineAlertMessage($pdo, $testMsg, true);
        if ($res['sent']) {
            echo json_encode(['status' => 'success', 'message' => 'ส่งข้อความทดสอบเข้า LINE สำเร็จแล้ว! กรุณาเช็กในแอป LINE ของคุณ']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'ส่งไม่สำเร็จ: ' . ($res['reason'] ?? 'Unknown error')]);
        }

    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
