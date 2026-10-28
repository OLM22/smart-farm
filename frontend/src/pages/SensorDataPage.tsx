import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PageTemplate from "../templates/PageTemplate2";
import SensorCard from "../components/SensorCard";
import Gauge from "../components/Gauge";
import { useDevice } from "../contexts/DeviceContext";
import { useAuthApi } from "../api/authApi";
import {
  Thermometer, Droplet, Droplets, Wind, WindArrowDown, AirVent, Sparkle, Sparkles, Activity, Zap,
  GaugeCircle, FlaskConical, TrendingUp, BarChart4, Waves
} from "lucide-react";

/* ---------- types ---------- */
type SensorData = Record<string, { value: number; unit: string; stddev?: number; timestamp?: string }>;
type SensorThreshold = {
  sensor_id: number | string;
  par_threshold_min: number | string | null;
  par_threshold_max: number | string | null;
  sensor_type?: string | null;
};
type SensorMaster = { sensor_id: number | string; sensor_type: string };
type SensorConfig = { id: string; title: string; icon?: React.ReactNode };

/* ---------- config ---------- */
const SENSORS: SensorConfig[] = [
  { id: "sensor_pressure_reactor", title: "Reactor Pressure", icon: <GaugeCircle /> },
  { id: "sensor_co2_inflow_tank_1", title: "CO₂ Inflow Tank 1", icon: <WindArrowDown /> },
  { id: "sensor_co2_inflow_tank_2", title: "CO₂ Inflow Tank 2", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow_tank_1", title: "CO₂ Outflow Tank 1", icon: <Wind /> },
  { id: "sensor_co2_outflow_tank_2", title: "CO₂ Outflow Tank 2", icon: <Wind /> },
  { id: "sensor_co2_inflow_tube_1", title: "CO₂ Inflow Tube 1", icon: <WindArrowDown /> },
  { id: "sensor_co2_inflow_tube_2", title: "CO₂ Inflow Tube 2", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow_tube_1", title: "CO₂ Outflow Tube 1", icon: <Wind /> },
  { id: "sensor_co2_outflow_tube_2", title: "CO₂ Outflow Tube 2", icon: <Wind /> },
  { id: "sensor_co2_inflow_n7", title: "CO₂ Inflow N7", icon: <WindArrowDown /> },
  { id: "sensor_co2_inflow_n30", title: "CO₂ Inflow N30", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow_n8", title: "CO₂ Outflow N8", icon: <Wind /> },
  { id: "sensor_co2_outflow_n31", title: "CO₂ Outflow N31", icon: <Wind /> },
  { id: "sensor_co2_inflow", title: "CO₂ Inflow", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow", title: "CO₂ Outflow", icon: <Wind /> },
  { id: "sensor_co2_water", title: "CO₂ Water", icon: <AirVent /> },
  { id: "sensor_co2_inflow_temp", title: "CO₂ Inflow Temperature", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow_temp", title: "CO₂ Outflow Temperature", icon: <Wind /> },
  { id: "sensor_co2_inflow_humid", title: "CO₂ Inflow Humidity", icon: <WindArrowDown /> },
  { id: "sensor_co2_outflow_humid", title: "CO₂ Outflow Humidity", icon: <Wind /> },
  { id: "sensor_co2_flow_rate", title: "CO₂ Flow Rate", icon: <TrendingUp /> },
  { id: "sensor_co2_flow_rate_acc", title: "Acc. CO₂ Flow Rate", icon: <BarChart4 /> },
  { id: "sensor_do_intube1", title: "Disolve Oxygen", icon: <WindArrowDown /> },
  { id: "sensor_temp_inflow", title: "Temperature Inflow", icon: <Thermometer /> },
  { id: "sensor_temp_outflow", title: "Temperature Outflow", icon: <Thermometer /> },
  { id: "sensor_temp_reactor", title: "Reactor Temperature", icon: <Thermometer /> },
  { id: "sensor_o2_inflow", title: "O₂ Inflow", icon: <WindArrowDown /> },
  { id: "sensor_o2_outflow", title: "O₂ Outflow", icon: <Wind /> },
  { id: "sensor_ppfd_reactor", title: "PPFD Reactor", icon: <Sparkles /> },
  { id: "sensor_lux_reactor", title: "LUX Reactor", icon: <Sparkle /> },
  { id: "sensor_ph_reactor", title: "Reactor pH", icon: <FlaskConical /> },
  { id: "sensor_ec_reactor", title: "Reactor EC", icon: <Activity /> },

  { id: "sensor_tds_reactor", title: "Reactor TDS", icon: <Waves /> },
  { id: "sensor_humid_inflow", title: "Humidity Inflow", icon: <Droplets /> },
  { id: "sensor_humid_outflow", title: "Humidity Outflow", icon: <Droplet /> },
  { id: "sensor_orp_reactor", title: "Reactor ORP", icon: <Zap /> },
];

const COLOR = {
  gray: "#6B7280", low2: "#1D4ED8", low1: "#3B82F6",
  ok1: "#22C55E", ok2: "#16A34A", ok3: "#84CC16",
  warn1: "#F59E0B", warn2: "#EA580C", high: "#DC2626",
};

type ColorKey = keyof typeof COLOR;
const COLOR_LABEL: Record<ColorKey, string> = {
  low2: "ต่ำมากกว่าที่ควร",
  low1: "ต่ำกว่าเกณฑ์",
  ok1: "อยู่ในช่วงที่ดี (ค่าต่ำ)",
  ok2: "อยู่ในช่วงที่ดี (กำลังดี)",
  ok3: "อยู่ในช่วงที่ดี (ค่าสูง)",
  warn1: "สูงกว่าเกณฑ์เล็กน้อย",
  warn2: "สูงกว่าเกณฑ์มาก",
  high: "สูงมากเกณฑ์วิกฤต",
  gray: "ยังไม่มีเกณฑ์ข้อมูล",
};

/* ---------- skeletons ---------- */
const SkBar = ({ w = "w-24" }: { w?: string }) => <div className={`h-3 ${w} bg-gray-200 rounded`} />;
const SensorSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-3 w-full animate-pulse">
    <div className="flex items-center gap-3 mb-3"><div className="h-6 w-6 bg-gray-200 rounded" /><SkBar w="w-32" /></div>
    <div className="flex items-end gap-2"><div className="h-10 w-20 bg-gray-200 rounded" /><SkBar w="w-10" /></div>
    <div className="mt-3 space-y-2"><SkBar w="w-28" /><SkBar w="w-20" /></div>
  </div>
);
const GaugeSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-3 w-full h-full flex flex-col animate-pulse col-span-1 row-span-2">
    <div className="flex items-center gap-3 mb-3"><div className="h-7 w-7 bg-gray-200 rounded" /><SkBar w="w-40" /></div>
    <div className="flex-1 flex items-center justify-center"><div className="h-28 w-28 rounded-full bg-gray-200" /></div>
    <div className="mt-3"><SkBar w="w-24" /></div>
  </div>
);

/* ---------- helpers ---------- */
const toNum = (x: unknown): number | null => {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  const n = Number(String(x).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

/* ------ คอมโพเนนต์ Legend ------ */
const ColorLegend: React.FC = () => {
  const items: { key: ColorKey; label: string }[] = [
    { key: "low2", label: COLOR_LABEL.low2 },
    { key: "low1", label: COLOR_LABEL.low1 },
    { key: "ok1", label: COLOR_LABEL.ok1 },
    { key: "ok2", label: COLOR_LABEL.ok2 },
    { key: "ok3", label: COLOR_LABEL.ok3 },
    { key: "warn1", label: COLOR_LABEL.warn1 },
    { key: "warn2", label: COLOR_LABEL.warn2 },
    { key: "high", label: COLOR_LABEL.high },
    { key: "gray", label: COLOR_LABEL.gray },
  ];

  return (
    <div className="mt-3 bg-white rounded-lg shadow p-3">
      <div className="text-sm font-medium text-gray-700 mb-2">Color legend: </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: COLOR[key] }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


// alias ชื่อไม่ตรงกับ DB
const ALIASES: Record<string, string> = {
  sensor_co2_water: "sensor_co2_outside",
};

const norm = (s?: string) => String(s ?? "").toLowerCase().trim();
const stripSensorPrefix = (s: string) => norm(s).replace(/^sensor_/, "");
const swap2 = (s: string) => {
  const p = stripSensorPrefix(s).split("_");
  return p.length === 2 ? `${p[1]}_${p[0]}` : stripSensorPrefix(s);
};
const keyVariants = (raw: string) => {
  const k = ALIASES[raw] ?? raw;
  const a = norm(k);
  const b = stripSensorPrefix(k);
  const c = swap2(k);
  return new Set([a, a.replace(/_/g, ""), b, b.replace(/_/g, ""), c, c.replace(/_/g, "")]);
};

/* ---------- component ---------- */
const SensorDataPage: React.FC = () => {
  const { selectedDeviceId } = useDevice();
  const authApi = useAuthApi();

  const [sensorValues, setSensorValues] = useState<Record<string, number | undefined>>({});
  const [sensorExtras, setSensorExtras] = useState<Record<string, { unit?: string; stddev?: number; last_updated?: string }>>({});
  const [sensorThresholds, setSensorThresholds] = useState<SensorThreshold[]>([]);
  const [sensorTypeById, setSensorTypeById] = useState<Record<string, string>>({});
  const [, setError] = useState<string | null>(null);          // ไม่ใช้ตัวแปร error เพื่อเลี่ยง TS6133
  const [initialLoading, setInitialLoading] = useState(true);
  const [showNoData, setShowNoData] = useState(false);

  // guards
  const activeDeviceRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqSeqRef = useRef(0);
  const showSkeletonNextFetchRef = useRef(true);
  const inflightRef = useRef(false);
  const mountedOnceRef = useRef(false);

  // --- เก็บ last-good threshold index แบบ sticky ---
  type Threshold = { min: number | null; max: number | null; display: string | null };
  const thresholdIndexRef = useRef<Map<string, Threshold>>(new Map());
  const [thTick, setThTick] = useState(0); // ไว้กระตุ้น re-render เมื่ออัปเดต index จริง ๆ

  useEffect(() => {
    activeDeviceRef.current = selectedDeviceId ?? null;
    setSensorValues({});
    setSensorExtras({});
    setError(null);
    showSkeletonNextFetchRef.current = true;
    setInitialLoading(true);
    if (abortRef.current) abortRef.current.abort();
  }, [selectedDeviceId]);

  /* ---------- fetch masters & thresholds ---------- */
  const fetchSensorsMaster = useCallback(async () => {
    try {
      const resp = await authApi("sensors"); // optional
      const list = (await resp.json()) as SensorMaster[] | any[];
      const map: Record<string, string> = {};
      for (const r of list ?? []) {
        const id = String((r as any).sensor_id ?? "");
        const type = String((r as any).sensor_type ?? "");
        if (id && type) map[id] = type;
      }
      setSensorTypeById(map);
    } catch {
      // ไม่มี endpoint นี้ก็ข้ามได้
    }
  }, [authApi]);

  // ดึง threshold: ลอง /sensors ก่อน แล้ว fallback ไป /sensor-thresholds
  const fetchThresholds = useCallback(async () => {
    async function load(url: string) {
      const resp = await authApi(url);
      if (!resp.ok) throw new Error(`${url}: ${resp.status}`);
      const json = await resp.json();
      return Array.isArray(json) ? (json as SensorThreshold[]) : ((json?.rows ?? []) as SensorThreshold[]);
    }

    try {
      let rows: SensorThreshold[] = [];
      try {
        rows = await load("sensors");
      } catch {
        rows = await load("sensor-thresholds");
      }
      setSensorThresholds(rows ?? []);
      console.info("[thresholds] loaded:", rows?.length ?? 0);
    } catch (e) {
      console.error("fetchThresholds error:", e);
      // ❗️อย่าเซ็ต [] ทับของเดิม เพื่อไม่ให้สีหาย ให้คงค่าปัจจุบันไว้
    }
  }, [authApi]);

  /* ---------- build sticky threshold index ---------- */
  useEffect(() => {
    // สร้าง index ใหม่จาก sensorThresholds + sensorTypeById
    const build = () => {
      const idx = new Map<string, Threshold>();

      const put = (key: string, th: Threshold) => {
        for (const v of keyVariants(key)) {
          const cur = idx.get(v);
          const score = (t?: Threshold) => (!t ? -1 : t.min !== null && t.max !== null ? 2 : 1);
          if (!cur || score(th) > score(cur)) idx.set(v, th);
        }
      };

      for (const row of sensorThresholds) {
        const keyFromType = (row as any).sensor_type as string | undefined | null;
        const keyFromId = sensorTypeById[String((row as any).sensor_id ?? "")];
        const key = keyFromType || keyFromId;
        if (!key) continue;

        const min = toNum((row as any).par_threshold_min);
        const max = toNum((row as any).par_threshold_max);
        if (min === null && max === null) continue;

        let display: string | null = null;
        if (min !== null && max !== null && max > min) display = `${min}-${max}`;
        else if (min !== null) display = `>${min}`;
        else if (max !== null) display = `<${max}`;

        put(key, { min, max, display });
      }
      return idx;
    };

    const newIdx = build();
    const oldIdx = thresholdIndexRef.current;

    // ใช้กติกา sticky: ถ้า newIdx.size === 0 ให้ “เก็บของเดิม” ไว้ ไม่ทับ
    if (newIdx.size > 0 || oldIdx.size === 0) {
      thresholdIndexRef.current = newIdx;
      setThTick((x) => x + 1); // กระตุ้นให้ re-render (เพื่ออัปเดต Range/สีทันที)
      console.info("[thresholdIndex] applied size:", newIdx.size);
    } else {
      console.warn("[thresholdIndex] keep last-good (incoming empty).");
    }
  }, [sensorThresholds, sensorTypeById]);

  /* ---------- lookups (อ่านจาก ref) ---------- */
  const getThresholdsForSensor = useCallback((key: string): Threshold | null => {
    const idx = thresholdIndexRef.current;
    const ali = ALIASES[key] ?? key;

    return (
      idx.get(norm(key)) ||
      idx.get(stripSensorPrefix(key)) ||
      idx.get(norm(key).replace(/_/g, "")) ||
      idx.get(stripSensorPrefix(key).replace(/_/g, "")) ||
      idx.get(norm(ali)) ||
      idx.get(stripSensorPrefix(ali)) ||
      idx.get(stripSensorPrefix(ali).replace(/_/g, "")) ||
      idx.get(swap2(ali)) ||
      idx.get(swap2(ali).replace(/_/g, "")) ||
      null
    );
  }, []);

  const getColorForValue = useCallback((value: number | undefined, key: string) => {
    const th = getThresholdsForSensor(key);
    if (value === undefined || th === null) return COLOR.gray;
    const { min, max } = th;

    if (min !== null && max !== null && max > min) {
      const span = max - min;
      if (value < min) { const diff = (min - value) / span; return diff > 0.5 ? COLOR.low2 : COLOR.low1; }
      if (value > max) { const diff = (value - max) / span; if (diff > 0.8) return COLOR.high; if (diff > 0.3) return COLOR.warn2; return COLOR.warn1; }
      const p = (value - min) / span;
      if (p < 0.33) return COLOR.ok1;
      if (p < 0.66) return COLOR.ok2;
      return COLOR.ok3;
    }
    if (min === null && max !== null) {
      if (value <= 0.7 * max) return COLOR.ok2;
      if (value <= max) return COLOR.ok3;
      if (value <= 1.2 * max) return COLOR.warn1;
      if (value <= 1.5 * max) return COLOR.warn2;
      return COLOR.high;
    }
    if (min !== null && max === null) {
      if (value >= 1.3 * min) return COLOR.ok2;
      if (value >= min) return COLOR.ok1;
      if (value >= 0.8 * min) return COLOR.low1;
      return COLOR.low2;
    }
    return COLOR.gray;
  }, [getThresholdsForSensor]);

  /* ---------- “No data …” timer ---------- */
  useEffect(() => {
    setShowNoData(false);
    if (initialLoading) return;
    const hasRenderable = SENSORS.some((s) => {
      const v = sensorValues[s.id];
      return typeof v === "number" && Number.isFinite(v);
    });
    if (hasRenderable) return;
    const t = setTimeout(() => setShowNoData(true), 5000);
    return () => clearTimeout(t);
  }, [initialLoading, sensorValues, selectedDeviceId]);

  /* ---------- fetch data (robust) ---------- */
  const fetchData = useCallback(async () => {
    const deviceId = selectedDeviceId;
    if (!deviceId || inflightRef.current) return;
    inflightRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++reqSeqRef.current;

    try {
      const resp = await authApi(`sensor-data/latest-all/${deviceId}`, { signal: controller.signal } as any);

      if (controller.signal.aborted || activeDeviceRef.current !== deviceId || seq !== reqSeqRef.current) return;

      if (resp.status === 204) {
        setSensorValues({});
        setSensorExtras({});
        setError(null);
      } else if (!resp.ok) {
        setError(`HTTP ${resp.status}`);
      } else {
        let data: SensorData = {};
        try { data = await resp.json(); } catch { data = {}; }

        const valuesOnly: Record<string, number | undefined> = {};
        const extras: Record<string, { unit?: string; stddev?: number; last_updated?: string }> = {};
        Object.entries(data).forEach(([key, val]) => {
          valuesOnly[key] = (val as any).value;
          extras[key] = { unit: (val as any).unit, stddev: (val as any).stddev, last_updated: (val as any).timestamp };
        });

        setSensorValues(valuesOnly);
        setSensorExtras(extras);
        setError(null);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Error fetching sensor data:", err);
        setError("Failed to fetch data");
      }
    } finally {
      inflightRef.current = false;
      if (showSkeletonNextFetchRef.current) {
        if (!abortRef.current?.signal.aborted && activeDeviceRef.current === selectedDeviceId && seq === reqSeqRef.current) {
          setInitialLoading(false);
          showSkeletonNextFetchRef.current = false;
        }
      }
    }
  }, [authApi, selectedDeviceId]);

  /* ---------- init ---------- */
  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;

    showSkeletonNextFetchRef.current = true;
    setInitialLoading(true);

    (async () => {
      await fetchSensorsMaster();
      await fetchThresholds();
      await fetchData();
    })();

    const interval = setInterval(fetchData, 5000);
    return () => { clearInterval(interval); if (abortRef.current) abortRef.current.abort(); };
  }, [fetchSensorsMaster, fetchThresholds, fetchData]);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchSensorsMaster();
      fetchThresholds();
      fetchData();
    }
  }, [selectedDeviceId, fetchSensorsMaster, fetchThresholds, fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchData();
    }, 10000);
    return () => window.clearInterval(id);
  }, [fetchData]);

  /* ---------- render ---------- */
  const hasNumber = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);

  const sensorCards = useMemo(() => {
    if (initialLoading) {
      const count = Math.min(11, SENSORS.length);
      return Array.from({ length: count }).map((_, i) =>
        i === 0 ? <GaugeSkeleton key={`sk-g-${i}`} /> : <div key={`sk-${i}`} className="col-span-1"><SensorSkeleton /></div>
      );
    }

    const cards: React.ReactNode[] = [];

    // const sensorsToRender = SENSORS.filter((s) => hasNumber(sensorValues[s.id]));
    const LastTimeShowCard = 5 * 24 * 60 * 60 * 1000; // แสดงการ์ด 5 วันย้อนหลัง
    const sensorsToRender = SENSORS.filter((s) => {
      const v = sensorValues[s.id];
      const ts = sensorExtras[s.id]?.last_updated;
      if (!hasNumber(v) || !ts) return false;
      return Date.now() - new Date(ts).getTime() <= LastTimeShowCard;
    });


    sensorsToRender.forEach((sensor) => {
      const value = sensorValues[sensor.id] as number;
      const unit = sensorExtras[sensor.id]?.unit;
      const stddev = sensorExtras[sensor.id]?.stddev;


      if (sensor.id === "sensor_pressure_reactor") {
        cards.push(
          <div key={sensor.id} className="bg-white rounded-lg shadow-md p-1 w-full flex flex-col items-center justify-center transition-transform hover:scale-[1.02] hover:shadow-lg col-span-1 row-span-2">
            <div className="flex items-center gap-3 mb-2 text-gray-700">
              {sensor.icon && <div className="text-2xl text-indigo-600">{sensor.icon}</div>}
              <h3 className="text-base font-semibold">{sensor.title}</h3>
            </div>
            <Gauge value={value} min={0} max={50} stddev={stddev} unit={unit || "mbar"} />
          </div>
        );
      } else {
        cards.push(
          <SensorCard
            key={sensor.id}
            title={sensor.title}
            icon={<div className="text-indigo-600 text-xl">{sensor.icon}</div>}
            color={getColorForValue(value, sensor.id)}
            value={Number(value.toFixed(2))}
            unit={unit}
            error={null}
            thresholds={getThresholdsForSensor(sensor.id)}
            lastUpdated={sensorExtras[sensor.id]?.last_updated}
          />
        );
      }
    });

    if (cards.length === 0 && showNoData) {
      cards.push(
        <div key="no-data" className="col-span-full flex flex-col items-center justify-center text-gray-400 text-lg py-20">
          <GaugeCircle className="w-16 h-16 mb-4 opacity-50" />
          No data available for this device.
        </div>
      );
    }

    return cards;
    // เพิ่ม thTick เพื่อให้ re-render เมื่อ index เปลี่ยน
  }, [initialLoading, sensorValues, sensorExtras, getColorForValue, getThresholdsForSensor, showNoData, thTick]);

  return (
    <PageTemplate title="Sensor Data Analytics" showDeviceSelector={true}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 auto-rows-fr gap-0.5 mb-0 px-0.5">
        {sensorCards}
      </div>

      {/* Legend อธิบายความหมายของสี */}
      <ColorLegend />

      <br />
    </PageTemplate>
  );

};

export default React.memo(SensorDataPage);
