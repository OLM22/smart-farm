import React, { useState, useEffect } from "react";
import { Switch, InputNumber, Spin, Button, message } from "antd";
import { CodepenCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { publicApiGet, publicApiPost } from "../api/publicApi";

const WaterControl: React.FC = () => {
  // Internal states
  const [internalAuto, setInternalAuto] = useState<"ON" | "OFF">("OFF");
  const [internalMinLow, setInternalMinLow] = useState<number>(10);
  const [internalMinHigh, setInternalMinHigh] = useState<number>(20);
  const [internalMaxLow, setInternalMaxLow] = useState<number>(40);
  const [internalMaxHigh, setInternalMaxHigh] = useState<number>(50);
  const [sensorValues, setSensorValues] = useState<any>({});

  // Loading states
  const [autoLoading, setAutoLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  // Input values
  const [minLowInput, setMinLowInput] = useState<number>(internalMinLow);
  const [minHighInput, setMinHighInput] = useState<number>(internalMinHigh);
  const [maxLowInput, setMaxLowInput] = useState<number>(internalMaxLow);
  const [maxHighInput, setMaxHighInput] = useState<number>(internalMaxHigh);

  // Polling helper
  const pollConfirm = async (
    fetchFn: () => Promise<boolean>,
    revertFn: () => void,
    setLoading: (b: boolean) => void
  ) => {
    let elapsed = 0;
    const poll = async () => {
      if (await fetchFn()) return setLoading(false);
      elapsed += 500;
      if (elapsed >= 5000) {
        revertFn();
        setLoading(false);
      } else {
        setTimeout(poll, 500);
      }
    };
    setTimeout(poll, 500);
  };

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await publicApiGet("mqtt/temp/status");
        const data = await res.json();
        if (data.success && data.status) {
          setInternalAuto(data.status.tempAuto === "ON" ? "ON" : "OFF");
          setInternalMinLow(data.status.tempMinLow);
          setInternalMinHigh(data.status.tempMinHigh);
          setInternalMaxLow(data.status.tempMaxLow);
          setInternalMaxHigh(data.status.tempMaxHigh);
          setMinLowInput(data.status.tempMinLow);
          setMinHighInput(data.status.tempMinHigh);
          setMaxLowInput(data.status.tempMaxLow);
          setMaxHighInput(data.status.tempMaxHigh);
        }
      } catch {
        message.error("Failed to fetch water temperature status.");
      }
    };
    fetchStatus();
  }, []);

  // Poll sensor values for tank status
  useEffect(() => {
    const fetchValues = async () => {
      try {
        const res = await publicApiGet("mqtt/sensor/values");
        const data = await res.json();
        if (data.success) {
          setSensorValues(data.values);
        }
      } catch (err) {
      }
    };
    fetchValues();
    const interval = setInterval(fetchValues, 3000);
    return () => clearInterval(interval);
  }, []);

  const getTankColor = (tankValue: number | null | undefined) => {
    if (internalAuto === "OFF" || tankValue === null || tankValue === undefined) return "bg-gray-300"; // Gray (Manual or Offline)

    // Sort boundaries dynamically to handle custom user inputs safely
    const lowBoundaryMin = Math.min(internalMinLow, internalMaxLow);
    const lowBoundaryMax = Math.max(internalMinLow, internalMaxLow);
    const highBoundaryMin = Math.min(internalMinHigh, internalMaxHigh);
    const highBoundaryMax = Math.max(internalMinHigh, internalMaxHigh);

    if (tankValue < lowBoundaryMin || tankValue > highBoundaryMax) {
      return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"; // Red
    }

    if (
      (tankValue >= lowBoundaryMin && tankValue <= lowBoundaryMax) ||
      (tankValue >= highBoundaryMin && tankValue <= highBoundaryMax)
    ) {
      return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"; // Orange
    }

    return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"; // Green (Normal / Working)
  };

  // Toggle Auto Mode
  const handleAutoToggle = async (checked: boolean) => {
    const prev = internalAuto;
    const newStatus = checked ? "ON" : "OFF";
    setInternalAuto(newStatus);
    setAutoLoading(true);
    try {
      await publicApiPost(`mqtt/station1/temp/auto/control/${newStatus}`, {});
      await pollConfirm(
        async () => {
          const res = await publicApiGet("mqtt/temp/status");
          const data = await res.json();
          return data.success && data.status?.tempAuto === newStatus;
        },
        () => setInternalAuto(prev),
        setAutoLoading
      );
      message.success(`Water temp mode set to ${checked ? "Auto" : "Manual"}`);
    } catch {
      setInternalAuto(prev);
      setAutoLoading(false);
      message.error("Failed to set water temp mode");
    }
  };

  // Apply All handler
  const handleApplyAll = async () => {
    setApplyLoading(true);
    const prevValues = {
      minLow: internalMinLow,
      minHigh: internalMinHigh,
      maxLow: internalMaxLow,
      maxHigh: internalMaxHigh,
    };

    setInternalMinLow(minLowInput);
    setInternalMinHigh(minHighInput);
    setInternalMaxLow(maxLowInput);
    setInternalMaxHigh(maxHighInput);

    try {
      await Promise.all([
        publicApiPost(`mqtt/station1/temp/minlow/control/${minLowInput}`, {}),
        publicApiPost(`mqtt/station1/temp/minhigh/control/${minHighInput}`, {}),
        publicApiPost(`mqtt/station1/temp/maxlow/control/${maxLowInput}`, {}),
        publicApiPost(`mqtt/station1/temp/maxhigh/control/${maxHighInput}`, {}),
      ]);

      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/temp/status");
          const data = await res.json();
          if (
            data.success &&
            data.status &&
            data.status.tempMinLow === minLowInput &&
            data.status.tempMinHigh === minHighInput &&
            data.status.tempMaxLow === maxLowInput &&
            data.status.tempMaxHigh === maxHighInput
          ) {
            confirmed = true;
            setApplyLoading(false);
            message.success("All temperature thresholds updated");
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 8000) {
          setInternalMinLow(prevValues.minLow);
          setInternalMinHigh(prevValues.minHigh);
          setInternalMaxLow(prevValues.maxLow);
          setInternalMaxHigh(prevValues.maxHigh);
          setMinLowInput(prevValues.minLow);
          setMinHighInput(prevValues.minHigh);
          setMaxLowInput(prevValues.maxLow);
          setMaxHighInput(prevValues.maxHigh);
          setApplyLoading(false);
          message.error("Failed to confirm temperature threshold changes");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch {
      setInternalMinLow(prevValues.minLow);
      setInternalMinHigh(prevValues.minHigh);
      setInternalMaxLow(prevValues.maxLow);
      setInternalMaxHigh(prevValues.maxHigh);
      setMinLowInput(prevValues.minLow);
      setMinHighInput(prevValues.minHigh);
      setMaxLowInput(prevValues.maxLow);
      setMaxHighInput(prevValues.maxHigh);
      setApplyLoading(false);
      message.error("Failed to set temperature thresholds");
    }
  };

  const hasChanges =
    minLowInput !== internalMinLow ||
    minHighInput !== internalMinHigh ||
    maxLowInput !== internalMaxLow ||
    maxHighInput !== internalMaxHigh;

  return (
    <div className="w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-emerald-500 text-2xl">
            <CodepenCircleOutlined />
          </span>
          <h2 className="text-xl font-extrabold text-gray-800">
            Water Temp Control
            <span className="text-sm font-medium text-gray-400 ml-1.5">°C</span>
          </h2>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-semibold text-gray-600">Mode:</span>
        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200">
          <Switch
            checked={internalAuto === "ON"}
            onChange={handleAutoToggle}
            checkedChildren="Auto"
            unCheckedChildren="Manual"
            disabled={autoLoading}
            loading={autoLoading}
            className={internalAuto === "ON" ? "!bg-green-500" : ""}
            style={{ minWidth: 72 }}
          />
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${internalAuto === "ON"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
            }`}
        >
          {internalAuto === "ON" ? "● Active" : "○ Inactive"}
        </span>
      </div>

      {/* Tank Status */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-semibold text-gray-600">Status:</span>
        <div className="flex gap-4 items-center">
          {[
            { label: "Tank 1", val: sensorValues.temp1 },
            { label: "Tank 2", val: sensorValues.temp2 },
            { label: "Tank 3", val: sensorValues.temp3 }
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-1.5" title={`${t.val ?? '--'} °C`}>
              <span className={`w-3 h-3 rounded-full transition-colors duration-300 ${getTankColor(t.val)}`} />
              <span className="text-xs font-medium text-gray-500">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold Controls */}
      <div className="flex-1 space-y-3">
        {/* Min Zone */}
        <div className="bg-green-50/60 border border-green-100 rounded-xl p-3">
          <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">
            Min Threshold
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Low</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  value={minLowInput}
                  min={-50}
                  max={100}
                  step={0.5}
                  onChange={(v) => setMinLowInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">High</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  value={minHighInput}
                  min={-50}
                  max={100}
                  step={0.5}
                  onChange={(v) => setMinHighInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
          </div>
        </div>

        {/* Max Zone */}
        <div className="bg-red-50/60 border border-red-100 rounded-xl p-3">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
            Max Threshold
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Low</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  value={maxLowInput}
                  min={-50}
                  max={100}
                  step={0.5}
                  onChange={(v) => setMaxLowInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">High</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  value={maxHighInput}
                  min={-50}
                  max={100}
                  step={0.5}
                  onChange={(v) => setMaxHighInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
          </div>
        </div>
      </div>

      {/* Apply All Button */}
      <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleApplyAll}
          loading={applyLoading}
          disabled={applyLoading || !hasChanges}
          size="large"
          className={`${hasChanges ? "!bg-green-600 hover:!bg-green-700" : ""
            }`}
        >
          Apply All
        </Button>
      </div>
    </div>
  );
};

export default WaterControl;
