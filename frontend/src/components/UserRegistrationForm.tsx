import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Form, Input, Button, Select, message, Progress, Space } from "antd";
import { useAuthApiPost } from "../api/authApi";

const { Option } = Select;

interface PasswordStrength {
  score: number;
  feedback: string;
}

interface UserFormData {
  username: string;
  password: string;
  email: string;
  role: string;
}

interface UserRegistrationFormProps {
  onSuccess?: () => void;
}

const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const authApiPost = useAuthApiPost();

  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length < 8) {
      feedback.push("Password should be at least 8 characters long");
    } else {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Include uppercase letters");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Include lowercase letters");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Include numbers");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Include special characters");
    }

    return {
      score: (score / 5) * 100,
      feedback: feedback.join(", "),
    };
  };

  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, "").trim();
  };

  const handleSubmit = async (values: UserFormData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setLoading(true);
      const sanitizedValues = {
        ...values,
        username: sanitizeInput(values.username),
        email: sanitizeInput(values.email),
      };
      if (passwordStrength.score < 60) {
        message.error(
          "Password is too weak. Please follow the password requirements."
        );
        return;
      }
      const registerRes = await authApiPost("auth/register", sanitizedValues);
      if (!registerRes.ok) {
        const errData = await registerRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to register user");
      }
      // Log the user registration activity
      const logRes = await authApiPost("user-logs", {
        activity: `[${user?.username}] Registered new user: ${sanitizedValues.username} with role ${sanitizedValues.role}`,
      });
      if (!logRes.ok) {
        const errData = await logRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to log registration");
      }
      message.success("User registered successfully");
      form.resetFields();
      setPasswordStrength({ score: 0, feedback: "" });
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || "Failed to register user");
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
      validateTrigger={["onChange", "onBlur"]}
    >
      <Form.Item
        name="username"
        label="Username"
        rules={[
          { required: true, message: "Please input username!" },
          { min: 3, message: "Username must be at least 3 characters" },
          { max: 20, message: "Username must be less than 20 characters" },
          {
            pattern: /^[a-zA-Z0-9_-]+$/,
            message:
              "Username can only contain letters, numbers, underscores, and hyphens",
          },
        ]}
      >
        <Input maxLength={20} showCount placeholder="Enter username" />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[
          { required: true, message: "Please input password!" },
          { min: 8, message: "Password must be at least 8 characters" },
          {
            validator: (_, value) => {
              if (value && passwordStrength.score < 60) {
                return Promise.reject(new Error("Password is too weak"));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.Password
          onChange={(e) => {
            const strength = checkPasswordStrength(e.target.value);
            setPasswordStrength(strength);
          }}
          placeholder="Enter password"
        />
      </Form.Item>

      {passwordStrength.score > 0 && (
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Progress
            percent={passwordStrength.score}
            status={passwordStrength.score < 60 ? "exception" : "success"}
            size="small"
          />
          <span style={{ fontSize: "12px", color: "#666" }}>
            {passwordStrength.feedback}
          </span>
        </Space>
      )}

      <Form.Item
        name="confirmPassword"
        label="Confirm Password"
        dependencies={["password"]}
        rules={[
          { required: true, message: "Please confirm your password!" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Passwords do not match!"));
            },
          }),
        ]}
      >
        <Input.Password placeholder="Confirm password" />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: "Please input email!" },
          { type: "email", message: "Please enter a valid email!" },
          { max: 100, message: "Email must be less than 100 characters" },
        ]}
      >
        <Input type="email" placeholder="Enter email" maxLength={100} />
      </Form.Item>

      <Form.Item
        name="role"
        label="Role"
        rules={[{ required: true, message: "Please select role!" }]}
      >
        <Select placeholder="Select role">
          <Option value="admin">Admin</Option>
          <Option value="user">User</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={isSubmitting || passwordStrength.score < 60}
        >
          Register User
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UserRegistrationForm;
