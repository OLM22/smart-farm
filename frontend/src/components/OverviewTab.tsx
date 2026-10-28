import React from 'react';
import type { SensorRecord } from '../types';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  Gauge, 
  Zap, 
  Waves, 
  CheckCircle2, 
  Wifi, 
  Server
} from 'lucide-react';

interface OverviewTabProps {
  latest: SensorRecord | null;
  records: SensorRecord[];
  totalLogs: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ latest, records, totalLogs }) => {
  if (!latest) {
    return (
      <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>ยังไม่มีข้อมูลในระบบ</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          กดปุ่ม "⚡ Test Simulate Sync" ด้านบน หรือเริ่มรัน ESP32 / Raspberry Pi Gateway เพื่อเริ่มรับข้อมูลค่ะ
        </p>
      </div>
    );
  }

  // Cards definitions
  const sensorCards = [
    {
      id: 's_temp',
      title: 'อุณหภูมิดิน (Soil Temp)',
      value: latest.s_temp,
      unit: '°C',
      code: 's_temp',
      icon: <Thermometer size={20} color="#f59e0b" />,
      accent: '#f59e0b',
      range: 'ช่วงเหมาะสม: 20 - 32 °C',
      progress: Math.min(100, Math.max(0, ((latest.s_temp - 15) / 25) * 100))
    },
    {
      id: 's_hmd',
      title: 'ความชื้นในดิน (Soil Humidity)',
      value: latest.s_hmd,
      unit: '%',
      code: 's_hmd',
      icon: <Droplets size={20} color="#10b981" />,
      accent: '#10b981',
      range: 'ช่วงเหมาะสม: 50 - 80 %',
      progress: Math.min(100, latest.s_hmd)
    },
    {
      id: 'w_temp',
      title: 'อุณหภูมิน้ำ (Water Temp)',
      value: latest.w_temp,
      unit: '°C',
      code: 'w_temp',
      icon: <Waves size={20} color="#06b6d4" />,
      accent: '#06b6d4',
      range: 'ช่วงเหมาะสม: 22 - 28 °C',
      progress: Math.min(100, Math.max(0, ((latest.w_temp - 15) / 20) * 100))
    },
    {
      id: 's_temp_s',
      title: 'อุณหภูมิอากาศ (Air Temp)',
      value: latest.s_temp_s,
      unit: '°C',
      code: 's_temp_s',
      icon: <Thermometer size={20} color="#ef4444" />,
      accent: '#ef4444',
      range: 'ช่วงเหมาะสม: 25 - 35 °C',
      progress: Math.min(100, Math.max(0, ((latest.s_temp_s - 15) / 30) * 100))
    },
    {
      id: 'a_hmd',
      title: 'ความชื้นอากาศ (Air Humidity)',
      value: latest.a_hmd,
      unit: '%',
      code: 'a_hmd',
      icon: <Droplets size={20} color="#3b82f6" />,
      accent: '#3b82f6',
      range: 'ช่วงเหมาะสม: 60 - 85 %',
      progress: Math.min(100, latest.a_hmd)
    },
    {
      id: 'p_water',
      title: 'ค่า pH ของน้ำ (Water pH)',
      value: latest.p_water,
      unit: 'pH',
      code: 'p_water',
      icon: <Gauge size={20} color="#8b5cf6" />,
      accent: '#8b5cf6',
      range: 'เป้าหมาย: 6.0 - 7.5 pH',
      progress: Math.min(100, Math.max(0, (latest.p_water / 14) * 100))
    },
    {
      id: 'e_water',
      title: 'ความนำไฟฟ้า (Water EC)',
      value: latest.e_water,
      unit: 'mS/cm',
      code: 'e_water',
      icon: <Zap size={20} color="#ec4899" />,
      accent: '#ec4899',
      range: 'ช่วงเหมาะสม: 1.0 - 2.5 mS/cm',
      progress: Math.min(100, Math.max(0, (latest.e_water / 4) * 100))
    },
    {
      id: 'l_int',
      title: 'ความเข้มแสง (Light Intensity)',
      value: latest.l_int.toLocaleString(),
      unit: 'Lux',
      code: 'l_int',
      icon: <Sun size={20} color="#eab308" />,
      accent: '#eab308',
      range: 'เซนเซอร์สังเคราะห์แสงพืช',
      progress: Math.min(100, (latest.l_int / 65535) * 100)
    },
    {
      id: 'w_speed',
      title: 'ความเร็วลม (Wind Speed)',
      value: latest.w_speed,
      unit: 'm/s',
      code: 'w_speed',
      icon: <Wind size={20} color="#64748b" />,
      accent: '#64748b',
      range: 'สถานีตรวจวัดสภาพอากาศ',
      progress: Math.min(100, (latest.w_speed / 10) * 100)
    },
    {
      id: 'w_level',
      title: 'ระดับน้ำในถัง (Water Level)',
      value: latest.w_level,
      unit: '%',
      code: 'w_level',
      icon: <Waves size={20} color="#0284c7" />,
      accent: '#0284c7',
      range: 'ถังพักสารละลายหลัก',
      progress: Math.min(100, latest.w_level)
    },
    {
      id: 'f_rate',
      title: 'อัตราการไหล (Flow Rate)',
      value: latest.f_rate,
      unit: 'L/min',
      code: 'f_rate',
      icon: <Gauge size={20} color="#14b8a6" />,
      accent: '#14b8a6',
      range: 'อัตราการจ่ายน้ำผ่านท่อ',
      progress: Math.min(100, (latest.f_rate / 10) * 100)
    },
    {
      id: 'f_stat',
      title: 'สถานะตอบสนอง (Feedback)',
      value: latest.f_stat,
      unit: '',
      code: 'f_stat',
      icon: <CheckCircle2 size={20} color="#6366f1" />,
      accent: '#6366f1',
      range: `Node Status: ${latest.c_stat}`,
      progress: 100
    }
  ];

  return (
    <div>
      {/* Telemetry Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Node ID
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {latest.node_id}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Wifi size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LoRa Signal (RSSI / SNR)
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {latest.rssi ?? '--'} dBm / {latest.snr ?? '--'}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Node Status
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399' }}>
              {latest.c_stat}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Gauge size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Logs Recorded
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {totalLogs.toLocaleString()} รายการ
            </div>
          </div>
        </div>
      </div>

      {/* 12 Sensor Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {sensorCards.map((card) => (
          <div
            key={card.id}
            className="glass-panel"
            style={{
              padding: '22px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Accent Strip */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: card.accent
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)'
                }}>
                  {card.icon}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {card.title}
                </span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '2px 8px',
                borderRadius: '6px',
                color: 'var(--text-muted)'
              }}>
                {card.code}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {card.value}
              </span>
              {card.unit && (
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {card.unit}
                </span>
              )}
            </div>

            {/* Micro Progress Indicator */}
            <div style={{
              width: '100%',
              height: '5px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                height: '100%',
                width: `${card.progress}%`,
                background: card.accent,
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }} />
            </div>

            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '8px'
            }}>
              {card.range}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sync Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
          รายการซิงค์ข้อมูลล่าสุด (Recent Synced Records)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>ID</th>
                <th style={{ padding: '12px 14px' }}>เวลาซิงค์ (Server)</th>
                <th style={{ padding: '12px 14px' }}>อุณหภูมิดิน</th>
                <th style={{ padding: '12px 14px' }}>ความชื้นดิน</th>
                <th style={{ padding: '12px 14px' }}>อุณหภูมิน้ำ</th>
                <th style={{ padding: '12px 14px' }}>pH น้ำ</th>
                <th style={{ padding: '12px 14px' }}>EC น้ำ</th>
                <th style={{ padding: '12px 14px' }}>ความเข้มแสง</th>
                <th style={{ padding: '12px 14px' }}>ระดับน้ำ</th>
                <th style={{ padding: '12px 14px' }}>RSSI</th>
                <th style={{ padding: '12px 14px' }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>#{r.id}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{r.synced_at}</td>
                  <td style={{ padding: '12px 14px' }}>{r.s_temp} °C</td>
                  <td style={{ padding: '12px 14px' }}>{r.s_hmd} %</td>
                  <td style={{ padding: '12px 14px' }}>{r.w_temp} °C</td>
                  <td style={{ padding: '12px 14px' }}>{r.p_water}</td>
                  <td style={{ padding: '12px 14px' }}>{r.e_water} mS</td>
                  <td style={{ padding: '12px 14px' }}>{r.l_int.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px' }}>{r.w_level} %</td>
                  <td style={{ padding: '12px 14px', color: 'var(--accent-emerald)' }}>{r.rssi ?? '-'} dBm</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge badge-emerald">{r.c_stat}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
