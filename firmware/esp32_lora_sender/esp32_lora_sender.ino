/**
 * ============================================================================
 * Smart Farm - ESP32 4-Relay + LoRa Sensor Sender Node
 * ============================================================================
 * หน้าที่:
 *  1. อ่านค่าเซนเซอร์สมาร์ทฟาร์ม 12 พารามิเตอร์ และส่งผ่าน LoRa 433MHz (SX1278) ทุก 5 วินาที
 *  2. ควบคุม Relay ทั้ง 4 ช่องบนบอร์ด ESP32 4-Relay (พัดลม, ไฟ, ปั๊มน้ำ, วาล์วปุ๋ย)
 *  3. ซิงค์สถานะปุ่มกดจากหน้าเว็บ (ControlsTab: /api/controls.php) อัตโนมัติผ่าน Wi-Fi (mDNS)
 *     และรองรับการรับคำสั่งผ่านคลื่นวิทยุ LoRa 433MHz (Two-Way LoRa) หรือพิมพ์สั่งผ่าน Serial
 *  4. กดปุ่ม BOOT (GPIO 0) ค้าง 3 วินาทีได้ตลอดเวลาเพื่อเปิด WiFiManager AP ตั้งค่า Wi-Fi ผ่านมือถือ
 * ============================================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <time.h>

// ==========================================
// โครงสร้างข้อมูลเซนเซอร์ (วางไว้บนสุดเพื่อป้องกัน Arduino Prototype Error)
// ==========================================
typedef struct {
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
  String feedback_status;      // f_stat
} FarmSensorData;

// ==========================================
// 1. การกำหนดขาพิน LoRa SPI & Relay 4 ช่อง
// ==========================================
#define LORA_SCK       18
#define LORA_MISO      19
#define LORA_MOSI      23
#define LORA_NSS        5   // CS
#define LORA_RST       14
// หมายเหตุ: ใช้โหมด SPI Polling (-1 สำหรับ DIO0) เพื่อคืนขา GPIO 26 ให้ Relay ใช้งานได้ 100%
#define LORA_DIO0      -1

// ขา Relay ทั้ง 4 ช่องบนบอร์ด ESP32 4-Relay (Active-HIGH: HIGH = ON, LOW = OFF)
#define PIN_RELAY_FAN    33  // Relay 1: fan_1   (พัดลมระบายอากาศ)
#define PIN_RELAY_LIGHT  25  // Relay 2: light_1 (ระบบไฟสังเคราะห์แสง)
#define PIN_RELAY_PUMP   26  // Relay 3: pump_1  (ปั๊มน้ำหลัก)
#define PIN_RELAY_VALVE  32  // Relay 4: valve_1 (วาล์วน้ำสารละลาย)

// ขาสำรองสำหรับบอร์ด 4-Relay อีกรุ่น (GPIO 27, 12) ให้ทำงานควบคู่กันอัตโนมัติ
#define PIN_RELAY_ALT2   27
#define PIN_RELAY_ALT4   12

#define RELAY_ON        HIGH
#define RELAY_OFF       LOW

#define PIN_BOOT_BTN    0   // ปุ่ม BOOT บนบอร์ด ESP32 (Active Low)
#define PIN_STATUS_LED  2   // Onboard LED (GPIO 2)

#define LED_ON          LOW
#define LED_OFF         HIGH

// ==========================================
// 2. การตั้งค่า LoRa & โหนด
// ==========================================
#define LORA_BAND        433E6    // ความถี่ LoRa 433 MHz
#define LORA_SYNC_WORD   0xF3     // Sync Word มาตรฐานตรงกับบอร์ด Receiver
#define LORA_TX_POWER    17       // กำลังส่ง 17 dBm
#define SPREADING_FACTOR 7        // SF7
#define SIGNAL_BANDWIDTH 125E3    // 125 kHz
#define CODING_RATE      5        // 4/5

const char* NODE_ID = "ESP32_NODE_01";
const char* SERVER_MDNS_HOST = "DESKTOP-P4UNEON"; // ชื่อเครื่องโน้ตบุ๊กเซิร์ฟเวอร์ (.local)
const int   SERVER_PORT = 8000;

const unsigned long SEND_INTERVAL_MS = 5000; // ส่งข้อมูล LoRa ทุก 5 วินาที
const unsigned long POLL_CONTROL_MS  = 2000; // ดึงสถานะปุ่มกด Relay จากเว็บทุก 2 วินาที

// ==========================================
// 3. ตัวแปรสถานะระบบและ Relay ทั้ง 4 ช่อง
// ==========================================
unsigned long lastSendTime = 0;
unsigned long lastPollTime = 0;
bool isConfigPortalActive = false;
unsigned long bootButtonPressStart = 0;
bool bootButtonPressed = false;

bool stateFan   = false; // fan_1
bool stateLight = false; // light_1
bool statePump  = false; // pump_1
bool stateValve = false; // valve_1
String serverBaseUrl = "";

// ==========================================
// 4. ฟังก์ชันควบคุม Relay ทั้ง 4 ช่อง
// ==========================================
void applyRelayHardware() {
  digitalWrite(PIN_RELAY_FAN,   stateFan   ? RELAY_ON : RELAY_OFF);
  digitalWrite(PIN_RELAY_LIGHT, stateLight ? RELAY_ON : RELAY_OFF);
  digitalWrite(PIN_RELAY_PUMP,  statePump  ? RELAY_ON : RELAY_OFF);
  digitalWrite(PIN_RELAY_VALVE, stateValve ? RELAY_ON : RELAY_OFF);

  // สั่งขาสำรองสำหรับบอร์ดอีกรุ่นควบคู่กัน
  digitalWrite(PIN_RELAY_ALT2,  stateLight ? RELAY_ON : RELAY_OFF);
  digitalWrite(PIN_RELAY_ALT4,  stateValve ? RELAY_ON : RELAY_OFF);
}

void updateRelaysFromStates(bool fan, bool light, bool pump, bool valve, const char* source) {
  bool changed = (fan != stateFan) || (light != stateLight) || (pump != statePump) || (valve != stateValve);
  stateFan   = fan;
  stateLight = light;
  statePump  = pump;
  stateValve = valve;
  applyRelayHardware();

  if (changed) {
    Serial.printf("[RELAY - %s] Updated -> FAN:%s | LIGHT:%s | PUMP:%s | VALVE:%s\n",
                  source,
                  stateFan ? "ON" : "OFF",
                  stateLight ? "ON" : "OFF",
                  statePump ? "ON" : "OFF",
                  stateValve ? "ON" : "OFF");
  }
}

String getRelaySummaryString() {
  return String("F:") + (stateFan ? "1" : "0") +
         ",L:" + (stateLight ? "1" : "0") +
         ",P:" + (statePump ? "1" : "0") +
         ",V:" + (stateValve ? "1" : "0");
}

// ==========================================
// 5. ฟังก์ชันซิงค์คำสั่งปุ่มกดจากหน้าเว็บ ControlsTab (ผ่าน Wi-Fi หรือ LoRa)
// ==========================================
void resolveServerUrl() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (serverBaseUrl.length() > 0) return;

  IPAddress serverIp = MDNS.queryHost(SERVER_MDNS_HOST, 1500);
  if (serverIp != INADDR_NONE) {
    serverBaseUrl = "http://" + serverIp.toString() + ":" + String(SERVER_PORT);
    Serial.printf("[mDNS] Found Smart Farm Server: %s\n", serverBaseUrl.c_str());
  } else {
    // Fallback ไปที่โดเมน DuckDNS
    serverBaseUrl = "http://olmy.duckdns.org:" + String(SERVER_PORT);
  }
}

void pollWebControls() {
  if (WiFi.status() != WL_CONNECTED) return;
  resolveServerUrl();
  if (serverBaseUrl.length() == 0) return;

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(1200);

  String url = serverBaseUrl + "/api/controls.php";
  if (http.begin(client, url)) {
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      JsonDocument doc;
      if (!deserializeJson(doc, payload) && doc["status"] == "success") {
        bool nextFan = stateFan, nextLight = stateLight, nextPump = statePump, nextValve = stateValve;
        JsonArray devices = doc["devices"].as<JsonArray>();
        for (JsonObject dev : devices) {
          String id = dev["device_id"].as<String>();
          bool isOn = (dev["command_state"].as<String>() == "ON");
          if (id == "fan_1")   nextFan   = isOn;
          if (id == "light_1") nextLight = isOn;
          if (id == "pump_1")  nextPump  = isOn;
          if (id == "valve_1") nextValve = isOn;
        }
        updateRelaysFromStates(nextFan, nextLight, nextPump, nextValve, "WEB_CONTROLS");
      }
    } else {
      serverBaseUrl = ""; // ค้นหา mDNS ใหม่รอบถัดไปหากเปลี่ยนวงแลน
    }
    http.end();
  }
}

// ฟังคำสั่งควบคุมที่ส่งกลับมาทางคลื่น LoRa 433MHz หรือพิมพ์ทาง Serial Monitor
void checkIncomingControlCommands() {
  // 1. ตรวจสอบแพ็กเกจ LoRa ขาเข้า (กรณีส่งคำสั่งกลับจากบอร์ด Receiver)
  int packetSize = LoRa.parsePacket();
  if (packetSize > 0) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }
    incoming.trim();
    JsonDocument doc;
    if (!deserializeJson(doc, incoming)) {
      bool nextFan   = doc["fan_1"].is<const char*>()   ? (String(doc["fan_1"].as<const char*>()) == "ON")   : stateFan;
      bool nextLight = doc["light_1"].is<const char*>() ? (String(doc["light_1"].as<const char*>()) == "ON") : stateLight;
      bool nextPump  = doc["pump_1"].is<const char*>()  ? (String(doc["pump_1"].as<const char*>()) == "ON")  : statePump;
      bool nextValve = doc["valve_1"].is<const char*>() ? (String(doc["valve_1"].as<const char*>()) == "ON") : stateValve;
      updateRelaysFromStates(nextFan, nextLight, nextPump, nextValve, "LORA_RX");
    }
  }

  // 2. ตรวจสอบคำสั่งทดสอบผ่าน Serial Monitor (เช่น พิมพ์ ALL=1, ALL=0, FAN=1, PUMP=1)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "ALL=1" || cmd == "ON") {
      updateRelaysFromStates(true, true, true, true, "SERIAL");
    } else if (cmd == "ALL=0" || cmd == "OFF") {
      updateRelaysFromStates(false, false, false, false, "SERIAL");
    } else if (cmd == "FAN=1")   updateRelaysFromStates(true, stateLight, statePump, stateValve, "SERIAL");
    else if (cmd == "FAN=0")     updateRelaysFromStates(false, stateLight, statePump, stateValve, "SERIAL");
    else if (cmd == "LIGHT=1")   updateRelaysFromStates(stateFan, true, statePump, stateValve, "SERIAL");
    else if (cmd == "LIGHT=0")   updateRelaysFromStates(stateFan, false, statePump, stateValve, "SERIAL");
    else if (cmd == "PUMP=1")    updateRelaysFromStates(stateFan, stateLight, true, stateValve, "SERIAL");
    else if (cmd == "PUMP=0")    updateRelaysFromStates(stateFan, stateLight, false, stateValve, "SERIAL");
    else if (cmd == "VALVE=1")   updateRelaysFromStates(stateFan, stateLight, statePump, true, "SERIAL");
    else if (cmd == "VALVE=0")   updateRelaysFromStates(stateFan, stateLight, statePump, false, "SERIAL");
  }
}

// ==========================================
// 6. ฟังก์ชันไฟแสดงสถานะ LED & WiFiManager
// ==========================================
void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_STATUS_LED, LED_ON);
    delay(delayMs);
    digitalWrite(PIN_STATUS_LED, LED_OFF);
    delay(delayMs);
  }
}

void configModeCallback(WiFiManager *myWiFiManager) {
  isConfigPortalActive = true;
  Serial.println("[WiFiManager] Entered AP Configuration Mode");
  Serial.printf("[WiFiManager] Connect to SSID: %s | IP: %s\n", 
                myWiFiManager->getConfigPortalSSID().c_str(), 
                WiFi.softAPIP().toString().c_str());
  Serial.println("[WiFiManager] Open browser to http://192.168.4.1 to configure WiFi");
}

void checkBootButtonLoop() {
  if (digitalRead(PIN_BOOT_BTN) == LOW) {
    if (!bootButtonPressed) {
      bootButtonPressed = true;
      bootButtonPressStart = millis();
      Serial.println("[BOOT] Button pressed. Hold for 3 seconds to enter WiFi Config...");
    } else {
      if ((millis() / 150) % 2 == 0) {
        digitalWrite(PIN_STATUS_LED, LED_ON);
      } else {
        digitalWrite(PIN_STATUS_LED, LED_OFF);
      }

      if (millis() - bootButtonPressStart >= 3000) {
        Serial.println("\n==========================================");
        Serial.println("[WiFiManager] Starting Configuration Portal...");
        Serial.println("==========================================");
        digitalWrite(PIN_STATUS_LED, LED_ON);

        WiFiManager wm;
        wm.setAPCallback(configModeCallback);
        wm.setConfigPortalTimeout(180);

        String apName = "SmartFarm_Setup_" + String((uint32_t)ESP.getEfuseMac(), HEX);
        if (!wm.startConfigPortal(apName.c_str(), "smartfarm1234")) {
          Serial.println("[WiFiManager] Configuration timeout or closed.");
        } else {
          Serial.println("[WiFiManager] WiFi Configured & Connected Successfully!");
          MDNS.begin("esp32-smartfarm-node01");
          serverBaseUrl = "";
        }
        isConfigPortalActive = false;
        bootButtonPressed = false;
        digitalWrite(PIN_STATUS_LED, LED_ON);
      }
    }
  } else {
    if (bootButtonPressed) {
      bootButtonPressed = false;
      digitalWrite(PIN_STATUS_LED, LED_ON);
      Serial.println("[BOOT] Released before 3 seconds. Cancelled.");
    }
  }
}

// ==========================================
// 7. ฟังก์ชันอ่าน/จำลองข้อมูลเซนเซอร์ & สร้าง JSON
// ==========================================
FarmSensorData readFarmSensors() {
  FarmSensorData data;
  
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
  data.feedback_status = getRelaySummaryString();

  return data;
}

String createJsonPayload(const FarmSensorData& sData) {
  JsonDocument doc;

  doc["id"] = NODE_ID;
  doc["ts"] = (uint32_t)time(nullptr);

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
// 8. Setup & Main Loop
// ==========================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000);
  Serial.println("\n====================================================");
  Serial.println("  Smart Farm - ESP32 4-Relay + LoRa Sender Node");
  Serial.println("====================================================");

  pinMode(PIN_BOOT_BTN, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // ตั้งค่าขา Relay ทั้ง 4 ช่องเป็น OUTPUT และเริ่มต้นที่ OFF
  pinMode(PIN_RELAY_FAN,   OUTPUT);
  pinMode(PIN_RELAY_LIGHT, OUTPUT);
  pinMode(PIN_RELAY_PUMP,  OUTPUT);
  pinMode(PIN_RELAY_VALVE, OUTPUT);
  pinMode(PIN_RELAY_ALT2,  OUTPUT);
  pinMode(PIN_RELAY_ALT4,  OUTPUT);
  applyRelayHardware();

  digitalWrite(PIN_STATUS_LED, LED_ON);
  delay(300);
  digitalWrite(PIN_STATUS_LED, LED_OFF);

  // เชื่อมต่อ Wi-Fi ที่เคยบันทึกไว้ในบอร์ดอัตโนมัติ (แบบไม่บล็อกการทำงานของ LoRa)
  WiFi.mode(WIFI_STA);
  WiFi.begin();
  Serial.print("[WiFi] Auto-connecting to saved Wi-Fi");
  unsigned long wifiWait = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiWait < 4000) {
    delay(250);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s (Ready to sync Relay Controls from Web)\n", WiFi.localIP().toString().c_str());
    MDNS.begin("esp32-smartfarm-node01");
  } else {
    Serial.println("\n[WiFi] Not connected yet (Hold BOOT 3s anytime to configure WiFi for Web Relay Sync)");
  }

  // กำหนดขา SPI สำหรับโมดูล LoRa
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  Serial.print("[LoRa] Initializing LoRa transceiver at ");
  Serial.print(LORA_BAND / 1E6);
  Serial.println(" MHz...");

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("[LoRa] ERROR: Starting LoRa failed! Check wiring connections.");
    while (1) {
      blinkLed(1, 100);
    }
  }

  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.setTxPower(LORA_TX_POWER);
  LoRa.setSpreadingFactor(SPREADING_FACTOR);
  LoRa.setSignalBandwidth(SIGNAL_BANDWIDTH);
  LoRa.setCodingRate4(CODING_RATE);

  Serial.println("[LoRa] Initialized successfully.");
  digitalWrite(PIN_STATUS_LED, LED_ON);
  Serial.println("[Relay] Ready! Supports Web ControlsTab Sync + LoRa RX + Serial Commands (ALL=1, ALL=0)\n");
}

void loop() {
  // 1. ตรวจจับปุ่ม BOOT (กดค้าง 3 วิเพื่อเปิด WiFi Portal)
  checkBootButtonLoop();

  // 2. ตรวจรับคำสั่งเปิด/ปิด Relay จากคลื่น LoRa หรือ Serial Monitor
  checkIncomingControlCommands();

  unsigned long currentMillis = millis();

  // 3. ซิงค์สถานะปุ่มกด Relay ทั้ง 4 ช่องจากหน้าเว็บ (ControlsTab) ทุก 2 วินาที
  if (currentMillis - lastPollTime >= POLL_CONTROL_MS) {
    lastPollTime = currentMillis;
    pollWebControls();
  }

  // 4. ส่งข้อมูลเซนเซอร์ผ่าน LoRa 433MHz ทุก 5 วินาที
  if (currentMillis - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentMillis;

    FarmSensorData sensorData = readFarmSensors();
    String jsonString = createJsonPayload(sensorData);

    Serial.print("[LoRa TX] Sending Packet: ");
    Serial.println(jsonString);

    LoRa.beginPacket();
    LoRa.print(jsonString);
    LoRa.endPacket();

    // คืนขา GPIO 26 ให้คงสถานะ Relay ปั๊มน้ำไว้เสมอหลังส่ง LoRa เสร็จ
    applyRelayHardware();

    digitalWrite(PIN_STATUS_LED, LED_OFF);
    delay(50);
    digitalWrite(PIN_STATUS_LED, LED_ON);
  }
}
