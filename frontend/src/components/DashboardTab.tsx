import React from 'react';
import { 
  Activity, 
  RefreshCw, 
  Server, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  Gauge, 
  Zap, 
  Waves, 
  Cpu
} from 'lucide-react';
import type { SensorRecord } from '../types';

interface DashboardTabProps {
  latest: SensorRecord | null;
  records: SensorRecord[];
  totalLogs: number;
  unreadAlerts: number;
  onRefresh: () => void;
  onOpenGatewayOps?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  latest,
  records,
  unreadAlerts,
  onRefresh,
  onOpenGatewayOps
}) => {
  // 12 Sensor Cards configuration
  const sensorCards = [
    {
      id: 's_temp',
      title: 'อุณหภูมิดิน (Soil Temp)',
      value: latest?.s_temp ?? 28.5,
      unit: '°C',
      code: 's_temp',
      icon: <Thermometer size={18} color="#f59e0b" />,
      accent: '#f59e0b',
      range: 'ช่วงปกติ: 20 - 32 °C',
      progress: Math.min(100, Math.max(0, (((latest?.s_temp ?? 28) - 15) / 25) * 100))
    },
    {
      id: 's_hmd',
      title: 'ความชื้นในดิน (Soil Humidity)',
      value: latest?.s_hmd ?? 65.2,
      unit: '%',
      code: 's_hmd',
      icon: <Droplets size={18} color="#10b981" />,
      accent: '#10b981',
      range: 'ช่วงปกติ: 50 - 80 %',
      progress: Math.min(100, latest?.s_hmd ?? 65)
    },
    {
      id: 'w_temp',
      title: 'อุณหภูมิน้ำ (Water Temp)',
      value: latest?.w_temp ?? 26.0,
      unit: '°C',
      code: 'w_temp',
      icon: <Waves size={18} color="#06b6d4" />,
      accent: '#06b6d4',
      range: 'ช่วงปกติ: 22 - 28 °C',
      progress: Math.min(100, Math.max(0, (((latest?.w_temp ?? 26) - 15) / 20) * 100))
    },
    {
      id: 's_temp_s',
      title: 'อุณหภูมิอากาศ (Air Temp)',
      value: latest?.s_temp_s ?? 31.5,
      unit: '°C',
      code: 's_temp_s',
      icon: <Thermometer size={18} color="#ef4444" />,
      accent: '#ef4444',
      range: 'ช่วงปกติ: 25 - 35 °C',
      progress: Math.min(100, Math.max(0, (((latest?.s_temp_s ?? 31) - 15) / 30) * 100))
    },
    {
      id: 'a_hmd',
      title: 'ความชื้นอากาศ (Air Humidity)',
      value: latest?.a_hmd ?? 68.0,
      unit: '%',
      code: 'a_hmd',
      icon: <Droplets size={18} color="#3b82f6" />,
      accent: '#3b82f6',
      range: 'ช่วงปกติ: 60 - 85 %',
      progress: Math.min(100, latest?.a_hmd ?? 68)
    },
    {
      id: 'p_water',
      title: 'ค่า pH ของน้ำ (Water pH)',
      value: latest?.p_water ?? 7.15,
      unit: 'pH',
      code: 'p_water',
      icon: <Gauge size={18} color="#8b5cf6" />,
      accent: '#8b5cf6',
      range: 'เป้าหมาย: 6.0 - 7.5 pH',
      progress: Math.min(100, Math.max(0, ((latest?.p_water ?? 7) / 14) * 100))
    },
    {
      id: 'e_water',
      title: 'ความนำไฟฟ้า (Water EC)',
      value: latest?.e_water ?? 1.55,
      unit: 'mS/cm',
      code: 'e_water',
      icon: <Zap size={18} color="#ec4899" />,
      accent: '#ec4899',
      range: 'ช่วงปกติ: 1.0 - 2.5 mS/cm',
      progress: Math.min(100, Math.max(0, ((latest?.e_water ?? 1.5) / 4) * 100))
    },
    {
      id: 'l_int',
      title: 'ความเข้มแสง (Light Intensity)',
      value: (latest?.l_int ?? 42000).toLocaleString(),
      unit: 'Lux',
      code: 'l_int',
      icon: <Sun size={18} color="#eab308" />,
      accent: '#eab308',
      range: 'เซนเซอร์สังเคราะห์แสงพืช',
      progress: Math.min(100, ((latest?.l_int ?? 42000) / 65535) * 100)
    },
    {
      id: 'w_speed',
      title: 'ความเร็วลม (Wind Speed)',
      value: latest?.w_speed ?? 2.4,
      unit: 'm/s',
      code: 'w_speed',
      icon: <Wind size={18} color="#64748b" />,
      accent: '#64748b',
      range: 'สถานีวัดสภาพอากาศ',
      progress: Math.min(100, ((latest?.w_speed ?? 2.4) / 10) * 100)
    },
    {
      id: 'w_level',
      title: 'ระดับน้ำในถัง (Water Level)',
      value: latest?.w_level ?? 84.5,
      unit: '%',
      code: 'w_level',
      icon: <Waves size={18} color="#0284c7" />,
      accent: '#0284c7',
      range: 'ถังพักน้ำสารละลายหลัก',
      progress: Math.min(100, latest?.w_level ?? 84.5)
    },
    {
      id: 'f_rate',
      title: 'อัตราการไหล (Flow Rate)',
      value: latest?.f_rate ?? 2.5,
      unit: 'L/min',
      code: 'f_rate',
      icon: <Gauge size={18} color="#14b8a6" />,
      accent: '#14b8a6',
      range: 'ท่อจ่ายน้ำหลัก',
      progress: Math.min(100, ((latest?.f_rate ?? 2.5) / 10) * 100)
    },
    {
      id: 'f_stat',
      title: 'สถานะตอบสนอง (Feedback)',
      value: latest?.f_stat ?? 'ACTIVE',
      unit: '',
      code: 'f_stat',
      icon: <CheckCircle2 size={18} color="#6366f1" />,
      accent: '#6366f1',
      range: `Node Status: ${latest?.c_stat ?? 'NORMAL'}`,
      progress: 100
    }
  ];

  return (
    <div>
      {/* 1. Live Operations Center Banner matching Screenshot 2 */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(13, 25, 40, 0.95), rgba(8, 16, 28, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#10b981',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className="pulse-dot" /> LIVE OPERATIONS CENTER &bull; MULTI-FARM
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <Activity size={26} />
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ภาพรวมสุขภาพฟาร์มแบบเรียลไทม์
            </h2>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '10px' }}>
            ศูนย์บัญชาการสำหรับติดตาม Telemetry, Gateway และเหตุการณ์สำคัญใน Farm Scope ของคุณ
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: '#64748b' }}>
            <span>&bull; Server-scoped data</span>
            <span>&bull; Scope: ทุกฟาร์มที่ได้รับสิทธิ์</span>
            <span>&bull; อัปเดตจาก telemetry_readings</span>
          </div>
        </div>

        {/* Right Scope Selector */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>สโคปฟาร์ม:</span>
            <select style={{ minWidth: '220px', height: '38px', borderRadius: '10px' }}>
              <option value="all">แสดงทุกฟาร์มในระบบ (ทุกแห่ง)</option>
              <option value="farm-001">CRU Demo Center (กรุงเทพฯ)</option>
              <option value="farm-002">CRU Algae Greenhouse (กรุงเทพฯ)</option>
              <option value="farm-003">CRU Organic Farm (ชลบุรี)</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={onRefresh} style={{ height: '38px', borderRadius: '10px' }}>
            <RefreshCw size={15} /> ดึงข้อมูลเรียลไทม์ล่าสุด
          </button>
        </div>
      </div>

      {/* 2. Cluster Data Source Status Bar matching Screenshot 2 */}
      <div style={{
        background: '#091322',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
              ระบบคลัสเตอร์หลายฟาร์ม &mdash; แหล่งข้อมูล: <span style={{ color: '#34d399' }}>mysql / sqlite</span>
            </span>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              เชื่อมต่อฐานข้อมูลหลักบนระบบคลาวด์โฮสต์ติ้ง (ดึงข้อมูลวัดสดตรงจากตาราง 'telemetry_readings')
            </div>
          </div>
        </div>

        <div className="badge badge-emerald" style={{ padding: '6px 14px' }}>
          เกตเวย์ออนไลน์ 4/4
        </div>
      </div>

      {/* 3. Edge Runtime Observability matching Screenshot 2 */}
      <div className="glass-panel" style={{
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        borderLeft: '4px solid #10b981'
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            EDGE RUNTIME OBSERVABILITY
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '2px 0' }}>
            สุขภาพ Gateway และคิว Local-First
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            ออนไลน์ 4/4 &bull; คิวรอซิงค์ 0 &bull; Health metrics ครบ 100%
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {unreadAlerts > 0 && (
            <div className="badge badge-amber" style={{ padding: '6px 12px' }}>
              <AlertTriangle size={14} /> ต้องตรวจสอบ ({unreadAlerts})
            </div>
          )}

          <button
            className="btn"
            style={{ background: 'rgba(139, 92, 246, 0.2)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#c4b5fd' }}
            onClick={onOpenGatewayOps}
          >
            <Cpu size={14} /> เปิด Gateway Operations
          </button>
        </div>
      </div>

      {/* 4. AT A GLANCE: ภาพรวมการปฏิบัติการ matching Screenshot 2 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              AT A GLANCE
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              ภาพรวมการปฏิบัติการ
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" /> ข้อมูลจากฐานข้อมูลจริง
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* 1. Mapped Farms */}
          <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>จำนวนฟาร์มที่ลงทะเบียน</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>4 ฟาร์ม</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ฐานข้อมูล MySQL ('farms')</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Layers size={22} />
            </div>
          </div>

          {/* 2. Live Sensor Streams */}
          <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>เซนเซอร์สตรีมมิ่งสด</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>12 สตรีม</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ซิงค์ผ่าน Edge ('telemetry_readings')</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <Radio size={22} />
            </div>
          </div>

          {/* 3. Gateways */}
          <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>เกตเวย์ประจำฟาร์ม</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>4 เครื่อง</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ฮาร์ดแวร์เกตเวย์ ('devices')</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Server size={22} />
            </div>
          </div>

          {/* 4. Active Alarms */}
          <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>เหตุเตือนภัยค้างแก้ไข</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: unreadAlerts > 0 ? '#f43f5e' : '#f8fafc' }}>
                {unreadAlerts} รายการ
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>เหตุการณ์วิกฤต ('alarm_events')</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. 12 Sensor Telemetry Cards Grid */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px' }}>
          ข้อมูลเซนเซอร์เรียลไทม์ (12 Telemetry Streams)
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {sensorCards.map((card) => (
            <div
              key={card.id}
              className="glass-panel"
              style={{
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: card.accent
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)' }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                    {card.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#64748b'
                }}>
                  {card.code}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {card.value}
                </span>
                {card.unit && (
                  <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                    {card.unit}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${card.progress}%`,
                  background: card.accent,
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {card.range}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Telemetry Records Table */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '14px' }}>
          รายการซิงค์ข้อมูลล่าสุด (Recent Synced Records)
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>ID</th>
                <th style={{ padding: '10px 12px' }}>โหนด (Node)</th>
                <th style={{ padding: '10px 12px' }}>เวลาซิงค์ (Server)</th>
                <th style={{ padding: '10px 12px' }}>อุณหภูมิดิน</th>
                <th style={{ padding: '10px 12px' }}>ความชื้นดิน</th>
                <th style={{ padding: '10px 12px' }}>อุณหภูมิน้ำ</th>
                <th style={{ padding: '10px 12px' }}>pH น้ำ</th>
                <th style={{ padding: '10px 12px' }}>EC น้ำ</th>
                <th style={{ padding: '10px 12px' }}>ระดับน้ำ</th>
                <th style={{ padding: '10px 12px' }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 5).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>#{r.id}</td>
                  <td style={{ padding: '10px 12px' }}><strong>{r.node_id}</strong></td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.synced_at}</td>
                  <td style={{ padding: '10px 12px' }}>{r.s_temp} °C</td>
                  <td style={{ padding: '10px 12px' }}>{r.s_hmd} %</td>
                  <td style={{ padding: '10px 12px' }}>{r.w_temp} °C</td>
                  <td style={{ padding: '10px 12px' }}>{r.p_water}</td>
                  <td style={{ padding: '10px 12px' }}>{r.e_water} mS</td>
                  <td style={{ padding: '10px 12px' }}>{r.w_level} %</td>
                  <td style={{ padding: '10px 12px' }}><span className="badge badge-emerald">{r.c_stat}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
