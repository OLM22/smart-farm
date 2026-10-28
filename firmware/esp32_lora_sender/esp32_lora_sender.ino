/**
 * ============================================================================
 * Smart Farm - ESP32 LoRa Sensor Sender Node
 * ============================================================================
 * หน้าที่:
 *  1. อ่านค่าเซนเซอร์สมาร์ทฟาร์ม (หรือจำลองค่า)
 *  2. สร้างแพ็กเก็ตข้อมูล JSON ตามโครงสร้างมาตรฐาน
 *  3. ส่งข้อมูลผ่านโมดูล LoRa (SX1276 / SX1278)
 *  4. มีฟังก์ชัน WiFiManager สำหรับตั้งค่าเครือข่าย โดยกดปุ่ม BOOT ค้างขณะบู๊ต
 *  5. ไฟ LED สถานะ: กะพริบ = AP Config Mode, ติดค้าง = Normal Mode
 * ============================================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <time.h>

// ==========================================
// 1. การกำหนดขาพิน (Hardware Pinout)
// ==========================================
#define LORA_SCK       18
#define LORA_MISO      19
#define LORA_MOSI      23
#define LORA_NSS        5   // CS
#define LORA_DIO0      26   // IRQ
#define LORA_RST       14

#define PIN_BOOT_BTN    0   // ปุ่ม BOOT บนบอร์ด ESP32 (Active Low)
#define PIN_STATUS_LED  2   // Onboard LED (GPIO 2)

// ==========================================
// 2. การตั้งค่า LoRa & โหนด
// ==========================================
#define LORA_BAND       433E6    // ความถี่ LoRa (ปรับเป็น 868E6 หรือ 915E6 ตามโมดูลที่ใช้งานจริง)
#define LORA_SYNC_WORD  0xF3     // Sync Word สำหรับแยกเครือข่ายฟาร์ม (0x12 = ค่าเริ่มต้น)
#define LORA_TX_POWER   17       // ระดับกำลังส่ง (2 - 20 dBm)
#define SPREADING_FACTOR 7       // SF7 ถึง SF12
#define SIGNAL_BANDWIDTH 125E3   // 125 kHz
#define CODING_RATE      5       // 4/5

const char* NODE_ID = "ESP32_NODE_01";
const unsigned long SEND_INTERVAL_MS = 5000; // รอบการส่งข้อมูล (มิลลิวินาที)

// ==========================================
// 3. ตัวแปรระบบ
// ==========================================
unsigned long lastSendTime = 0;
bool isConfigPortalActive = false;

// ==========================================
// 4. ฟังก์ชันไฟแสดงสถานะ LED
// ==========================================
void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(delayMs);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(delayMs);
  }
}

// Callback เมื่อเข้าสู่ Config Portal ของ WiFiManager
void configModeCallback(WiFiManager *myWiFiManager) {
  isConfigPortalActive = true;
  Serial.println("[WiFiManager] Entered AP Configuration Mode");
  Serial.printf("[WiFiManager] Connect to SSID: %s | IP: %s\n", 
                myWiFiManager->getConfigPortalSSID().c_str(), 
                WiFi.softAPIP().toString().c_str());
}

// ตรวจสอบการกดปุ่ม BOOT ขณะเปิดเครื่อง
void checkBootButtonForConfig() {
  pinMode(PIN_BOOT_BTN, INPUT_PULLUP);
  
  // ตรวจสอบว่าปุ่มถูกกดค้างไว้ตอนบู๊ตหรือไม่ (กดค้างประมาณ 3 วินาที)
  if (digitalRead(PIN_BOOT_BTN) == LOW) {
    Serial.println("[BOOT] Boot button held detected. Checking duration...");
    unsigned long pressStart = millis();
    bool confirmed = true;

    while (millis() - pressStart < 3000) {
      if (digitalRead(PIN_BOOT_BTN) == HIGH) {
        confirmed = false;
        break;
      }
      digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
      delay(100);
    }

    if (confirmed) {
      Serial.println("[WiFiManager] Starting On-Demand Configuration Portal...");
      WiFiManager wm;
      wm.setAPCallback(configModeCallback);
      wm.setConfigPortalTimeout(180); // ปิด AP อัตโนมัติใน 3 นาทีหากไม่มีการเชื่อมต่อ

      String apName = "SmartFarm_Setup_" + String((uint32_t)ESP.getEfuseMac(), HEX);
      if (!wm.startConfigPortal(apName.c_str(), "smartfarm1234")) {
        Serial.println("[WiFiManager] Configuration timeout or failed to connect.");
      } else {
        Serial.println("[WiFiManager] WiFi Configured & Connected Successfully!");
      }
      isConfigPortalActive = false;
    }
  }
}

// ==========================================
// 5. โครงสร้างและฟังก์ชันอ่าน/จำลองข้อมูลเซนเซอร์
// ==========================================
struct FarmSensorData {
  float soil_temp;       // s_temp
  float soil_humidity;   // s_hmd
  float water_temp;      // w_temp
  float air_humidity;    // a_hmd
  float water_ph;        // p_water
  float water_ec;        // e_water
  float light_intensity; // l_int
  float air_temp;        // s_temp_s
  float wind_speed;      // w_speed
  float water_level;     // w_level
  float flow_rate;       // f_rate
  const char* current_status;  // c_stat
  const char* feedback_status; // f_stat
};

FarmSensorData readFarmSensors() {
  FarmSensorData data;
  
  // หมายเหตุ: สลับไปใช้การอ่านจาก Sensor IC จริง (e.g. Modbus RS485, SHT31, DS18B20) ได้ที่นี่
  // ในจุดนี้จำลองค่าที่มีความสมจริงสำหรับระบบ Smart Farm
  data.soil_temp       = 26.0 + (random(0, 80) / 10.0);
  data.soil_humidity   = 55.0 + (random(0, 300) / 10.0);
  data.water_temp      = 24.5 + (random(0, 50) / 10.0);
  data.air_humidity    = 60.0 + (random(0, 300) / 10.0);
  data.water_ph        = 6.5  + (random(0, 20) / 10.0);
  data.water_ec        = 1.2  + (random(0, 100) / 100.0);
  data.light_intensity = (float)random(15000, 65000);
  data.air_temp        = 29.0 + (random(0, 70) / 10.0);
  data.wind_speed      = 0.5  + (random(0, 45) / 10.0);
  data.water_level     = 70.0 + (random(0, 250) / 10.0);
  data.flow_rate       = 2.0  + (random(0, 30) / 10.0);
  data.current_status  = "NORMAL";
  data.feedback_status = "IDLE";

  return data;
}

// สร้าง JSON payload ตามสเปกเป๊ะ
String createJsonPayload(const FarmSensorData& sData) {
  JsonDocument doc;

  doc["id"] = NODE_ID;
  doc["ts"] = (uint32_t)time(nullptr); // Timestamp (หรือ millis() หากไม่ได้ซิงค์ NTP)

  JsonObject dataObj = doc["data"].to<JsonObject>();
  dataObj["s_temp"]   = serialized(String(sData.soil_temp, 2));
  dataObj["s_hmd"]    = serialized(String(sData.soil_humidity, 2));
  dataObj["w_temp"]   = serialized(String(sData.water_temp, 2));
  dataObj["a_hmd"]    = serialized(String(sData.air_humidity, 2));
  dataObj["p_water"]  = serialized(String(sData.water_ph, 2));
  dataObj["e_water"]  = serialized(String(sData.water_ec, 2));
  dataObj["l_int"]    = serialized(String(sData.light_intensity, 0));
  dataObj["s_temp_s"] = serialized(String(sData.air_temp, 2));
  dataObj["w_speed"]  = serialized(String(sData.wind_speed, 2));
  dataObj["w_level"]  = serialized(String(sData.water_level, 2));
  dataObj["f_rate"]   = serialized(String(sData.flow_rate, 2));
  dataObj["c_stat"]   = sData.current_status;
  dataObj["f_stat"]   = sData.feedback_status;

  String output;
  serializeJson(doc, output);
  return output;
}

// ==========================================
// 6. Setup & Main Loop
// ==========================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000);
  Serial.println("\n==========================================");
  Serial.println("  Smart Farm - ESP32 LoRa Sender Node");
  Serial.println("==========================================");

  // ตั้งค่าไฟแสดงสถานะ
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // ตรวจสอบเงื่อนไขปุ่ม BOOT เพื่อเข้าสู่ WiFiManager
  checkBootButtonForConfig();

  // กำหนดขา SPI สำหรับโมดูล LoRa ตามสเปก
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  Serial.print("[LoRa] Initializing LoRa transceiver at ");
  Serial.print(LORA_BAND / 1E6);
  Serial.println(" MHz...");

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("[LoRa] ERROR: Starting LoRa failed! Check wiring connections.");
    // กะพริบไฟ LED รัวๆ แสดงข้อผิดพลาดฮาร์ดแวร์
    while (1) {
      blinkLed(1, 100);
    }
  }

  // ปรับแต่งค่าวิทยุ LoRa เพื่อเสถียรภาพสูงสุด
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.setTxPower(LORA_TX_POWER);
  LoRa.setSpreadingFactor(SPREADING_FACTOR);
  LoRa.setSignalBandwidth(SIGNAL_BANDWIDTH);
  LoRa.setCodingRate4(CODING_RATE);

  Serial.println("[LoRa] Initialized successfully.");
  
  // โหมดปกติ: เปิดไฟ LED ค้างเพื่อแสดงสถานะทำงานปกติ
  digitalWrite(PIN_STATUS_LED, HIGH);
  Serial.println("[Status] Normal Mode Active (Status LED ON)\n");
}

void loop() {
  unsigned long currentMillis = millis();

  // ส่งข้อมูลเซนเซอร์ตามรอบเวลา
  if (currentMillis - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentMillis;

    FarmSensorData sensorData = readFarmSensors();
    String jsonString = createJsonPayload(sensorData);

    Serial.print("[LoRa TX] Sending Packet: ");
    Serial.println(jsonString);

    // ส่งผ่าน LoRa
    LoRa.beginPacket();
    LoRa.print(jsonString);
    LoRa.endPacket();

    // ดับไฟ LED สั้นๆ เพื่อแสดงจังหวะการส่งข้อมูล (Blink indication on TX)
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(50);
    digitalWrite(PIN_STATUS_LED, HIGH);
  }
}
