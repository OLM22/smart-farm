import React, { useState } from "react";
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAuthApiPost } from "../../api/authApi";

const ProfileMenu: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const post = useAuthApiPost();

  const handleLogout = async () => {
    try {
      // Log the logout activity
      await post("user-logs", {
        activity: `[${user?.username}] User logged out`,
      });
    } catch (error) {
      console.error("Failed to log logout activity:", error);
    } finally {
      logout();
      navigate("/login");
    }
  };

  const menuItems = [
    { key: "1", label: "Profile", icon: <UserOutlined /> },
    { key: "2", label: "Settings", icon: <SettingOutlined /> },
    {
      key: "3",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <UserOutlined style={{ fontSize: "16px", color: "white" }} />
        </div>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.username || "User"}
            </p>
            <p className="text-xs text-gray-500">{user?.role || "User"}</p>
          </div>
          {menuItems.map((item) => (
            <button
              key={item.key}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={item.onClick}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
