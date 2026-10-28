import React from 'react';
import { Grid } from 'lucide-react';
import type { SensorRecord } from '../types';

interface ZonesTabProps {
  latest: SensorRecord | null;
}

export const ZonesTab: React.FC<ZonesTabProps> = ({ latest }) => {
  const zones = [
    {
      id: 'ZONE-01',
      name: 'Zone 1: แปลงเพาะกล้าและระบบพ่นหมอก (Nursery & Fogging)',
      soilMoisture: latest?.s_hmd ?? 68.5,
      soilTemp: latest?.s_temp ?? 27.8,
      waterTemp: latest?.w_temp ?? 25.4,
      light: latest?.l_int ?? 38000,
      actuators: [
        { name: 'สเปรย์หมอก (Zone Fogger)', state: 'ACTIVE' },
        { name: 'วาล์วน้ำโซน 1 (Zone Valve 1)', state: 'OPEN' }
      ]
    },
    {
      id: 'ZONE-02',
      name: 'Zone 2: แปลงปลูกพืชหลักและระบบน้ำหยด (Main Growth Bed)',
      soilMoisture: ((latest?.s_hmd ?? 65) - 3.2),
      soilTemp: ((latest?.s_temp ?? 28) + 0.8),
      waterTemp: latest?.w_temp ?? 26.0,
      light: ((latest?.l_int ?? 42000) + 3000),
      actuators: [
        { name: 'ปั๊มน้ำหลัก (Main Pump)', state: 'ACTIVE' },
        { name: 'พัดลมระบาย (Exhaust Fan)', state: 'STANDBY' }
      ]
    },
    {
      id: 'ZONE-03',
      name: 'Zone 3: แปลงทดลองพืชพิเศษและหลอดสังเคราะห์แสง (Research Lab)',
      soilMoisture: ((latest?.s_hmd ?? 62) + 2.1),
      soilTemp: ((latest?.s_temp ?? 27) - 0.5),
      waterTemp: latest?.w_temp ?? 25.8,
      light: ((latest?.l_int ?? 45000) - 2000),
      actuators: [
        { name: 'ไฟสังเคราะห์แสง (Growth Light)', state: 'ACTIVE' },
        { name: 'วาล์วสารอาหาร (Nutrient Valve)', state: 'STANDBY' }
      ]
    }
  ];

  return (
    <div>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Grid size={22} color="var(--accent-emerald)" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            โครงสร้างและโซนแปลงเกษตร (3 Zones Architecture)
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          ตามมาตรฐาน CRU Smart Farm แต่ละฟาร์มแบ่งออกเป็น 3 โซน โดยแต่ละโซนมีชุดเซนเซอร์และอุปกรณ์ควบคุมแยกอิสระเพื่อความปลอดภัย (Fail-Safe & Zone Isolation)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {zones.map((zone) => (
          <div key={zone.id} className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--accent-emerald)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>{zone.id}</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{zone.name}</h3>
              </div>
            </div>

            <div style={{
              background: 'rgba(10, 15, 26, 0.6)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div>
                <div style={{ color: '#94a3b8' }}>ความชื้นดิน:</div>
                <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{zone.soilMoisture.toFixed(1)} %</strong>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>อุณหภูมิดิน:</div>
                <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{zone.soilTemp.toFixed(1)} °C</strong>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>อุณหภูมิน้ำ:</div>
                <strong style={{ fontSize: '1.1rem', color: '#06b6d4' }}>{zone.waterTemp.toFixed(1)} °C</strong>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>ความเข้มแสง:</div>
                <strong style={{ fontSize: '1.1rem', color: '#eab308' }}>{zone.light.toLocaleString()} Lux</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                อุปกรณ์ประจำโซน (Zone Actuators)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {zone.actuators.map((act, aIdx) => (
                  <div key={aIdx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    fontSize: '0.8rem'
                  }}>
                    <span>{act.name}</span>
                    <span className={act.state === 'ACTIVE' ? 'badge badge-emerald' : 'badge'}>
                      {act.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
