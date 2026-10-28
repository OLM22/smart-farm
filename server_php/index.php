<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Farm AIoT - Live Telemetry Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --surface-color: rgba(18, 24, 38, 0.85);
            --surface-border: rgba(255, 255, 255, 0.08);
            --card-hover: rgba(30, 41, 59, 0.85);
            --accent-green: #10b981;
            --accent-green-glow: rgba(16, 185, 129, 0.35);
            --accent-blue: #3b82f6;
            --accent-blue-glow: rgba(59, 130, 246, 0.35);
            --accent-cyan: #06b6d4;
            --accent-amber: #f59e0b;
            --accent-purple: #8b5cf6;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Plus Jakarta Sans', 'Prompt', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 24px;
            background-image: 
                radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.12) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.12) 0px, transparent 50%);
            background-attachment: fixed;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 28px;
            padding: 20px 24px;
            background: var(--surface-color);
            backdrop-filter: blur(12px);
            border: 1px solid var(--surface-border);
            border-radius: 16px;
        }

        .brand-title {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .brand-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #10b981, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px var(--accent-green-glow);
        }

        .brand-icon svg {
            width: 26px;
            height: 26px;
            fill: white;
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .subtitle {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        .system-status {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #34d399;
            box-shadow: 0 0 8px #34d399;
            animation: pulse 1.8s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.25); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }

        .btn {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-primary);
            border: 1px solid var(--surface-border);
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
        }

        .btn-primary {
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            box-shadow: 0 4px 14px var(--accent-green-glow);
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #059669, #047857);
        }

        /* Top Bar Info */
        .telemetry-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .meta-card {
            background: var(--surface-color);
            backdrop-filter: blur(12px);
            border: 1px solid var(--surface-border);
            padding: 16px 20px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .meta-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 4px;
        }

        .meta-val {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        /* Grid */
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
        }

        .sensor-card {
            background: var(--surface-color);
            backdrop-filter: blur(12px);
            border: 1px solid var(--surface-border);
            padding: 22px;
            border-radius: 16px;
            position: relative;
            overflow: hidden;
            transition: all 0.25s ease;
        }

        .sensor-card:hover {
            transform: translateY(-3px);
            border-color: rgba(255, 255, 255, 0.2);
            background: var(--card-hover);
        }

        .sensor-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--card-accent, #10b981);
        }

        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 14px;
        }

        .card-title {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .card-param {
            font-size: 0.7rem;
            color: var(--text-muted);
            font-family: monospace;
            background: rgba(255, 255, 255, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
        }

        .card-value-group {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 8px;
        }

        .card-value {
            font-size: 2.2rem;
            font-weight: 800;
            letter-spacing: -0.03em;
        }

        .card-unit {
            font-size: 0.95rem;
            color: var(--text-muted);
            font-weight: 500;
        }

        .card-footer {
            font-size: 0.75rem;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid rgba(255, 255, 255, 0.04);
            padding-top: 10px;
            margin-top: 8px;
        }

        /* History Table Section */
        .history-section {
            background: var(--surface-color);
            backdrop-filter: blur(12px);
            border: 1px solid var(--surface-border);
            border-radius: 16px;
            padding: 24px;
            overflow-x: auto;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .section-title {
            font-size: 1.1rem;
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }

        th {
            text-align: left;
            padding: 12px 14px;
            color: var(--text-muted);
            font-weight: 600;
            border-bottom: 1px solid var(--surface-border);
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
        }

        td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--text-secondary);
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.02);
            color: var(--text-primary);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header>
            <div class="brand-title">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4a1 1 0 0 0 1.41 1.41l1.78-.62C9.13 20.61 10.53 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-1.28 0-2.48-.32-3.53-.88l-.29-.15-2.07.72.72-2.07-.15-.29C6.12 15.28 5.8 14.08 5.8 12.8c0-3.42 2.78-6.2 6.2-6.2s6.2 2.78 6.2 6.2-2.78 6.2-6.2 6.2z"/></svg>
                </div>
                <div>
                    <h1>Smart Farm AIoT System</h1>
                    <div class="subtitle">LoRa ESP32 ➔ Raspberry Pi Gateway (MongoDB) ➔ PHP Server Sync</div>
                </div>
            </div>

            <div class="system-status">
                <div class="badge">
                    <span class="pulse-dot"></span>
                    <span id="sync-status">Sync Active</span>
                </div>
                <button class="btn btn-primary" onclick="simulateSyncPacket()">
                    ⚡ Test Simulate Sync
                </button>
            </div>
        </header>

        <!-- Metadata Cards -->
        <div class="telemetry-meta">
            <div class="meta-card">
                <div>
                    <div class="meta-label">Active Node ID</div>
                    <div class="meta-val" id="meta-node-id">--</div>
                </div>
            </div>
            <div class="meta-card">
                <div>
                    <div class="meta-label">LoRa RSSI / SNR</div>
                    <div class="meta-val" id="meta-lora-signal">-- dBm</div>
                </div>
            </div>
            <div class="meta-card">
                <div>
                    <div class="meta-label">Current Status</div>
                    <div class="meta-val" id="meta-cur-stat">--</div>
                </div>
            </div>
            <div class="meta-card">
                <div>
                    <div class="meta-label">Last Synced Time</div>
                    <div class="meta-val" id="meta-last-sync">--:--:--</div>
                </div>
            </div>
        </div>

        <!-- Sensor Cards Grid -->
        <div class="cards-grid">
            <!-- Soil Temp -->
            <div class="sensor-card" style="--card-accent: #f59e0b;">
                <div class="card-top">
                    <span class="card-title">อุณหภูมิดิน (Soil Temp)</span>
                    <span class="card-param">s_temp</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-s_temp">--</span>
                    <span class="card-unit">°C</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 20 - 32 °C</span></div>
            </div>

            <!-- Soil Humidity -->
            <div class="sensor-card" style="--card-accent: #10b981;">
                <div class="card-top">
                    <span class="card-title">ความชื้นในดิน (Soil Humidity)</span>
                    <span class="card-param">s_hmd</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-s_hmd">--</span>
                    <span class="card-unit">%</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 50 - 80 %</span></div>
            </div>

            <!-- Water Temp -->
            <div class="sensor-card" style="--card-accent: #06b6d4;">
                <div class="card-top">
                    <span class="card-title">อุณหภูมิน้ำ (Water Temp)</span>
                    <span class="card-param">w_temp</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-w_temp">--</span>
                    <span class="card-unit">°C</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 22 - 28 °C</span></div>
            </div>

            <!-- Air Temp -->
            <div class="sensor-card" style="--card-accent: #ef4444;">
                <div class="card-top">
                    <span class="card-title">อุณหภูมิอากาศ (Air Temp)</span>
                    <span class="card-param">s_temp_s</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-s_temp_s">--</span>
                    <span class="card-unit">°C</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 25 - 35 °C</span></div>
            </div>

            <!-- Air Humidity -->
            <div class="sensor-card" style="--card-accent: #3b82f6;">
                <div class="card-top">
                    <span class="card-title">ความชื้นอากาศ (Air Humidity)</span>
                    <span class="card-param">a_hmd</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-a_hmd">--</span>
                    <span class="card-unit">%</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 60 - 85 %</span></div>
            </div>

            <!-- Water pH -->
            <div class="sensor-card" style="--card-accent: #8b5cf6;">
                <div class="card-top">
                    <span class="card-title">ค่า pH น้ำ (Water pH)</span>
                    <span class="card-param">p_water</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-p_water">--</span>
                    <span class="card-unit">pH</span>
                </div>
                <div class="card-footer"><span>เป้าหมาย: 6.0 - 7.5</span></div>
            </div>

            <!-- Water EC -->
            <div class="sensor-card" style="--card-accent: #ec4899;">
                <div class="card-top">
                    <span class="card-title">ค่าความนำไฟฟ้า (Water EC)</span>
                    <span class="card-param">e_water</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-e_water">--</span>
                    <span class="card-unit">mS/cm</span>
                </div>
                <div class="card-footer"><span>ช่วงปกติ: 1.0 - 2.5</span></div>
            </div>

            <!-- Light Intensity -->
            <div class="sensor-card" style="--card-accent: #eab308;">
                <div class="card-top">
                    <span class="card-title">ความเข้มแสง (Light Intensity)</span>
                    <span class="card-param">l_int</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-l_int">--</span>
                    <span class="card-unit">Lux</span>
                </div>
                <div class="card-footer"><span>เซนเซอร์สังเคราะห์แสง</span></div>
            </div>

            <!-- Wind Speed -->
            <div class="sensor-card" style="--card-accent: #64748b;">
                <div class="card-top">
                    <span class="card-title">ความเร็วลม (Wind Speed)</span>
                    <span class="card-param">w_speed</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-w_speed">--</span>
                    <span class="card-unit">m/s</span>
                </div>
                <div class="card-footer"><span>สถานีวัดสภาพอากาศ</span></div>
            </div>

            <!-- Water Level -->
            <div class="sensor-card" style="--card-accent: #0284c7;">
                <div class="card-top">
                    <span class="card-title">ระดับน้ำ (Water Level)</span>
                    <span class="card-param">w_level</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-w_level">--</span>
                    <span class="card-unit">%</span>
                </div>
                <div class="card-footer"><span>ถังเก็บน้ำหล่อเลี้ยง</span></div>
            </div>

            <!-- Flow Rate -->
            <div class="sensor-card" style="--card-accent: #14b8a6;">
                <div class="card-top">
                    <span class="card-title">อัตราการไหล (Flow Rate)</span>
                    <span class="card-param">f_rate</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-f_rate">--</span>
                    <span class="card-unit">L/min</span>
                </div>
                <div class="card-footer"><span>ท่อส่งน้ำหลัก</span></div>
            </div>

            <!-- Feedback / Control Status -->
            <div class="sensor-card" style="--card-accent: #6366f1;">
                <div class="card-top">
                    <span class="card-title">สถานะตอบสนอง (Feedback)</span>
                    <span class="card-param">f_stat</span>
                </div>
                <div class="card-value-group">
                    <span class="card-value" id="val-f_stat" style="font-size: 1.6rem;">--</span>
                </div>
                <div class="card-footer"><span>ควบคุมอัตโนมัติ</span></div>
            </div>
        </div>

        <!-- Historical Logs Table -->
        <div class="history-section">
            <div class="section-header">
                <div class="section-title">ประวัติการรับข้อมูลล่าสุด (Recent Synced Records)</div>
                <button class="btn" onclick="fetchSensorData()">🔄 รีเฟรช</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Node ID</th>
                        <th>เวลาซิงค์ (Server)</th>
                        <th>อุณหภูมิดิน</th>
                        <th>ความชื้นดิน</th>
                        <th>อุณหภูมิน้ำ</th>
                        <th>pH</th>
                        <th>EC</th>
                        <th>ความเข้มแสง</th>
                        <th>RSSI / SNR</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody id="logs-table-body">
                    <tr><td colspan="11" style="text-align: center; color: var(--text-muted);">กำลังโหลดข้อมูล...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        async function fetchSensorData() {
            try {
                const res = await fetch('api/get_sensors.php?limit=15');
                const result = await res.json();

                if (result.status === 'success' && result.latest) {
                    const row = result.latest;
                    document.getElementById('meta-node-id').textContent = row.node_id || '--';
                    document.getElementById('meta-lora-signal').textContent = `${row.rssi ?? '--'} dBm / ${row.snr ?? '--'}`;
                    document.getElementById('meta-cur-stat').textContent = row.c_stat || 'NORMAL';
                    document.getElementById('meta-last-sync').textContent = row.synced_at ? row.synced_at.split(' ')[1] : '--';

                    const keys = ['s_temp', 's_hmd', 'w_temp', 's_temp_s', 'a_hmd', 'p_water', 'e_water', 'l_int', 'w_speed', 'w_level', 'f_rate', 'f_stat'];
                    keys.forEach(k => {
                        const el = document.getElementById(`val-${k}`);
                        if (el && row[k] !== undefined && row[k] !== null) {
                            el.textContent = row[k];
                        }
                    });

                    // Render table
                    const tbody = document.getElementById('logs-table-body');
                    if (result.records && result.records.length > 0) {
                        tbody.innerHTML = result.records.map(r => `
                            <tr>
                                <td>#${r.id}</td>
                                <td><strong>${r.node_id}</strong></td>
                                <td>${r.synced_at}</td>
                                <td>${r.s_temp ?? '-'} °C</td>
                                <td>${r.s_hmd ?? '-'} %</td>
                                <td>${r.w_temp ?? '-'} °C</td>
                                <td>${r.p_water ?? '-'}</td>
                                <td>${r.e_water ?? '-'}</td>
                                <td>${r.l_int ?? '-'}</td>
                                <td>${r.rssi ?? '-'} dBm</td>
                                <td><span style="color: #34d399;">${r.c_stat ?? 'NORMAL'}</span></td>
                            </tr>
                        `).join('');
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
            }
        }

        async function simulateSyncPacket() {
            const mockPacket = {
                api_key: "smartfarm_secret_token_2026",
                count: 1,
                records: [{
                    rpi_doc_id: "test_" + Date.now(),
                    node_id: "ESP32_NODE_01",
                    node_ts: Math.floor(Date.now() / 1000),
                    rssi: -65 - Math.floor(Math.random() * 20),
                    snr: 9.5,
                    received_at: new Date().toISOString(),
                    data: {
                        s_temp: (26 + Math.random() * 5).toFixed(2),
                        s_hmd: (60 + Math.random() * 15).toFixed(2),
                        w_temp: (25 + Math.random() * 3).toFixed(2),
                        a_hmd: (65 + Math.random() * 10).toFixed(2),
                        p_water: (6.7 + Math.random() * 0.6).toFixed(2),
                        e_water: (1.3 + Math.random() * 0.4).toFixed(2),
                        l_int: Math.floor(35000 + Math.random() * 20000),
                        s_temp_s: (30 + Math.random() * 4).toFixed(2),
                        w_speed: (1.2 + Math.random() * 2).toFixed(2),
                        w_level: (80 + Math.random() * 10).toFixed(2),
                        f_rate: (2.5 + Math.random() * 1.5).toFixed(2),
                        c_stat: "NORMAL",
                        f_stat: "ACTIVE"
                    }
                }]
            };

            try {
                const res = await fetch('api/sync.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockPacket)
                });
                const data = await res.json();
                if (data.status === 'success') {
                    fetchSensorData();
                }
            } catch (err) {
                console.error("Simulation error:", err);
            }
        }

        // Initial fetch and poll every 4 seconds
        fetchSensorData();
        setInterval(fetchSensorData, 4000);
    </script>
</body>
</html>
