import React, { useState } from 'react';
import type { DeviceControl } from '../types';
import { Power, Cpu, CheckCircle2, Lightbulb, Wind, Waves, Disc } from 'lucide-react';

interface ControlsTabProps {
  devices: DeviceControl[];
  onToggleDevice: (deviceId: string, newState: 'ON' | 'OFF') => Promise<void>;
  onToggleAutoMode: (deviceId: string, autoMode: number) => Promise<void>;
}

export const ControlsTab: React.FC<ControlsTabProps> = ({
  devices,
  onToggleDevice,
  onToggleAutoMode
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStateChange = async (deviceId: string, currentState: 'ON' | 'OFF') => {
    setUpdatingId(deviceId);
    const nextState = currentState === 'ON' ? 'OFF' : 'ON';
    await onToggleDevice(deviceId, nextState);
    setUpdatingId(null);
  };

  const handleAutoChange = async (deviceId: string, currentAuto: number) => {
    setUpdatingId(deviceId);
    const nextAuto = currentAuto === 1 ? 0 : 1;
    await onToggleAutoMode(deviceId, nextAuto);
    setUpdatingId(null);
  };

  const getDeviceIcon = (id: string) => {
    if (id.includes('pump')) return <Waves size={24} color="#06b6d4" />;
    if (id.includes('fan')) return <Wind size={24} color="#60a5fa" />;
    if (id.includes('light')) return <Lightbulb size={24} color="#eab308" />;
    return <Disc size={24} color="#10b981" />;
  };

  return (
    <div>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Power size={22} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            แผงควบคุมอุปกรณ์และรีเลย์ (Actuator & Relay Controls)
          </h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          สั่งการทำงานของอุปกรณ์ในฟาร์มโดยตรง หรือเปิดโหมดอัตโนมัติ (Auto Mode) เพื่อให้ควบคุมตามเงื่อนไขเซนเซอร์ พร้อมตรวจสอบการยืนยันสถานะกลับ (Feedback Confirmation)
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {devices.map((dev) => {
          const isOn = dev.state === 'ON';
          const isAuto = dev.auto_mode === 1;
          const isBusy = updatingId === dev.device_id;

          return (
            <div
              key={dev.device_id}
              className="glass-panel"
              style={{
                padding: '24px',
                position: 'relative',
                borderLeft: `4px solid ${isOn ? 'var(--accent-emerald)' : 'var(--text-muted)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)'
                  }}>
                    {getDeviceIcon(dev.device_id)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{dev.device_name}</h4>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      ID: {dev.device_id}
                    </span>
                  </div>
                </div>

                {/* Auto / Manual Mode Badge */}
                <button
                  className="btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    background: isAuto ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    borderColor: isAuto ? 'rgba(59, 130, 246, 0.3)' : 'var(--surface-border)',
                    color: isAuto ? '#60a5fa' : 'var(--text-muted)'
                  }}
                  onClick={() => handleAutoChange(dev.device_id, dev.auto_mode)}
                  disabled={isBusy}
                >
                  <Cpu size={12} />
                  {isAuto ? 'AUTO MODE' : 'MANUAL'}
                </button>
              </div>

              {/* State & Toggle Control */}
              <div style={{
                background: 'rgba(10, 15, 26, 0.6)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                border: '1px solid var(--surface-border)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    สถานะการสั่งการ (Command State)
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: isOn ? 'var(--accent-emerald)' : 'var(--text-muted)'
                  }}>
                    {dev.state}
                  </div>
                </div>

                {/* Toggle switch */}
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => handleStateChange(dev.device_id, dev.state)}
                    disabled={isBusy}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Feedback Loop Status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color={isOn ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                  <span>ยืนยันสถานะ: <strong style={{ color: 'var(--text-primary)' }}>{dev.feedback_status}</strong></span>
                </div>

                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {dev.last_command_at ? dev.last_command_at.split(' ')[1] : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
