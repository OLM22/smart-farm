<?php
/**
 * Database Configuration for Smart Farm PHP Server
 * Supports SQLite (Default for zero-config testing) and MySQL / MariaDB via PDO.
 */

define('API_SECRET_KEY', 'smartfarm_secret_token_2026');

// Database type: 'sqlite' or 'mysql'
define('DB_DRIVER', 'sqlite');

// MySQL Settings (if DB_DRIVER == 'mysql')
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', 'smart_farm_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// SQLite Settings (stores database in server_php/database/smart_farm.sqlite)
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
            initSqliteSchema($pdo);
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

function initSqliteSchema($pdo) {
    $sql = "CREATE TABLE IF NOT EXISTS farm_sensor_logs (
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
    );";
    $pdo->exec($sql);
}
