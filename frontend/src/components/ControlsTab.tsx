import React, { useState } from 'react';
import type { DeviceControl } from '../types';
import { api } from '../api';
import { Power, Cpu, CheckCircle2, Lightbulb, Wind, Waves, Disc, Save } from 'lucide-react';

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
  const [customThresholds, setCustomThresholds] = useState<Record<string, number>>({});
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);

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

  const handleSaveThreshold = async (dev: DeviceControl) => {
    const val = customThresholds[dev.device_id] ?? dev.threshold_val ?? 32;
    setUpdatingId(dev.device_id);
    await api.updateDeviceControl(dev.device_id, undefined, undefined, val);
    setUpdatingId(null);
    setSavedMsgId(dev.device_id);
    setTimeout(() => setSavedMsgId(null), 2000);
  };

  const getDeviceIcon = (id: string) => {
    if (id.includes('pump')) return <Waves size={24} color="#06b6d4" />;
    if (id.includes('fan')) return <Wind size={24} color="#60a5fa" />;
    if (id.includes('light')) return <Lightbulb size={24} color="#eab308" />;
    return <Disc size={24} color="#10b981" />;
  };

  const getAutoMeta = (dev: DeviceControl) => {
    const id = dev.device_id;
    const val = customThresholds[id] !== undefined ? customThresholds[id] : (dev.threshold_val ?? 32);
    if (id.includes('pump')) return { label: 'เปิดเมื่อ ความชื้นดิน (s_hmd) <', unit: '%', val, step: 1 };
    if (id.includes('fan')) return { label: 'เปิดเมื่อ อุณหภูมิอากาศ (s_temp_s) >', unit: '°C', val, step: 0.5 };
    if (id.includes('light')) return { label: 'เปิดเมื่อ ความเข้มแสง (l_int) <', unit: 'Lux', val, step: 1000 };
    return { label: 'เปิดเมื่อ ค่าปุ๋ย/EC (e_water) <', unit: 'mS/cm', val, step: 0.1 };
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

              {/* Auto Condition Info & Editable Threshold */}
              {(() => {
                const meta = getAutoMeta(dev);
                return (
                  <div style={{
                    fontSize: '0.76rem',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    marginBottom: '12px',
                    background: isAuto ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isAuto ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                    color: isAuto ? '#93c5fd' : 'var(--text-muted)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <span>🤖 {meta.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          step={meta.step}
                          style={{
                            width: '76px',
                            padding: '3px 6px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            textAlign: 'center',
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                            color: '#f8fafc'
                          }}
                          value={meta.val}
                          onChange={(e) => setCustomThresholds(prev => ({
                            ...prev,
                            [dev.device_id]: parseFloat(e.target.value) || 0
                          }))}
                        />
                        <span>{meta.unit}</span>
                        <button
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa' }}
                          onClick={() => handleSaveThreshold(dev)}
                          disabled={isBusy}
                          title="บันทึกค่าเกณฑ์ Auto"
                        >
                          <Save size={12} /> {savedMsgId === dev.device_id ? 'บันทึกแล้ว' : 'ตั้งค่า'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
