import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  DatePicker,
  message,
} from "antd";
import dayjs from "dayjs";
import { useAuthApiPost } from "../api/authApi";

const { Option } = Select;

interface SensorFormData {
  sensor_id: string;
  node_id: string;
  sensor_type: string;
  position: string;
  par_threshold_min: number;
  par_threshold_max: number;
  set_data_record_time: number;
  unit: string;
  status: string;
  last_calibrated: string;
}

interface SensorFormProps {
  onSuccess?: () => void;
}

const SensorForm: React.FC<SensorFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const authApiPost = useAuthApiPost();

  const handleSubmit = async (values: SensorFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setLoading(true);

      // Convert dayjs object to ISO string if it exists
      const formattedValues = {
        ...values,
        last_calibrated: values.last_calibrated
          ? dayjs(values.last_calibrated).toISOString()
          : null,
        // Format set_data_record_time from seconds to HH:mm:ss
        set_data_record_time: new Date(values.set_data_record_time * 1000)
          .toISOString()
          .substr(11, 8),
      };

      const createRes = await authApiPost("sensors", formattedValues);
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create sensor");
      }

      // Log the sensor creation activity
      const logRes = await authApiPost("user-logs/with-node-id", {
        node_id: values.node_id,
        activity: `[${user?.username}] Created new sensor: ${values.sensor_id} (${values.sensor_type}) for node ${values.node_id}`,
      });
      if (!logRes.ok) {
        const errData = await logRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to log sensor creation");
      }

      message.success("Sensor created successfully");
      form.resetFields();
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || "Failed to create sensor");
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
        name="sensor_id"
        label="Sensor ID"
        rules={[
          { required: true, message: "Please input sensor ID!" },
          {
            pattern: /^[A-Za-z0-9_-]+$/,
            message:
              "Sensor ID can only contain letters, numbers, underscores, and hyphens",
          },
        ]}
      >
        <Input placeholder="Enter sensor ID" maxLength={20} showCount />
      </Form.Item>

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
        name="sensor_type"
        label="Sensor Type"
        rules={[
          { required: true, message: "Please input sensor type!" },
          { max: 50, message: "Sensor type must be less than 50 characters" },
        ]}
      >
        <Input placeholder="Enter sensor type" maxLength={50} showCount />
      </Form.Item>

      <Form.Item
        name="position"
        label="Position"
        rules={[
          { required: true, message: "Please input position!" },
          { max: 50, message: "Position must be less than 50 characters" },
        ]}
      >
        <Input placeholder="Enter position" maxLength={50} showCount />
      </Form.Item>

      <Form.Item
        name="par_threshold_min"
        label="Min Threshold"
        rules={[{ required: true, message: "Please input min threshold!" }]}
      >
        <InputNumber
          style={{ width: "100%" }}
          placeholder="Enter minimum threshold"
        />
      </Form.Item>

      <Form.Item
        name="par_threshold_max"
        label="Max Threshold"
        rules={[{ required: true, message: "Please input max threshold!" }]}
      >
        <InputNumber
          style={{ width: "100%" }}
          placeholder="Enter maximum threshold"
        />
      </Form.Item>

      <Form.Item
        name="set_data_record_time"
        label="Data Record Time (seconds)"
        rules={[{ required: true, message: "Please input data record time!" }]}
      >
        <InputNumber
          style={{ width: "100%" }}
          min={1}
          placeholder="Enter data record time in seconds"
        />
      </Form.Item>

      <Form.Item
        name="unit"
        label="Unit"
        rules={[
          { required: true, message: "Please input unit!" },
          { max: 20, message: "Unit must be less than 20 characters" },
        ]}
      >
        <Input
          placeholder="Enter unit (e.g., °C, %, etc.)"
          maxLength={20}
          showCount
        />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: "Please select status!" }]}
      >
        <Select placeholder="Select status">
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
          <Option value="calibration">Calibration</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="last_calibrated"
        label="Last Calibrated"
        rules={[
          {
            required: true,
            message: "Please select calibration date and time!",
          },
        ]}
      >
        <DatePicker
          showTime={{
            format: "HH:mm",
            defaultValue: dayjs("00:00:00", "HH:mm:ss"),
          }}
          format="YYYY-MM-DD HH:mm"
          style={{ width: "100%" }}
          placeholder="Select calibration date and time"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={isSubmitting}
        >
          Create Sensor
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SensorForm;
