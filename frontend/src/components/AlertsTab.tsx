import React, { useState } from 'react';
import type { AlertRule, AlertLog } from '../types';
import { Check, BellRing, Save, CheckCircle } from 'lucide-react';

interface AlertsTabProps {
  rules: AlertRule[];
  logs: AlertLog[];
  onUpdateRule: (rule: Partial<AlertRule>) => Promise<void>;
  onMarkRead: (id: number | 'all') => Promise<void>;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ rules, logs, onUpdateRule, onMarkRead }) => {
  const [editingRules, setEditingRules] = useState<Record<string, { min_val: number | null; max_val: number | null }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleInputChange = (ruleKey: string, field: 'min_val' | 'max_val', value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setEditingRules(prev => ({
      ...prev,
      [ruleKey]: {
        min_val: field === 'min_val' ? num : (prev[ruleKey]?.min_val ?? rules.find(r => r.rule_key === ruleKey)?.min_val ?? null),
        max_val: field === 'max_val' ? num : (prev[ruleKey]?.max_val ?? rules.find(r => r.rule_key === ruleKey)?.max_val ?? null)
      }
    }));
  };

  const handleSave = async (rule: AlertRule) => {
    setSavingKey(rule.rule_key);
    const edits = editingRules[rule.rule_key] || {};
    await onUpdateRule({
      rule_key: rule.rule_key,
      min_val: edits.min_val !== undefined ? edits.min_val : rule.min_val,
      max_val: edits.max_val !== undefined ? edits.max_val : rule.max_val,
      is_active: rule.is_active
    });
    setSavingKey(null);
  };

  return (
    <div>
      {/* 1. Threshold Configuration */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <BellRing size={22} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            การตั้งค่าเกณฑ์แจ้งเตือน (Alert Thresholds)
          </h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          กำหนดช่วงค่าต่ำสุด-สูงสุดที่ยอมรับได้ หากค่าจากเซนเซอร์อยู่นอกช่วง ระบบจะบันทึกการแจ้งเตือนอัตโนมัติ
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {rules.map((rule) => {
            const currentMin = editingRules[rule.rule_key]?.min_val !== undefined 
              ? (editingRules[rule.rule_key].min_val ?? '') 
              : (rule.min_val ?? '');
            const currentMax = editingRules[rule.rule_key]?.max_val !== undefined 
              ? (editingRules[rule.rule_key].max_val ?? '') 
              : (rule.max_val ?? '');

            return (
              <div
                key={rule.rule_key}
                style={{
                  background: 'rgba(10, 15, 26, 0.6)',
                  border: '1px solid var(--surface-border)',
                  padding: '16px 18px',
                  borderRadius: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rule.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หน่วย: {rule.unit}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      ค่าต่ำสุด (Min)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      style={{ width: '100%' }}
                      value={currentMin}
                      onChange={(e) => handleInputChange(rule.rule_key, 'min_val', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      ค่าสูงสุด (Max)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      style={{ width: '100%' }}
                      value={currentMax}
                      onChange={(e) => handleInputChange(rule.rule_key, 'max_val', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={() => handleSave(rule)}
                    disabled={savingKey === rule.rule_key}
                  >
                    <Save size={14} />
                    {savingKey === rule.rule_key ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Alert Triggered Logs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              ประวัติการแจ้งเตือน (Triggered Alert Logs)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              บันทึกเหตุการณ์ผิดปกติทั้งหมดในระบบ
            </span>
          </div>

          <button className="btn" onClick={() => onMarkRead('all')}>
            <CheckCircle size={16} /> ทำเครื่องหมายอ่านแล้วทั้งหมด
          </button>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            ไม่มีประวัติการแจ้งเตือน ระบบทำงานปกติ
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px' }}>ระดับ (Severity)</th>
                  <th style={{ padding: '12px 14px' }}>โหนด (Node)</th>
                  <th style={{ padding: '12px 14px' }}>ข้อความแจ้งเตือน</th>
                  <th style={{ padding: '12px 14px' }}>ค่าที่ตรวจพบ</th>
                  <th style={{ padding: '12px 14px' }}>เกณฑ์ที่ตั้ง</th>
                  <th style={{ padding: '12px 14px' }}>เวลาที่เกิด</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      opacity: log.is_read ? 0.6 : 1
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${log.severity === 'DANGER' ? 'badge-rose' : 'badge-amber'}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{log.node_id}</td>
                    <td style={{ padding: '12px 14px' }}>{log.message}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--accent-rose)', fontWeight: 700 }}>{log.current_val}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{log.threshold_val}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{log.created_at}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {!log.is_read ? (
                        <button
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => onMarkRead(log.id)}
                        >
                          <Check size={12} /> รับทราบ
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>อ่านแล้ว</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
