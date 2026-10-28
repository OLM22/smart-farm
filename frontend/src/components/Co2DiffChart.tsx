import React, { useEffect, useState, useRef } from "react";
import ReactApexChart from "react-apexcharts";
import { useAuthApi } from "../api/authApi";
import { Progress, Skeleton } from "antd";

interface Co2DiffChartProps {
  deviceId: string;
  startDate: Date;
  endDate: Date;
}

const Co2DiffChart: React.FC<Co2DiffChartProps> = ({
  deviceId,
  startDate,
  endDate,
}) => {
  const authApi = useAuthApi();
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoData, setShowNoData] = useState(false);

  const lastFetchedRange = useRef<{ start: Date; end: Date } | null>(null);

  const fetchChartData = async (rangeStart: Date, rangeEnd: Date) => {
    try {
      setLoading(true);
      setShowNoData(false);

      const fields = ["sensor_co2_inflow", "sensor_co2_outflow"];
      const collectionsParam = fields.join(",");
      const params = new URLSearchParams({
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        device_id: deviceId,
      });

      const res = await authApi(
        `sensor-data/filter-multi/${collectionsParam}?${params.toString()}`
      );
      const json = await res.json();

      const parseSeries = (key: string) =>
        (json[key] || []).map((item: any) => ({
          x: new Date(item.timestamp).getTime(),
          y: Number(item.value),
        }));

      const inflow = parseSeries("sensor_co2_inflow");
      const outflow = parseSeries("sensor_co2_outflow");

      const co2Diff = inflow.map((inItem: any, index: number) => {
        const outItem = outflow[index];
        if (inItem && outItem && inItem.x === outItem.x) {
          return { x: inItem.x, y: inItem.y - outItem.y };
        }
        return null;
      }).filter(Boolean);

      const newSeries = [{ name: "CO₂ Inflow - Outflow", data: co2Diff }];
      setSeries(newSeries);

      const isAllEmpty = newSeries.every((s) => s.data.length === 0);
      setTimeout(() => setShowNoData(isAllEmpty), isAllEmpty ? 3000 : 0);
    } catch (err) {
      console.error("❌ Error loading CO₂ Diff chart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deviceId || !startDate || !endDate) return;

    const last = lastFetchedRange.current;
    if (
      last &&
      last.start.getTime() === startDate.getTime() &&
      last.end.getTime() === endDate.getTime()
    ) {
      return;
    }

    fetchChartData(startDate, endDate);
    lastFetchedRange.current = { start: new Date(startDate), end: new Date(endDate) };
  }, [startDate, endDate, deviceId]);

  return (
    <div className="bg-white w-full rounded-none shadow !p-0 !m-0 leading-none">
      {loading ? (
        <div className="w-full p-2">
          <Skeleton
            active
            paragraph={{ rows: 4 }}
            title={{ width: "40%" }}
            className="!mb-1 leading-none"
          />
          <Progress
            percent={99.9}
            showInfo={false}
            status="active"
            strokeColor={{ from: "#3B82F6", to: "#06b6d4" }}
            className="!my-0"
          />
          <p className="text-center text-xs text-gray-500 mt-1 leading-none">
            Loading data...
          </p>
        </div>
      ) : (
        <>
          {/* Main Chart */}
          <div className="h-[240px] p-0 m-0">
            <ReactApexChart
              options={{
                chart: {
                  id: "co2-diff-chart",
                  type: "line",
                  height: 240,
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
                noData: {
                  text: showNoData ? "No Data" : "Loading...",
                  align: "center",
                  verticalAlign: "middle",
                  style: {
                    color: "#999",
                    fontSize: "18px",
                  },
                },
                grid: {
                  padding: { top: 0, right: 0, bottom: 0, left: 0 },
                },
                colors: ["#0d835bff"],
                stroke: { curve: "smooth", width: 2 },
                xaxis: {
                  type: "datetime",
                  title: { text: "Time" },
                  labels: { style: { fontSize: "11px" } },
                },
                yaxis: {
                  title: { text: "CO₂ Δ (ppm)" },
                  labels: { style: { fontSize: "11px" } },
                },
                tooltip: {
                shared: true,
                x: { format: "dd/MM/yyyy HH:mm" },
                y: {
                    formatter: (value: number | null) => {
                    if (value === null || value === undefined || isNaN(value)) return "-";
                    return `${value.toFixed(2)} ppm`;
                    },
                    title: {
                    formatter: (seriesName: string) => seriesName,
                    },
                },
                },
              }}
              series={series}
              type="line"
              height={240}
            />
          </div>

          {/* Brush Chart */}
          <div className="h-[90px] m-0 p-0">
            <ReactApexChart
              options={{
                chart: {
                  id: "co2-diff-brush",
                  height: 90,
                  type: "area",
                  brush: {
                    target: "co2-diff-chart",
                    enabled: true,
                  },
                  selection: {
                    enabled: true,
                    xaxis: {
                      min: series[0]?.data?.[0]?.x ?? undefined,
                      max: series[0]?.data?.slice(-1)?.[0]?.x ?? undefined,
                    },
                  },
                },
                grid: {
                  padding: { top: 0, right: 0, bottom: 0, left: 0 },
                },
                colors: ["#0d835bff"],
                legend: { show: false },
                fill: {
                  type: "gradient",
                  gradient: { opacityFrom: 0.9, opacityTo: 0.1 },
                },
                xaxis: {
                  type: "datetime",
                  labels: { style: { fontSize: "10px" } },
                },
                yaxis: {
                  tickAmount: 2,
                  labels: { style: { fontSize: "10px" } },
                },
              }}
              series={series}
              type="area"
              height={90}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Co2DiffChart;
