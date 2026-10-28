# Smart Farm AIoT Monitoring & Control System

ระบบสมาร์ทฟาร์มครบวงจร (ESP32 LoRa ➔ Raspberry Pi Gateway + MongoDB ➔ PHP Web Server Telemetry Sync)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-blue.svg)](#)
[![LoRa](https://img.shields.io/badge/Wireless-LoRa%20SX1276%2FSX1278-orange.svg)](#)
[![Raspberry Pi](https://img.shields.io/badge/Gateway-Raspberry%20Pi-red.svg)](#)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2B%20SQLite%2FMySQL-brightgreen.svg)](#)

---

## 📌 สถาปัตยกรรมระบบ (System Architecture)

```
[ ESP32 Sensor Node ] 
       │ (LoRa Wireless 433/868/915 MHz)
       ▼
[ ESP32 Receiver Node ]
       │ (USB Serial: 115200 baud)
       ▼
[ Raspberry Pi Gateway ] ──(Local Buffer)──> [ Local MongoDB ]
       │                                             │
       │                                     [ Storage Manager ]
       │                                     (SD Card ↔ USB Flash Drive)
       │ (HTTP REST Sync / API Key)
       ▼
[ Web Server (PHP + Dashboard) ] ──> [ Central Database ]
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Layout)

```
c:\Smart Farm/
├── firmware/
│   ├── esp32_lora_sender/          # เฟิร์มแวร์ ESP32 โหนดส่ง + WiFiManager + จัดการเซนเซอร์
│   │   └── esp32_lora_sender.ino
│   └── esp32_lora_receiver/        # เฟิร์มแวร์ ESP32 โหนดรับ (LoRa ➔ USB Serial Bridge)
│       └── esp32_lora_receiver.ino
│
├── rpi_gateway/                    # เซอร์วิสบน Raspberry Pi (Python)
│   ├── main.py                     # Entry point เริ่มต้นทุกเซอร์วิส
│   ├── serial_reader.py            # อ่านข้อมูล USB Serial จาก ESP32
│   ├── mongo_handler.py            # บันทึกลง MongoDB และจัดการสถานะซิงค์
│   ├── storage_manager.py          # บริหารพื้นที่ SD Card ↔ USB Flash Drive
│   ├── sync_client.py              # ซิงค์ข้อมูลขึ้น Main Web Server
│   ├── config.json                 # กำหนดค่าพอร์ต, Path, URL
│   └── requirements.txt
│
├── server_php/                     # ฝั่ง Web Server (ทดสอบบนแล็ปท็อป/Server หลัก)
│   ├── api/
│   │   ├── sync.php                # Endpoint รับข้อมูลจาก Raspberry Pi
│   │   └── get_sensors.php         # API ส่งข้อมูลให้หน้า Dashboard
│   ├── config/
│   │   └── database.php            # ตั้งค่าฐานข้อมูล (รองรับ SQLite / MySQL)
│   ├── database/
│   │   └── schema.sql              # โครงสร้างตารางสำหรับ MySQL
│   └── index.php                   # แดชบอร์ดแสดงผล Telemetry แบบเรียลไทม์
│
└── docs/
    └── SYSTEM_ARCHITECTURE.md      # เอกสารสเปกฮาร์ดแวร์และการเชื่อมต่อฉบับละเอียด
```

---

## ⚡ การกำหนดขา LoRa บน ESP32 (Pin Connections)

| LoRa Pin | ESP32 GPIO | รายละเอียด |
| :--- | :--- | :--- |
| **VCC** | 3.3V | ไฟเลี้ยงโมดูล LoRa |
| **GND** | GND | กราวด์ร่วม |
| **SCK** | **GPIO 18** | SPI Clock |
| **MISO** | **GPIO 19** | SPI MISO |
| **MOSI** | **GPIO 23** | SPI MOSI |
| **NSS (CS)** | **GPIO 5** | Chip Select |
| **DIO0 (IRQ)**| **GPIO 26**| Packet Interrupt |
| **Reset** | **GPIO 14**| Module Reset |
| **Boot Button** | **GPIO 0** | กดค้างขณะบู๊ตเพื่อเข้า WiFiManager AP Mode |
| **Status LED** | **GPIO 2** | กะพริบ = AP Mode / ติดค้าง = โหมดปกติ |

---

## 📡 โครงสร้างข้อมูล JSON (JSON Data Structure)

```json
{
  "id": "node_id",
  "ts": "timestamp",
  "data": {
    "s_temp": "soil_temp",
    "s_hmd": "soil_humidity",
    "w_temp": "water_temp",
    "a_hmd": "air_humidity",
    "p_water": "water_ph",
    "e_water": "water_ec",
    "l_int": "light_intensity",
    "s_temp_s": "air_temp",
    "w_speed": "wind_speed",
    "w_level": "water_level",
    "f_rate": "flow_rate",
    "c_stat": "current_status",
    "f_stat": "feedback_status"
  }
}
```

---

## 🚀 วิธีการทดสอบและเริ่มต้นใช้งาน (Quickstart)

### 1. ทดสอบ Web Server บนแล็ปท็อป (PHP)
ไม่ต้องติดตั้ง Web Server ซับซ้อน สามารถรัน Built-in Web Server ของ PHP ได้ทันที:
```bash
cd server_php
php -S 0.0.0.0:8000
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:8000`  
คุณสามารถกดปุ่ม **"⚡ Test Simulate Sync"** เพื่อทดสอบจำลองส่งข้อมูล JSON เข้า API ได้ทันที

### 2. รันเซอร์วิสบน Raspberry Pi
```bash
cd rpi_gateway
pip install -r requirements.txt
python main.py
```

### 3. แฟลชโค้ดลง ESP32
เปิดโปรแกรม **Arduino IDE** หรือ **PlatformIO**:
* โหนดส่ง: `firmware/esp32_lora_sender/esp32_lora_sender.ino`
* โหนดรับ: `firmware/esp32_lora_receiver/esp32_lora_receiver.ino`
* ติดตั้ง Libraries ที่จำเป็น: `LoRa` (โดย Sandeep Mistry), `ArduinoJson`, `WiFiManager`
