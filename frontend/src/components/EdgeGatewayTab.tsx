import React from 'react';
import { HardDrive, Cpu, RefreshCw, Server } from 'lucide-react';
import type { SensorRecord } from '../types';

interface EdgeGatewayTabProps {
  latest: SensorRecord | null;
  totalLogs: number;
  onRefresh: () => void;
}

export const EdgeGatewayTab: React.FC<EdgeGatewayTabProps> = ({ latest, totalLogs, onRefresh }) => {
  return (
    <div>
      <div className="glass-panel" style={{
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="pulse-dot" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Edge Gateway & Runtime Observability
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            สถานะฮาร์ดแวร์ Raspberry Pi Gateway, การเชื่อมต่อ USB Serial กับ ESP32, ฐานข้อมูล MongoDB ในเครื่อง และระบบจัดการพื้นที่ SD Card & Flash Drive
          </p>
        </div>

        <button className="btn btn-primary" onClick={onRefresh}>
          <RefreshCw size={15} /> ตรวจสอบสถานะสด
        </button>
      </div>

      {/* Gateway Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* 1. Hardware Gateway Status */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Server size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Raspberry Pi Gateway</h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Gateway ID: GW-F001-01</span>
              </div>
            </div>
            <span className="badge badge-emerald">ONLINE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>IP Address (LAN):</span>
              <strong style={{ color: '#f8fafc' }}>192.168.1.100</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>USB Serial Port:</span>
              <strong style={{ color: '#34d399' }}>/dev/ttyUSB0 (115200 baud)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>ESP32 Receiver Node:</span>
              <strong style={{ color: '#60a5fa' }}>เชื่อมต่อปกติ &bull; RSSI {latest?.rssi ?? '-68'} dBm</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Heartbeat ล่าสุด:</span>
              <strong style={{ color: '#f8fafc' }}>{latest?.synced_at ?? 'ปกติ (ทุก 5 วินาที)'}</strong>
            </div>
          </div>
        </div>

        {/* 2. Storage Health SD Card vs Flash Drive */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <HardDrive size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>ระบบจัดการพื้นที่ (Storage Manager)</h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>SD Card ↔ USB Flash Drive</span>
              </div>
            </div>
            <span className="badge badge-emerald">PROTECTED</span>
          </div>

          {/* MicroSD bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>MicroSD Card (Root /):</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>38% ใช้ไป (12.2 GB / 32 GB)</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '38%', height: '100%', background: '#10b981', borderRadius: '9999px' }} />
            </div>
          </div>

          {/* USB Flash Drive bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>USB Flash Drive (/media/usb):</span>
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>14% ใช้ไป (18.1 GB / 128 GB)</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '14%', height: '100%', background: '#3b82f6', borderRadius: '9999px' }} />
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '12px' }}>
            &bull; ย้ายข้อมูลประวัติเก่าเกิน 7 วันลง Flash Drive อัตโนมัติ เพื่อป้องกัน SD Card เสื่อมสภาพ
          </div>
        </div>

        {/* 3. Local MongoDB & Sync Queue */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
                <Cpu size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Local MongoDB Buffer</h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Offline-First Sync Engine</span>
              </div>
            </div>
            <span className="badge badge-emerald">SYNCED 100%</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>MongoDB Port:</span>
              <strong style={{ color: '#f8fafc' }}>27017 (Localhost Only)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Sync Backlog Queue:</span>
              <strong style={{ color: '#34d399' }}>0 ค้าง (ถ่ายโอนครบถ้วน)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Target Server URL:</span>
              <strong style={{ color: '#60a5fa' }}>http://localhost:8000/api/sync.php</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Total Record Buffer:</span>
              <strong style={{ color: '#f8fafc' }}>{totalLogs} รายการ</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
