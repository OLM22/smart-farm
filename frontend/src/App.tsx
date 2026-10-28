import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { SensorRecord, AlertRule, AlertLog, DeviceControl } from './types';
import { Navigation } from './components/Navigation';
import { OverviewTab } from './components/OverviewTab';
import { HistoryTab } from './components/HistoryTab';
import { AlertsTab } from './components/AlertsTab';
import { ControlsTab } from './components/ControlsTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'alerts' | 'controls'>('overview');
  
  // Data states
  const [latest, setLatest] = useState<SensorRecord | null>(null);
  const [records, setRecords] = useState<SensorRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [devices, setDevices] = useState<DeviceControl[]>([]);
  
  // UI states
  const [hours, setHours] = useState<number>(24);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  // Poll latest telemetry
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

  // Fetch historical data
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

  // Fetch alert rules and logs
  const refreshAlerts = useCallback(async () => {
    try {
      const [rData, lData] = await Promise.all([api.getAlertRules(), api.getAlertLogs(50)]);
      if (rData.status === 'success') setRules(rData.rules);
      if (lData.status === 'success') setAlertLogs(lData.logs);
    } catch (e) {
      console.error("Error fetching alerts:", e);
    }
  }, []);

  // Fetch device controls
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
    refreshLatest();
    refreshHistory();
    refreshAlerts();
    refreshDevices();
  }, [refreshLatest, refreshHistory, refreshAlerts, refreshDevices]);

  // Polling loop
  useEffect(() => {
    const timer = setInterval(() => {
      refreshLatest();
      if (activeTab === 'history') refreshHistory();
      if (activeTab === 'alerts') refreshAlerts();
      if (activeTab === 'controls') refreshDevices();
    }, 3000);

    return () => clearInterval(timer);
  }, [activeTab, refreshLatest, refreshHistory, refreshAlerts, refreshDevices]);

  // Handlers
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

  return (
    <div className="container">
      {/* Offline Alert if Backend is not running */}
      {!serverOnline && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.2)',
          border: '1px solid var(--accent-rose)',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          color: '#fecdd3',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ ไม่สามารถเชื่อมต่อกับ PHP REST Backend ได้ที่ <strong>http://localhost:8000</strong> กรุณาตรวจสอบว่ารัน backend อยู่หรือไม่</span>
          <button className="btn btn-danger" onClick={refreshLatest}>ลองเชื่อมต่อใหม่</button>
        </div>
      )}

      {/* Navigation & Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSyncing={isSyncing}
        unreadAlerts={unreadAlerts}
        onSimulate={handleSimulate}
      />

      {/* Main Tab Content */}
      <main style={{ minHeight: '650px' }}>
        {activeTab === 'overview' && (
          <OverviewTab latest={latest} records={records} totalLogs={totalLogs} />
        )}

        {activeTab === 'history' && (
          <HistoryTab records={records} hours={hours} setHours={setHours} />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab
            rules={rules}
            logs={alertLogs}
            onUpdateRule={handleUpdateRule}
            onMarkRead={handleMarkRead}
          />
        )}

        {activeTab === 'controls' && (
          <ControlsTab
            devices={devices}
            onToggleDevice={handleToggleDevice}
            onToggleAutoMode={handleToggleAutoMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        padding: '24px 0',
        textAlign: 'center',
        borderTop: '1px solid var(--surface-border)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem'
      }}>
        Smart Farm AIoT System &copy; 2026 &bull; ESP32 LoRa ➔ Raspberry Pi Gateway &bull; PHP REST Backend &bull; React Frontend
      </footer>
    </div>
  );
};

export default App;
