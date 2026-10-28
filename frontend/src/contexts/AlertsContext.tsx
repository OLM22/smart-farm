import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthApiGet, useAuthApiPatch } from "../api/authApi";

interface Alert {
  alert_id: string;
  node_id: string;
  sensor_id: string;
  alert_type: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
  is_read: boolean;
  node_name: string;
  sensor_type: string;
}

interface AlertsContextType {
  alerts: Alert[];
  loading: boolean;
  fetchAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const authApiGet = useAuthApiGet();
  const authApiPatch = useAuthApiPatch();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await authApiGet("alerts/unread");
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const alertsData = await response.json();
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const response = await authApiPatch(`alerts/${alertId}/read`, {});
      if (!response.ok) throw new Error("Failed to mark alert as read");
      setAlerts((prev) => prev.filter((alert) => alert.alert_id !== alertId));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        alerts.map(async (alert) => {
          const response = await authApiPatch(
            `alerts/${alert.alert_id}/read`,
            {}
          );
          if (!response.ok) throw new Error("Failed to mark alert as read");
        })
      );
      setAlerts([]);
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AlertsContext.Provider
      value={{ alerts, loading, fetchAlerts, markAsRead, markAllAsRead }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return context;
};
