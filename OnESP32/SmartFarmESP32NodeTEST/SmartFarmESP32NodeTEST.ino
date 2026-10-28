#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <WiFiManager.h>
#include <HTTPUpdate.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>

// ==========================================
// 1. การตั้งค่าอุปกรณ์และโหมดการทำงาน
// ==========================================
#define FIRMWARE_VERSION "v2.4.2"

// การตั้งค่า mDNS สำหรับค้นหา Raspberry Pi ในวง LAN อัตโนมัติ
const char* mqtt_hostname = "raspberrypi"; // ชื่อ Hostname ของ Pi (ไม่ต้องใส่ .local)
#define MQTT_PORT        1883

// กำหนด ID อุปกรณ์จำลอง (จำลองทั้ง SENSOR และ RELAY บนบอร์ดเดียวกัน)
#define CLIENT_ID          "ESP32_TEST_NODE_CLIENT"
#define SENSOR_DEVICE_ID   "ESP32_SENSOR_TEST_01"
#define RELAY_DEVICE_ID    "ESP32_RELAY_TEST_01"

// กำหนดขา GPIO สำหรับ Relay
const int RELAY_PINS[] = {26, 27, 14, 12}; // GPIO สำหรับ Relay ช่อง 1, 2, 3, 4
const int RELAY_COUNT  = 4;

// การตั้งค่า Telemetry เพิ่มเติม
const char* TELEMETRY_TOPIC = "cru/farm-004/dev-esp-005/telemetry";

// ==========================================
// 2. ตัวแปรระบบ และ Timers (Non-blocking)
// ==========================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastRegisterTime  = 0;
unsigned long lastSensorTime    = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastOTATime       = 0;

// ==========================================
// 3. ฟังก์ชันระบบ (NTP Time Sync & OTA)
// ==========================================
void setupTime() {
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void checkOTA() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClient otaClient;
  HTTPClient http;
  http.setTimeout(2000); // ป้องกันค้างรอ Timeout จนทำให้ MQTT หลุด
  if (http.begin(otaClient, "http://10.60.7.124/firmware.json")) {
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      JsonDocument doc;
      deserializeJson(doc, http.getString());
      const char* newVersion = doc["version"];
      const char* fileUrl = doc["file"];
      if (newVersion && fileUrl && String(newVersion) != FIRMWARE_VERSION) {
        Serial.printf("[OTA] Updating firmware to %s...\n", newVersion);
        httpUpdate.update(otaClient, fileUrl);
      }
    }
    http.end();
  }
}

// ==========================================
// 4. ฟังก์ชันค้นหา IP และสื่อสาร MQTT
// ==========================================

// ค้นหา IP Address ของ Raspberry Pi ผ่าน mDNS
IPAddress getPiIPAddress() {
  Serial.printf("[mDNS] Searching for %s.local...\n", mqtt_hostname);
  IPAddress serverIP = MDNS.queryHost(mqtt_hostname);
  
  int retry = 0;
  while (serverIP == INADDR_NONE && retry < 10) {
    delay(500);
    Serial.print(".");
    serverIP = MDNS.queryHost(mqtt_hostname);
    retry++;
  }

  if (serverIP != INADDR_NONE) {
    Serial.printf("\n[mDNS] Found Raspberry Pi IP: %s\n", serverIP.toString().c_str());
  } else {
    Serial.println("\n[mDNS] Failed to resolve Raspberry Pi IP!");
  }
  return serverIP;
}

// ส่งข้อมูลลงทะเบียนบอร์ดจำลองไปที่ Raspberry Pi (ลงทะเบียนทั้ง 2 ตัว)
void sendRegistration() {
  if (!mqttClient.connected()) return;

  // 1. ลงทะเบียนเซนเซอร์จำลอง (SENSOR)
  {
    JsonDocument doc;
    doc["device_id"] = SENSOR_DEVICE_ID;
    doc["type"]      = "SENSOR";
    doc["version"]   = FIRMWARE_VERSION;
    doc["ip"]        = WiFi.localIP().toString();

    JsonArray sensors = doc["sensor_types"].to<JsonArray>();
    sensors.add("soil_moisture");
    sensors.add("temperature");
    sensors.add("humidity");

    char buffer[512];
    serializeJson(doc, buffer);
    mqttClient.publish("farm/nodes/register", buffer);
    Serial.println("[MQTT] Sent SENSOR registration payload");
  }

  // 2. ลงทะเบียนรีเลย์จำลอง (RELAY)
  {
    JsonDocument doc;
    doc["device_id"] = RELAY_DEVICE_ID;
    doc["type"]      = "RELAY";
    doc["version"]   = FIRMWARE_VERSION;
    doc["ip"]        = WiFi.localIP().toString();
    doc["relay_count"] = RELAY_COUNT;

    JsonArray channels = doc["channels"].to<JsonArray>();
    for (int i = 1; i <= RELAY_COUNT; i++) {
      JsonObject ch = channels.add<JsonObject>();
      ch["ch"] = i;
      ch["name"] = "CH" + String(i);
    }

    char buffer[512];
    serializeJson(doc, buffer);
    mqttClient.publish("farm/nodes/register", buffer);
    Serial.println("[MQTT] Sent RELAY registration payload");
  }
}

// รับคำสั่งเปิด-ปิด Relay จาก Raspberry Pi
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.println("[MQTT] Callback JSON Deserialization failed");
    return;
  }

  int channel = doc["channel"];          // ช่องที่ต้องการสั่ง (1..N)
  const char* command = doc["command"];  // "ON" หรือ "OFF"

  Serial.printf("[MQTT] Command Received -> Channel: %d, Action: %s\n", channel, command);

  if (channel >= 1 && channel <= RELAY_COUNT) {
    int pin = RELAY_PINS[channel - 1];
    if (String(command) == "ON") {
      digitalWrite(pin, LOW);  // Active LOW Relay (เปิด)
      Serial.printf("[GPIO] Set Pin %d to LOW (ON)\n", pin);
    } else if (String(command) == "OFF") {
      digitalWrite(pin, HIGH); // Active LOW Relay (ปิด)
      Serial.printf("[GPIO] Set Pin %d to HIGH (OFF)\n", pin);
    }
  }
}

// จัดการการเชื่อมต่อ MQTT (พร้อมระบบ mDNS Auto Connect)
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    IPAddress piIP = getPiIPAddress();

    if (piIP != INADDR_NONE) {
      mqttClient.setServer(piIP, MQTT_PORT);
      Serial.print("[MQTT] Connecting to MQTT Broker...");
      
      // ป้องกัน Client ID ชนกันเมื่อทดสอบหลายบอร์ดโดยต่อท้ายด้วย MAC Address
      String clientId = "ESP32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
      if (mqttClient.connect(clientId.c_str())) {
        Serial.println(" Connected!");
        sendRegistration();

        // สมัครรับข้อมูลคำสั่ง Relay
        String controlTopic = "farm/relay/" + String(RELAY_DEVICE_ID) + "/control";
        mqttClient.subscribe(controlTopic.c_str());
        Serial.printf("[MQTT] Subscribed to %s\n", controlTopic.c_str());
      } else {
        Serial.printf(" Failed, rc=%d. Retrying in 10 seconds...\n", mqttClient.state());
        delay(10000);
      }
    } else {
      Serial.println("[mDNS] Could not find Raspberry Pi. Retrying in 10 seconds...");
      delay(10000);
    }
  }
}

// ส่งค่าเซนเซอร์ไปยัง Raspberry Pi (ค่าจำลอง)
void publishSensorData() {
  if (!mqttClient.connected()) return;

  JsonDocument doc;
  doc["device_id"] = SENSOR_DEVICE_ID;
  
  JsonObject readings = doc["readings"].to<JsonObject>();
  // สุ่มค่าจำลอง
  readings["soil_moisture"] = random(20, 80);               // ความชื้นดิน 20-80
  readings["temperature"]   = 25.0 + (random(0, 100) / 10.0); // อุณหภูมิ 25.0 - 35.0
  readings["humidity"]      = 50.0 + (random(0, 300) / 10.0); // ความชื้นสัมพัทธ์ 50.0 - 80.0

  char buffer[256];
  serializeJson(doc, buffer);
  
  String dataTopic = "farm/" + String(SENSOR_DEVICE_ID) + "/sensors/data";
  mqttClient.publish(dataTopic.c_str(), buffer);
  Serial.printf("[MQTT] Published simulated sensor data: %s\n", buffer);
}

// ส่งข้อมูล Telemetry ไปยัง MQTT Topic: cru/farm-004/dev-esp-005/telemetry
void publishTelemetryData() {
  if (!mqttClient.connected()) return;

  JsonDocument doc;
  doc["farm_id"]          = "farm-004";
  doc["device_id"]        = "dev-esp-005";
  doc["zone_id"]          = "zone-7";
  doc["sensor_type"]      = "LIGHT_LUX";
  // จำลองค่าแสงแดด 10,000 - 20,000 Lux
  doc["value"]            = 10000.0 + random(0, 10000);
  doc["unit"]             = "Lux";
  doc["quality_status"]   = "GOOD";
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["rssi_dbm"]         = WiFi.RSSI(); // ดึงความแรงสัญญาณจริง

  char buffer[384];
  serializeJson(doc, buffer);

  mqttClient.publish(TELEMETRY_TOPIC, buffer);
  Serial.printf("[MQTT] Published telemetry to %s: %s\n", TELEMETRY_TOPIC, buffer);
}

// ==========================================
// 5. Setup & Main Loop
// ==========================================
void setup() {
  Serial.begin(115200);

  // ตั้งค่า GPIO สำหรับ Relay
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH); // ปิดไว้ก่อนเริ่มต้น (Active LOW)
  }

  // เชื่อมต่อ Wi-Fi ผ่าน WiFiManager
  WiFiManager wm;
  if (!wm.autoConnect("ESP32_TestNode_AP")) {
    Serial.println("Failed to connect Wi-Fi. Rebooting...");
    ESP.restart();
  }

  setupTime();

  // เริ่มต้น mDNS Service
  if (!MDNS.begin("esp32-node-test")) {
    Serial.println("Error setting up MDNS responder!");
  } else {
    Serial.println("mDNS responder started");
  }

  mqttClient.setBufferSize(512);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long currentMillis = millis();

  // Task 1: ส่ง Heartbeat / Re-register ทุกๆ 1 นาที
  if (currentMillis - lastRegisterTime >= 60000) {
    lastRegisterTime = currentMillis;
    sendRegistration();
  }

  // Task 2: อ่านและส่งค่าเซนเซอร์จำลองทุกๆ 5 วินาที
  if (currentMillis - lastSensorTime >= 5000) {
    lastSensorTime = currentMillis;
    publishSensorData();
  }

  // Task 3: ส่งข้อมูล Telemetry (cru/farm-004/dev-esp-005/telemetry) ทุกๆ 5 วินาที
  if (currentMillis - lastTelemetryTime >= 5000) {
    lastTelemetryTime = currentMillis;
    publishTelemetryData();
  }

  // Task 4: ตรวจสอบ OTA Update ทุกๆ 5 นาที (300,000 ms) ป้องกัน MQTT Ping Timeout
  if (currentMillis - lastOTATime >= 300000) {
    lastOTATime = currentMillis;
    checkOTA();
  }
}
