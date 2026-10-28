# EGAT-AIoT Dashboard (Chlorella Web) — Project Overview

ระบบ Dashboard สำหรับ monitoring และ control อุปกรณ์ AIoT ของ EGAT โดยเน้นการเพาะเลี้ยง Chlorella (สาหร่ายเซลล์เดียว) ผ่าน sensor, MQTT, camera และ Telegram bot

---

## Tech Stack

| Layer        | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| **Frontend** | React 18 · TypeScript · Vite 5 · Tailwind CSS 4 · Ant Design 5 · Lucide Icons |
| **Backend**  | Node.js · Express 4 · Mongoose (MongoDB) · pg (PostgreSQL)  |
| **Realtime** | MQTT 5 (ทั้ง backend และ frontend)                            |
| **Charts**   | ApexCharts · Chart.js (react-chartjs-2)                      |
| **Auth**     | JWT (jsonwebtoken) · bcrypt · API Key middleware              |
| **Deploy**   | Nginx · PM2 · Python venv (Telegram bot)                     |

---

## Project Structure

```
Chlorella_web/
├── README.md
├── package-lock.json
│
├── backend/                     # Express API server (port 4000)
│   ├── server.js                # Entry point — Express app, DB connections, route mounting
│   ├── package.json
│   ├── control.json
│   ├── middleware/
│   │   └── apiKeyMiddleware.js  # API key authentication middleware
│   ├── models/
│   │   ├── db.js                # PostgreSQL client factory
│   │   ├── controls.js          # Mongoose schema — Control (timestamp, data)
│   │   └── sensorData.js       # Mongoose schema — SensorData (timestamp, sensor_type, device_id, unit, location, batch_no, value)
│   └── routes/
│       ├── auth.js              # Authentication (login/register) — public, rate-limited
│       ├── mqtt.js              # MQTT relay control — public
│       ├── sensorData.js        # Sensor data CRUD — protected
│       ├── sensors.js           # Sensor management — protected
│       ├── alerts.js            # Alert rules & notifications — protected
│       ├── nodes.js             # Node/device management — protected
│       ├── system_setting.js    # System settings — protected
│       ├── camera_data.js       # Camera data — protected
│       ├── cell_analysis.js     # Cell analysis results — protected
│       ├── imageAnalysis.js     # Image analysis — protected
│       ├── user_logs.js         # User activity logs — protected
│       └── device_status_logs.js # Device status logs — protected
│
└── frontend/                    # React SPA (Vite dev port 5173)
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── eslint.config.js
    ├── package.json
    ├── public/                  # Static assets
    └── src/
        ├── main.tsx             # App entry — BrowserRouter
        ├── App.tsx              # Root component — AuthProvider > ConfigProvider > DeviceProvider > Routes
        ├── App.css
        ├── index.css
        ├── vite-env.d.ts
        │
        ├── api/
        │   ├── authApi.ts       # Auth API calls (login, register, token)
        │   └── publicApi.ts     # Public API calls (no auth)
        │
        ├── contexts/
        │   ├── AuthContext.tsx   # Authentication state & JWT management
        │   ├── AlertsContext.tsx # Alerts state & real-time updates
        │   └── DeviceContext.tsx # Device/node state management
        │
        ├── protectedRoutes/
        │   └── ProtectedRoute.tsx # Route guard — redirects to /login if unauthenticated
        │
        ├── pages/
        │   ├── LoginPage.tsx           # /login
        │   ├── OverviewPage.tsx        # /admin/overview — Dashboard summary
        │   ├── SensorDataPage.tsx      # /admin/sensor-data — Real-time sensor display
        │   ├── HistoricalDataPage2.tsx # /admin/historical-data — Historical charts
        │   ├── DeepAnalysisPage.tsx    # /admin/deep-analysis — AI/deep analysis
        │   ├── AlertsPage.tsx          # /admin/alerts — Alert management
        │   ├── ControlPanelPage.tsx    # /admin/control-panel — Device controls
        │   └── SettingsPage.tsx        # /admin/settings — System settings
        │
        ├── components/
        │   ├── SensorCard.tsx          # Sensor data display card
        │   ├── Gauge.tsx               # Gauge meter component
        │   ├── LineChart.tsx           # Line chart (ApexCharts)
        │   ├── LineChartWithBrush.tsx  # Line chart with brush zoom
        │   ├── DonutChart.tsx          # Donut chart
        │   ├── Co2DiffChart.tsx        # CO₂ differential chart
        │   ├── GasEcDualChart.tsx      # Gas & EC dual-axis chart
        │   ├── ChartPopup.tsx          # Chart popup/modal
        │   ├── Co2Control.tsx          # CO₂ control panel
        │   ├── GasControl.tsx          # Gas control panel
        │   ├── LightControl.tsx        # Light control panel
        │   ├── PhControl.tsx           # pH control panel
        │   ├── So2Control.tsx          # SO₂ control panel
        │   ├── WaterControl.tsx        # Water control panel
        │   ├── BatchSelector.tsx       # Batch selection dropdown
        │   ├── DatetimePicker.tsx      # Datetime picker
        │   ├── TimeRangePicker.tsx     # Time range picker
        │   ├── NodeForm.tsx            # Node create/edit form
        │   ├── SensorForm.tsx          # Sensor create/edit form
        │   └── UserRegistrationForm.tsx # User registration form
        │
        ├── templates/
        │   ├── PageTemplate2.tsx       # Main page layout wrapper
        │   ├── DashboardHeader2.tsx    # Dashboard header bar
        │   ├── Sidebar2.tsx            # Sidebar navigation menu
        │   ├── headers/
        │   │   ├── AddUserButton.tsx   # Add user button
        │   │   ├── NotificationIcon.tsx # Notification bell icon
        │   │   ├── TimeDisplay.tsx     # Current time display
        │   │   └── UserIcon.tsx        # User avatar/menu
        │   └── footers/
        │       └── Footerbar.tsx       # Footer bar
        │
        └── types/
            └── images.d.ts            # Image module type declarations

```

---

## API Endpoints

| Method | Endpoint                   | Auth     | Description                 |
| ------ | -------------------------- | -------- | --------------------------- |
| *      | `/api/auth`                | Public (rate-limited) | Login / Register   |
| *      | `/api/mqtt`                | Public   | MQTT relay control           |
| *      | `/api/sensor-data`         | API Key  | Sensor data CRUD             |
| *      | `/api/image-analysis`      | API Key  | Image analysis               |
| *      | `/api/sensors`             | API Key  | Sensor management            |
| *      | `/api/alerts`              | API Key  | Alert rules & notifications  |
| *      | `/api/nodes`               | API Key  | Node/device management       |
| *      | `/api/system-settings`     | API Key  | System settings              |
| *      | `/api/camera-data`         | API Key  | Camera data                  |
| *      | `/api/cell-analysis`       | API Key  | Cell analysis results        |
| *      | `/api/user-logs`           | API Key  | User activity logs           |
| *      | `/api/device-status-logs`  | API Key  | Device status logs           |

---

## Database

### MongoDB (chlorella-aiot-cluster)

- **SensorData** — `timestamp`, `sensor_type`, `device_id`, `unit`, `location`, `batch_no`, `value`
- **Control** — `timestamp`, `data` (Mixed)

### PostgreSQL

- ใช้ `pg` client ผ่าน env variables: `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT`

---

## Frontend Routing

| Route                    | Page               | Description               |
| ------------------------ | ------------------ | ------------------------- |
| `/login`                 | LoginPage          | Authentication            |
| `/admin/overview`        | OverviewPage       | Dashboard summary         |
| `/admin/sensor-data`     | SensorDataPage     | Real-time sensors         |
| `/admin/historical-data` | HistoricalDataPage2 | Historical data & charts |
| `/admin/deep-analysis`   | DeepAnalysisPage   | AI/deep analysis          |
| `/admin/alerts`          | AlertsPage         | Alert management          |
| `/admin/control-panel`   | ControlPanelPage   | Device controls (CO₂, Gas, Light, pH, SO₂, Water) |
| `/admin/settings`        | SettingsPage       | System settings           |

> `/` และ `/admin` redirect ไปที่ `/admin/overview` อัตโนมัติ

---

## Key Architecture Patterns

1. **Context Providers** — `AuthProvider` → `ConfigProvider` (Ant Design) → `DeviceProvider` → `AlertsProvider` (nested inside protected routes)
2. **Protected Routes** — `ProtectedRoute` component checks auth state; redirects to `/login` if unauthenticated
3. **API Key Middleware** — `apiKeyMiddleware.js` verifies API key header on all protected backend routes
4. **Rate Limiting** — Auth routes are rate-limited to 5 requests/minute per IP
5. **Dual Database** — MongoDB for document-based data (sensors, controls); PostgreSQL for relational data
6. **MQTT Integration** — Both backend (relay control) and frontend (real-time data subscription) connect to MQTT broker

---

## Environment Variables

ต้องมีไฟล์ `.env` 2 ไฟล์:

### Backend `.env`
- `MONGODB_URI` — MongoDB connection string
- `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT` — PostgreSQL
- `PORT` — Server port (default: 4000)

### Frontend `.env`
- Vite environment variables (e.g. `VITE_API_URL`, `VITE_MQTT_*`)

---

## Development

```bash
# Backend
cd backend && npm install && npm run dev    # nodemon on port 4000

# Frontend
cd frontend && npm install && npm run dev   # Vite on port 5173
```

## Production Deployment

- **Frontend** → `npm run build` → rsync to `/var/www/egat-aiot/` → served by **Nginx**
- **Backend** → `pm2 start server.js`
- **Telegram Bot** → `pm2 start telegram.py --interpreter ./myenv/bin/python`
