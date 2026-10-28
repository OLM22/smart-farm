import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import OverviewPage from "./pages/OverviewPage";
import SensorDataPage from "./pages/SensorDataPage";
import DeepAnalysisPage from "./pages/DeepAnalysisPage";
import { DeviceProvider } from "./contexts/DeviceContext";
import HistoricalDataPage2 from "./pages/HistoricalDataPage2";
import AlertsPage from "./pages/AlertsPage";
import { AlertsProvider } from "./contexts/AlertsContext";
import ControlPanelPage from "./pages/ControlPanelPage";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/LoginPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./protectedRoutes/ProtectedRoute";

// Component that wraps authenticated routes with AlertsProvider
function AuthenticatedApp() {
  return (
    <AlertsProvider>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/admin" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Navigate to="/admin/overview" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/overview"
          element={
            <ProtectedRoute>
              <OverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sensor-data"
          element={
            <ProtectedRoute>
              <SensorDataPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/historical-data"
          element={
            <ProtectedRoute>
              <HistoricalDataPage2 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/deep-analysis"
          element={
            <ProtectedRoute>
              <DeepAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/control-panel"
          element={
            <ProtectedRoute>
              <ControlPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        {/* Catch all route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AlertsProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#10b981",
            colorLink: "#10b981",
            colorLinkHover: "#059669",
            borderRadius: 8,
          },
        }}
      >
        <DeviceProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </div>
        </DeviceProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
