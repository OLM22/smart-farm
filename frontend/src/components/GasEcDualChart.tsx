import React, { useEffect, useState, useRef } from "react";
import ReactApexChart from "react-apexcharts";
import { useAuthApi } from "../api/authApi";
import { Progress, Skeleton } from "antd";

interface GasEcDualChartProps {
  deviceId: string;
  startDate: Date;
  endDate: Date;
}

// 🔧 Align all series to the same timestamps
function alignSeries(
  seriesList: { name: string; data: { x: number; y: number }[] }[]
) {
  const allTimestamps = new Set<number>();
  seriesList.forEach((s) => s.data.forEach((p) => allTimestamps.add(p.x)));

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  return seriesList.map((s) => {
    const dataMap = new Map(s.data.map((p) => [p.x, p.y]));
    const alignedData = sortedTimestamps.map((x) => ({
      x,
      y: dataMap.has(x) ? dataMap.get(x)! : null,
    }));
    return { name: s.name, data: alignedData };
  });
}

const GasEcDualChart: React.FC<GasEcDualChartProps> = ({
  deviceId,
  startDate,
  endDate,
}) => {
  const authApi = useAuthApi();
  const [series, setSeries] = useState<any[]>([]);
  const [zoomedSeries, setZoomedSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoData, setShowNoData] = useState(false);
  const lastFetchedRange = useRef<{ start: Date; end: Date } | null>(null);

  const fetchChartData = async (rangeStart: Date, rangeEnd: Date) => {
    try {
      setLoading(true);
      setShowNoData(false);

      const fields = [
        "sensor_co2_inflow",
        "sensor_co2_outflow",
        "sensor_so2_inflow",
        "sensor_so2_outflow",
        "sensor_ec_reactor",
      ];
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

      const rawSeries = [
        { name: "CO₂ Inflow", data: parseSeries("sensor_co2_inflow") },
        { name: "CO₂ Outflow", data: parseSeries("sensor_co2_outflow") },
        { name: "SO₂ Inflow", data: parseSeries("sensor_so2_inflow") },
        { name: "SO₂ Outflow", data: parseSeries("sensor_so2_outflow") },
        { name: "EC", data: parseSeries("sensor_ec_reactor") },
      ];

      const alignedSeries = alignSeries(rawSeries);
      setSeries(alignedSeries);
      setZoomedSeries(alignedSeries);

      const isAllEmpty = alignedSeries.every((s) => s.data.length === 0);
      setTimeout(() => setShowNoData(isAllEmpty), isAllEmpty ? 3000 : 0);
    } catch (err) {
      console.error("❌ Error loading chart:", err);
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
    <div className="bg-white w-full rounded-none shadow !p-0 m-0 leading-none">
      {loading ? (
        <div className="w-full px-2 py-2">
          <Skeleton
            active
            paragraph={{ rows: 6 }}
            title={{ width: "50%" }}
            className="mb-1"
          />
          <Progress
            percent={99.9}
            showInfo={false}
            status="active"
            strokeColor={{ from: "#3B82F6", to: "#06b6d4" }}
          />
          <p className="text-center text-sm text-gray-500 mt-1 leading-none">Loading data...</p>
        </div>
      ) : (
        <>
          {/* Main Chart */}
          <div className="h-[300px] m-0 p-0">
            <ReactApexChart
              options={{
                chart: {
                  id: "main-chart",
                  type: "line",
                  height: 300,
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
                  style: { color: "#999", fontSize: "20px" },
                },
                grid: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
                colors: ["#DC2626", "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981"],
                legend: { show: false },
                stroke: { curve: "smooth", width: 2 },
                xaxis: {
                  type: "datetime",
                  title: { text: "Time" },
                  labels: { style: { fontSize: "11px" } },
                },
                yaxis: [
                  {
                    title: { text: "Gas Concentration (ppm)" },
                    labels: { style: { fontSize: "11px" } },
                  },
                  {
                    opposite: true,
                    title: { text: "EC (mS/cm)" },
                    labels: { style: { fontSize: "11px" } },
                  },
                ],

                tooltip: {
                  shared: true,
                  intersect: false,
                  x: { format: "dd/MM/yyyy HH:mm" },
                  y: {
                    formatter: (value: number | null, opts: any) => {
                      const name: string = opts?.w?.config?.series?.[opts.seriesIndex]?.name || "";
                      if (value === null || value === undefined || isNaN(value)) return "-";

                      const unit = name.toLowerCase().includes("ec") ? "μS/cm" : "ppm";
                      return `${value.toFixed(2)} ${unit}`;
                    },
                    title: {
                      formatter: (seriesName: string) => seriesName,
                    },
                  },
                }

              }}
              series={zoomedSeries}
              type="line"
              height={300}
            />
          </div>

          {/* Brush Chart */}
          <div className="h-[90px] m-0 p-0">
            <ReactApexChart
              options={{
                chart: {
                  id: "brush-chart",
                  height: 90,
                  type: "area",
                  brush: { target: "main-chart", enabled: true },
                  selection: {
                    enabled: true,
                    xaxis: {
                      min: zoomedSeries[0]?.data?.[0]?.x ?? undefined,
                      max: zoomedSeries[0]?.data?.slice(-1)?.[0]?.x ?? undefined,
                    },
                  },
                },
                grid: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
                colors: ["#DC2626", "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981"],
                legend: { show: false },
                fill: {
                  type: "gradient",
                  gradient: { opacityFrom: 0.91, opacityTo: 0.1 },
                },
                xaxis: { type: "datetime", labels: { style: { fontSize: "10px" } } },
                yaxis: { tickAmount: 2, labels: { style: { fontSize: "10px" } } },
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

export default GasEcDualChart;
