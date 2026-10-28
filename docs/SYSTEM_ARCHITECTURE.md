# Smart Farm AIoT System Architecture & Hardware Pinout Specification

เอกสารอ้างอิงสถาปัตยกรรมระบบสมาร์ทฟาร์ม (Smart Farm AIoT System) ครอบคลุมการเชื่อมต่อฮาร์ดแวร์, โปรโตคอล LoRa, การจัดการหน่วยความจำบน Raspberry Pi และการซิงค์ข้อมูลเข้า Web Server

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture)

ระบบประกอบด้วย 3 ส่วนหลัก:
1. **Sensor Node (โหนดส่งเซนเซอร์)**: ESP32 + เซนเซอร์ในฟาร์ม + โมดูล LoRa (SX1276 / SX1278)
2. **Receiver Gateway Node (โหนดรับ)**: ESP32 + LoRa เชื่อมต่อกับ Raspberry Pi ผ่านสาย USB Serial
3. **Local Gateway & Storage (Raspberry Pi)**:
   - รันโปรแกรมรับข้อมูลผ่านพอร์ต Serial (Baud 115200)
   - บันทึกข้อมูลลงฐานข้อมูล MongoDB ภายในเครื่อง (Local Offline-first Buffer)
   - มี **Storage Manager** บริหารจัดการพื้นที่ระหว่าง SD Card และ USB Flash Drive อัตโนมัติ ป้องกัน SD Card เต็มและเสื่อมสภาพ
   - ซิงค์ข้อมูลขึ้น Main Web Server (PHP Backend) เมื่อเชื่อมต่อเครือข่ายสำเร็จ
4. **Web Server (แล็ปท็อป/โหมดเทส)**: รัน PHP + Database แสดงแดชบอร์ด Telemetry สด และบันทึกประวัติ

---

## 2. การกำหนดขา LoRa บน ESP32 (Hardware Pinout)

| ฟังก์ชัน LoRa | ขา ESP32 (GPIO) | รายละเอียดการต่อวงจร |
| :--- | :--- | :--- |
| **VCC** | 3.3V | ใช้ไฟเลี้ยง 3.3V ห้ามต่อ 5V |
| **GND** | GND | กราวด์ร่วม |
| **SCK** | **GPIO 18** | SPI Bus Clock |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **NSS (CS)** | **GPIO 5** | Chip Select |
| **DIO0 (IRQ)** | **GPIO 26** | Packet Interrupt |
| **Reset** | **GPIO 14** | Module Reset Pin |
| **Boot Button** | **GPIO 0** | กดค้างขณะบู๊ต 3 วินาทีเพื่อเข้าสู่ WiFiManager AP Mode |
| **Status LED** | **GPIO 2** | กะพริบ = AP Mode / ติดค้าง = Normal Mode / กะพริบสั้น = Packet TX/RX |

---

## 3. โครงสร้างข้อมูล JSON (Data Structure Specification)

ทุกโหนดจะส่งข้อมูลในรูปแบบ JSON มาตรฐาน:

```json
{
  "id": "ESP32_NODE_01",
  "ts": 1709123456,
  "data": {
    "s_temp": 28.50,
    "s_hmd": 65.20,
    "w_temp": 26.10,
    "a_hmd": 70.00,
    "p_water": 6.80,
    "e_water": 1.45,
    "l_int": 45000,
    "s_temp_s": 31.20,
    "w_speed": 1.80,
    "w_level": 85.00,
    "f_rate": 2.40,
    "c_stat": "NORMAL",
    "f_stat": "IDLE"
  }
}
```

### คำอธิบายฟิลด์ข้อมูล
* `s_temp`: อุณหภูมิในดิน (Soil Temperature - °C)
* `s_hmd`: ความชื้นในดิน (Soil Humidity - %)
* `w_temp`: อุณหภูมิน้ำ (Water Temperature - °C)
* `a_hmd`: ความชื้นในอากาศ (Air Humidity - %)
* `p_water`: ค่ากรด-ด่างของน้ำ (Water pH)
* `e_water`: ค่าความนำไฟฟ้าของน้ำ (Water EC - mS/cm)
* `l_int`: ความเข้มแสง (Light Intensity - Lux)
* `s_temp_s`: อุณหภูมิในอากาศ (Air Temperature - °C)
* `w_speed`: ความเร็วลม (Wind Speed - m/s)
* `w_level`: ระดับน้ำในถัง/บ่อ (Water Level - %)
* `f_rate`: อัตราการไหลของน้ำ (Water Flow Rate - L/min)
* `c_stat`: สถานะการทำงานของโหนด (Current Status: e.g. NORMAL, WARNING, ALERT)
* `f_stat`: สถานะการตอบสนอง/ฟีดแบ็กควบคุม (Feedback Status: e.g. IDLE, PUMP_ON, VALVE_OPEN)

---

## 4. เงื่อนไขและฟังก์ชันพิเศษ

### 4.1 Wi-Fi Manager และไฟ LED แสดงสถานะ
- **โหมดตั้งค่า Wi-Fi (AP Config Portal)**:
  - ขณะเปิดสวิตช์หรือกดปุ่ม RESET บน ESP32 หากกดปุ่ม **BOOT (GPIO 0)** ค้างไว้เกิน 3 วินาที บอร์ดจะเปิด Wi-Fi Hotspot ในชื่อ `SmartFarm_Setup_XXXX` (รหัสผ่าน: `smartfarm1234`)
  - **ไฟ LED สถานะ (GPIO 2)** จะกะพริบต่อเนื่องเพื่อแจ้งให้ผู้ใช้ทราบว่าอยู่ในโหมดตั้งค่าเครือข่าย
  - ผู้ใช้งานสามารถใช้โทรศัพท์หรือคอมพิวเตอร์เชื่อมต่อและตั้งค่า SSID / Password ของ Wi-Fi ได้ผ่านหน้าเบราว์เซอร์ (192.168.4.1)
- **โหมดปกติ (Normal Operation)**:
  - ไฟ LED ออนบอร์ด (GPIO 2) จะเปิด **ติดค้าง** ตลอดเวลาเพื่อระบุสถานะพร้อมทำงาน
  - ไฟจะดับกระพริบชั่วขณะสั้นๆ (Blink Pulse) เมื่อมีการส่ง (TX) หรือรับ (RX) แพ็กเก็ต LoRa

### 4.2 การจัดการพื้นที่จัดเก็บบน Raspberry Pi (SD Card ↔ Flash Drive)
- ข้อมูลที่รับจาก ESP32 ผ่านสาย USB Serial จะถูกบันทึกลงใน **MongoDB** บน Raspberry Pi ทันที
- **Storage Manager** ทำงานในระดับเบื้องหลัง (Background Worker):
  - ตรวจสอบเปอร์เซ็นต์การใช้งานของ MicroSD Card หากเกินเกณฑ์ความปลอดภัย (เช่น 80%) หรือครบรอบวันที่กำหนด
  - ทำการส่งออกข้อมูลเก่าที่ถูกซิงค์แล้ว (Synced Records) บีบอัดเป็นไฟล์ `.json.gz` ย้ายไปยัง **USB Flash Drive** ที่เสียบอยู่ ณ `/media/usb`
  - ลบข้อมูลเก่าออกจากฐานข้อมูลเพื่อคืนพื้นที่ให้ SD Card และช่วยยืดอายุการใช้งานของการเขียนข้อมูล (Write Cycles) ของ SD Card
