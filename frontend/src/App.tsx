import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { SensorRecord, AlertRule, AlertLog, DeviceControl, User } from './types';
import { Sidebar, type NavItemKey } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { LoginPage } from './components/LoginPage';
import { DashboardTab } from './components/DashboardTab';
import { GisMapTab } from './components/GisMapTab';
import { ControlsTab } from './components/ControlsTab';
import { AlertsTab } from './components/AlertsTab';
import { HistoryTab } from './components/HistoryTab';
import { EdgeGatewayTab } from './components/EdgeGatewayTab';
import { ZonesTab } from './components/ZonesTab';

export const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cru_farm_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    // Default user as requested
    return {
      email: 'olm22@gmail.com',
      name: 'olm22',
      role: 'SUPER_ADMIN',
      farmScope: 'ALL_FARMS'
    };
  });

  // Navigation & UI States
  const [activeNav, setActiveNav] = useState<NavItemKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hours, setHours] = useState(24);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  // Data States
  const [latest, setLatest] = useState<SensorRecord | null>(null);
  const [records, setRecords] = useState<SensorRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [devices, setDevices] = useState<DeviceControl[]>([]);

  // Telemetry Poll
  const refreshLatest = useCallback(async () => {
    try {
      const data = await api.getLatestSensors();
      if (data.status === 'success') {
        setLatest(data.latest);
        setTotalLogs(data.total_logs);
        setUnreadAlerts(data.unread_alerts);
        setServerOnline(true);
      }
    } catch (e) {
      setServerOnline(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await api.getHistory(hours, 100);
      if (data.status === 'success') {
        setRecords(data.records);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  }, [hours]);

  const refreshAlerts = useCallback(async () => {
    try {
      const [rData, lData] = await Promise.all([api.getAlertRules(), api.getAlertLogs(50)]);
      if (rData.status === 'success') setRules(rData.rules);
      if (lData.status === 'success') setAlertLogs(lData.logs);
    } catch (e) {
      console.error("Error fetching alerts:", e);
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const data = await api.getDeviceControls();
      if (data.status === 'success') {
        setDevices(data.devices);
      }
    } catch (e) {
      console.error("Error fetching devices:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (currentUser) {
      refreshLatest();
      refreshHistory();
      refreshAlerts();
      refreshDevices();
    }
  }, [currentUser, refreshLatest, refreshHistory, refreshAlerts, refreshDevices]);

  // Polling loop
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      refreshLatest();
      if (activeNav === 'reports') refreshHistory();
      if (activeNav === 'alerts') refreshAlerts();
      if (activeNav === 'controls') refreshDevices();
    }, 3000);

    return () => clearInterval(timer);
  }, [currentUser, activeNav, refreshLatest, refreshHistory, refreshAlerts, refreshDevices]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('cru_farm_user');
    setCurrentUser(null);
  };

  // Simulate sync packet
  const handleSimulate = async () => {
    setIsSyncing(true);
    try {
      await api.simulateTelemetrySync();
      await refreshLatest();
      await refreshHistory();
      await refreshAlerts();
    } catch (e) {
      console.error("Simulation failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateRule = async (rule: Partial<AlertRule>) => {
    try {
      await api.updateAlertRule(rule);
      await refreshAlerts();
    } catch (e) {
      console.error("Failed to update rule:", e);
    }
  };

  const handleMarkRead = async (id: number | 'all') => {
    try {
      await api.markAlertsAsRead(id);
      await refreshAlerts();
      await refreshLatest();
    } catch (e) {
      console.error("Failed to mark alert as read:", e);
    }
  };

  const handleToggleDevice = async (deviceId: string, newState: 'ON' | 'OFF') => {
    try {
      await api.updateDeviceControl(deviceId, newState);
      await refreshDevices();
    } catch (e) {
      console.error("Failed to toggle device:", e);
    }
  };

  const handleToggleAutoMode = async (deviceId: string, autoMode: number) => {
    try {
      await api.updateDeviceControl(deviceId, undefined, autoMode);
      await refreshDevices();
    } catch (e) {
      console.error("Failed to toggle auto mode:", e);
    }
  };

  // If user is not logged in, render LoginPage
  if (!currentUser) {
    return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* 1. Left Sidebar matching Screenshot layout */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        user={currentUser}
        unreadAlerts={unreadAlerts}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* 2. Main Content View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar with user's email */}
        <TopNavbar
          user={currentUser}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onSimulate={handleSimulate}
          isSyncing={isSyncing}
        />

        {/* Offline Warning Notice if PHP server unreachable */}
        {!serverOnline && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.2)',
            borderBottom: '1px solid var(--accent-rose)',
            padding: '10px 24px',
            color: '#fecdd3',
            fontSize: '0.82rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>⚠️ ไม่สามารถเชื่อมต่อกับ PHP REST Backend ได้ที่ <strong>http://localhost:8000</strong> กรุณาตรวจสอบว่าเซิร์ฟเวอร์รันอยู่หรือไม่</span>
            <button className="btn btn-danger" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={refreshLatest}>
              ลองเชื่อมต่อใหม่
            </button>
          </div>
        )}

        {/* Content Tabs */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {activeNav === 'dashboard' && (
            <DashboardTab
              latest={latest}
              records={records}
              totalLogs={totalLogs}
              unreadAlerts={unreadAlerts}
              onRefresh={refreshLatest}
              onOpenGatewayOps={() => setActiveNav('edge_gateway')}
            />
          )}

          {activeNav === 'gis_map' && (
            <GisMapTab
              onSelectFarmForDashboard={() => setActiveNav('dashboard')}
            />
          )}

          {activeNav === 'controls' && (
            <ControlsTab
              devices={devices}
              onToggleDevice={handleToggleDevice}
              onToggleAutoMode={handleToggleAutoMode}
            />
          )}

          {activeNav === 'zones' && (
            <ZonesTab latest={latest} />
          )}

          {activeNav === 'alerts' && (
            <AlertsTab
              rules={rules}
              logs={alertLogs}
              onUpdateRule={handleUpdateRule}
              onMarkRead={handleMarkRead}
            />
          )}

          {activeNav === 'reports' && (
            <HistoryTab
              records={records}
              hours={hours}
              setHours={setHours}
            />
          )}

          {activeNav === 'edge_gateway' && (
            <EdgeGatewayTab
              latest={latest}
              totalLogs={totalLogs}
              onRefresh={refreshLatest}
            />
          )}

          {['hardware', 'users', 'database', 'settings'].includes(activeNav) && (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
                ระบบจัดการ {activeNav === 'hardware' ? 'ฮาร์ดแวร์ & OTA' : activeNav === 'users' ? 'ผู้ใช้และสิทธิ์' : activeNav === 'database' ? 'ฐานข้อมูล' : 'ตั้งค่าระบบฟาร์ม'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                ผู้ดูแลระบบ: <strong>{currentUser.email}</strong> &bull; สิทธิ์: <strong>{currentUser.role}</strong>
              </p>
              <div className="badge badge-emerald">พร้อมใช้งานภายใต้ Farm Scope: {currentUser.farmScope}</div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            CRU Smart Farm &copy; 2026 &bull; Multi-Farm IoT Monitoring, Automation and Remote Control Platform
          </div>
          <div>
            ผู้ใช้งาน: <strong style={{ color: '#34d399' }}>{currentUser.email}</strong>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
