import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import LineChart from "../components/LineChart";
import ChartPopup from "../components/ChartPopup";
import PageTemplate from "../templates/PageTemplate2";
import { useDevice } from "../contexts/DeviceContext";
import TimeRangePicker from "../components/TimeRangePicker";
import {
  ExpandAltOutlined,
  FireOutlined,
  ExperimentOutlined,
  CloudOutlined,
  DashboardOutlined,

  RiseOutlined,
  FundOutlined,
  RadarChartOutlined,
  LineChartOutlined,
  DotChartOutlined,
  InteractionOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { Card, Button, Skeleton } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useAuthApi } from "../api/authApi";

dayjs.extend(utc);

// Memoized chart
const MemoizedLineChart = React.memo(LineChart);

// Sensor icons
const ICON_MAP: Record<string, JSX.Element> = {
  temperature: <FireOutlined />,
  co2temp: <FireOutlined />,
  co2humid: <LineChartOutlined />,
  reactorPh: <ExperimentOutlined />,
  co2tank: <CloudOutlined />,
  co2tube: <CloudOutlined />,
  co2: <CloudOutlined />,
  co2n78: <CloudOutlined />,
  co2n3031: <CloudOutlined />,
  co2water: <RiseOutlined />,
  do: <CloudOutlined />,
  PPFD: <BulbOutlined />,
  LUX: <BulbOutlined />,
  reactorEc: <DashboardOutlined />,

  o2: <RiseOutlined />,
  FlowRate: <FundOutlined />,
  FlowRateAcc: <RadarChartOutlined />,
  humidity: <LineChartOutlined />,
  reactorOrp: <DotChartOutlined />,
  reactorTds: <InteractionOutlined />,
  reactorPressure: <DashboardOutlined />,
};

// Chart Configs
const CHART_CONFIGS = {
  co2tank: {
    fields: ["sensor_co2_inflow_tank_1", "sensor_co2_inflow_tank_2", "sensor_co2_outflow_tank_1", "sensor_co2_outflow_tank_2"],
    title: "CO₂ Tank Levels",
    unit: " ppm",
    colors: ["#7d208eff", "#026d7bff", "#b52ecdff", "#029bb0ff"],
    yAxisTitle: "CO₂ Level (ppm)",
    type: "quad" as const,
  },
  co2tube: {
    fields: ["sensor_co2_inflow_tube_1", "sensor_co2_inflow_tube_2", "sensor_co2_outflow_tube_1", "sensor_co2_outflow_tube_2"],
    title: "CO₂ Tube Levels",
    unit: " ppm",
    colors: ["#b52ecdff", "#029bb0ff"],
    yAxisTitle: "CO₂ Level (ppm)",
    type: "quad" as const,
  },
  co2: {
    fields: ["sensor_co2_inflow", "sensor_co2_outflow"],
    title: "CO₂ Levels",
    unit: " ppm",
    colors: ["#9C27B0", "#00BCD4"],
    yAxisTitle: "CO₂ Level (ppm)",
    type: "double" as const,
  },
  co2n78: {
    fields: ["sensor_co2_inflow_n7", "sensor_co2_outflow_n8"],
    title: "CO₂ Inflow N7 - Outflow N8",
    unit: " ppm",
    colors: ["#9C27B0", "#00BCD4"],
    yAxisTitle: "CO₂ Level (ppm)",
    type: "double" as const,
  },
  co2n3031: {
    fields: ["sensor_co2_inflow_n30", "sensor_co2_outflow_n31"],
    title: "CO₂ Inflow N30 - Outflow N31",
    unit: " ppm",
    colors: ["#9C27B0", "#00BCD4"],
    yAxisTitle: "CO₂ Level (ppm)",
    type: "double" as const,
  },
  co2water: {
    fields: ["sensor_co2_water"],
    title: "CO₂ Water",
    unit: "",
    colors: ["#6366F1"],
    yAxisTitle: "CO₂ Water",
    type: "single" as const,
  },
  co2temp: {
    fields: ["sensor_co2_inflow_temp", "sensor_co2_outflow_temp", "sensor_temp_reactor"],
    title: "CO₂ Temperature",
    unit: " °C",
    colors: ["#FF4B4B", "#4ECDC4", "#F59E0B"],
    yAxisTitle: "CO₂ Temperature (°C)",
    type: "triple" as const,
  },
  co2humid: {
    fields: ["sensor_co2_inflow_humid", "sensor_co2_outflow_humid"],
    title: "CO₂ Humidity",
    unit: "%",
    colors: ["#4CAF50", "#FFD700"],
    yAxisTitle: "CO₂ Humidity (%)",
    type: "double" as const,
  },
  do: {
    fields: ["sensor_do_intube1"],
    title: "Disolve Oxygen",
    unit: "mg/l",
    colors: ["#4CAF50"],
    yAxisTitle: "Disolve Oxygen",
    type: "single" as const,
  },
  temperature: {
    fields: ["sensor_temp_inflow", "sensor_temp_outflow", "sensor_temp_reactor"],
    title: "Temperature",
    unit: "°C",
    colors: ["#FF4B4B", "#4ECDC4", "#F59E0B"],
    yAxisTitle: "Temperature (°C)",
    type: "triple" as const,
  },
  reactorPh: {
    fields: ["sensor_ph_reactor"],
    title: "Reactor pH",
    unit: "",
    colors: ["#6366F1"],
    yAxisTitle: "pH Level",
    type: "single" as const,
  },
  PPFD: {
    fields: ["sensor_ppfd_reactor"],
    title: "PPFD Reactor",
    unit: " mole/sec^2",
    colors: ["#f8db00ff"],
    yAxisTitle: "PPFD (mole/sec^2)",
    type: "single" as const,
  },
  LUX: {
    fields: ["sensor_lux_reactor"],
    title: "LUX Reactor",
    unit: " mole/sec^2",
    colors: ["#f8db00ff"],
    yAxisTitle: "LUX (mole/sec^2)",
    type: "single" as const,
  },
  reactorEc: {
    fields: ["sensor_ec_reactor"],
    title: "Reactor EC",
    unit: " mS/cm",
    colors: ["#EAB308"],
    yAxisTitle: "EC (mS/cm)",
    type: "single" as const,
  },
  o2: {
    fields: ["sensor_o2_inflow", "sensor_o2_outflow"],
    title: "O₂ Levels",
    unit: "%",
    colors: ["#E91E63", "#673AB7"],
    yAxisTitle: "O₂ Level (%)",
    type: "double" as const,
  },
  FlowRate: {
    fields: ["sensor_co2_flow_rate"],
    title: "CO₂ Flow Rate",
    unit: " mL/min",
    colors: ["#9C27B0"],
    yAxisTitle: "Flow Rate (mL/min)",
    type: "single" as const,
  },
  FlowRateAcc: {
    fields: ["sensor_co2_flow_rate_acc"],
    title: "Acc. CO₂ Flow Rate",
    unit: " m^3",
    colors: ["#9C27B0"],
    yAxisTitle: "Acc. Flow Rate (m^3)",
    type: "single" as const,
  },
  humidity: {
    fields: ["sensor_humid_inflow", "sensor_humid_outflow"],
    title: "Humidity",
    unit: "%",
    colors: ["#4CAF50", "#FFD700"],
    yAxisTitle: "Humidity (%)",
    type: "double" as const,
  },
  reactorOrp: {
    fields: ["sensor_orp_reactor"],
    title: "Reactor ORP",
    unit: " mV",
    colors: ["#DB2777"],
    yAxisTitle: "ORP (mV)",
    type: "single" as const,
  },
  reactorTds: {
    fields: ["sensor_tds_reactor"],
    title: "Reactor TDS",
    unit: " NTU",
    colors: ["#14B8A6"],
    yAxisTitle: "TDS (NTU)",
    type: "single" as const,
  },
  reactorPressure: {
    fields: ["sensor_pressure_reactor"],
    title: "Reactor Pressure",
    unit: " mbar",
    colors: ["#8B5CF6"],
    yAxisTitle: "Pressure (mbar)",
    type: "single" as const,
  },
};

const OverviewPage: React.FC = () => {
  const { selectedDeviceId } = useDevice();
  const authApi = useAuthApi();

  const [startDate, setStartDate] = useState(() =>
    dayjs.utc().startOf("day").toDate()
  );
  const [endDate, setEndDate] = useState(() => dayjs.utc().toDate());
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const timeRangePickerRef = useRef<any>(null);

  // แสดงเฉพาะการ์ดที่มีข้อมูล
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // กันการยิงซ้ำ/ชนกัน
  const inflightRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (timeRangePickerRef.current?.selectPreset) {
      timeRangePickerRef.current.selectPreset("today");
    }
  }, []);

  const handleTimeRangeChange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const chartConfigs = useMemo(() => {
    return Object.entries(CHART_CONFIGS).map(([key, config]) => ({
      key,
      ...config,
      deviceId: selectedDeviceId ?? "",
      dataLimit: 50,
      field: config.fields[0],
      field2: config.fields[1],
      field3: config.fields[2],
      field4: config.fields[3],
      color: config.colors[0],
      color2: config.colors[1],
      color3: config.colors[2],
      color4: config.colors[3],
      startDate,
      endDate,
    }));
  }, [selectedDeviceId, startDate, endDate]);

  // ตรวจว่ามีข้อมูลจริงหรือไม่ ด้วย filter-multi
  const checkHasData = useCallback(async () => {
    if (!selectedDeviceId || inflightRef.current) return;

    inflightRef.current = true;
    const mySeq = ++seqRef.current;

    try {
      const results = await Promise.all(
        chartConfigs.map(async (cfg) => {
          const collections = cfg.fields.join(",");
          const qs = new URLSearchParams({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            device_id: selectedDeviceId,
          });

          try {
            const resp = await authApi(
              `sensor-data/filter-multi/${collections}?${qs.toString()}`
            );
            const data = await resp.json();
            const anyData = cfg.fields.some(
              (f) => Array.isArray((data as any)[f]) && (data as any)[f].length > 0
            );
            return { key: cfg.key, ok: anyData };
          } catch {
            return { key: cfg.key, ok: false };
          }
        })
      );

      if (mySeq !== seqRef.current) return;
      setVisibleKeys(results.filter((r) => r.ok).map((r) => r.key));
    } finally {
      inflightRef.current = false;
      setInitialLoading(false); // โหลดครั้งแรกเสร็จแล้ว
    }
  }, [authApi, selectedDeviceId, startDate, endDate, chartConfigs]);

  // เรียกเมื่อ dependencies สำคัญเปลี่ยน
  useEffect(() => {
    checkHasData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, startDate.getTime(), endDate.getTime()]);

  // ---- Skeleton card (สำหรับช่วงโหลดแรก) ----
  const SkeletonCard: React.FC = () => (
    <Card className="glass-card !rounded-2xl" bodyStyle={{ padding: "8px 12px" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <Skeleton.Input active size="small" style={{ width: 180 }} />
        <Skeleton.Button active size="small" />
      </div>
      <div>
        <Skeleton active title={false} paragraph={{ rows: 8 }} />
      </div>
    </Card>
  );

  const skeletonCount = Math.min(9, Object.keys(CHART_CONFIGS).length);

  return (
    <PageTemplate title="Overview Dashboard" showDeviceSelector={true}>
      <div className="flex justify-end mb-2">
        <TimeRangePicker
          ref={timeRangePickerRef}
          onTimeRangeChange={handleTimeRangeChange}
          startDate={startDate}
          endDate={endDate}
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialLoading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={`sk-${i}`} />
          ))
          : visibleKeys.length === 0
            ? (
              <div className="col-span-full flex justify-center py-8 text-gray-400">
                No charts have data for this range.
              </div>
            )
            : chartConfigs
              .filter((c) => visibleKeys.includes(c.key))
              .map((config) => (
                <Card
                  key={config.key}
                  className="glass-card card-accent-line card-hover-lift !rounded-2xl"
                  bodyStyle={{ padding: "12px 16px" }}
                  title={
                    <div className="flex items-center gap-1 font-medium text-base font-bold leading-tight">
                      {ICON_MAP[config.key] ?? null} {config.title}
                    </div>
                  }
                  extra={
                    <Button
                      type="text"
                      icon={<ExpandAltOutlined style={{ fontSize: 16 }} />}
                      onClick={() => setSelectedChart(config.key)}
                      title="Expand Chart"
                      style={{ color: "#10b981", borderColor: "#10b981" }}
                      className="hover:text-green-800 hover:border-green-800 hover:bg-gray-100 transition-colors rounded"
                    />
                  }
                >
                  <div className="leading-none">
                    <MemoizedLineChart
                      deviceId={config.deviceId}
                      field={config.field}
                      field2={config.field2}
                      field3={config.field3}
                      field4={config.field4}
                      title={config.title}
                      unit={config.unit}
                      color={config.color}
                      color2={config.color2}
                      color3={config.color3}
                      color4={config.color4}
                      type={config.type}
                      yAxisTitle={config.yAxisTitle}
                      dataLimit={config.dataLimit}
                      startDate={config.startDate}
                      endDate={config.endDate}
                    />
                  </div>

                  <ChartPopup
                    isOpen={selectedChart === config.key}
                    onClose={() => setSelectedChart(null)}
                    deviceId={config.deviceId}
                    field={config.field}
                    field2={config.field2}
                    field3={config.field3}
                    field4={config.field4}
                    title={config.title}
                    unit={config.unit}
                    color={config.color}
                    color2={config.color2}
                    color3={config.color3}
                    color4={config.color4}
                    type={config.type}
                    yAxisTitle={config.yAxisTitle}
                    startDate={config.startDate}
                    endDate={config.endDate}
                    dataLimit={100}
                  />
                </Card>
              ))}
      </div>
    </PageTemplate>
  );
};

export default React.memo(OverviewPage);
