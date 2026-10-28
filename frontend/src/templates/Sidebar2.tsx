import React, { useMemo, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  HomeOutlined,
  DatabaseOutlined,
  FundOutlined,
  ControlOutlined,
  HistoryOutlined,
  AlertOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavLabel =
  | "Overview"
  | "Sensor Data"
  | "Deep Analysis"
  | "Control Panel"
  | "Historical Data"
  | "Alerts"
  | "Settings";

const iconMap: Record<NavLabel, React.ReactNode> = {
  Overview: <HomeOutlined style={{ fontSize: 16 }} />,
  "Sensor Data": <DatabaseOutlined style={{ fontSize: 16 }} />,
  "Deep Analysis": <FundOutlined style={{ fontSize: 16 }} />,
  "Control Panel": <ControlOutlined style={{ fontSize: 16 }} />,
  "Historical Data": <HistoryOutlined style={{ fontSize: 16 }} />,
  Alerts: <AlertOutlined style={{ fontSize: 16 }} />,
  Settings: <SettingOutlined style={{ fontSize: 16 }} />,
};

const navItems: { key: string; label: NavLabel }[] = [
  { key: "/admin/overview", label: "Overview" },
  { key: "/admin/sensor-data", label: "Sensor Data" },
  { key: "/admin/deep-analysis", label: "Deep Analysis" },
  { key: "/admin/control-panel", label: "Control Panel" },
  { key: "/admin/historical-data", label: "Historical Data" },
  { key: "/admin/alerts", label: "Alerts" },
  { key: "/admin/settings", label: "Settings" },
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = useMemo(() => {
    const found = navItems.find((item) => location.pathname.startsWith(item.key));
    return found ? found.key : "";
  }, [location.pathname]);

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
    // ปรับตรงนี้ให้ไม่ขยายเมนูตอนย่อ
    if (!isCollapsed && window.innerWidth < 768) {
      onToggleCollapse();
    }
  };

  return (
    <Sider
      collapsible
      collapsed={isCollapsed}
      onCollapse={onToggleCollapse}
      breakpoint="md"
      collapsedWidth={64}
      width={192}
      style={{
        height: "calc(100vh - 32px)",
        position: "fixed",
        left: 16,
        top: 16,
        bottom: 16,
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        zIndex: 1000,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: "0 16px",
          fontWeight: "bold",
          fontSize: 18,
          color: "#10b981",
          userSelect: "none",
        }}
      >
        {!isCollapsed && <span>Menu</span>}
        <Button
          type="text"
          onClick={onToggleCollapse}
          icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={isCollapsed ? "Open menu" : "Close menu"}
          style={{ color: "#10b981" }}
        />
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        items={navItems.map((item) => ({
          key: item.key,
          icon: iconMap[item.label],
          label: item.label,
        }))}
        style={{ borderRight: 0, fontSize: 18, background: "transparent" }}
      />
    </Sider>
  );
};

export default memo(Sidebar);
