import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoveUp, MoveDown, AlertTriangle } from "lucide-react";

export interface SensorCardProps {
  title: string;
  icon?: React.ReactNode;

  /** สีของตัวเลข (hex เช่น #22C55E). แนะนำส่งจาก getColorForValue(...) */
  color?: string;

  /** ค่าตัวเลขที่จะโชว์บนการ์ด (เช่น 23.45) */
  value?: number;

  /** หน่วย เช่น "ppm", "°C", "ph" (จะซ่อนหากเป็น "ph") */
  unit?: string;

  /** error ข้อความสั้น ๆ ถ้ามี */
  error?: string | null;

  /** threshold ที่ใช้แสดงช่วง และใช้ render เป็นบรรทัด Range: ... */
  thresholds?: {
    min: number | null;
    max: number | null;
    display: string | null;
  } | null;

  /** เวลาอัปเดตค่าเซนเซอร์ล่าสุด (ISO string) ใช้คำนวณ stale */
  lastUpdated?: string;

  /** นาทีที่ถือว่า "stale" (ค่าเริ่มต้น 2 นาที) */
  staleAfter?: number;

  /** ให้สีไปลงกับ unit/trend ด้วยหรือไม่ (ค่าเริ่มต้น: false = ย้อมสีเฉพาะตัวเลข) */
  colorAffectsUnit?: boolean;

  /** เกณฑ์ความต่างขั้นต่ำที่จะแสดงไอคอน trend (เช่น 0.01) */
  trendMinDelta?: number;

  /** แสดง/ซ่อนไอคอน trend (ค่าเริ่มต้น true) */
  showTrend?: boolean;

  /** แสดง/ซ่อนบรรทัด Range: ... (ค่าเริ่มต้น true) */
  showThresholds?: boolean;

  className?: string;
}

const formatUnit = (u?: string) => {
  if (!u) return "";
  const lu = u.toLowerCase();
  // ซ่อนคำว่า "ph" ตามที่ต้องการ
  if (lu === "ph") return "";
  return u;
};

const numberFmt = (n: number) =>
  // ปล่อยให้ SensorDataPage ปัดทศนิยมมาแล้วก็ได้ แต่กันเหนียวเผื่อยังไม่ปัด
  Number.isFinite(n) ? Number(n.toFixed(2)).toString() : "--";

const minutesToMs = (m: number) => m * 60 * 1000;

const SensorCard: React.FC<SensorCardProps> = ({
  title,
  icon,
  color = "#6B7280",
  value,
  unit = "",
  error = null,
  thresholds = null,
  lastUpdated,
  staleAfter = 2,
  colorAffectsUnit = false,
  trendMinDelta = 0.01,
  showTrend = true,
  showThresholds = true,
  className = "",
}) => {
  // เก็บค่าเดิมเพื่อเทียบ trend
  const prevValueRef = useRef<number | undefined>(undefined);
  const [isTransitioning, setTransitioning] = useState(false);

  // เมื่อค่า value เปลี่ยน ให้ทำ transition เล็กน้อยและจำ previous value
  useEffect(() => {
    setTransitioning(true);
    const t = setTimeout(() => setTransitioning(false), 180);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const previousValue = prevValueRef.current;

  // คำนวณสถานะ stale
  const isStale = useMemo(() => {
    if (!lastUpdated) return false; // ถ้าไม่มีเวลาอัปเดต ให้ถือว่าไม่ stale
    const ts = new Date(lastUpdated).getTime();
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts > minutesToMs(staleAfter);
  }, [lastUpdated, staleAfter]);

  const displayValue = useMemo(() => {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    return numberFmt(value);
  }, [value]);

  const getTrendIcon = () => {
    if (!showTrend) return null;
    if (previousValue === undefined || value === undefined || isStale) return null;

    const delta = value - previousValue;
    if (delta > trendMinDelta) return <MoveUp size={18} className="ml-1" />;
    if (delta < -trendMinDelta) return <MoveDown size={18} className="ml-1" />;
    return null;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-3 w-full flex flex-col justify-between transition-transform hover:scale-[1.01] hover:shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        {icon ? <div className="text-xl">{icon}</div> : null}
        <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
      </div>

      {/* Value */}
      <div className="mt-2">
        {error ? (
          <div className="text-red-600 text-sm font-semibold">Error</div>
        ) : (
          <div className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-1">
            {isStale || displayValue === undefined ? (
              <div className="flex items-center gap-1 text-gray-400">
                -- <AlertTriangle size={16} className="text-yellow-500" />
              </div>
            ) : (
              <>
                {/* เลข: ได้รับสี */}
                <span
                  style={{ color }}
                  className={`transition-all duration-300 ease-in-out ${
                    isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
                  }`}
                >
                  {displayValue}
                </span>

                {/* หน่วย + trend: แยก span ออกจากสีหลัก
                    - ถ้า colorAffectsUnit=true จะย้อมสีตามเลข
                    - ถ้า false จะเป็นสีเทาอิสระ */}
                {formatUnit(unit) && (
                  <span
                    className={`text-base sm:text-lg lg:text-xl ml-1 inline-flex items-center ${
                      colorAffectsUnit ? "" : "text-gray-500"
                    }`}
                    style={colorAffectsUnit ? { color } : undefined}
                  >
                    {formatUnit(unit)}
                    {getTrendIcon()}
                  </span>
                )}
                {!formatUnit(unit) && getTrendIcon()}
              </>
            )}
          </div>
        )}

        {/* Thresholds */}
        {showThresholds && thresholds?.display && (
          <div className="text-xs text-gray-500 mt-1">
            Range: {thresholds.display} {formatUnit(unit) ? formatUnit(unit) : ""}
          </div>
        )}

        {/* เวลาอัปเดต (ถ้ามี) */}
        {lastUpdated && (
          <div className="text-[10px] text-gray-400 mt-1">
            Updated:{" "}
            {new Date(lastUpdated).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SensorCard);
