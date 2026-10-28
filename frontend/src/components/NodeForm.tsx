import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Form, Input, Button, Select, message } from "antd";
import { useAuthApiPost } from "../api/authApi";

const { Option } = Select;

interface NodeFormData {
  node_id: string;
  node_name: string;
  location: string;
  status: string;
}

interface NodeFormProps {
  onSuccess?: () => void;
}

const NodeForm: React.FC<NodeFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const authApiPost = useAuthApiPost();

  const handleSubmit = async (values: NodeFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setLoading(true);
      const createRes = await authApiPost("nodes", values);
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create node");
      }
      // Log the node creation activity
      const logRes = await authApiPost("user-logs/with-node-id", {
        node_id: values.node_id,
        activity: `[${user?.username}] Created new node: ${values.node_id} (${values.node_name})`,
      });
      if (!logRes.ok) {
        const errData = await logRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to log node creation");
      }
      message.success("Node created successfully");
      form.resetFields();
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || "Failed to create node");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      style={{ maxWidth: 600 }}
    >
      <Form.Item
        name="node_id"
        label="Node ID"
        rules={[
          { required: true, message: "Please input node ID!" },
          {
            pattern: /^[A-Za-z0-9_-]+$/,
            message:
              "Node ID can only contain letters, numbers, underscores, and hyphens",
          },
        ]}
      >
        <Input placeholder="Enter node ID" maxLength={20} showCount />
      </Form.Item>

      <Form.Item
        name="node_name"
        label="Node Name"
        rules={[
          { required: true, message: "Please input node name!" },
          { max: 50, message: "Node name must be less than 50 characters" },
        ]}
      >
        <Input placeholder="Enter node name" maxLength={50} showCount />
      </Form.Item>

      <Form.Item
        name="location"
        label="Location"
        rules={[
          { required: true, message: "Please input location!" },
          { max: 100, message: "Location must be less than 100 characters" },
        ]}
      >
        <Input placeholder="Enter location" maxLength={100} showCount />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: "Please select status!" }]}
      >
        <Select placeholder="Select status">
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
          <Option value="maintenance">Maintenance</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={isSubmitting}
        >
          Create Node
        </Button>
      </Form.Item>
    </Form>
  );
};

export default NodeForm;
