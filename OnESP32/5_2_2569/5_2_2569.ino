#include <WiFi.h>
#include <PubSubClient.h>
#include <ModbusMaster.h>
#include <ArduinoJson.h>

// --- 1. ตั้งค่าการเชื่อมต่อ ---
const char* ssid = "TP-Link_E25A";
const char* password = "93495622";
const char* mqtt_server = "192.168.1.104"; // แก้ไขเป็น IP ของเครื่องคอมพิวเตอร์ที่รัน Broker (เดิม: 119.59.99.233)
const char* mqtt_user = "aiotchlorella";
const char* mqtt_pass = "P@$$w0rd2025";
const char* mqtt_topic_pub = "weather/station/data";

// --- 2. การตั้งค่าขา Pin และ Topics ---
const int relayPins[] = {26, 25, 33, 32}; 
const char* relayTopics[] = {
  "/station1/pump/status/control",  // G26 (Pump)
  "/station1/light/status/control", // G25 (Light)
  "/station1/fan/status/control",   // G33 (Fan)
  "/station1/batch/control"         // G32 (Batch control)
};

#define RXD2 16
#define TXD2 17
#define RE_DE_PIN 4 

WiFiClient espClient;
PubSubClient client(espClient);
ModbusMaster node;

// ฟังก์ชันควบคุมทิศทาง RS485
void preTransmission() { digitalWrite(RE_DE_PIN, 1); delay(1); } 
void postTransmission() { delay(1); digitalWrite(RE_DE_PIN, 0); } 

// --- ฟังก์ชันรับคำสั่งและส่งสถานะยืนยันกลับ (Feedback Loop) ---
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) { message += (char)payload[i]; }
  String topicStr = String(topic);

  for (int i = 0; i < 4; i++) {
    if (topicStr == relayTopics[i]) {
      // ในระบบ Cloud จะรับค่าเป็น ON / OFF หรือ 1 / 0
      if (message == "ON" || message == "1") {
        digitalWrite(relayPins[i], HIGH);
        // แปลง /control เป็น /response เพื่ออัปเดตสถานะกลับหน้าเว็บ
        String responseTopic = topicStr;
        responseTopic.replace("/control", "/response");
        client.publish(responseTopic.c_str(), "ON", true);
      } else {
        digitalWrite(relayPins[i], LOW);
        String responseTopic = topicStr;
        responseTopic.replace("/control", "/response");
        client.publish(responseTopic.c_str(), "OFF", true);
      }
      Serial.printf("Topic %s -> Relay Pin %d (%s) (Confirmed)\n", topicStr.c_str(), relayPins[i], message.c_str());
    }
  }
}

void setup_wifi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected");
}

void reconnect() {
  while (!client.connected()) {
    // ระบุ ClientID, Username และ Password สำหรับ Cloud Broker
    if (client.connect("ESP32WeatherStation", mqtt_user, mqtt_pass)) {
      for (int i = 0; i < 4; i++) client.subscribe(relayTopics[i]);
      Serial.println("MQTT Connected & Subscribed to Cloud Broker");
    } else {
      Serial.print("Failed, rc="); Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // ตั้งค่า Relay
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], LOW); 
  }
  
  // ตั้งค่า RE/DE สำหรับ RS485
  pinMode(RE_DE_PIN, OUTPUT);
  digitalWrite(RE_DE_PIN, 0);

  // เริ่มต้น Modbus
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  node.begin(1, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  client.setBufferSize(512); // รองรับ JSON ขนาดใหญ่
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  static unsigned long lastSend = 0;
  if (millis() - lastSend >= 5000) {
    lastSend = millis();

    uint16_t id_val = 0;
    // 1. อ่าน ID อุปกรณ์ (Reg 2000)
    if (node.readHoldingRegisters(2000, 1) == node.ku8MBSuccess) {
      id_val = node.getResponseBuffer(0);
    }
    
    delay(50); // พักช่วงเล็กน้อยกัน Modbus ชนกัน

    // 2. อ่านค่า Humidity, Temp, Pressure (Reg 500-505)
    uint8_t result = node.readHoldingRegisters(500, 6); 
    
    if (result == node.ku8MBSuccess) {
      StaticJsonDocument<512> doc;
      doc["sensor_id"]   = "Sensor_" + String(id_val);
      doc["humidity"]    = node.getResponseBuffer(0) / 10.0;
      doc["temperature"] = (int16_t)node.getResponseBuffer(1) / 10.0;
      doc["pressure"]    = node.getResponseBuffer(5) / 10.0;
      doc["timestamp"]   = millis();

      char buffer[512];
      serializeJson(doc, buffer);
      client.publish(mqtt_topic_pub, buffer);
      Serial.println("Data Published: " + String(buffer));
    } else {
      Serial.print("Modbus Read Error: "); Serial.println(result, HEX);
    }
  }
}