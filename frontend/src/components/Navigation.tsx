import React from 'react';
import { Activity, BarChart2, Bell, Sliders, Radio, Zap } from 'lucide-react';

interface NavigationProps {
  activeTab: 'overview' | 'history' | 'alerts' | 'controls';
  setActiveTab: (tab: 'overview' | 'history' | 'alerts' | 'controls') => void;
  isSyncing: boolean;
  unreadAlerts: number;
  onSimulate: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isSyncing,
  unreadAlerts,
  onSimulate
}) => {
  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
          }}>
            <Radio size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Smart Farm AIoT
              </h1>
              <span className="badge badge-emerald">
                <span className="pulse-dot"></span>
                v2.0 Clean
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              LoRa Gateway ➔ MongoDB Buffer ➔ PHP REST Backend
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(10, 15, 26, 0.6)',
          padding: '6px',
          borderRadius: '14px',
          border: '1px solid var(--surface-border)'
        }}>
          <button
            className="btn"
            style={{
              background: activeTab === 'overview' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '10px'
            }}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={17} />
            ภาพรวมสด (Live)
          </button>

          <button
            className="btn"
            style={{
              background: activeTab === 'history' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '10px'
            }}
            onClick={() => setActiveTab('history')}
          >
            <BarChart2 size={17} />
            กราฟประวัติ (Analytics)
          </button>

          <button
            className="btn"
            style={{
              background: activeTab === 'alerts' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'alerts' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '10px',
              position: 'relative'
            }}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell size={17} />
            แจ้งเตือน (Alerts)
            {unreadAlerts > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--accent-rose)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '9999px',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)'
              }}>
                {unreadAlerts}
              </span>
            )}
          </button>

          <button
            className="btn"
            style={{
              background: activeTab === 'controls' ? 'var(--accent-emerald)' : 'transparent',
              color: activeTab === 'controls' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '10px'
            }}
            onClick={() => setActiveTab('controls')}
          >
            <Sliders size={17} />
            ควบคุมรีเลย์ (Actuators)
          </button>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={onSimulate}
            disabled={isSyncing}
          >
            <Zap size={16} />
            {isSyncing ? 'กำลังซิงค์...' : '⚡ Test Simulate Sync'}
          </button>
        </div>

      </div>
    </header>
  );
};
