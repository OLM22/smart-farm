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
#define FIRMWARE_VERSION "1.0.0"

// การตั้งค่า mDNS สำหรับค้นหา Raspberry Pi ในวง LAN อัตโนมัติ
const char* mqtt_hostname = "raspberrypi"; // ชื่อ Hostname ของ Pi (ไม่ต้องใส่ .local)
#define MQTT_PORT        1883

// กำหนดประเภทอุปกรณ์: เลือกอย่างใดอย่างหนึ่ง ("SENSOR" หรือ "RELAY")
#define NODE_TYPE        "RELAY" 
#define DEVICE_ID        "ESP32_R4_01"

// กำหนดขา GPIO สำหรับ Relay (กรณี NODE_TYPE = "RELAY")
const int RELAY_PINS[] = {26, 27, 14, 12}; // GPIO สำหรับ Relay ช่อง 1, 2, 3, 4
const int RELAY_COUNT  = 4;

// ==========================================
// 2. ตัวแปรระบบ และ Timers (Non-blocking)
// ==========================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastRegisterTime = 0;
unsigned long lastSensorTime   = 0;
unsigned long lastOTATime      = 0;

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

// ส่งข้อมูลลงทะเบียนบอร์ดไปที่ Raspberry Pi
void sendRegistration() {
  if (!mqttClient.connected()) return;

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["type"]      = NODE_TYPE;
  doc["version"]   = FIRMWARE_VERSION;
  doc["ip"]        = WiFi.localIP().toString();

  if (String(NODE_TYPE) == "SENSOR") {
    JsonArray sensors = doc["sensor_types"].to<JsonArray>();
    sensors.add("soil_moisture");
    sensors.add("temperature");
    sensors.add("humidity");
  } else if (String(NODE_TYPE) == "RELAY") {
    doc["relay_count"] = RELAY_COUNT;
    JsonArray channels = doc["channels"].to<JsonArray>();
    
    JsonObject ch1 = channels.add<JsonObject>();
    ch1["ch"] = 1; ch1["name"] = "CH1";
    
    JsonObject ch2 = channels.add<JsonObject>();
    ch2["ch"] = 2; ch2["name"] = "CH2";
    
    JsonObject ch3 = channels.add<JsonObject>();
    ch3["ch"] = 3; ch3["name"] = "CH3";
    
    JsonObject ch4 = channels.add<JsonObject>();
    ch4["ch"] = 4; ch4["name"] = "CH4";
  }

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish("farm/nodes/register", buffer);
  Serial.println("[MQTT] Sent registration payload to Raspberry Pi");
}

// รับคำสั่งเปิด-ปิด Relay จาก Raspberry Pi
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) return;

  int channel = doc["channel"];          // ช่องที่ต้องการสั่ง (1..N)
  const char* command = doc["command"];  // "ON" หรือ "OFF"

  Serial.printf("[MQTT] Command -> Channel: %d, Action: %s\n", channel, command);

  if (channel >= 1 && channel <= RELAY_COUNT) {
    int pin = RELAY_PINS[channel - 1];
    if (String(command) == "ON") {
      digitalWrite(pin, LOW);  // Active LOW Relay (เปิด)
    } else if (String(command) == "OFF") {
      digitalWrite(pin, HIGH); // Active LOW Relay (ปิด)
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
      
      if (mqttClient.connect(DEVICE_ID)) {
        Serial.println(" Connected!");
        sendRegistration();

        if (String(NODE_TYPE) == "RELAY") {
          String controlTopic = "farm/relay/" + String(DEVICE_ID) + "/control";
          mqttClient.subscribe(controlTopic.c_str());
          Serial.printf("[MQTT] Subscribed to %s\n", controlTopic.c_str());
        }
      } else {
        Serial.printf(" Failed, rc=%d. Retrying in 5 seconds...\n", mqttClient.state());
        delay(5000);
      }
    } else {
      Serial.println("[mDNS] Could not find Raspberry Pi. Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ส่งค่าเซนเซอร์ไปยัง Raspberry Pi
void publishSensorData() {
  if (String(NODE_TYPE) != "SENSOR" || !mqttClient.connected()) return;

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  
  JsonObject readings = doc["readings"].to<JsonObject>();
  readings["soil_moisture"] = analogRead(34) / 40.95; // ตัวอย่างอ่านค่าเซนเซอร์
  readings["temperature"]   = 32.5;
  readings["humidity"]      = 60.0;

  char buffer[256];
  serializeJson(doc, buffer);
  
  String dataTopic = "farm/" + String(DEVICE_ID) + "/sensors/data";
  mqttClient.publish(dataTopic.c_str(), buffer);
  Serial.println("[MQTT] Published sensor data");
}

// ==========================================
// 5. Setup & Main Loop
// ==========================================
void setup() {
  Serial.begin(115200);

  // ตั้งค่า GPIO สำหรับ Relay
  if (String(NODE_TYPE) == "RELAY") {
    for (int i = 0; i < RELAY_COUNT; i++) {
      pinMode(RELAY_PINS[i], OUTPUT);
      digitalWrite(RELAY_PINS[i], HIGH); // ปิดไว้ก่อนเริ่มต้น
    }
  }

  // เชื่อมต่อ Wi-Fi ผ่าน WiFiManager
  WiFiManager wm;
  if (!wm.autoConnect("ESP32_Config_OLM")) {
    Serial.println("Failed to connect Wi-Fi. Rebooting...");
    ESP.restart();
  }

  setupTime();

  // เริ่มต้น mDNS Service
  if (!MDNS.begin("esp32-node")) {
    Serial.println("Error setting up MDNS responder!");
  } else {
    Serial.println("mDNS responder started");
  }

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

  // Task 2: อ่านและส่งค่าเซนเซอร์ทุกๆ 5 วินาที
  if (currentMillis - lastSensorTime >= 5000) {
    lastSensorTime = currentMillis;
    publishSensorData();
  }

  // Task 3: ตรวจสอบ OTA Update ทุกๆ 10 วินาที
  if (currentMillis - lastOTATime >= 10000) {
    lastOTATime = currentMillis;
    checkOTA();
  }
}
