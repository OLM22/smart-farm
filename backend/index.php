<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config/database.php';

$pdo = getDbConnection();
$count = $pdo->query("SELECT COUNT(*) FROM farm_sensor_logs")->fetchColumn();

echo json_encode([
    'service' => 'Smart Farm AIoT REST Backend',
    'status' => 'healthy',
    'version' => '2.0.0',
    'database' => DB_DRIVER,
    'total_sensor_records' => intval($count),
    'endpoints' => [
        'POST /api/sync.php' => 'Sync telemetry from Raspberry Pi (requires X-Farm-API-Key)',
        'GET /api/sensors.php?type=latest' => 'Latest telemetry and general stats',
        'GET /api/sensors.php?type=history&hours=24' => 'Time-series sensor records for charts',
        'GET /api/sensors.php?type=stats' => 'Min/Max/Avg telemetry stats',
        'GET /api/alerts.php?type=rules' => 'Alert thresholds list',
        'POST /api/alerts.php?type=update_rule' => 'Update min/max threshold',
        'GET /api/alerts.php?type=logs' => 'Historical alert logs',
        'GET /api/controls.php' => 'Actuator/Relay device status',
        'POST /api/controls.php' => 'Switch actuator state ON/OFF'
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
