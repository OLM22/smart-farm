import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, Spin } from "antd";
import {
    FireOutlined,
    BulbOutlined,
    ExperimentOutlined,
    CloudOutlined,
    ThunderboltOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

interface SensorValues {
    temp: number | null;
    light: number | null;
    ph: number | null;
    co2: number | null;
    ec: number | null;
    [key: string]: number | null | undefined;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/";

const SENSOR_CONFIG = [
    {
        key: "temp" as const,
        label: "Temperature",
        unit: "°C",
        icon: <FireOutlined />,
        gradient: "from-orange-400 to-red-500",
        bgGlow: "bg-gradient-to-br from-orange-50 to-red-50",
        iconColor: "text-orange-500",
        glowBorder: "border-orange-200",
    },
    {
        key: "light" as const,
        label: "Light",
        unit: "lux",
        icon: <BulbOutlined />,
        gradient: "from-yellow-400 to-amber-500",
        bgGlow: "bg-gradient-to-br from-yellow-50 to-amber-50",
        iconColor: "text-yellow-500",
        glowBorder: "border-yellow-200",
    },
    {
        key: "ph" as const,
        label: "pH",
        unit: "pH",
        icon: <ExperimentOutlined />,
        gradient: "from-indigo-400 to-purple-500",
        bgGlow: "bg-gradient-to-br from-indigo-50 to-purple-50",
        iconColor: "text-indigo-500",
        glowBorder: "border-indigo-200",
    },
    {
        key: "co2" as const,
        label: "CO₂",
        unit: "ppm",
        icon: <CloudOutlined />,
        gradient: "from-teal-400 to-cyan-500",
        bgGlow: "bg-gradient-to-br from-teal-50 to-cyan-50",
        iconColor: "text-teal-500",
        glowBorder: "border-teal-200",
    },
    {
        key: "ec" as const,
        label: "EC",
        unit: "µS/cm",
        icon: <ThunderboltOutlined />,
        gradient: "from-emerald-400 to-green-500",
        bgGlow: "bg-gradient-to-br from-emerald-50 to-green-50",
        iconColor: "text-emerald-500",
        glowBorder: "border-emerald-200",
    },
];

const MAX_HISTORY = 20;
const POLL_INTERVAL = 3000;

// Sparkline SVG component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({
    data,
    color,
}) => {
    if (data.length < 2) return null;

    const width = 120;
    const height = 32;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y =
            height - padding - ((v - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    });

    const areaPoints = [
        `${padding},${height - padding}`,
        ...points,
        `${width - padding},${height - padding}`,
    ].join(" ");

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ maxWidth: width }}
        >
            <polygon points={areaPoints} fill={color} opacity="0.1" />
            <polyline
                points={points.join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Last point dot */}
            {data.length > 0 && (
                <circle
                    cx={
                        padding +
                        ((data.length - 1) / (data.length - 1)) * (width - padding * 2)
                    }
                    cy={
                        height -
                        padding -
                        ((data[data.length - 1] - min) / range) * (height - padding * 2)
                    }
                    r="2.5"
                    fill={color}
                />
            )}
        </svg>
    );
};

// Color map for sparkline strokes
const SPARKLINE_COLORS: Record<string, string> = {
    temp: "#ea580c",
    light: "#d97706",
    ph: "#6366f1",
    co2: "#0d9488",
    ec: "#10b981",
};

const MqttSensorValues: React.FC = () => {
    const [values, setValues] = useState<SensorValues>({
        temp: null,
        light: null,
        ph: null,
        co2: null,
        ec: null,
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeTank, setActiveTank] = useState("Avg");

    // History for sparklines
    const historyRef = useRef<Record<string, number[]>>({
        temp: [],
        light: [],
        ph: [],
        co2: [],
        ec: [],
    });
    const [history, setHistory] = useState<Record<string, number[]>>({
        temp: [],
        light: [],
        ph: [],
        co2: [],
        ec: [],
    });

    // Reference to the previous values to detect changes
    const previousValuesRef = useRef<SensorValues | null>(null);

    const fetchValues = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}mqtt/sensor/values`);
            const data = await res.json();
            if (data.success) {
                // Check if any of the values have actually changed (or if this is the first load)
                const hasChanged = !previousValuesRef.current || Object.keys(data.values).some(
                    (key) => data.values[key] !== previousValuesRef.current?.[key]
                );

                if (hasChanged) {
                    previousValuesRef.current = data.values;
                    setLastUpdated(new Date());
                }

                setValues(data.values);

                // Update history
                const newHistory = { ...historyRef.current };
                Object.keys(data.values).forEach((key) => {
                    const val = data.values[key];
                    if (!newHistory[key]) newHistory[key] = [];
                    if (val !== null && val !== undefined && Number.isFinite(val)) {
                        const arr = [...newHistory[key], val];
                        if (arr.length > MAX_HISTORY) arr.shift();
                        newHistory[key] = arr;
                    }
                });
                historyRef.current = newHistory;
                setHistory({ ...newHistory });
            }
        } catch (err) {
            console.error("Failed to fetch MQTT sensor values:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchValues();
        const interval = setInterval(fetchValues, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchValues]);

    const formatValue = (val: number | null | undefined) => {
        if (val === null || val === undefined) return "--";
        return Number(val.toFixed(2)).toString();
    };

    return (
        <Card
            className="glass-card card-accent-line card-hover-lift !rounded-2xl w-full"
            bodyStyle={{ padding: "16px 20px" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-lg font-bold text-gray-800">
                        Live Sensor Values
                    </span>
                    <button
                        onClick={fetchValues}
                        className="ml-1 text-gray-400 hover:text-green-500 transition-colors"
                        title="Refresh"
                    >
                        <ReloadOutlined spin={loading} />
                    </button>
                </div>
                {lastUpdated && (
                    <span className="text-xs text-gray-400">
                        Updated:{" "}
                        {`${String(lastUpdated.getHours()).padStart(2, "0")}:${String(
                            lastUpdated.getMinutes()
                        ).padStart(2, "0")}:${String(
                            lastUpdated.getSeconds()
                        ).padStart(2, "0")}`}
                    </span>
                )}
            </div>

            {/* Tank Selectors */}
            <div className="flex flex-wrap gap-2 mb-4">
                {["Avg", "Tank 1", "Tank 2", "Tank 3"].map((tank) => (
                    <button
                        key={tank}
                        onClick={() => setActiveTank(tank)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                            activeTank === tank
                                ? "bg-green-600 text-white border-green-600 shadow-md"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-green-300"
                        }`}
                    >
                        {tank}
                    </button>
                ))}
            </div>

            {loading && !lastUpdated ? (
                <div className="flex justify-center py-8">
                    <Spin size="large" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {SENSOR_CONFIG.map((sensor) => {
                        let dataKey: string = sensor.key;
                        if (activeTank !== "Avg" && sensor.key !== "light" && sensor.key !== "co2") {
                            const tankNum = activeTank.split(" ")[1];
                            dataKey = `${sensor.key}${tankNum}`;
                        }
                        const val = values[dataKey];
                        const displayVal = formatValue(val);
                        const sparkData = history[dataKey] || [];

                        return (
                            <div
                                key={sensor.key}
                                className={`relative overflow-hidden rounded-2xl ${sensor.bgGlow} border ${sensor.glowBorder} p-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] flex flex-col justify-between min-h-[130px]`}
                            >
                                {/* Decorative gradient bar */}
                                <div
                                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${sensor.gradient}`}
                                />

                                {/* Top: Icon + Label */}
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-lg ${sensor.iconColor}`}>
                                        {sensor.icon}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {sensor.label}
                                    </span>
                                </div>

                                {/* Center: Big Value + Unit */}
                                <div className="flex items-baseline gap-1.5 my-auto">
                                    <span
                                        className={`text-4xl xl:text-5xl font-extrabold bg-gradient-to-r ${sensor.gradient} bg-clip-text text-transparent leading-none`}
                                    >
                                        {displayVal}
                                    </span>
                                    {sensor.unit && val !== null && val !== undefined && (
                                        <span className="text-base xl:text-lg text-gray-400 font-semibold">
                                            {sensor.unit}
                                        </span>
                                    )}
                                </div>

                                {/* Bottom: Sparkline */}
                                <div className="mt-auto pt-1">
                                    {sparkData.length >= 2 ? (
                                        <Sparkline
                                            data={sparkData}
                                            color={SPARKLINE_COLORS[sensor.key]}
                                        />
                                    ) : (
                                        <div className="h-[32px] flex items-center">
                                            <span className="text-[10px] text-gray-300 italic">
                                                Collecting data...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default React.memo(MqttSensorValues);
