import React from "react";
import { Card, Tabs } from "antd";
import type { TabsProps } from "antd";
import PageTemplate from "../templates/PageTemplate2";
import UserRegistrationForm from "../components/UserRegistrationForm";
import NodeForm from "../components/NodeForm";
import SensorForm from "../components/SensorForm";

const SettingsPage: React.FC = () => {
  const handleSuccess = () => {
    // You can add any common success handling here
    // For example, refreshing data or showing a notification
  };

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Register User",
      children: <UserRegistrationForm onSuccess={handleSuccess} />,
    },
    {
      key: "2",
      label: "Create Node",
      children: <NodeForm onSuccess={handleSuccess} />,
    },
    {
      key: "3",
      label: "Create Sensor",
      children: <SensorForm onSuccess={handleSuccess} />,
    },
  ];

  return (
    <PageTemplate title="Settings" showDeviceSelector={false}>
      <Card className="glass-card card-hover-lift">
        <Tabs defaultActiveKey="1" items={items} />
      </Card>
    </PageTemplate>
  );
};

export default SettingsPage;
