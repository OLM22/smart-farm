<?php
/**
 * Smart Farm Backend - Database Configuration & Helpers
 * Supports SQLite (Default for zero-config testing) and MySQL / MariaDB via PDO.
 */

// Enable CORS for modern React Frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Farm-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('API_SECRET_KEY', 'smartfarm_secret_token_2026');

// Database Driver: 'sqlite' or 'mysql'
define('DB_DRIVER', 'sqlite');

// MySQL Settings (if DB_DRIVER == 'mysql')
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', 'smart_farm_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// SQLite Settings
define('SQLITE_FILE', __DIR__ . '/../database/smart_farm.sqlite');

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        if (DB_DRIVER === 'sqlite') {
            $dir = dirname(SQLITE_FILE);
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
            $pdo = new PDO('sqlite:' . SQLITE_FILE);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            initSchema($pdo);
        } else {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

function initSchema($pdo) {
    // 1. Table for Sensor Logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS farm_sensor_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rpi_doc_id TEXT,
        node_id TEXT,
        node_ts INTEGER,
        s_temp REAL,
        s_hmd REAL,
        w_temp REAL,
        a_hmd REAL,
        p_water REAL,
        e_water REAL,
        l_int REAL,
        s_temp_s REAL,
        w_speed REAL,
        w_level REAL,
        f_rate REAL,
        c_stat TEXT,
        f_stat TEXT,
        rssi INTEGER,
        snr REAL,
        rpi_received_at TEXT,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );");

    // 2. Table for Alert Rules / Thresholds
    $pdo->exec("CREATE TABLE IF NOT EXISTS farm_alert_rules (
        rule_key TEXT PRIMARY KEY,
        label TEXT,
        min_val REAL,
        max_val REAL,
        unit TEXT,
        is_active INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );");

    // 3. Table for Alert Event Logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS farm_alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_key TEXT,
        node_id TEXT,
        message TEXT,
        current_val REAL,
        threshold_val REAL,
        severity TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );");

    // 4. Table for Device Controls & Actuators
    $pdo->exec("CREATE TABLE IF NOT EXISTS farm_device_controls (
        device_id TEXT PRIMARY KEY,
        device_name TEXT,
        state TEXT DEFAULT 'OFF',
        auto_mode INTEGER DEFAULT 0,
        feedback_status TEXT DEFAULT 'IDLE',
        last_command_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );");

    // Seed default alert thresholds if empty
    $count = $pdo->query("SELECT COUNT(*) FROM farm_alert_rules")->fetchColumn();
    if ($count == 0) {
        $defaultRules = [
            ['s_temp', 'อุณหภูมิดิน (Soil Temp)', 20.0, 35.0, '°C'],
            ['s_hmd', 'ความชื้นดิน (Soil Humidity)', 40.0, 85.0, '%'],
            ['w_temp', 'อุณหภูมิน้ำ (Water Temp)', 20.0, 30.0, '°C'],
            ['p_water', 'ค่า pH ของน้ำ (Water pH)', 5.5, 7.8, 'pH'],
            ['e_water', 'ค่า EC นำไฟฟ้า (Water EC)', 0.8, 2.5, 'mS/cm'],
            ['w_level', 'ระดับน้ำในถัง (Water Level)', 30.0, 100.0, '%'],
            ['a_hmd', 'ความชื้นในอากาศ (Air Humidity)', 40.0, 90.0, '%'],
            ['s_temp_s', 'อุณหภูมิอากาศ (Air Temp)', 20.0, 38.0, '°C']
        ];
        $stmt = $pdo->prepare("INSERT INTO farm_alert_rules (rule_key, label, min_val, max_val, unit) VALUES (?, ?, ?, ?, ?)");
        foreach ($defaultRules as $r) {
            $stmt->execute($r);
        }
    }

    // Seed default actuators
    $actCount = $pdo->query("SELECT COUNT(*) FROM farm_device_controls")->fetchColumn();
    if ($actCount == 0) {
        $defaultDevices = [
            ['pump_1', 'ปั๊มน้ำหลัก (Main Water Pump)', 'OFF', 1, 'PUMP_OFF'],
            ['fan_1', 'พัดลมระบายอากาศ (Exhaust Fan)', 'OFF', 1, 'FAN_OFF'],
            ['light_1', 'ระบบไฟสังเคราะห์แสง (Growth Light)', 'OFF', 0, 'LIGHT_OFF'],
            ['valve_1', 'วาล์วน้ำสารละลาย (Nutrient Valve)', 'OFF', 0, 'VALVE_CLOSED']
        ];
        $stmt = $pdo->prepare("INSERT INTO farm_device_controls (device_id, device_name, state, auto_mode, feedback_status) VALUES (?, ?, ?, ?, ?)");
        foreach ($defaultDevices as $d) {
            $stmt->execute($d);
        }
    }
}
