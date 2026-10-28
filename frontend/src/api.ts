import type { SensorRecord, AlertRule, AlertLog, DeviceControl } from './types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  // 1. Sensors Telemetry
  async getLatestSensors(): Promise<{
    status: string;
    latest: SensorRecord | null;
    total_logs: number;
    unread_alerts: number;
    server_time: string;
  }> {
    const res = await fetch(`${API_BASE}/sensors.php?type=latest`);
    return res.json();
  },

  async getHistory(hours = 24, limit = 100): Promise<{
    status: string;
    records: SensorRecord[];
  }> {
    const res = await fetch(`${API_BASE}/sensors.php?type=history&hours=${hours}&limit=${limit}`);
    return res.json();
  },

  // 2. Alerts & Rules
  async getAlertRules(): Promise<{ status: string; rules: AlertRule[] }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=rules`);
    return res.json();
  },

  async updateAlertRule(rule: Partial<AlertRule>): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=update_rule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    return res.json();
  },

  async getAlertLogs(limit = 50): Promise<{ status: string; logs: AlertLog[] }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=logs&limit=${limit}`);
    return res.json();
  },

  async markAlertsAsRead(id: number | 'all' = 'all'): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=mark_read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return res.json();
  },

  // 3. Device Controls
  async getDeviceControls(): Promise<{ status: string; devices: DeviceControl[] }> {
    const res = await fetch(`${API_BASE}/controls.php`);
    return res.json();
  },

  async updateDeviceControl(deviceId: string, state?: 'ON' | 'OFF', autoMode?: number): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/controls.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, state, auto_mode: autoMode })
    });
    return res.json();
  },

  // 4. Test Simulate Packet
  async simulateTelemetrySync(): Promise<{ status: string; synced_count: number }> {
    const packet = {
      api_key: 'smartfarm_secret_token_2026',
      count: 1,
      records: [{
        rpi_doc_id: 'sim_' + Date.now(),
        node_id: 'ESP32_NODE_01',
        node_ts: Math.floor(Date.now() / 1000),
        rssi: -62 - Math.floor(Math.random() * 25),
        snr: +(7.5 + Math.random() * 4).toFixed(1),
        received_at: new Date().toISOString(),
        data: {
          s_temp: +(25 + Math.random() * 8).toFixed(2),
          s_hmd: +(55 + Math.random() * 25).toFixed(2),
          w_temp: +(24 + Math.random() * 5).toFixed(2),
          a_hmd: +(60 + Math.random() * 25).toFixed(2),
          p_water: +(6.4 + Math.random() * 1.4).toFixed(2),
          e_water: +(1.2 + Math.random() * 0.9).toFixed(2),
          l_int: Math.floor(25000 + Math.random() * 40000),
          s_temp_s: +(28 + Math.random() * 7).toFixed(2),
          w_speed: +(0.8 + Math.random() * 3.5).toFixed(2),
          w_level: +(75 + Math.random() * 20).toFixed(2),
          f_rate: +(1.8 + Math.random() * 2.5).toFixed(2),
          c_stat: 'NORMAL',
          f_stat: 'ACTIVE'
        }
      }]
    };

    const res = await fetch(`${API_BASE}/sync.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet)
    });
    return res.json();
  }
};
