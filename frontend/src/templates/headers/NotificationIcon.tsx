import { BellOutlined } from "@ant-design/icons";
import { Badge, Popover, List, Tag, Button } from "antd";
import { useAlerts } from "../../contexts/AlertsContext";

const NotificationIcon = () => {
  const {
    alerts: notifications,
    loading,
    markAsRead,
    markAllAsRead,
  } = useAlerts();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "green";
      default:
        return "default";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const content = (
    <div style={{ width: 300, maxHeight: 350, overflowY: "auto" }}>
      {notifications.length > 0 && (
        <div style={{ marginBottom: 8, textAlign: "right" }}>
          <Button type="link" size="small" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
      )}
      <List
        loading={loading}
        itemLayout="horizontal"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                type="link"
                size="small"
                onClick={() => markAsRead(item.alert_id)}
              >
                Mark as read
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{item.alert_type}</span>
                  <Tag color={getSeverityColor(item.severity)}>
                    {item.severity}
                  </Tag>
                </div>
              }
              description={
                <div>
                  <p style={{ margin: 0 }}>Node: {item.node_name}</p>
                  <p style={{ margin: 0 }}>Sensor: {item.sensor_type}</p>
                  <small style={{ color: "#999" }}>
                    {formatTime(item.timestamp)}
                  </small>
                </div>
              }
            />
          </List.Item>
        )}
      />
      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
          No new notifications
        </div>
      )}
    </div>
  );

  return (
    <Popover content={content} title="Notifications" trigger="click">
      <Badge
        count={notifications.length}
        style={{
          backgroundColor: notifications.some((n) => n.severity === "high")
            ? "#ff4d4f"
            : "#1890ff",
        }}
      >
        <BellOutlined style={{ fontSize: "20px", cursor: "pointer" }} />
      </Badge>
    </Popover>
  );
};

export default NotificationIcon;
