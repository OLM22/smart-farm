import { useImperativeHandle, forwardRef } from "react";
import { DatePicker, Space, Button } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";

// Enable UTC plugin for dayjs
dayjs.extend(utc);

interface TimeRangePickerProps {
  onTimeRangeChange: (start: Date, end: Date) => void;
  startDate: Date;
  endDate: Date;
  color?: string;
  hidePresets?: boolean;
}

const DatetimePicker = forwardRef(function TimeRangePicker(
  {
    onTimeRangeChange,
    startDate,
    endDate,
    color = "#3B82F6",
    hidePresets = false,
  }: TimeRangePickerProps,
  ref
) {
  const handlePresetClick = (preset: string) => {
    // Get current local time
    const now = dayjs();
    let start: dayjs.Dayjs;

    switch (preset) {
      case "today":
        start = now.startOf("day");
        break;
      case "6h":
        start = now.subtract(6, "hour");
        break;
      case "12h":
        start = now.subtract(12, "hour");
        break;
      case "24h":
        start = now.subtract(24, "hour");
        break;
      default:
        return;
    }

    // Convert local time to UTC while preserving the exact time
    // For example, if local time is 14:00, it will be sent as 14:00 UTC
    const localToUTC = (date: dayjs.Dayjs) => {
      const localTime = date.format("YYYY-MM-DD HH:mm:ss");
      return dayjs.utc(localTime);
    };

    onTimeRangeChange(localToUTC(start).toDate(), localToUTC(now).toDate());
  };

  const presets = [
    { label: "Today", value: "today" },
    { label: "Last 6h", value: "6h" },
    { label: "Last 12h", value: "12h" },
    { label: "Last 24h", value: "24h" },
  ];

  // Use UTC dates for display and selection
  const displayStartDate = dayjs.utc(startDate);
  const displayEndDate = dayjs.utc(endDate);

  // Expose selectPreset method to parent
  useImperativeHandle(ref, () => ({
    selectPreset: (preset: string) => handlePresetClick(preset),
  }));

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
      { !hidePresets && (
        <Space wrap className="mb-2 sm:mb-0">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              size="small"
              onClick={() => handlePresetClick(preset.value)}
              className="px-3 py-3 text-base font-medium text-white"
              style={{
                backgroundColor: color,
                borderRadius: 6,
                boxShadow: "none",
                color: "#fff",
                border: "none",
              }}
            >
              {preset.label}
            </Button>
          ))}
        </Space>
      )}
      <div className="w-full sm:w-auto">
        <DatePicker.RangePicker
          showTime
          value={[displayStartDate, displayEndDate]}
          onChange={(dates) => {
            if (dates) {
              const [start, end] = dates;
              if (start && end) {
                // Use UTC time directly
                onTimeRangeChange(start.toDate(), end.toDate());
              }
            }
          }}
          format="YYYY-MM-DD HH:mm"
          className="w-full sm:w-[320px] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          popupClassName="custom-range-picker"
          suffixIcon={<CalendarOutlined className="text-gray-500" />}
          separator={<ClockCircleOutlined className="text-gray-500" />}
        />
      </div>
    </div>
  );
});

export default DatetimePicker;
