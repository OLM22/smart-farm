import React, { useState } from 'react';
import type { SensorRecord } from '../types';
import { Download, Layers } from 'lucide-react';

interface HistoryTabProps {
  records: SensorRecord[];
  hours: number;
  setHours: (h: number) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ records, hours, setHours }) => {
  const [metricCategory, setMetricCategory] = useState<'soil' | 'water' | 'climate'>('soil');

  // Export CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['id', 'node_id', 'synced_at', 's_temp', 's_hmd', 'w_temp', 'a_hmd', 'p_water', 'e_water', 'l_int', 's_temp_s', 'w_speed', 'w_level', 'f_rate', 'c_stat'];
    const rows = records.map(r => [
      r.id,
      r.node_id,
      `"${r.synced_at}"`,
      r.s_temp,
      r.s_hmd,
      r.w_temp,
      r.a_hmd,
      r.p_water,
      r.e_water,
      r.l_int,
      r.s_temp_s,
      r.w_speed,
      r.w_level,
      r.f_rate,
      r.c_stat
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartfarm_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to generate SVG polyline / path coordinates
  const renderLineChart = (
    dataKey1: keyof SensorRecord,
    name1: string,
    color1: string,
    dataKey2?: keyof SensorRecord,
    name2?: string,
    color2?: string
  ) => {
    if (records.length < 2) {
      return (
        <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          ต้องการข้อมูลอย่างน้อย 2 รายการขึ้นไปเพื่อวาดกราฟแนวโน้ม
        </div>
      );
    }

    const width = 900;
    const height = 300;
    const padding = 40;

    const values1 = records.map(r => Number(r[dataKey1]) || 0);
    const min1 = Math.min(...values1);
    const max1 = Math.max(...values1);
    const range1 = max1 - min1 || 1;

    const getCoords = (val: number, idx: number, min: number, range: number) => {
      const x = padding + (idx / (records.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    };

    const points1 = values1.map((v, i) => getCoords(v, i, min1, range1));
    const pathD1 = points1.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

    let points2: { x: number; y: number }[] = [];
    let pathD2 = '';
    let min2 = 0;
    let max2 = 0;

    if (dataKey2) {
      const values2 = records.map(r => Number(r[dataKey2]) || 0);
      min2 = Math.min(...values2);
      max2 = Math.max(...values2);
      const range2 = max2 - min2 || 1;
      points2 = values2.map((v, i) => getCoords(v, i, min2, range2));
      pathD2 = points2.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color1 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name1} (Min: {min1.toFixed(1)}, Max: {max1.toFixed(1)})</span>
          </div>
          {dataKey2 && name2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color2 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name2} (Min: {min2.toFixed(1)}, Max: {max2.toFixed(1)})</span>
            </div>
          )}
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Line 1 */}
          <path d={pathD1} fill="none" stroke={color1} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points1.map((p, i) => (
            <circle key={`p1-${i}`} cx={p.x} cy={p.y} r="3" fill={color1} />
          ))}

          {/* Line 2 (Optional) */}
          {pathD2 && (
            <>
              <path d={pathD2} fill="none" stroke={color2} strokeWidth="3" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
              {points2.map((p, i) => (
                <circle key={`p2-${i}`} cx={p.x} cy={p.y} r="3" fill={color2} />
              ))}
            </>
          )}

          {/* X-Axis labels */}
          {records.length > 0 && (
            <>
              <text x={padding} y={height - 10} fill="var(--text-muted)" fontSize="11">
                {records[0].synced_at.split(' ')[1] || ''}
              </text>
              <text x={width - padding} y={height - 10} fill="var(--text-muted)" fontSize="11" textAnchor="end">
                {records[records.length - 1].synced_at.split(' ')[1] || ''}
              </text>
            </>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Category buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn"
            style={{
              background: metricCategory === 'soil' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              borderColor: metricCategory === 'soil' ? 'var(--accent-emerald)' : 'var(--surface-border)',
              color: metricCategory === 'soil' ? '#34d399' : 'var(--text-secondary)'
            }}
            onClick={() => setMetricCategory('soil')}
          >
            <Layers size={16} /> ดิน (Soil Moisture & Temp)
          </button>
          <button
            className="btn"
            style={{
              background: metricCategory === 'water' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              borderColor: metricCategory === 'water' ? 'var(--accent-cyan)' : 'var(--surface-border)',
              color: metricCategory === 'water' ? '#22d3ee' : 'var(--text-secondary)'
            }}
            onClick={() => setMetricCategory('water')}
          >
            <Layers size={16} /> น้ำและสารละลาย (Water & Nutrients)
          </button>
          <button
            className="btn"
            style={{
              background: metricCategory === 'climate' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              borderColor: metricCategory === 'climate' ? 'var(--accent-amber)' : 'var(--surface-border)',
              color: metricCategory === 'climate' ? '#fbbf24' : 'var(--text-secondary)'
            }}
            onClick={() => setMetricCategory('climate')}
          >
            <Layers size={16} /> สภาพแวดล้อม (Climate & Wind)
          </button>
        </div>

        {/* Time range & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '10px' }}>
            {[1, 6, 24, 72].map((h) => (
              <button
                key={h}
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: hours === h ? 'var(--accent-emerald)' : 'transparent',
                  color: hours === h ? '#fff' : 'var(--text-secondary)'
                }}
                onClick={() => setHours(h)}
              >
                {h === 72 ? '3 วัน' : `${h} ชม.`}
              </button>
            ))}
          </div>

          <button className="btn" onClick={handleExportCSV}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Trend Chart Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px' }}>
          {metricCategory === 'soil' && 'แนวโน้มความสัมพันธ์: อุณหภูมิดิน (Soil Temp) vs ความชื้นดิน (Soil Humidity)'}
          {metricCategory === 'water' && 'แนวโน้มคุณภาพน้ำ: ค่า pH ของน้ำ vs อุณหภูมิน้ำ'}
          {metricCategory === 'climate' && 'แนวโน้มสภาพอากาศ: อุณหภูมิอากาศ (Air Temp) vs ความชื้นอากาศ (Air Humidity)'}
        </h3>

        {metricCategory === 'soil' && renderLineChart('s_temp', 'อุณหภูมิดิน (°C)', '#f59e0b', 's_hmd', 'ความชื้นดิน (%)', '#10b981')}
        {metricCategory === 'water' && renderLineChart('p_water', 'ค่า pH ของน้ำ', '#8b5cf6', 'w_temp', 'อุณหภูมิน้ำ (°C)', '#06b6d4')}
        {metricCategory === 'climate' && renderLineChart('s_temp_s', 'อุณหภูมิอากาศ (°C)', '#ef4444', 'a_hmd', 'ความชื้นอากาศ (%)', '#3b82f6')}
      </div>
    </div>
  );
};
