import React, { useState, useEffect } from "react";
import { Typography, Modal, Switch, Tooltip } from "antd";
import LineChart from "./LineChart";
import LineChartWithBrush from "./LineChartWithBrush";
import TimeRangePicker from "./TimeRangePicker";

const { Text } = Typography;

interface ChartPopupProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  field: string;
  field2?: string;
  field3?: string;
  field4?: string;
  title: string;
  unit: string;
  color: string;
  color2?: string;
  color3?: string;
  color4?: string;
  type: "single" | "double" | "triple" | "quad";
  yAxisTitle: string;
  startDate: Date;
  endDate: Date;
  dataLimit: number;
}

const ChartPopup: React.FC<ChartPopupProps> = ({
  isOpen,
  onClose,
  deviceId,
  field,
  field2,
  field3,
  field4,
  title,
  unit,
  color,
  color2,
  color3,
  color4,
  type,
  yAxisTitle,
  startDate: initialStartDate,
  endDate: initialEndDate,
  dataLimit,
}) => {
  const [popupStartDate, setPopupStartDate] = useState(initialStartDate);
  const [popupEndDate, setPopupEndDate] = useState(initialEndDate);
  const [showBrush, setShowBrush] = useState(false); // Toggle switch

  useEffect(() => {
    if (isOpen) {
      setPopupStartDate(initialStartDate);
      setPopupEndDate(initialEndDate);
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  const handleTimeRangeChange = (start: Date, end: Date) => {
    setPopupStartDate(start);
    setPopupEndDate(end);
  };

  return (
    <Modal
      title={`${title} Chart`}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{
        top: 0,
        padding: 0,
        margin: 0,
        maxWidth: "100%",
      }}
      // ลบ prop styles ที่ไม่ถูกต้องออก
    >
      <div className="w-full h-full flex flex-col" style={{ height: "calc(100vh - 55px)", overflow: "hidden", padding: 24 }}>
        <div className="flex justify-between items-center mb-4">
          <TimeRangePicker
            onTimeRangeChange={handleTimeRangeChange}
            startDate={popupStartDate}
            endDate={popupEndDate}
            color="#3B82F6"
          />
          <div className="ml-4">
            <Text strong className="text-gray-700">Brush Mode:</Text>
            <Tooltip title="Select Time Period">
              <Switch
                checked={showBrush}
                onChange={(checked) => setShowBrush(checked)}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                className="w-fit"
              />
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {showBrush ? (
            <LineChartWithBrush
              deviceId={deviceId}
              field={field}
              field2={field2}
              field3={field3}
              field4={field4}
              title={title}
              unit={unit}
              color={color}
              color2={color2}
              color3={color3}
              color4={color4}
              type={type}
              yAxisTitle={yAxisTitle}
              dataLimit={dataLimit}
              startDate={popupStartDate}
              endDate={popupEndDate}
            />
          ) : (
            <LineChart
              deviceId={deviceId}
              field={field}
              field2={field2}
              field3={field3}
              field4={field4}
              title={title}
              unit={unit}
              color={color}
              color2={color2}
              color3={color3}
              color4={color4}
              type={type}
              yAxisTitle={yAxisTitle}
              dataLimit={dataLimit}
              startDate={popupStartDate}
              endDate={popupEndDate}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChartPopup;
