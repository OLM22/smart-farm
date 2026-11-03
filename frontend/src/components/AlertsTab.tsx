import React, { useState, useEffect } from 'react';
import type { AlertRule, AlertLog } from '../types';
import { api } from '../api';
import { Check, BellRing, Save, CheckCircle, Send, MessageSquare, HelpCircle } from 'lucide-react';

interface AlertsTabProps {
  rules: AlertRule[];
  logs: AlertLog[];
  onUpdateRule: (rule: Partial<AlertRule>) => Promise<void>;
  onMarkRead: (id: number | 'all') => Promise<void>;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ rules, logs, onUpdateRule, onMarkRead }) => {
  const [editingRules, setEditingRules] = useState<Record<string, { min_val: number | null; max_val: number | null }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // LINE Notification Settings State
  const [lineEnabled, setLineEnabled] = useState<number>(1);
  const [channelToken, setChannelToken] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [cooldownSec, setCooldownSec] = useState<number>(60);
  const [lineStatusMsg, setLineStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingLine, setSavingLine] = useState<boolean>(false);
  const [testingLine, setTestingLine] = useState<boolean>(false);
  const [showLineGuide, setShowLineGuide] = useState<boolean>(false);

  useEffect(() => {
    api.getLineSettings().then((res) => {
      if (res.status === 'success' && res.settings) {
        setLineEnabled(res.settings.line_enabled);
        setChannelToken(res.settings.channel_token || '');
        setTargetId(res.settings.target_id || '');
        setCooldownSec(res.settings.cooldown_sec ?? 60);
      }
    }).catch(() => {});
  }, []);

  const handleSaveLine = async () => {
    setSavingLine(true);
    setLineStatusMsg(null);
    try {
      const res = await api.saveLineSettings({
        line_enabled: lineEnabled,
        channel_token: channelToken,
        target_id: targetId,
        cooldown_sec: cooldownSec
      });
      setLineStatusMsg({
        type: res.status === 'success' ? 'success' : 'error',
        text: res.message
      });
    } catch (e) {
      setLineStatusMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกตั้งค่า LINE' });
    }
    setSavingLine(false);
  };

  const handleTestLine = async () => {
    if (!channelToken.trim()) {
      setLineStatusMsg({ type: 'error', text: 'กรุณาวาง LINE Channel Access Token ก่อนกดทดสอบครับ' });
      return;
    }
    setTestingLine(true);
    setLineStatusMsg(null);
    try {
      const res = await api.testLineAlert({
        line_enabled: lineEnabled,
        channel_token: channelToken,
        target_id: targetId,
        cooldown_sec: cooldownSec
      });
      setLineStatusMsg({
        type: res.status === 'success' ? 'success' : 'error',
        text: res.message
      });
    } catch (e) {
      setLineStatusMsg({ type: 'error', text: 'ไม่สามารถเชื่อมต่อเพื่อส่งข้อความทดสอบได้' });
    }
    setTestingLine(false);
  };

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
      {/* 0. LINE Messaging API Notification Configuration */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid #06c755' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(6, 199, 85, 0.15)', color: '#06c755' }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                การแจ้งเตือนผ่าน LINE (LINE Official Account / Messaging API)
                <span className={`badge ${lineEnabled ? 'badge-emerald' : ''}`} style={{ fontSize: '0.7rem' }}>
                  {lineEnabled ? 'เปิดใช้งาน (ACTIVE)' : 'ปิดอยู่ (DISABLED)'}
                </span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                ส่งข้อความแจ้งเตือนเข้าแอป LINE ทันทีเมื่อค่าเซนเซอร์สูงหรือต่ำกว่าเกณฑ์ที่กำหนด
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setShowLineGuide(!showLineGuide)}
            >
              <HelpCircle size={15} /> {showLineGuide ? 'ซ่อนวิธีรับ Token' : 'วิธีรับ LINE Token (1 นาที)'}
            </button>
            <button
              className="btn"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                background: lineEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                color: lineEnabled ? '#34d399' : '#94a3b8'
              }}
              onClick={() => setLineEnabled(lineEnabled ? 0 : 1)}
            >
              {lineEnabled ? '🟢 เปิดแจ้งเตือน LINE' : '⚪ ปิดแจ้งเตือน LINE'}
            </button>
          </div>
        </div>

        {showLineGuide && (
          <div style={{
            background: 'rgba(6, 199, 85, 0.08)',
            border: '1px solid rgba(6, 199, 85, 0.25)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            lineHeight: 1.6
          }}>
            <strong style={{ color: '#06c755' }}>📌 วิธีสร้าง LINE Bot รับแจ้งเตือนฟรี (LINE Messaging API):</strong>
            <ol style={{ margin: '6px 0 0 18px', color: '#e2e8f0' }}>
              <li>เข้าเว็บ <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>LINE Developers Console</a> แล้วล็อกอินด้วยบัญชี LINE ของคุณ</li>
              <li>สร้าง <strong>Provider</strong> (เช่น <code>SmartFarm</code>) &rarr; เลือกสร้างแชนเนลแบบ <strong>Messaging API</strong></li>
              <li>ไปที่แท็บ <strong>Messaging API</strong> &rarr; ใช้แอป LINE ในมือถือสแกน <strong>QR Code</strong> ของบอทเพื่อเพิ่มเป็นเพื่อน</li>
              <li>เลื่อนลงมาด้านล่างสุดของแท็บ <strong>Messaging API</strong> หัวข้อ <strong>Channel access token (long-lived)</strong> กดปุ่ม <strong>Issue</strong> แล้วคัดลอก Token ยาวๆ มาวางในช่องด้านล่างนี้ได้เลย!</li>
            </ol>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              LINE Channel Access Token (Long-lived) *
            </label>
            <input
              type="password"
              placeholder="วาง Channel Access Token ที่ได้จาก LINE Developers Console ที่นี่..."
              style={{ width: '100%' }}
              value={channelToken}
              onChange={(e) => setChannelToken(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Target User ID / Group ID (เว้นว่าง = ส่งหาทุกคนที่แอดบอท)
            </label>
            <input
              type="text"
              placeholder="เว้นว่างไว้เพื่อส่งแบบ Broadcast"
              style={{ width: '100%' }}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              ระยะเวลาเว้นวรรคแจ้งเตือนซ้ำ (Cooldown กันสแปม)
            </label>
            <select
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--surface-border)',
                color: '#f8fafc'
              }}
              value={cooldownSec}
              onChange={(e) => setCooldownSec(Number(e.target.value))}
            >
              <option value={0}>ส่งทุกครั้งทันที (0 วินาที)</option>
              <option value={30}>ทุกๆ 30 วินาที</option>
              <option value={60}>ทุกๆ 1 นาที (แนะนำ)</option>
              <option value={300}>ทุกๆ 5 นาที</option>
            </select>
          </div>
        </div>

        {lineStatusMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '14px',
            fontSize: '0.82rem',
            background: lineStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: lineStatusMsg.type === 'success' ? '#34d399' : '#fb7185',
            border: `1px solid ${lineStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
          }}>
            {lineStatusMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{ background: 'rgba(6, 199, 85, 0.18)', color: '#06c755', border: '1px solid rgba(6, 199, 85, 0.35)' }}
            onClick={handleTestLine}
            disabled={testingLine}
          >
            <Send size={15} />
            {testingLine ? 'กำลังส่งเข้า LINE...' : '📲 ทดสอบส่งแจ้งเตือนเข้า LINE ทันที'}
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSaveLine}
            disabled={savingLine}
          >
            <Save size={15} />
            {savingLine ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า LINE'}
          </button>
        </div>
      </div>

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
                    <td style={{ padding: '12px 14px', color: 'var(--accent-rose)', fontWeight: 700 }}>
                      {Number(log.current_val).toFixed(2)}
                    </td>
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
