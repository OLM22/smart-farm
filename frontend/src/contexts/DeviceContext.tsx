import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuthApiGet } from "../api/authApi";
import { useAuth } from "./AuthContext";

interface DeviceContextType {
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  deviceIds: readonly string[];
  loading: boolean;
  error: string | null;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authApiGet = useAuthApiGet();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setDeviceIds([]);
      setSelectedDeviceId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    authApiGet("nodes/names")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to fetch device names");
        const ids = await response.json();
        setDeviceIds(ids);
        setSelectedDeviceId(ids[0] || "");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line
  }, [user]);

  return (
    <DeviceContext.Provider
      value={{
        selectedDeviceId,
        setSelectedDeviceId,
        deviceIds,
        loading,
        error,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }
  return context;
};
