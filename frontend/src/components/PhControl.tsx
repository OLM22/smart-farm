import React, { useState, useEffect } from "react";
import { Switch, InputNumber, Spin, Button, message } from "antd";
import { ExperimentOutlined, SaveOutlined } from "@ant-design/icons";
import { publicApiGet, publicApiPost } from "../api/publicApi";

const PhControl: React.FC = () => {
  // Internal states
  const [internalAuto, setInternalAuto] = useState<"ON" | "OFF">("OFF");
  const [internalMinLowPh, setInternalMinLowPh] = useState<number>(0);
  const [internalMinHighPh, setInternalMinHighPh] = useState<number>(2);
  const [internalMaxLowPh, setInternalMaxLowPh] = useState<number>(12);
  const [internalMaxHighPh, setInternalMaxHighPh] = useState<number>(14);
  const [sensorValues, setSensorValues] = useState<any>({});

  // Loading states
  const [autoLoading, setAutoLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  // Input states
  const [minLowPhInput, setMinLowPhInput] = useState<number>(internalMinLowPh);
  const [minHighPhInput, setMinHighPhInput] = useState<number>(internalMinHighPh);
  const [maxLowPhInput, setMaxLowPhInput] = useState<number>(internalMaxLowPh);
  const [maxHighPhInput, setMaxHighPhInput] = useState<number>(internalMaxHighPh);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await publicApiGet("mqtt/ph/status");
        const data = await res.json();
        if (data.success && data.status) {
          setInternalAuto(data.status.phAuto === "ON" ? "ON" : "OFF");
          setInternalMinLowPh(data.status.phMinLow);
          setInternalMinHighPh(data.status.phMinHigh);
          setInternalMaxLowPh(data.status.phMaxLow);
          setInternalMaxHighPh(data.status.phMaxHigh);
          setMinLowPhInput(data.status.phMinLow);
          setMinHighPhInput(data.status.phMinHigh);
          setMaxLowPhInput(data.status.phMaxLow);
          setMaxHighPhInput(data.status.phMaxHigh);
        }
      } catch { }
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
    if (internalAuto === "OFF" || tankValue === null || tankValue === undefined) return "bg-gray-300"; // Gray

    // Sort boundaries dynamically to handle custom user inputs safely
    const lowBoundaryMin = Math.min(internalMinLowPh, internalMaxLowPh);
    const lowBoundaryMax = Math.max(internalMinLowPh, internalMaxLowPh);
    const highBoundaryMin = Math.min(internalMinHighPh, internalMaxHighPh);
    const highBoundaryMax = Math.max(internalMinHighPh, internalMaxHighPh);

    if (tankValue < lowBoundaryMin || tankValue > highBoundaryMax) {
      return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"; // Red
    }

    if (
      (tankValue >= lowBoundaryMin && tankValue <= lowBoundaryMax) ||
      (tankValue >= highBoundaryMin && tankValue <= highBoundaryMax)
    ) {
      return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"; // Orange
    }

    return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"; // Green (OK)
  };

  const handleAutoToggle = async (checked: boolean) => {
    setAutoLoading(true);
    const prev = internalAuto;
    const newStatus = checked ? "ON" : "OFF";
    setInternalAuto(newStatus);
    try {
      const response = await publicApiPost(
        `mqtt/station1/ph/auto/control/${newStatus}`,
        {}
      );
      if (!response.ok) throw new Error("Failed to send command");
      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/ph/status");
          const data = await res.json();
          if (data.success && data.status && data.status.phAuto === newStatus) {
            confirmed = true;
            setInternalAuto(newStatus);
            setAutoLoading(false);
            message.success(`pH mode set to ${checked ? "Auto" : "Manual"}`);
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 5000) {
          setInternalAuto(prev);
          setAutoLoading(false);
          message.error("Failed to set pH mode");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch {
      setInternalAuto(prev);
      setAutoLoading(false);
      message.error("Failed to set pH mode");
    }
  };

  // Apply All handler — sends all 4 values
  const handleApplyAll = async () => {
    setApplyLoading(true);
    const prevValues = {
      minLow: internalMinLowPh,
      minHigh: internalMinHighPh,
      maxLow: internalMaxLowPh,
      maxHigh: internalMaxHighPh,
    };

    setInternalMinLowPh(minLowPhInput);
    setInternalMinHighPh(minHighPhInput);
    setInternalMaxLowPh(maxLowPhInput);
    setInternalMaxHighPh(maxHighPhInput);

    try {
      await Promise.all([
        publicApiPost(`mqtt/station1/ph/minlow/control/${minLowPhInput}`, {}),
        publicApiPost(`mqtt/station1/ph/minhigh/control/${minHighPhInput}`, {}),
        publicApiPost(`mqtt/station1/ph/maxlow/control/${maxLowPhInput}`, {}),
        publicApiPost(`mqtt/station1/ph/maxhigh/control/${maxHighPhInput}`, {}),
      ]);

      // Poll for full confirmation
      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/ph/status");
          const data = await res.json();
          if (
            data.success &&
            data.status &&
            data.status.phMinLow === minLowPhInput &&
            data.status.phMinHigh === minHighPhInput &&
            data.status.phMaxLow === maxLowPhInput &&
            data.status.phMaxHigh === maxHighPhInput
          ) {
            confirmed = true;
            setApplyLoading(false);
            message.success("All pH thresholds updated");
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 8000) {
          // Revert on timeout
          setInternalMinLowPh(prevValues.minLow);
          setInternalMinHighPh(prevValues.minHigh);
          setInternalMaxLowPh(prevValues.maxLow);
          setInternalMaxHighPh(prevValues.maxHigh);
          setMinLowPhInput(prevValues.minLow);
          setMinHighPhInput(prevValues.minHigh);
          setMaxLowPhInput(prevValues.maxLow);
          setMaxHighPhInput(prevValues.maxHigh);
          setApplyLoading(false);
          message.error("Failed to confirm pH threshold changes");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch {
      setInternalMinLowPh(prevValues.minLow);
      setInternalMinHighPh(prevValues.minHigh);
      setInternalMaxLowPh(prevValues.maxLow);
      setInternalMaxHighPh(prevValues.maxHigh);
      setMinLowPhInput(prevValues.minLow);
      setMinHighPhInput(prevValues.minHigh);
      setMaxLowPhInput(prevValues.maxLow);
      setMaxHighPhInput(prevValues.maxHigh);
      setApplyLoading(false);
      message.error("Failed to set pH thresholds");
    }
  };

  const hasChanges =
    minLowPhInput !== internalMinLowPh ||
    minHighPhInput !== internalMinHighPh ||
    maxLowPhInput !== internalMaxLowPh ||
    maxHighPhInput !== internalMaxHighPh;

  return (
    <div className="w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-500 text-2xl">
            <ExperimentOutlined />
          </span>
          <h2 className="text-xl font-extrabold text-gray-800">pH Control</h2>
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
            { label: "Tank 1", val: sensorValues.ph1 },
            { label: "Tank 2", val: sensorValues.ph2 },
            { label: "Tank 3", val: sensorValues.ph3 }
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-1.5" title={`${t.val ?? '--'} pH`}>
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
                  min={0}
                  max={14}
                  step={0.1}
                  value={minLowPhInput}
                  onChange={(v) => setMinLowPhInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">High</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  min={0}
                  max={14}
                  step={0.1}
                  value={minHighPhInput}
                  onChange={(v) => setMinHighPhInput(v ?? 0)}
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
                  min={0}
                  max={14}
                  step={0.1}
                  value={maxLowPhInput}
                  onChange={(v) => setMaxLowPhInput(v ?? 0)}
                  className="!w-full"
                  disabled={applyLoading}
                />
              </Spin>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">High</label>
              <Spin spinning={applyLoading} size="small">
                <InputNumber
                  min={0}
                  max={14}
                  step={0.1}
                  value={maxHighPhInput}
                  onChange={(v) => setMaxHighPhInput(v ?? 0)}
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
          className={`${hasChanges
              ? "!bg-green-600 hover:!bg-green-700"
              : ""
            }`}
        >
          Apply All
        </Button>
      </div>
    </div>
  );
};

export default PhControl;
