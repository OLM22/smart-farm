import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import DashboardHeader from "./DashboardHeader2";
import Sidebar from "./Sidebar2";
import Footbar from "./footers/Footerbar";
import { useDevice } from "../contexts/DeviceContext";
import { Select } from "antd";
import { Box, Columns4, Columns3 } from "lucide-react";

interface PageTemplateProps {
  children: ReactNode;
  title: string;
  onDeviceIdChange?: (deviceId: string) => void;
  showDeviceSelector?: boolean;
}

const PageTemplate: React.FC<PageTemplateProps> = ({
  children,
  title,
  onDeviceIdChange,
  showDeviceSelector = true,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { selectedDeviceId, setSelectedDeviceId, deviceIds } = useDevice();

  // จำนวน Device
  const safeDeviceIds = Array.isArray(deviceIds) ? deviceIds : [];
  const deviceCount = safeDeviceIds.length;

  // ข้อความไดนามิกตามจำนวน
  const labelText = useMemo(() => {
    if (deviceCount === 0) return "No reactors available.";
    if (deviceCount === 1) return "Reactor:";
    return "Reactors — Select:";
  }, [deviceCount]);

  // default select ตัวแรกถ้ายังไม่เลือก/ไม่อยู่ในลิสต์
  useEffect(() => {
    if (deviceCount > 0 && (!selectedDeviceId || !safeDeviceIds.includes(selectedDeviceId))) {
      const first = safeDeviceIds[0];
      setSelectedDeviceId(first);
      onDeviceIdChange?.(first);
    }
  }, [deviceCount, safeDeviceIds, selectedDeviceId, setSelectedDeviceId, onDeviceIdChange]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsSidebarCollapsed(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDeviceIdChange = useCallback(
    (value: string) => {
      setSelectedDeviceId(value);
      onDeviceIdChange?.(value);
    },
    [onDeviceIdChange, setSelectedDeviceId]
  );

  const mainContentClasses = useMemo(
    () =>
      `flex-1 flex flex-col overflow-hidden transition-all duration-300 relative ${
        isSidebarCollapsed ? "ml-24 text-base" : "ml-56 text-sm"
      }`,
    [isSidebarCollapsed]
  );

  const titleClasses = useMemo(
    () =>
      `font-bold text-gray-800 ${isSidebarCollapsed ? "text-2xl" : "text-xl"}`,
    [isSidebarCollapsed]
  );

  // เลือกไอคอนตามลำดับ
  const iconForIndex = (idx: number) => {
    if (idx === 0) return <Box className="w-4 h-4" />;
    if (idx === 1) return <Columns4 className="w-4 h-4" />;
    if (idx === 2) return <Columns3 className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

  // options สำหรับ antd Select (label รองรับ JSX)
  const deviceOptions = useMemo(
    () =>
      safeDeviceIds.map((id, idx) => ({
        value: id,
        label: (
          <div className="flex items-center gap-2">
            {iconForIndex(idx)}
            <span>{id}</span>
          </div>
        ),
      })),
    [safeDeviceIds]
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f3f7f4] via-[#ebf0ec] to-[#dfe7e2]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content */}
      <div className={mainContentClasses}>
        {/* Header */}
        <div className="pt-4 pr-4 pl-4 z-10 flex-shrink-0">
          <DashboardHeader />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Page Title and Device ID Selector */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className={titleClasses}>{title}</h1>
            </div>

            {showDeviceSelector && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="deviceId"
                    className="text-gray-700 font-medium flex items-center gap-2"
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                        deviceCount === 0
                          ? "bg-gray-200 text-gray-600"
                          : "bg-green-100 text-green-700"
                      }`}
                      title={`Total devices: ${deviceCount}`}
                    >
                      {deviceCount}
                    </span>
                    {labelText}
                  </label>

                  <Select
                    id="deviceId"
                    className="min-w-[240px]"
                    value={selectedDeviceId ?? undefined}
                    onChange={handleDeviceIdChange}
                    options={deviceOptions}
                    disabled={deviceCount === 0}
                    // ให้แสดง label (ที่มีไอคอน) บน control ด้วย
                    optionLabelProp="label"
                    // สไตล์ให้เข้ากับ tailwind โทนเดิม
                    popupClassName="!rounded-md"
                    // placeholder ตอนไม่มีอุปกรณ์
                    placeholder={deviceCount === 0 ? "No devices" : "Select device"}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Page Content */}
          {children}

          {/* Footer */}
          <Footbar />
        </div>
      </div>
    </div>
  );
};

export default React.memo(PageTemplate);
