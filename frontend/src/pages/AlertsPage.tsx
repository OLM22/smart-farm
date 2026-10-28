import React, { useState, useEffect } from "react";
import PageTemplate from "../templates/PageTemplate2";
import { Table, Tag, Select, Space, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useAlerts } from "../contexts/AlertsContext";

const { Option } = Select;

const AlertsPage: React.FC = () => {
  const { alerts, loading, markAsRead } = useAlerts();
  const [selectedNode, setSelectedNode] = useState<string>("all");
  const [nodeNames, setNodeNames] = useState<string[]>([]);

  // Update node names when alerts change
  useEffect(() => {
    const uniqueNodeNames = [
      ...new Set(alerts.map((alert) => alert.node_name)),
    ];
    setNodeNames(uniqueNodeNames);
  }, [alerts]);

  const filteredAlerts =
    selectedNode === "all"
      ? alerts
      : alerts.filter((alert) => alert.node_name === selectedNode);

  const columns = [
    {
      title: "Alert ID",
      dataIndex: "alert_id",
      key: "alert_id",
    },
    {
      title: "Node Name",
      dataIndex: "node_name",
      key: "node_name",
    },
    {
      title: "Sensor Type",
      dataIndex: "sensor_type",
      key: "sensor_type",
    },
    {
      title: "Alert Type",
      dataIndex: "alert_type",
      key: "alert_type",
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => (
        <Tag
          color={
            severity === "high"
              ? "red"
              : severity === "medium"
              ? "orange"
              : "green"
          }
        >
          {severity.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "is_read",
      key: "is_read",
      render: (isRead: boolean) => (
        <Tag color={isRead ? "green" : "red"}>{isRead ? "Read" : "Unread"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => markAsRead(record.alert_id)}
            disabled={record.is_read}
          >
            Mark as Read
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageTemplate title="Alerts Management" showDeviceSelector={false}>
      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          value={selectedNode}
          onChange={setSelectedNode}
          placeholder="Filter by Node"
        >
          <Option value="all">All Nodes</Option>
          {nodeNames.map((nodeName) => (
            <Option key={nodeName} value={nodeName}>
              {nodeName}
            </Option>
          ))}
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredAlerts}
        rowKey="alert_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
        style={{ overflowX: "auto" }}
      />
    </PageTemplate>
  );
};

export default React.memo(AlertsPage);
