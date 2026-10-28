export interface SensorData {
  s_temp: number;       // Soil Temp (°C)
  s_hmd: number;        // Soil Humidity (%)
  w_temp: number;       // Water Temp (°C)
  a_hmd: number;        // Air Humidity (%)
  p_water: number;      // Water pH
  e_water: number;      // Water EC (mS/cm)
  l_int: number;        // Light Intensity (Lux)
  s_temp_s: number;     // Air Temp (°C)
  w_speed: number;      // Wind Speed (m/s)
  w_level: number;      // Water Level (%)
  f_rate: number;       // Flow Rate (L/min)
  c_stat: string;       // Current Status
  f_stat: string;       // Feedback Status
}

export interface SensorRecord {
  id: number;
  rpi_doc_id?: string;
  node_id: string;
  node_ts: number;
  s_temp: number;
  s_hmd: number;
  w_temp: number;
  a_hmd: number;
  p_water: number;
  e_water: number;
  l_int: number;
  s_temp_s: number;
  w_speed: number;
  w_level: number;
  f_rate: number;
  c_stat: string;
  f_stat: string;
  rssi: number | null;
  snr: number | null;
  rpi_received_at?: string;
  synced_at: string;
}

export interface AlertRule {
  rule_key: string;
  label: string;
  min_val: number | null;
  max_val: number | null;
  unit: string;
  is_active: number;
  updated_at?: string;
}

export interface AlertLog {
  id: number;
  rule_key: string;
  node_id: string;
  message: string;
  current_val: number;
  threshold_val: number;
  severity: 'WARNING' | 'DANGER' | 'INFO';
  is_read: number;
  created_at: string;
}

export interface DeviceControl {
  device_id: string;
  device_name: string;
  state: 'ON' | 'OFF';
  auto_mode: number;
  feedback_status: string;
  last_command_at: string;
}
