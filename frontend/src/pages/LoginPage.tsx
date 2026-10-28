import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { publicApiPost } from "../api/publicApi";
import { useAuthApiPost } from "../api/authApi";

import {
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Card,
  Checkbox,
  Grid,
} from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const authApiPost = useAuthApiPost();
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const screens = useBreakpoint();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (values: {
    username: string;
    password: string;
    remember?: boolean;
  }) => {
    setError("");
    setLoading(true);

    try {
      const response = await publicApiPost("/auth/login", values);
      const data = await response.json();

      if (response.ok && data.user) {
        login(data.user); // AuthContext will handle sessionStorage
        setJustLoggedIn(true);
      } else {
        setError(data.message || "Login failed: Invalid response from server.");
      }
    } catch (err: any) {
      let message = "An error occurred";
      if (err instanceof Response) {
        try {
          const errorData = await err.json();
          message = errorData.message || message;
        } catch { }
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Log login activity once after login
  useEffect(() => {
    if (justLoggedIn && user) {
      authApiPost("/user-logs", {
        activity: `[${user.username}] User logged in`,
      });
      setJustLoggedIn(false);
    }
  }, [justLoggedIn, user]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to right, #e0f2ff, #d0d7ff)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <Card
        style={{
          width: screens.xs ? "100%" : 400,
          maxWidth: 400,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
        bordered={false}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src="/logo.png"
            alt="Kasetsart University Smart Farm Logo"
            style={{
              height: screens.xs ? 55 : 75,
              marginBottom: 16,
              objectFit: "contain",
            }}
          />
          <Title level={screens.xs ? 4 : 3} style={{ margin: 0 }}>
            Welcome Back
          </Title>
          <Text type="secondary" style={{ fontSize: screens.xs ? 12 : 14 }}>
            Please sign in to your account
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please input your username" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Enter your username"
              autoComplete="username"
              size={screens.xs ? "middle" : "large"}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please input your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
              size={screens.xs ? "middle" : "large"}
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size={screens.xs ? "middle" : "large"}
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
