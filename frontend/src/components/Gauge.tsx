import React, { useState, useEffect } from "react";

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  stddev?: number;
  unit?: string;
  lastUpdated?: string;
  staleAfter?: number;
  className?: string;
}

const Gauge: React.FC<GaugeProps> = ({
  value,
  min,
  max,
  stddev,
  unit = "",
  lastUpdated,
  staleAfter = 2,
  className = "",
}) => {
  const [displayValue, setDisplayValue] = useState<number | undefined>(value);
  const [previousValue, setPreviousValue] = useState<number | undefined>();
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!lastUpdated) return;
    const updated = new Date(lastUpdated).getTime();
    const now = Date.now();
    const staleMs = (staleAfter || 2) * 60 * 1000;
    setIsStale(now - updated > staleMs);
  }, [lastUpdated, staleAfter]);

  useEffect(() => {
    if (value !== undefined && value !== displayValue) {
      setPreviousValue(displayValue);
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const clamped = Math.max(min, Math.min(displayValue ?? 0, max));
  const angle = ((clamped - min) / (max - min)) * 180;

  const format = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(2)}K` : n.toFixed(2);

  const formatUnit = (unit: string) => {
    const u = unit.toLowerCase();
    if (u === "celsius" || u === "c") return "°C";
    if (u === "ph") return "";
    return unit;
  };

  const getTrendSymbol = () => {
    if (previousValue === undefined || displayValue === undefined || isStale) return "";
    const delta = displayValue - previousValue;
    if (delta > 0.01) return "↑";
    if (delta < -0.01) return "↓";
    return "→";
  };

  const getTrendColor = () => {
    if (previousValue === undefined || displayValue === undefined || isStale) return "#999";
    const delta = displayValue - previousValue;
    if (delta > 0.01) return "#22c55e"; // green
    if (delta < -0.01) return "#ef4444"; // red
    return "#aaa";
  };

  return (
    <div className={`w-full p-0 overflow-hidden ${className}`}>
      <svg viewBox="10 10 180 110" className="w-full h-auto block">
        {/* Arc */}
        <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#e5e5e5" strokeWidth="16" />
        <path
          d="M20,100 A80,80 0 0,1 180,100"
          fill="none"
          stroke="#0c1f99"
          strokeWidth="16"
          strokeDasharray="251.2"
          strokeDashoffset={251.2 - (angle / 180) * 251.2}
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />

        {/* Centered Value + Unit + Trend Symbol in one line */}
        {!isStale && displayValue !== undefined && (
          <text x="100" y="90" textAnchor="middle" dominantBaseline="middle">
            <tspan fontSize="28" fontWeight="bold" fill="#0c1f99">
              {format(displayValue)}
            </tspan>
            <tspan fontSize="16" fontWeight="normal" fill="#0c1f99" dx="6">
              {formatUnit(unit)}
            </tspan>
            <tspan fontSize="18" fontWeight="normal" fill={getTrendColor()} dx="6">
              {getTrendSymbol()}
            </tspan>
          </text>
        )}

        {/* Min / Max */}
        <text x="32" y="118" textAnchor="middle" fontSize="16" fill="#555" fontWeight="bold">
          {format(min)}
        </text>
        <text x="168" y="118" textAnchor="middle" fontSize="16" fill="#555" fontWeight="bold">
          {format(max)}
        </text>
      </svg>

      {/* stddev */}
      {stddev !== undefined && (
        <div className="text-center mt-1">
          <div className="text-gray-400 text-sm font-medium">Standard Deviation</div>
          <div className="text-gray-700 text-lg font-semibold">{format(stddev)}</div>
        </div>
      )}
    </div>
  );
};

export default Gauge;
