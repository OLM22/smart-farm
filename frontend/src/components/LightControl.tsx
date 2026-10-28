import React, { useState, useEffect } from "react";
import { Switch, message, Button, TimePicker, InputNumber } from "antd";
import { BulbOutlined, PlusOutlined, MinusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { publicApiGet, publicApiPost } from "../api/publicApi";

interface LightControlProps {
  timerEnabled?: boolean;
  timerRange?: { start: Date; end: Date } | null;
  onTimerChange?: (start: Date | null, end: Date | null) => void;
}

const DAYS = [
  { key: "Mon", label: "Mon" },
  { key: "Tue", label: "Tue" },
  { key: "Wed", label: "Wed" },
  { key: "Thu", label: "Thu" },
  { key: "Fri", label: "Fri" },
  { key: "Sat", label: "Sat" },
  { key: "Sun", label: "Sun" },
];

interface LightSchedule {
  start: string; // "HH:mm"
  duration: number;
  days: string[];
}

const LightControl: React.FC<LightControlProps> = () => {
  const [setTimeEnabled, setSetTimeEnabled] = useState(false);
  const [setTimeLoading, setSetTimeLoading] = useState(false);

  // Array of schedules for editing
  const [schedules, setSchedules] = useState<LightSchedule[]>([
    { start: "08:00", duration: 8, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }
  ]);

  // Stored schedules from backend
  const [savedSchedules, setSavedSchedules] = useState<LightSchedule[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      setSetTimeLoading(true);
      try {
        const res = await publicApiGet("mqtt/light/status");
        const data = await res.json();
        if (data.success && data.status) {
          if (typeof data.status.lightTimerEnabled === "string") {
            setSetTimeEnabled(data.status.lightTimerEnabled === "ON");
          }

          if (data.status.lightSchedules && data.status.lightSchedules.length > 0) {
            setSavedSchedules(data.status.lightSchedules);
            setSchedules(data.status.lightSchedules);
          } else if (data.status.lightStart && data.status.lightDuration) {
            // Fallback for legacy data
            const fallback: LightSchedule = {
              start: data.status.lightStart,
              duration: parseFloat(data.status.lightDuration),
              days: data.status.lightDays ? data.status.lightDays.split(",").filter(Boolean) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            };
            setSavedSchedules([fallback]);
            setSchedules([fallback]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch light status", error);
      } finally {
        setSetTimeLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const toggleDay = (index: number, day: string) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      const sched = newSchedules[index];
      if (sched.days.includes(day)) {
        sched.days = sched.days.filter(d => d !== day);
      } else {
        sched.days = [...sched.days, day];
      }
      return newSchedules;
    });
  };

  const updateSchedule = (index: number, field: keyof LightSchedule, value: any) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      return newSchedules;
    });
  };

  const addSchedule = () => {
    if (schedules.length >= 5) return;
    setSchedules(prev => [...prev, { start: "08:00", duration: 8, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }]);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length <= 1) return;
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetTimer = async () => {
    // Validation
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.start) {
        message.warning(`Please select a start time for Schedule ${i + 1}`);
        return;
      }
      if (s.days.length === 0) {
        message.warning(`Please select at least 1 day for Schedule ${i + 1}`);
        return;
      }
    }

    // Sort days
    const dayOrder = DAYS.map((d) => d.key);
    const sortedSchedules = schedules.map(s => {
      const sortedDays = s.days.slice().sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      return { ...s, days: sortedDays };
    });

    try {
      const payloadStr = encodeURIComponent(JSON.stringify(sortedSchedules));
      const res = await publicApiPost(`mqtt/station1/light/schedules/control/${payloadStr}`, {});

      if (!res.ok) throw new Error("Failed to set timer");

      // Poll for confirmation
      let elapsed = 0;
      let confirmed = false;
      const poll = async () => {
        try {
          const statusRes = await publicApiGet("mqtt/light/status");
          const data = await statusRes.json();
          if (data.success && data.status && data.status.lightSchedules) {
            // Just check if we received lightSchedules back
            confirmed = true;
            setSavedSchedules(sortedSchedules);
            setSchedules(sortedSchedules);
            message.success("Timer schedules set successfully");
            return;
          }
        } catch { }
        elapsed += 500;
        if (elapsed >= 5000) {
          message.error("Failed to confirm timer schedules");
        } else if (!confirmed) {
          setTimeout(poll, 500);
        }
      };
      setTimeout(poll, 500);
    } catch (error) {
      message.error("Failed to set timer schedules");
      console.error(error);
    }
  };

  const buildTimerSummary = () => {
    if (savedSchedules.length === 0) return null;
    return savedSchedules.map((s, i) => {
      const dayLabels = s.days.map(k => {
        const found = DAYS.find(d => d.key === k);
        return found ? found.label : k;
      }).join(" ");
      return `[${i + 1}] Starts ${s.start} / ${s.duration} hrs / ${dayLabels}`;
    }).join(" | ");
  };

  return (
    <div className="w-full glass-card card-accent-line card-hover-lift !rounded-2xl p-5 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-yellow-500 text-2xl">
          <BulbOutlined />
        </span>
        <h2 className="text-xl font-extrabold text-gray-800">Light Control</h2>
      </div>

      {/* Set Time Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-semibold text-gray-600">Timer:</span>
        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200">
          <Switch
            checked={setTimeEnabled}
            onChange={async (checked) => {
              const command = checked ? "ON" : "OFF";
              const prevValue = setTimeEnabled;
              setSetTimeLoading(true);
              setSetTimeEnabled(checked);
              try {
                const response = await publicApiPost(`mqtt/station1/light/timer/control/${command}`, {});
                if (!response.ok) throw new Error("Failed to send timer command");
                
                let elapsed = 0;
                let confirmed = false;
                const poll = async () => {
                  try {
                    const res = await publicApiGet("mqtt/light/status");
                    const data = await res.json();
                    if (data.success && data.status && data.status.lightTimerEnabled === command) {
                      confirmed = true;
                      setSetTimeEnabled(command === "ON");
                      setSetTimeLoading(false);
                      message.success(`Timer turned ${command}`);
                      return;
                    }
                  } catch { }
                  elapsed += 500;
                  if (elapsed >= 5000) {
                    setSetTimeEnabled(prevValue);
                    setSetTimeLoading(false);
                    message.error("Failed to set timer status");
                  } else if (!confirmed) {
                    setTimeout(poll, 500);
                  }
                };
                setTimeout(poll, 500);
              } catch (error) {
                setSetTimeEnabled(prevValue);
                setSetTimeLoading(false);
                message.error("Failed to set timer status");
                console.error(error);
              }
            }}
            checkedChildren="ON"
            unCheckedChildren="OFF"
            className={setTimeEnabled ? "!bg-green-500" : ""}
            loading={setTimeLoading}
            style={{ minWidth: 56 }}
          />
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${setTimeEnabled
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
            }`}
        >
          {setTimeEnabled ? "● Enabled" : "○ Disabled"}
        </span>
      </div>

      {/* Timer Schedules */}
      {setTimeEnabled && (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-3">
          {schedules.map((schedule, index) => (
            <div key={index} className="bg-yellow-50/60 border border-yellow-100 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs font-bold text-yellow-700 uppercase tracking-wider">
                  Timer Schedule {index + 1}
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="default" 
                    size="small" 
                    icon={<MinusOutlined />} 
                    disabled={schedules.length <= 1}
                    onClick={() => removeSchedule(index)}
                    title="Remove Schedule"
                  />
                  {index === schedules.length - 1 && (
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<PlusOutlined />} 
                      disabled={schedules.length >= 5}
                      onClick={addSchedule}
                      title="Add Schedule"
                    />
                  )}
                </div>
              </div>

              {/* Start Time & Duration */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    ⏰ Start Time
                  </label>
                  <TimePicker
                    value={schedule.start ? dayjs(schedule.start, "HH:mm") : null}
                    onChange={(val) => updateSchedule(index, "start", val ? val.format("HH:mm") : "")}
                    format="HH:mm"
                    className="w-full"
                    size="middle"
                    minuteStep={5}
                    placeholder="Select time"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    ⏱️ Duration (hrs)
                  </label>
                  <InputNumber
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={schedule.duration}
                    onChange={(val) => updateSchedule(index, "duration", val ?? 1)}
                    className="w-full"
                    size="middle"
                    addonAfter="hrs"
                  />
                </div>
              </div>

              {/* Day-of-week selector */}
              <div className="mb-2">
                <label className="text-xs font-semibold text-gray-500 mb-2 block">
                  📅 Scheduled Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(({ key, label }) => {
                    const active = schedule.days.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDay(index, key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer ${active
                          ? "bg-yellow-400 border-yellow-500 text-white shadow-sm"
                          : "bg-white border-gray-300 text-gray-500 hover:border-yellow-400 hover:text-yellow-600"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Set Timer button */}
          <div className="flex justify-end pt-2">
            <Button type="primary" onClick={handleSetTimer}>
              Save All Schedules
            </Button>
          </div>
        </div>
      )}

      {/* Timer status summary */}
      <div className="mt-auto pt-2 border-t border-gray-100">
        {buildTimerSummary() ? (
          <div className="text-xs text-gray-400 break-words whitespace-normal line-clamp-2" title={buildTimerSummary()!}>
            <span className="font-semibold">Timer:</span> {buildTimerSummary()}
          </div>
        ) : (
          <span className="text-xs text-gray-400">No timer set</span>
        )}
      </div>
    </div>
  );
};

export default LightControl;
