#include <WiFi.h>
#include <PubSubClient.h>
#include <ModbusMaster.h>
#include <ArduinoJson.h>

// --- 1. ตั้งค่าการเชื่อมต่อ ---
const char* ssid = "Natachat-Floor-1_5G";
const char* password = "mxaagdf8";
const char* mqtt_server = "192.168.1.104"; // แก้ไขเป็น IP ของเครื่องคอมพิวเตอร์ที่รัน Broker (เดิม: 119.59.99.233)
const char* mqtt_user = "aiotchlorella";
const char* mqtt_pass = "P@$$w0rd2025";
const char* mqtt_topic_pub = "weather/station/data";

// --- 2. การตั้งค่าขา Pin และ Topics ---
// G26 = Pump, G25 = Light, G33 = Fan, G32 = (Spare)
const int relayPins[] = {26, 25, 33, 32}; 

// Subscription topics (รับคำสั่งจาก Dashboard)
const char* relayTopics[] = {
  "/station1/pump/status/control",
  "/station1/light/status/control",
  "/station1/fan/status/control",
  "/station1/spare/status/control"
};

// Publisher topics (ส่งสถานะยืนยันกลับ Dashboard)
const char* responseTopics[] = {
  "/station1/pump/status/response",
  "/station1/light/status/response",
  "/station1/fan/status/response",
  "/station1/spare/status/response"
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

  // ระบบ Dashboard ส่งมาเป็น "ON" หรือ "OFF"
  for (int i = 0; i < 4; i++) {
    if (topicStr == relayTopics[i]) {
      if (message == "ON") {
        digitalWrite(relayPins[i], LOW);  // สั่ง LOW คือเปิด (Active Low)
        client.publish(responseTopics[i], "ON", true);
      } else if (message == "OFF") {
        digitalWrite(relayPins[i], HIGH); // สั่ง HIGH คือปิด (Active Low)
        client.publish(responseTopics[i], "OFF", true);
      }
      Serial.printf("Topic %s -> Relay pin %d %s (Confirmed)\n", topicStr.c_str(), relayPins[i], message.c_str());
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
    // ใส่ User / Password สำหรับ MQTT
    if (client.connect("ESP32WeatherStation", mqtt_user, mqtt_pass)) {
      for (int i = 0; i < 4; i++) client.subscribe(relayTopics[i]);
      Serial.println("MQTT Connected & Subscribed to controls");
    } else {
      Serial.print("Failed, rc="); Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // ตั้งค่า Relay เป็น Active Low ดังนั้นตอนเริ่มต้นให้เป็น HIGH เพื่อ "ปิด"
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], HIGH); 
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
  // เปลี่ยน IP เป็นของ EGAT ระบบ (119.59.99.233:1883)
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
    
    delay(100); // พักช่วงเล็กน้อยกัน Modbus ชนกัน

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
      
      // แถม: ถ้าอยากให้หน้าเว็บอ่านค่าอุณหภูมิได้แบบเดียวกับ test sensor
      // ให้ส่งเข้ามาที่ topic /station1/temp/value ด้วยก็ได้ครับ
      // String tempValue = String((int16_t)node.getResponseBuffer(1) / 10.0);
      // client.publish("/station1/temp/value", tempValue.c_str());

      Serial.println("Data Published: " + String(buffer));
    } else {
      Serial.print("Modbus Read Error: "); Serial.println(result, HEX);
    }
  }
}
