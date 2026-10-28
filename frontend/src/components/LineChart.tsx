import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuthApi } from "../api/authApi";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface DataPoint {
  time: string;
  value?: number;
  value1?: number;
  value2?: number;
  value3?: number;
  value4?: number;
  rawTimestamp?: string;
  timestampMs?: number;
}

type AverageValue =
  | string
  | {
      in: string;
      in2?: string;     
      out: string;
      out2?: string;  
      reactor?: string;   // (ยังใช้กับ triple ได้)
    };

interface LineChartProps {
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
  dataLimit: number;
  startDate: Date;
  endDate: Date;
  loading?: boolean;
  error?: string | null;
}

const LineChart: React.FC<LineChartProps> = ({
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
  dataLimit,
  startDate,
  endDate,
  loading: initialLoading = false,
  error: initialError = null,
}) => {
  const authApi = useAuthApi();
  const [chartId] = useState(`chart-${Math.floor(Math.random() * 1000)}`);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [allData, setAllData] = useState<DataPoint[]>([]);
  const [windowStart, setWindowStart] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isFlowRate = useMemo(() => {
    return [
      "sensor_co2_flow_rate",
      "sensor_co2_flow_rate_acc",
      "sensor_so2_flow_rate",
      "sensor_so2_flow_rate_acc",
    ].includes(field) || [
      "sensor_co2_flow_rate",
      "sensor_co2_flow_rate_acc",
      "sensor_so2_flow_rate",
      "sensor_so2_flow_rate_acc",
    ].includes(field2 ?? "");
  }, [field, field2]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    timeoutRef.current = setTimeout(() => {
      const fetchData = async () => {
        if (!deviceId) return;
        setLoading(true);
        try {
          let processedData: DataPoint[] = [];

          const collections = [
            field,
            type !== "single" ? field2 : undefined,
            type === "triple" || type === "quad" ? field3 : undefined,
            type === "quad" ? field4 : undefined,
          ].filter(Boolean) as string[];


          const url = `sensor-data/filter-multi/${collections.join(",")}?` +
            new URLSearchParams({
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              device_id: deviceId,
            });

          const response = await authApi(url, {
            signal: abortControllerRef.current?.signal,
          });
          const responseData = await response.json();

          if (type === "single") {
            processedData = (responseData[field] || [])
              .map((item: any) => ({
                time: item.timestamp,
                value: Number(item.value),
                rawTimestamp: item.timestamp,
                timestampMs: new Date(item.timestamp).getTime(),
              }))
              .sort((a: DataPoint, b: DataPoint) => a.timestampMs! - b.timestampMs!);
          } else {

            const value1Map = new Map<number, number>(
              (responseData[field] || []).map((item: any) => [
                new Date(item.timestamp).getTime(),
                Number(item.value),
              ])
            );

            const value2Map = field2
              ? new Map<number, number>(
                  (responseData[field2] || []).map((item: any) => [
                    new Date(item.timestamp).getTime(),
                    Number(item.value),
                  ])
                )
              : new Map<number, number>();

            const value3Map =
              (type === "triple" || type === "quad") && field3
                ? new Map<number, number>(
                    (responseData[field3] || []).map((item: any) => [
                      new Date(item.timestamp).getTime(),
                      Number(item.value),
                    ])
                  )
                : new Map<number, number>();

            const value4Map =
              type === "quad" && field4
                ? new Map<number, number>(
                    (responseData[field4] || []).map((item: any) => [
                      new Date(item.timestamp).getTime(),
                      Number(item.value),
                    ])
                  )
                : new Map<number, number>();

            const allTimestamps = new Set([
              ...value1Map.keys(),
              ...value2Map.keys(),
              ...value3Map.keys(),
              ...value4Map.keys(),
            ]);

            processedData = Array.from(allTimestamps)
              .map((timestampMs) => ({
                time: new Date(timestampMs).toISOString(),
                value1: value1Map.get(timestampMs) ?? 0,
                value2: value2Map.get(timestampMs) ?? 0,
                value3: value3Map.get(timestampMs) ?? 0,
                value4: value4Map.get(timestampMs) ?? 0,
                rawTimestamp: new Date(timestampMs).toISOString(),
                timestampMs,
              }))
              .sort((a, b) => a.timestampMs! - b.timestampMs!);
         
          }

          setAllData(processedData);
          setWindowStart(Math.max(0, processedData.length - dataLimit));
          setError(null);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            setError("Failed to fetch data");
            console.error("Error fetching chart data:", err);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [deviceId, startDate, endDate, field, field2, field3, field4, type, dataLimit]);


  const yValues = useMemo(() => {
    if (type === "single") return allData.map((d) => d.value ?? 0);
    if (type === "double")
      return [
        ...allData.map((d) => d.value1 ?? 0),
        ...allData.map((d) => d.value2 ?? 0),
      ];
    if (type === "triple")
      return [
        ...allData.map((d) => d.value1 ?? 0),
        ...allData.map((d) => d.value2 ?? 0),
        ...allData.map((d) => d.value3 ?? 0),
      ];
    // quad
    return [
      ...allData.map((d) => d.value1 ?? 0),
      ...allData.map((d) => d.value2 ?? 0),
      ...allData.map((d) => d.value3 ?? 0),
      ...allData.map((d) => d.value4 ?? 0),
    ];
  }, [allData, type]);

  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 10;
  const margin = (maxY - minY) * 0.1 || 1;

  const average: AverageValue = useMemo(() => {
    if (type === "single") {
      const sum = allData.reduce((acc, curr) => acc + (curr.value || 0), 0);
      return allData.length ? (sum / allData.length).toFixed(2) : "0";
    } else if (type === "double") {
      const sum1 = allData.reduce((acc, curr) => acc + (curr.value1 || 0), 0);
      const sum2 = allData.reduce((acc, curr) => acc + (curr.value2 || 0), 0);
      return {
        in: (sum1 / allData.length).toFixed(2),
        out: (sum2 / allData.length).toFixed(2),
      };
    } else if (type === "triple") {
      const sum1 = allData.reduce((acc, curr) => acc + (curr.value1 || 0), 0);
      const sum2 = allData.reduce((acc, curr) => acc + (curr.value2 || 0), 0);
      const sum3 = allData.reduce((acc, curr) => acc + (curr.value3 || 0), 0);
      return {
        in: allData.length ? (sum1 / allData.length).toFixed(2) : "0",
        out: allData.length ? (sum2 / allData.length).toFixed(2) : "0",
        reactor: allData.length ? (sum3 / allData.length).toFixed(2) : "0",
      };
    } else { // quad
      const sum1 = allData.reduce((acc, curr) => acc + (curr.value1 || 0), 0);
      const sum2 = allData.reduce((acc, curr) => acc + (curr.value2 || 0), 0);
      const sum3 = allData.reduce((acc, curr) => acc + (curr.value3 || 0), 0);
      const sum4 = allData.reduce((acc, curr) => acc + (curr.value4 || 0), 0);
      return {
        in: allData.length ? (sum1 / allData.length).toFixed(2) : "0",
        in2: allData.length ? (sum2 / allData.length).toFixed(2) : "0",
        out: allData.length ? (sum3 / allData.length).toFixed(2) : "0",
        out2: allData.length ? (sum4 / allData.length).toFixed(2) : "0",
      };
    }
  }, [allData, type]);

const series =
  type === "single"
    ? [
        {
          name: title,
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value ?? 0]),
        },
      ]
    : type === "double"
    ? [
        {
          name: isFlowRate ? "CO₂" : "Inflow",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value1 ?? 0]),
        },
        {
          name: isFlowRate ? "SO₂" : "Outflow",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value2 ?? 0]),
        },
      ]
    : type === "triple"
    ? [
        {
          name: "Inflow",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value1 ?? 0]),
        },
        {
          name: "Outflow",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value2 ?? 0]),
        },
        {
          name: "Reactor",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value3 ?? 0]),
        },
      ]
    : type === "quad"
    ? [
        {
          name: "Inflow 1",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value1 ?? 0]),
        },
        {
          name: "Inflow 2",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value2 ?? 0]),
        },
        {
          name: "Outflow 1",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value3 ?? 0]),
        },
        {
          name: "Outflow 2",
          data: allData
            .slice(windowStart, windowStart + dataLimit)
            .map((d) => [d.timestampMs!, d.value4 ?? 0]), 
        },
      ]
    : [
        // fallback (กรณีไม่เข้าเงื่อนไขใด ๆ)
      ];


  const chartOptions: ApexOptions = {
    chart: {
      id: chartId,
      height: 320,
      type: "line",
      toolbar: { show: false },
      animations: { enabled: true },
    },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: "smooth" },
    colors:
      type === "single"
        ? [color]
        : type === "double"
        ? [color, color2 || `${color}88`]
        : type === "triple"
        ? [color, color2 || `${color}88`, color3 || `${color}44`]
        : [color, color2 || `${color}88`, color3 || `${color}44`, color4 || `${color}22`],
    legend: {
      position: "top",
      horizontalAlign: "right",
      offsetY: -10,
    },
    grid: {
      row: { colors: ["#f3f3f3", "transparent"], opacity: 0.5 },
      padding: { bottom: 30 },
    },
    xaxis: {
      type: "datetime",
      min: allData[windowStart]?.timestampMs,
      max: allData[windowStart + dataLimit - 1]?.timestampMs,
      labels: { rotate: -45, format: "yyyy-MM-dd HH:mm:ss" },
      title: {
        text: "Timestamp Thailand (UTC+7)",
        style: { fontSize: "12px", fontWeight: 500, color: "#666" },
      },
    },
    yaxis: {
      title: {
        text: yAxisTitle,
        style: { fontSize: "12px", fontWeight: 500, color: "#666" },
      },
      min: Math.floor(Math.min(...yValues) - margin),
      max: Math.ceil(Math.max(...yValues) + margin),
      tickAmount: 5,
      decimalsInFloat: 2,
      labels: { formatter: (val) => val.toFixed(2) },
    },
    tooltip: {
      theme: "dark",
      x: {
        formatter: (val: number) => {
          const dp = allData.find((d) => d.timestampMs === val);
          return dp?.rawTimestamp || new Date(val).toISOString();
        },
      },
    },
  };

return (
  <div className="w-full bg-white rounded-md shadow-sm p-1.5">
    <div className="flex justify-between mb-1">
      <div>
        <h5 className="text-gray-500 font-normal font-bold mb-0.5">Avg {title}</h5>
        {typeof average === "string" ? (
          <p className="text-gray-900 text-base font-bold">{average}{unit}</p>
        ) : (

          <div className="text-xs text-gray-900 font-bold leading-tight">
            {type === "double" && (
              <>
                <p>{isFlowRate ? "CO₂" : "Inflow"}: {average.in}{unit}</p>
                <p>{isFlowRate ? "SO₂" : "Outflow"}: {average.out}{unit}</p>
              </>
            )}

            {type === "triple" && (
              <>
                <p>Inflow: {average.in}{unit}</p>
                <p>Outflow: {average.out}{unit}</p>
                <p>Reactor: {average.reactor}{unit}</p>
              </>
            )}

            {type === "quad" && (
              <>
                <p>Inflow 1: {average.in}{unit}</p>
                <p>Inflow 2: {average.in2}{unit}</p>
                <p>Outflow 1: {average.out}{unit}</p>
                <p>Outflow 2: {average.out2}{unit}</p>
              </>
            )}
          </div>

        )}
      </div>
    </div>

    {/* กราฟ */}
    <div className="mt-0 mb-0" style={{ height: 320 }}>
      {loading ? (
        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-red-500">Error loading data</div>
      ) : (
        <ReactApexChart options={chartOptions} series={series} type="line" height={320} />
      )}
    </div>

    {/* ปุ่มเลื่อน */}
    <div className="flex justify-center items-center mt-1 gap-1.5">
      <button
        onClick={() => setWindowStart((prev) => Math.max(0, prev - dataLimit))}
        disabled={windowStart === 0}
        className="px-1.5 py-0.5 bg-green-600 text-white rounded text-sm disabled:bg-green-200"
      >
        ◀
      </button>
      <span className="text-xs">
        {windowStart + 1} - {Math.min(windowStart + dataLimit, allData.length)} / {allData.length}
      </span>
      <button
        onClick={() => setWindowStart((prev) => Math.min(allData.length - dataLimit, prev + dataLimit))}
        disabled={windowStart + dataLimit >= allData.length}
        className="px-1.5 py-0.5 bg-green-600 text-white rounded text-sm disabled:bg-green-200"
      >
        ▶
      </button>
    </div>
  </div>
);

};

export default LineChart;
