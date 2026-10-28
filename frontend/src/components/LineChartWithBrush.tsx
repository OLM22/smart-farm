import React, { useState, useEffect } from "react";
import { useAuthApi } from "../api/authApi";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface LineChartWithBrushProps {
  deviceId: string;
  field: string;
  field2?: string;
  field3?: string;
  field4?: string;
  title: string;
  color: string;
  color2?: string;
  color3?: string;
  color4?: string;
  type: "single" | "double" | "triple" | "quad";
  yAxisTitle: string;
  unit: string;
  startDate: Date;
  endDate: Date;
  dataLimit: number;
  limitData?: boolean;
}

const LineChartWithBrush: React.FC<LineChartWithBrushProps> = ({
  deviceId,
  field,
  field2,
  field3,
  field4,
  title,
  color,
  color2,
  color3,
  color4,
  type,
  yAxisTitle,
  startDate,
  endDate,
  dataLimit,
  limitData = false,
}) => {
  const authApi = useAuthApi();
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const collections = [
        field,
        type !== "single" ? field2 : undefined,
        type === "triple" || type === "quad" ? field3 : undefined,
        type === "quad" ? field4 : undefined,
      ].filter(Boolean) as string[];

      const collectionsParam = collections.join(",");
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        device_id: deviceId,
      });

      const url = `sensor-data/filter-multi/${collectionsParam}?${params.toString()}`;
      const response = await authApi(url);
      const responseData = await response.json();

      const series: any[] = [];
      const allTimestamps = new Set<number>();

      // เก็บ timestamp ทั้งหมด
      collections.forEach((key) => {
        (responseData[key] || []).forEach((d: any) => {
          allTimestamps.add(new Date(d.timestamp).getTime());
        });
      });
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      // จัดชุดข้อมูลให้ทุกเส้นมี timestamp เหมือนกัน
      collections.forEach((key, index) => {

        const name =
          type === "single"
            ? title
            : type === "double"
            ? index === 0
              ? "Inflow"
              : "Outflow"
            : type === "triple"
            ? index === 0
              ? "Inflow"
              : index === 1
              ? "Outflow"
              : "Reactor"
            : index === 0
            ? "Inflow 1"
            : index === 1
            ? "Inflow 2"
            : index === 2
            ? "Outflow 1"
            : "Outflow 2";

        const dataMap = new Map<number, number>();
        (responseData[key] || []).forEach((d: any) => {
          dataMap.set(new Date(d.timestamp).getTime(), Number(d.value));
        });

        const alignedData = sortedTimestamps.map((ts) => ({
          x: ts,
          y: dataMap.has(ts) ? dataMap.get(ts) : null,
        }));

        series.push({ name, data: alignedData });
      });

      const finalSeries = limitData
        ? series.map((s) => ({
            ...s,
            data: s.data.slice(-dataLimit),
          }))
        : series;

      setSeriesData(finalSeries);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deviceId, startDate, endDate, field, field2, field3, field4, dataLimit, limitData]);

  const colors =
    type === "single"
      ? [color]
      : type === "double"
      ? [color, color2 || "#999"]
      : type === "triple"
      ? [color, color2 || "#999", color3 || "#666"]
      : [color, color2 || "#999", color3 || "#666", color4 || "#333"];

  const mainChartOptions: ApexOptions = {
    chart: {
      id: "main-chart",
      type: "line",
      height: 320,
      zoom: { enabled: true },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        },
      },
    },
    colors,
    stroke: { width: 2 },
    xaxis: { type: "datetime" },
    yaxis: {
      title: { text: `${yAxisTitle}` },
      labels: { formatter: (val) => val.toFixed(2) },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: "yyyy-MM-dd HH:mm",
      },
      y: {
        formatter: (val: number) => (val !== null ? val.toFixed(2) : "-"),
        title: {
          formatter: (seriesName: string) => seriesName,
        },
      },
    },
  };

  const brushChartOptions: ApexOptions = {
    chart: {
      id: "brush-chart",
      height: 100,
      type: "area",
      brush: {
        target: "main-chart",
        enabled: true,
      },
      selection: {
        enabled: true,
        xaxis: {
          min: seriesData[0]?.data?.[0]?.x,
          max: seriesData[0]?.data?.slice(-1)?.[0]?.x,
        },
      },
    },
    colors,
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.91,
        opacityTo: 0.1,
      },
    },
    legend: { show: false },
    xaxis: {
      type: "datetime",
      tooltip: { enabled: false },
    },
    yaxis: {
      tickAmount: 2,
    },
  };

  return (
    <div className="bg-white p-4 rounded shadow w-full">
      {loading && <p className="text-gray-400 mb-2">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && seriesData.length > 0 && (
        <>
          <ReactApexChart
            options={mainChartOptions}
            series={seriesData}
            type="line"
            height={320}
          />
          <div className="mt-4">
            <ReactApexChart
              options={brushChartOptions}
              series={seriesData}
              type="area"
              height={100}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default LineChartWithBrush;