import React, { useState, useEffect, useRef } from "react";
import { DatabaseOutlined } from "@ant-design/icons";
import { Fan, Lightbulb, Wind } from "lucide-react";
import { message, Spin, Button } from "antd";
import { publicApiGet, publicApiPost } from "../api/publicApi";

interface BatchSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

interface DeviceStatus {
  pump: string;
  light: string;
  fan: string;
}

const DEVICE_LIST = [
  { key: "pump" as keyof DeviceStatus, label: "Carbon Valve", icon: <Wind size={32} strokeWidth={1.5} />, topic: "mqtt/station1/pump/status/control" },
  { key: "light" as keyof DeviceStatus, label: "Light", icon: <Lightbulb size={32} strokeWidth={1.5} />, topic: "mqtt/station1/light/status/control" },
  { key: "fan" as keyof DeviceStatus, label: "Fan", icon: <Fan size={32} strokeWidth={1.5} />, topic: "mqtt/station1/fan/status/control" },
];

const BatchSelector: React.FC<BatchSelectorProps> = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [internalValue, setInternalValue] = useState<number>(value);
  const [inputValue, setInputValue] = useState<number>(value);

  // Device status state
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    pump: "OFF",
    light: "OFF",
    fan: "OFF",
  });
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);

  // --- Batch fetch ---
  useEffect(() => {
    const fetchBatch = async () => {
      setLoading(true);
      try {
        const res = await publicApiGet("mqtt/batch/status");
        const data = await res.json();
        if (data.success && typeof data.batch === "number") {
          setInternalValue(data.batch);
          setInputValue(data.batch);
          onChange(data.batch);
        }
      } catch (e) {
        // optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Device status polling ---
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const res = await publicApiGet("mqtt/device/status");
        const data = await res.json();
        if (data.success && data.status) {
          setDeviceStatus({
            pump: data.status.pump ?? "OFF",
            light: data.status.light ?? "OFF",
            fan: data.status.fan ?? "OFF",
          });
        }
      } catch {
        // ignore polling errors
      }
    };

    fetchDeviceStatus(); // initial fetch
    intervalRef.current = setInterval(fetchDeviceStatus, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(Number(e.target.value));
  };

  const handleSet = async () => {
    const prevValue = internalValue;
    setInternalValue(inputValue);
    onChange(inputValue);
    setLoading(true);
    try {
      const response = await publicApiPost(
        `mqtt/station1/batch/control/${inputValue}`,
        {}
      );
      if (!response.ok) throw new Error("Failed to set batch");

      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/batch/status");
          const data = await res.json();
          if (data.success && data.batch === inputValue) {
            confirmed = true;
            setInternalValue(inputValue);
            setLoading(false);
            message.success(`Batch set to ${inputValue}`);
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 5000) {
          setInternalValue(prevValue);
          setInputValue(prevValue);
          setLoading(false);
          message.error("Failed to confirm batch change");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch (error) {
      setInternalValue(prevValue);
      setInputValue(prevValue);
      setLoading(false);
      message.error("Failed to set batch");
    }
  };

  const isOn = (status: string) =>
    status?.toUpperCase() === "ON" || status === "1";

  const handleToggleDevice = async (key: keyof DeviceStatus, topic: string) => {
    const currentOn = isOn(deviceStatus[key]);
    const newCommand = currentOn ? "OFF" : "ON";
    setTogglingDevice(key);
    try {
      const res = await publicApiPost(`${topic}/${newCommand}`, {});
      if (!res.ok) throw new Error("Failed");
      // Optimistic update
      setDeviceStatus((prev) => ({ ...prev, [key]: newCommand }));
      message.success(`${DEVICE_LIST.find(d => d.key === key)?.label} → ${newCommand}`);
    } catch {
      message.error("Command failed");
    } finally {
      setTogglingDevice(null);
    }
  };

  return (
    <div className="w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-emerald-500 text-2xl">
          <DatabaseOutlined />
        </span>
        <h2 className="text-xl font-extrabold text-gray-800">Batch Selector</h2>
      </div>

      {/* Batch input row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label
          htmlFor="batch-input"
          className="font-semibold text-gray-700 mb-1 sm:mb-0 whitespace-nowrap"
        >
          Batch:
        </label>
        <Spin spinning={loading} size="small" className="flex-shrink-0">
          <input
            id="batch-input"
            type="number"
            min={0}
            value={inputValue}
            onChange={handleInputChange}
            className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg outline-none text-black font-medium focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
            disabled={loading}
          />
        </Spin>
        <Button
          type="primary"
          onClick={handleSet}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Set
        </Button>
      </div>

      {/* Device Status Indicators */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Device Status
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DEVICE_LIST.map(({ key, label, icon, topic }) => {
            const on = isOn(deviceStatus[key]);
            const isToggling = togglingDevice === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleToggleDevice(key, topic)}
                disabled={isToggling}
                className={`relative overflow-hidden flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-2 transition-all duration-300 cursor-pointer border backdrop-blur-sm ${on
                  ? "bg-gradient-to-br from-emerald-50 to-green-100 border-green-300 shadow-[0_4px_15px_-3px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_-3px_rgba(34,197,94,0.4)] hover:-translate-y-1"
                  : "bg-gradient-to-br from-slate-50 to-gray-100 border-gray-200 shadow-sm hover:shadow-md hover:bg-white hover:-translate-y-1"
                  } ${isToggling ? "opacity-60 scale-95" : "active:scale-95"}`}
              >
                {/* Glow effect for ON state */}
                {on && <div className="absolute inset-0 bg-white/30 rounded-2xl pointer-events-none" />}
                
                <div className={`transition-all duration-500 flex items-center justify-center ${on && !isToggling ? 'scale-110 drop-shadow-md text-emerald-600' : 'text-gray-400 opacity-80'} ${on && key === 'fan' ? 'animate-[spin_3s_linear_infinite]' : ''}`}>
                  {icon}
                </div>
                <span className={`text-[11px] font-extrabold tracking-wide transition-colors duration-300 z-10 ${on ? 'text-green-800' : 'text-gray-500'}`}>
                  {label}
                </span>
                
                <div className="flex items-center gap-1.5 mt-1 bg-white/80 px-3 py-1 rounded-full shadow-sm border border-white/60 z-10">
                  <span
                    className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${on
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                      : "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${on ? "text-green-700" : "text-red-500"
                      }`}
                  >
                    {isToggling ? "..." : on ? "ON" : "OFF"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BatchSelector;
