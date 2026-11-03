import type { SensorRecord, AlertRule, AlertLog, DeviceControl } from './types';

// ใช้ Relative Path '/api' เพื่อให้ทำงานได้ทั้งผ่าน:
// 1. Vite Proxy (พอร์ต 5173) -> http://olmy.duckdns.org:5173
// 2. Domain สาธารณะ / Cloudflare Tunnel / ngrok / Tailscale
// 3. localhost และ IP ในวง WiFi / Hotspot ทุกวง
const API_BASE = '/api';

function normalizeRecord(r: any): SensorRecord {
  if (!r) return r;
  return {
    ...r,
    id: Number(r.id ?? 0),
    node_ts: Number(r.node_ts ?? 0),
    s_temp: Number(r.s_temp ?? 0),
    s_hmd: Number(r.s_hmd ?? 0),
    w_temp: Number(r.w_temp ?? 0),
    a_hmd: Number(r.a_hmd ?? 0),
    p_water: Number(r.p_water ?? 0),
    e_water: Number(r.e_water ?? 0),
    l_int: Number(r.l_int ?? 0),
    s_temp_s: Number(r.s_temp_s ?? 0),
    w_speed: Number(r.w_speed ?? 0),
    w_level: Number(r.w_level ?? 0),
    f_rate: Number(r.f_rate ?? 0),
    rssi: Number(r.rssi ?? -65),
    snr: Number(r.snr ?? 9.5),
  };
}

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
    const data = await res.json();
    if (data.latest) {
      data.latest = normalizeRecord(data.latest);
    }
    data.total_logs = Number(data.total_logs ?? 0);
    data.unread_alerts = Number(data.unread_alerts ?? 0);
    return data;
  },

  async getHistory(hours = 24, limit = 100): Promise<{
    status: string;
    records: SensorRecord[];
  }> {
    const res = await fetch(`${API_BASE}/sensors.php?type=history&hours=${hours}&limit=${limit}`);
    const data = await res.json();
    if (Array.isArray(data.records)) {
      data.records = data.records.map(normalizeRecord);
    }
    return data;
  },

  // 2. Alerts & Rules
  async getAlertRules(): Promise<{ status: string; rules: AlertRule[] }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=rules`);
    const data = await res.json();
    if (Array.isArray(data.rules)) {
      data.rules = data.rules.map((r: any) => ({
        ...r,
        id: Number(r.id ?? 0),
        min_val: Number(r.min_val ?? 0),
        max_val: Number(r.max_val ?? 0),
        is_active: Number(r.is_active ?? 1),
      }));
    }
    return data;
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
    const data = await res.json();
    if (Array.isArray(data.logs)) {
      data.logs = data.logs.map((l: any) => ({
        ...l,
        id: Number(l.id ?? 0),
        current_val: Number(l.current_val ?? 0),
        threshold_val: Number(l.threshold_val ?? 0),
        is_read: Number(l.is_read ?? 0),
      }));
    }
    return data;
  },

  async markAlertsAsRead(id: number | 'all' = 'all'): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=mark_read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return res.json();
  },

  async getLineSettings(): Promise<{
    status: string;
    settings: {
      line_enabled: number;
      channel_token: string;
      target_id: string;
      cooldown_sec: number;
      last_sent_ts: number;
    };
  }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=line_settings`);
    return res.json();
  },

  async saveLineSettings(settings: {
    line_enabled: number;
    channel_token: string;
    target_id: string;
    cooldown_sec: number;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=save_line_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async testLineAlert(settings: {
    line_enabled: number;
    channel_token: string;
    target_id: string;
    cooldown_sec: number;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/alerts.php?type=test_line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // 3. Device Controls
  async getDeviceControls(): Promise<{ status: string; devices: DeviceControl[] }> {
    const res = await fetch(`${API_BASE}/controls.php`);
    const data = await res.json();
    if (Array.isArray(data.devices)) {
      data.devices = data.devices.map((d: any) => ({
        ...d,
        auto_mode: Number(d.auto_mode ?? 0),
        threshold_val: Number(
          d.threshold_val && Number(d.threshold_val) > 0
            ? d.threshold_val
            : d.device_id === 'pump_1' ? 65
            : d.device_id === 'fan_1' ? 32
            : d.device_id === 'light_1' ? 30000
            : 1.5
        ),
      }));
    }
    return data;
  },

  async updateDeviceControl(deviceId: string, state?: 'ON' | 'OFF', autoMode?: number, thresholdVal?: number): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/controls.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, state, auto_mode: autoMode, threshold_val: thresholdVal })
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
