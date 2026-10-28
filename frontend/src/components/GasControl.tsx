import React, { useState, useEffect } from "react";
import { Switch, InputNumber, Button, Spin, message } from "antd";
import { CloudOutlined, SaveOutlined } from "@ant-design/icons";
import { publicApiGet, publicApiPost } from "../api/publicApi";

const GasControl: React.FC = () => {
  // Internal states
  const [internalAuto, setInternalAuto] = useState<"ON" | "OFF">("OFF");
  const [internalCo2MinLow, setInternalCo2MinLow] = useState<number>(0);
  const [internalCo2MinHigh, setInternalCo2MinHigh] = useState<number>(10);
  const [internalCo2MaxLow, setInternalCo2MaxLow] = useState<number>(90);
  const [internalCo2MaxHigh, setInternalCo2MaxHigh] = useState<number>(100);
  const [sensorValues, setSensorValues] = useState<any>({});

  // Loading states
  const [autoLoading, setAutoLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  // Input states
  const [co2MinLowInput, setCo2MinLowInput] =
    useState<number>(internalCo2MinLow);
  const [co2MinHighInput, setCo2MinHighInput] =
    useState<number>(internalCo2MinHigh);
  const [co2MaxLowInput, setCo2MaxLowInput] =
    useState<number>(internalCo2MaxLow);
  const [co2MaxHighInput, setCo2MaxHighInput] =
    useState<number>(internalCo2MaxHigh);

  // Fetch initial state
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await publicApiGet("mqtt/gas/status");
        const data = await res.json();
        if (data.success && data.status) {
          setInternalAuto(data.status.gasAuto === "ON" ? "ON" : "OFF");
          setInternalCo2MinLow(data.status.co2MinLow);
          setInternalCo2MinHigh(data.status.co2MinHigh);
          setInternalCo2MaxLow(data.status.co2MaxLow);
          setInternalCo2MaxHigh(data.status.co2MaxHigh);
          setCo2MinLowInput(data.status.co2MinLow);
          setCo2MinHighInput(data.status.co2MinHigh);
          setCo2MaxLowInput(data.status.co2MaxLow);
          setCo2MaxHighInput(data.status.co2MaxHigh);
        }
      } catch { }
    };
    fetchStatus();
  }, []);

  // Poll sensor values for status
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

  const getGlobalColor = (tankValue: number | null | undefined) => {
    if (internalAuto === "OFF" || tankValue === null || tankValue === undefined) return "bg-gray-300"; // Gray

    // Sort boundaries dynamically to handle custom user inputs safely
    const lowBoundaryMin = Math.min(internalCo2MinLow, internalCo2MaxLow);
    const lowBoundaryMax = Math.max(internalCo2MinLow, internalCo2MaxLow);
    const highBoundaryMin = Math.min(internalCo2MinHigh, internalCo2MaxHigh);
    const highBoundaryMax = Math.max(internalCo2MinHigh, internalCo2MaxHigh);

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

  // Auto toggle
  const handleAutoToggle = async (checked: boolean) => {
    setAutoLoading(true);
    const prev = internalAuto;
    const newStatus = checked ? "ON" : "OFF";
    setInternalAuto(newStatus);
    try {
      await publicApiPost(`mqtt/station1/gas/auto/control/${newStatus}`, {});
      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/gas/status");
          const data = await res.json();
          if (
            data.success &&
            data.status &&
            data.status.gasAuto === newStatus
          ) {
            confirmed = true;
            setInternalAuto(newStatus);
            setAutoLoading(false);
            message.success(`CO₂ mode set to ${checked ? "Auto" : "Manual"}`);
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 5000) {
          setInternalAuto(prev);
          setAutoLoading(false);
          message.error("Failed to set CO₂ mode");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch {
      setInternalAuto(prev);
      setAutoLoading(false);
      message.error("Failed to set CO₂ mode");
    }
  };

  // Apply All handler
  const handleApplyAll = async () => {
    setApplyLoading(true);
    const prevValues = {
      minLow: internalCo2MinLow,
      minHigh: internalCo2MinHigh,
      maxLow: internalCo2MaxLow,
      maxHigh: internalCo2MaxHigh,
    };

    setInternalCo2MinLow(co2MinLowInput);
    setInternalCo2MinHigh(co2MinHighInput);
    setInternalCo2MaxLow(co2MaxLowInput);
    setInternalCo2MaxHigh(co2MaxHighInput);

    try {
      await Promise.all([
        publicApiPost(
          `mqtt/station1/gas/co2/minlow/control/${co2MinLowInput}`,
          {}
        ),
        publicApiPost(
          `mqtt/station1/gas/co2/minhigh/control/${co2MinHighInput}`,
          {}
        ),
        publicApiPost(
          `mqtt/station1/gas/co2/maxlow/control/${co2MaxLowInput}`,
          {}
        ),
        publicApiPost(
          `mqtt/station1/gas/co2/maxhigh/control/${co2MaxHighInput}`,
          {}
        ),
      ]);

      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const res = await publicApiGet("mqtt/gas/status");
          const data = await res.json();
          if (
            data.success &&
            data.status &&
            data.status.co2MinLow === co2MinLowInput &&
            data.status.co2MinHigh === co2MinHighInput &&
            data.status.co2MaxLow === co2MaxLowInput &&
            data.status.co2MaxHigh === co2MaxHighInput
          ) {
            confirmed = true;
            setApplyLoading(false);
            message.success("All CO₂ thresholds updated");
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 8000) {
          setInternalCo2MinLow(prevValues.minLow);
          setInternalCo2MinHigh(prevValues.minHigh);
          setInternalCo2MaxLow(prevValues.maxLow);
          setInternalCo2MaxHigh(prevValues.maxHigh);
          setCo2MinLowInput(prevValues.minLow);
          setCo2MinHighInput(prevValues.minHigh);
          setCo2MaxLowInput(prevValues.maxLow);
          setCo2MaxHighInput(prevValues.maxHigh);
          setApplyLoading(false);
          message.error("Failed to confirm CO₂ threshold changes");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch {
      setInternalCo2MinLow(prevValues.minLow);
      setInternalCo2MinHigh(prevValues.minHigh);
      setInternalCo2MaxLow(prevValues.maxLow);
      setInternalCo2MaxHigh(prevValues.maxHigh);
      setCo2MinLowInput(prevValues.minLow);
      setCo2MinHighInput(prevValues.minHigh);
      setCo2MaxLowInput(prevValues.maxLow);
      setCo2MaxHighInput(prevValues.maxHigh);
      setApplyLoading(false);
      message.error("Failed to set CO₂ thresholds");
    }
  };

  const hasChanges =
    co2MinLowInput !== internalCo2MinLow ||
    co2MinHighInput !== internalCo2MinHigh ||
    co2MaxLowInput !== internalCo2MaxLow ||
    co2MaxHighInput !== internalCo2MaxHigh;

  return (
    <div className="w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-green-500 text-2xl">
            <CloudOutlined />
          </span>
          <h2 className="text-xl font-extrabold text-gray-800">
            CO₂ Control
            <span className="text-sm font-medium text-gray-400 ml-1.5">
              ppm
            </span>
          </h2>
        </div>
      </div>

      {/* Auto Mode Toggle */}
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

      {/* Global Status */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-semibold text-gray-600">Status:</span>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5" title={`${sensorValues.co2 ?? '--'} ppm`}>
            <span className={`w-3 h-3 rounded-full transition-colors duration-300 ${getGlobalColor(sensorValues.co2)}`} />
            <span className="text-xs font-medium text-gray-500">Global (Room)</span>
          </div>
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
                  value={co2MinLowInput}
                  onChange={(v) => setCo2MinLowInput(v ?? 0)}
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
                  value={co2MinHighInput}
                  onChange={(v) => setCo2MinHighInput(v ?? 0)}
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
                  value={co2MaxLowInput}
                  onChange={(v) => setCo2MaxLowInput(v ?? 0)}
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
                  value={co2MaxHighInput}
                  onChange={(v) => setCo2MaxHighInput(v ?? 0)}
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

export default GasControl;
