import React, { useState, useRef, useCallback, useEffect } from "react";
import PageTemplate from "../templates/PageTemplate2";
import GasEcDualChart from "../components/GasEcDualChart";
import Co2DiffChart from "../components/Co2DiffChart";
import { useDevice } from "../contexts/DeviceContext";
import { Card } from "antd";
import DatetimePicker from "../components/DatetimePicker";

const DeepAnalysisPage: React.FC = () => {
  const { selectedDeviceId } = useDevice();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const timeRangePickerRef = useRef<any>(null);

  const handleTimeRangeChange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  // กำหนดค่าเริ่มต้นเมื่อโหลด component
  useEffect(() => {
    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 7 * 60 * 60 * 1000); // +7 ชั่วโมง
    const defaultStart = new Date(defaultEnd.getTime() - 15 * 60 * 60 * 1000); // 15 ชั่วโมงก่อน

    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  }, []);

  return (
    <PageTemplate title="Deep Analysis" showDeviceSelector={true}>
      {/* 🔹 ตัวเลือกเวลารวม */}
      <div className="flex justify-end mb-4">
        <DatetimePicker
          ref={timeRangePickerRef}
          onTimeRangeChange={handleTimeRangeChange}
          startDate={startDate}
          endDate={endDate}
          color="#10b981"
        />
      </div>

      {/* 🔸 กราฟรวม */}
      <div className="grid grid-cols-1 gap-6 w-full">
        <Card
          className="glass-card card-accent-line card-hover-lift !rounded-2xl !w-full"
          bodyStyle={{ padding: 16 }}
          title={<div className="text-lg font-semibold">CO₂, SO₂ and EC</div>}
        >
          <GasEcDualChart
            deviceId={selectedDeviceId}
            startDate={startDate}
            endDate={endDate}
          />
        </Card>

        <Card
          className="glass-card card-accent-line card-hover-lift !rounded-2xl !w-full"
          bodyStyle={{ padding: 16 }}
          title={<div className="text-lg font-semibold">CO₂ Difference</div>}
        >
          <Co2DiffChart
            deviceId={selectedDeviceId}
            startDate={startDate}
            endDate={endDate}
          />
        </Card>
      </div>
    </PageTemplate>
  );
};

export default React.memo(DeepAnalysisPage);
