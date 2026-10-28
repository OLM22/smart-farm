import React, { useState, useEffect } from "react";
import { Typography, Switch, InputNumber, Spin, Button, message } from "antd";
import { CloudOutlined } from "@ant-design/icons";
import { publicApiGet, publicApiPost } from "../api/publicApi";

const { Text } = Typography;

const Co2Control: React.FC = () => {
  const [internalAuto, setInternalAuto] = useState<"ON" | "OFF">("OFF");
  const [internalMinLow, setInternalMinLow] = useState<number>(400);
  const [internalMinHigh, setInternalMinHigh] = useState<number>(500);
  const [internalMaxLow, setInternalMaxLow] = useState<number>(1000);
  const [internalMaxHigh, setInternalMaxHigh] = useState<number>(1200);

  const [autoLoading, setAutoLoading] = useState(false);
  const [minLowLoading, setMinLowLoading] = useState(false);
  const [minHighLoading, setMinHighLoading] = useState(false);
  const [maxLowLoading, setMaxLowLoading] = useState(false);
  const [maxHighLoading, setMaxHighLoading] = useState(false);

  const [minLowInput, setMinLowInput] = useState<number>(internalMinLow);
  const [minHighInput, setMinHighInput] = useState<number>(internalMinHigh);
  const [maxLowInput, setMaxLowInput] = useState<number>(internalMaxLow);
  const [maxHighInput, setMaxHighInput] = useState<number>(internalMaxHigh);

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

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await publicApiGet("mqtt/gas/co2/status");
        const data = await res.json();
        if (data.success && data.status) {
          setInternalAuto(data.status.gasAuto === "ON" ? "ON" : "OFF");
          setInternalMinLow(data.status.co2MinLow);
          setInternalMinHigh(data.status.co2MinHigh);
          setInternalMaxLow(data.status.co2MaxLow);
          setInternalMaxHigh(data.status.co2MaxHigh);
          setMinLowInput(data.status.co2MinLow);
          setMinHighInput(data.status.co2MinHigh);
          setMaxLowInput(data.status.co2MaxLow);
          setMaxHighInput(data.status.co2MaxHigh);
        }
      } catch (error) {
        message.error("Failed to fetch CO₂ status.");
      }
    };
    fetchStatus();
  }, []);

  const handleAutoToggle = async (checked: boolean) => {
    const prev = internalAuto;
    const newStatus = checked ? "ON" : "OFF";
    setInternalAuto(newStatus);
    setAutoLoading(true);
    try {
      await publicApiPost(`mqtt/station1/gas/co2/auto/control/${newStatus}`, {});
      await pollConfirm(
        async () => {
          const res = await publicApiGet("mqtt/gas/co2/status");
          const data = await res.json();
          return data.success && data.status?.gasAuto === newStatus;
        },
        () => setInternalAuto(prev),
        setAutoLoading
      );
      message.success(`Auto mode set to ${newStatus}`);
    } catch {
      setInternalAuto(prev);
      setAutoLoading(false);
      message.error("Failed to set Auto mode");
    }
  };

  const createHandler = (
    label: string,
    key: string,
    value: number,
    inputValue: number,
    setInternal: (v: number) => void,
    setInput: (v: number) => void,
    setLoading: (b: boolean) => void
  ) => async () => {
    setLoading(true);
    const prev = value;
    setInternal(inputValue);
    try {
      await publicApiPost(`mqtt/station1/gas/co2/${key}/control/${inputValue}`, {});
      await pollConfirm(
        async () => {
          const res = await publicApiGet("mqtt/gas/co2/status");
          const data = await res.json();
          return data.success && data.status?.[`co2${key.charAt(0).toUpperCase() + key.slice(1)}`] === inputValue;
        },
        () => {
          setInternal(prev);
          setInput(prev);
          message.error(`Failed to confirm ${label}`);
        },
        setLoading
      );
      message.success(`${label} set to ${inputValue}`);
    } catch {
      setInternal(prev);
      setInput(prev);
      setLoading(false);
      message.error(`Failed to set ${label}`);
    }
  };

  return (
    <div className="w-full mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-green-400 text-2xl">
          <CloudOutlined />
        </span>
        <h2 className="text-xl font-bold text-gray-800">CO₂ Control (ppm)</h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Text strong className="text-gray-700">Auto:</Text>
        <Switch
          checked={internalAuto === "ON"}
          onChange={handleAutoToggle}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          disabled={autoLoading}
          loading={autoLoading}
          className="w-fit"
        />
        <Text type="secondary" className="text-sm text-gray-500 sm:ml-4 mt-2 sm:mt-0">
          {internalAuto === "ON" ? "Automatic CO₂ control enabled" : "Manual CO₂ adjustment"}
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: "minlow", label: "Min Low", value: internalMinLow,
            inputValue: minLowInput, setInternal: setInternalMinLow,
            setInput: setMinLowInput, loading: minLowLoading,
            setLoading: setMinLowLoading
          },
          {
            key: "minhigh", label: "Min High", value: internalMinHigh,
            inputValue: minHighInput, setInternal: setInternalMinHigh,
            setInput: setMinHighInput, loading: minHighLoading,
            setLoading: setMinHighLoading
          },
          {
            key: "maxlow", label: "Max Low", value: internalMaxLow,
            inputValue: maxLowInput, setInternal: setInternalMaxLow,
            setInput: setMaxLowInput, loading: maxLowLoading,
            setLoading: setMaxLowLoading
          },
          {
            key: "maxhigh", label: "Max High", value: internalMaxHigh,
            inputValue: maxHighInput, setInternal: setInternalMaxHigh,
            setInput: setMaxHighInput, loading: maxHighLoading,
            setLoading: setMaxHighLoading
          }
        ].map(({ key, label, value, inputValue, setInternal, setInput, loading, setLoading }) => (
          <div key={key} className="flex items-center gap-3 flex-wrap">
            <Text type="secondary">{label}:</Text>
            <Spin spinning={loading} size="small">
              <InputNumber
                value={inputValue}
                min={0}
                max={5000}
                onChange={(v) => setInput(v ?? 0)}
                className="w-full max-w-[80px]"
                disabled={loading}
              />
            </Spin>
            <Button
              type="primary"
              onClick={createHandler(label, key, value, inputValue, setInternal, setInput, setLoading)}
              loading={loading}
              disabled={loading}
              className="w-full max-w-[80px]"
            >
              Set
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Co2Control;