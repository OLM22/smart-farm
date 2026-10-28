import React, { useState, useCallback, useEffect } from "react";
import PageTemplate from "../templates/PageTemplate2";
import { useAuthApiGet } from "../api/authApi";
import { useDevice } from "../contexts/DeviceContext";
import { DatePicker, Table } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  DownloadOutlined,
  SearchOutlined,
  FireOutlined,
  CloudOutlined,

  DashboardOutlined,
  ControlOutlined,
  SlidersOutlined,
  BulbOutlined,
  CodeSandboxOutlined,
  InsertRowRightOutlined,
} from "@ant-design/icons";

dayjs.extend(utc);

const SENSOR_LABELS: Record<string, string> = {
  sensor_temp_inflow: "Temperature Inflow",
  sensor_temp_outflow: "Temperature Outflow",
  sensor_temp_reactor: "Temperature Reactor",
  sensor_co2_inflow: "CO₂ Inflow",
  sensor_co2_outflow: "CO₂ Outflow",
  sensor_co2_inflow_tank_1: "CO₂ Inflow Tank 1",
  sensor_co2_inflow_tank_2: "CO₂ Inflow Tank 2",
  sensor_co2_outflow_tank_1: "CO₂ Outflow Tank 1",
  sensor_co2_outflow_tank_2: "CO₂ Outflow Tank 2",
  sensor_co2_inflow_n7: "CO₂ Inflow N7",
  sensor_co2_outflow_n8: "CO₂ Outflow N8",
  sensor_do_intube1: "Disolve Oxygen",
  sensor_co2_water: "CO₂ Water",
  sensor_co2_inflow_temp: "CO₂ Inflow Temperature",
  sensor_co2_outflow_temp: "CO₂ Outflow Temperature",
  sensor_co2_inflow_humid: "CO₂ Inflow Humidity",
  sensor_co2_outflow_humid: "CO₂ Outflow Humidity",
  sensor_ppfd_reactor: "PPFD Reactor",
  sensor_lux_reactor: "LUX Reactor",
  sensor_co2_flow_rate: "CO₂ Flow Rate",
  sensor_co2_flow_rate_acc: "CO₂ Flow Rate Acc",
  sensor_co2_outside: "CO₂ Outside",

  sensor_o2_inflow: "O₂ Inflow",
  sensor_o2_outflow: "O₂ Outflow",
  sensor_ec_reactor: "EC Reactor",
  sensor_humid_inflow: "Humidity Inflow",
  sensor_humid_outflow: "Humidity Outflow",
  sensor_orp_reactor: "ORP Reactor",
  sensor_ph_reactor: "pH Reactor",
  sensor_tds_reactor: "TDS Reactor",
  sensor_pressure_reactor: "Pressure Reactor",
};

const SENSOR_GROUPS = [
  {
    label: "Tank Reactor Sensors",
    icon: <CodeSandboxOutlined />,
    sensors: [
      "sensor_co2_inflow_tank_1",
      "sensor_co2_inflow_tank_2",
      "sensor_co2_outflow_tank_1",
      "sensor_co2_outflow_tank_2",
      "sensor_temp_inflow",
      "sensor_temp_outflow",
      "sensor_temp_reactor",
      "sensor_o2_inflow",
      "sensor_o2_outflow",
      "sensor_s2_inflow",
      "sensor_s2_outflow",
      "sensor_ec_reactor",
      "sensor_orp_reactor",
      "sensor_ph_reactor",
      "sensor_tds_reactor",
      "sensor_pressure_reactor"
    ],
  },
  {
    label: "Tube Reactor Sensors",
    icon: <InsertRowRightOutlined />,
    sensors: [
      "sensor_co2_inflow_n7",
      "sensor_co2_outflow_n8",
      "sensor_co2_water",
      "sensor_temp_inflow",
      "sensor_temp_outflow",
      "sensor_temp_reactor",
      "sensor_humid_inflow",
      "sensor_humid_outflow",
      "sensor_co2_flow_rate",

      "sensor_do_intube1",
      "sensor_ppfd_reactor",
      "sensor_lux_reactor",
      "sensor_ph_reactor",
      "sensor_ec_reactor"
    ],
  },
  {
    label: "Temperature Sensors",
    icon: <FireOutlined />,
    sensors: [
      "sensor_temp_inflow",
      "sensor_temp_outflow",
      "sensor_temp_reactor"
    ],
  },
  {
    label: "CO₂ Sensors",
    icon: <CloudOutlined />,
    sensors: [
      "sensor_co2_inflow",
      "sensor_co2_outflow",
      "sensor_co2_flow_rate",
      "sensor_co2_flow_rate_acc",
      "sensor_co2_outside",
    ],
  },
  {
    label: "CO₂ Temperature Sensors",
    icon: <FireOutlined />,
    sensors: [
      "sensor_co2_inflow_temp",
      "sensor_co2_outflow_temp",
    ],
  },
  {
    label: "CO₂ Humidity Sensors",
    icon: <SlidersOutlined />,
    sensors: [
      "sensor_co2_inflow_humid",
      "sensor_co2_outflow_humid",
    ],
  },

  {
    label: "O₂ Sensors",
    icon: <DashboardOutlined />,
    sensors: ["sensor_o2_inflow", "sensor_o2_outflow"],
  },
  {
    label: "Light Sensors",
    icon: <BulbOutlined />,
    sensors: [
      "sensor_ppfd_reactor",
      "sensor_lux_reactor",
    ],
  },
  {
    label: "Reactor Sensors",
    icon: <ControlOutlined />,
    sensors: [
      "sensor_ec_reactor",
      "sensor_orp_reactor",
      "sensor_ph_reactor",
      "sensor_tds_reactor",
      "sensor_pressure_reactor",
      "sensor_temp_reactor",
    ],
  },
  {
    label: "Humidity",
    icon: <SlidersOutlined />,
    sensors: ["sensor_humid_inflow", "sensor_humid_outflow"],
  },
];

const HistoricalDataPage: React.FC = () => {
  const [userSelectedBatch, setUserSelectedBatch] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [batchNo, setBatchNo] = useState(""); // "" = all batch
  const [batchNoList, setBatchNoList] = useState<number[]>([]); // รายการ batch number ที่ดึงจาก backend
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [csvContent, setCsvContent] = useState("");

  const authApiGet = useAuthApiGet();
  const { selectedDeviceId } = useDevice();

  // แปลงวันที่ local เป็น UTC ISO String format
  const convertToUTC = useCallback(
    (localDateTime: string) =>
      localDateTime ? dayjs(localDateTime).format("YYYY-MM-DDTHH:mm:ss[Z]") : "",
    []
  );

  // ฟังก์ชันดึง batch no จาก backend ผ่าน API
  const fetchBatchNos = useCallback(async () => {
    if (!selectedDeviceId || !startDate || !endDate) {
      setBatchNoList([]);
      return;
    }
    try {
      const collections = "sensor_co2_inflow";
      const params = new URLSearchParams({
        start: convertToUTC(startDate),
        end: convertToUTC(endDate),
        device_id: selectedDeviceId,
      });

      const response = await authApiGet(`sensor-data/filter-multi/${collections}?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch batch numbers");
      const data = await response.json();

      const items = data[collections] || [];
      const batchSet = new Set<number>();
      items.forEach((item: any) => {
        if (item.batch_no !== undefined && item.batch_no !== null) {
          batchSet.add(Number(item.batch_no));
        }
      });
      const batchArr = Array.from(batchSet).sort((a, b) => a - b);
      setBatchNoList(batchArr);
    } catch (error) {
      console.error("Error fetching batch numbers:", error);
      setBatchNoList([]);
    }
  }, [selectedDeviceId, startDate, endDate, convertToUTC, authApiGet]);

  useEffect(() => {
    fetchBatchNos();
    // รีเซต batchNo เฉพาะเมื่อไม่ได้มาจากการเลือกของผู้ใช้
    if (!userSelectedBatch) {
      setBatchNo("");
    }
    // เคลียร์สถานะหลังเรียกใช้แล้ว
    setUserSelectedBatch(false);
  }, [startDate, endDate, selectedDeviceId]);

  // ฟังก์ชัน query ข้อมูล sensor และแปลงเป็น CSV
  const queryDataAndBuildCSV = useCallback(async () => {
    if (selectedCollections.length === 0) return "";

    setLoadingQuery(true);
    setError(null);
    setCsvContent("");

    try {
      const collectionsParam = selectedCollections.join(",");
      const params = new URLSearchParams({
        start: convertToUTC(startDate),
        end: convertToUTC(endDate),
        device_id: selectedDeviceId,
      });
      if (batchNo.trim() !== "") {
        params.append("batch_no", String(Number(batchNo)));
      }

      const response = await authApiGet(
        `sensor-data/filter-multi/${collectionsParam}?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch data");

      const responseData = await response.json();
      const timestampMap = new Map<string, any>();

      // สร้าง map key เป็น timestamp รวมข้อมูล sensor แต่ละ collection
      selectedCollections.forEach((collection) => {
        const items = responseData[collection] || [];
        items.forEach((item: any) => {
          const ts = item.timestamp;
          if (!timestampMap.has(ts)) {
            timestampMap.set(ts, {
              timestamp: ts,
              device_id: item.device_id ?? selectedDeviceId,
              batch_no: item.batch_no ?? batchNo,
            });
          }
        });
      });

      // เติมข้อมูล sensor value
      selectedCollections.forEach((collection) => {
        const items = responseData[collection] || [];
        items.forEach((item: any) => {
          const row = timestampMap.get(item.timestamp);
          if (row) {
            let value = item.value;
            if (value === undefined) {
              value = item.flow ?? item.accumulated ?? null;
            }
            row[collection] = value;
          }
        });
      });

      const sortedData = Array.from(timestampMap.values()).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );

      setPreviewData(sortedData.slice(0, 10)); // preview 10 แถวแรก

      // สร้าง CSV
      const headers = ["timestamp", "device_id", "batch_no", ...selectedCollections];
      const csvRows = [headers.join(",")];

      sortedData.forEach((row) => {
        const rowData = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
          return val;
        });
        csvRows.push(rowData.join(","));
      });

      const csv = csvRows.join("\n");
      setCsvContent(csv);
      return csv;
    } catch (err) {
      console.error("Query error:", err);
      setPreviewData([]);
      setError("Error fetching data");
      throw err;
    } finally {
      setLoadingQuery(false);
    }
  }, [
    selectedCollections,
    startDate,
    endDate,
    selectedDeviceId,
    batchNo,
    convertToUTC,
    authApiGet,
  ]);

  // ฟังก์ชันดาวน์โหลด CSV
  const handleDownload = useCallback(() => {
    setLoadingDownload(true);
    setError(null);

    if (!startDate || !endDate || selectedCollections.length === 0) {
      setError("Please complete the form before downloading.");
      setLoadingDownload(false);
      return;
    }

    if (!csvContent) {
      setError("No CSV content available. Please query data first.");
      setLoadingDownload(false);
      return;
    }

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sensor-data-${selectedDeviceId}-${dayjs(startDate).format("YYYYMMDDHHmm")}-to-${dayjs(endDate).format("YYYYMMDDHHmm")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Download error:", err);
      setError("Error generating CSV");
    } finally {
      setLoadingDownload(false);
    }
  }, [csvContent, startDate, endDate, selectedCollections, selectedDeviceId]);

  // toggle sensor รายตัว
  const toggleSensor = (sensor: string) => {
    setSelectedCollections((prev) =>
      prev.includes(sensor)
        ? prev.filter((s) => s !== sensor)
        : [...prev, sensor]
    );
  };

  // เลือก all sensors
  const selectAll = () => {
    const allSensors = Object.keys(SENSOR_LABELS);
    setSelectedCollections(allSensors);
  };

  // ล้างเลือก sensor ทั้งหมด
  const clearAll = () => setSelectedCollections([]);

  // toggle กลุ่ม sensors
  const toggleGroup = (groupSensors: string[]) => {
    const isAllSelected = groupSensors.every((sensor) =>
      selectedCollections.includes(sensor)
    );
    if (isAllSelected) {
      setSelectedCollections((prev) =>
        prev.filter((s) => !groupSensors.includes(s))
      );
    } else {
      setSelectedCollections((prev) => [
        ...prev,
        ...groupSensors.filter((s) => !prev.includes(s)),
      ]);
    }
  };

  return (
    <PageTemplate title="Historical Data" showDeviceSelector>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Historical Sensor Data
        </h2>

        {/* เลือกวันที่และ batch */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">Start</label>
            <DatePicker
              showTime
              value={startDate ? dayjs(startDate) : null}
              onChange={(d) => setStartDate(d ? d.toISOString() : "")}
              format="YYYY-MM-DD HH:mm"
              className="w-full"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">End</label>
            <DatePicker
              showTime
              value={endDate ? dayjs(endDate) : null}
              onChange={(d) => setEndDate(d ? d.toISOString() : "")}
              format="YYYY-MM-DD HH:mm"
              className="w-full"
            />
          </div>

          {/* Batch No as buttons */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Batch No</label>
            <div className="flex flex-wrap gap-2 max-w-full">
              <button
                onClick={() => setBatchNo("")}
                className={`px-3 py-1 rounded-full border font-semibold text-sm ${batchNo === ""
                  ? "bg-green-600 text-white border-green-700"
                  : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                  }`}
              >
                All Batch
              </button>
              {batchNoList.map((bno) => (
                <button
                  key={bno}
                  onClick={() => {
                    setUserSelectedBatch(true);
                    setBatchNo(String(bno));
                  }}
                  className={`px-3 py-1 rounded-full border font-semibold text-sm ${batchNo === String(bno)
                    ? "bg-green-600 text-white border-green-700"
                    : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {bno}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ปุ่มเลือก sensor */}
        <div className="border border-gray-300 rounded-lg p-4 space-y-4">
          {/* All / Clear All */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => {
                const allSensors = Object.keys(SENSOR_LABELS);
                const isAllSelected = allSensors.every((sensor) =>
                  selectedCollections.includes(sensor)
                );
                if (isAllSelected) {
                  clearAll();
                } else {
                  selectAll();
                }
              }}
              className={`px-3 py-1 text-sm rounded transition font-semibold ${Object.keys(SENSOR_LABELS).every((s) => selectedCollections.includes(s))
                ? "bg-red-400 text-white hover:bg-red-600"
                : "bg-green-400 text-white hover:bg-green-600"
                }`}
            >
              {Object.keys(SENSOR_LABELS).every((s) =>
                selectedCollections.includes(s)
              )
                ? " Clear All "
                : " All Collections "}
            </button>
          </div>

          {/* ปุ่มกลุ่ม Sensors */}
          <div className="flex flex-wrap gap-3 mb-4">
            {SENSOR_GROUPS.map(({ label, icon, sensors }) => {
              const allSelected = sensors.every((s) => selectedCollections.includes(s));
              return (
                <button
                  key={label}
                  onClick={() => toggleGroup(sensors)}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold border transition ${allSelected
                    ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
                    : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          {/* ปุ่มเลือก Sensors รายตัว */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(SENSOR_LABELS).map(([sensor, label]) => {
              const selected = selectedCollections.includes(sensor);
              return (
                <button
                  key={sensor}
                  onClick={() => toggleSensor(sensor)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition ${selected
                    ? "bg-green-500 text-white border-green-700 hover:bg-green-700"
                    : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div> {/* ปิด SENSOR panel */}

        {/* ปุ่ม Query และ Download */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={queryDataAndBuildCSV}
            disabled={loadingQuery}
            className={`flex items-center gap-2 px-5 py-2 rounded text-white font-semibold transition ${loadingQuery ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
          >
            <SearchOutlined />
            {loadingQuery ? "Loading..." : "Query Data"}
          </button>

          <button
            onClick={handleDownload}
            disabled={loadingDownload || !previewData.length}
            className={`flex items-center gap-2 px-5 py-2 rounded text-white font-semibold transition ${loadingDownload || !previewData.length
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
              }`}
          >
            <DownloadOutlined />
            {loadingDownload ? "Downloading..." : "Download CSV"}
          </button>
        </div>

        {/* แสดง error */}
        {error && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md mt-4">
            ⚠️ {error}
          </div>
        )}

        {/* Preview ตารางข้อมูล 10 แถวแรก */}
        {previewData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2 text-gray-800">
              Preview (first 10 rows)
            </h3>
            <Table
              dataSource={previewData}
              columns={Object.keys(previewData[0]).map((key) => ({
                title: key,
                dataIndex: key,
                key,
              }))}
              rowKey={(record) => record.timestamp + record.device_id}
              pagination={false}
              scroll={{ x: true }}
              size="small"
            />
          </div>
        )}

      </div> {/* ปิดกล่อง sensor selector ทั้งหมด */}
      <br />
    </PageTemplate>

  );
};

export default React.memo(HistoricalDataPage);
