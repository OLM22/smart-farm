/**
 * ============================================================================
 * Smart Farm - ESP32 LoRa Receiver Node (USB Serial Bridge to Raspberry Pi)
 * ============================================================================
 * หน้าที่:
 *  1. รับสัญญาณแพ็กเก็ต LoRa จากโหนดเซนเซอร์ในฟาร์ม
 *  2. ตรวจสอบความถูกต้องของข้อมูล JSON
 *  3. ส่งต่อข้อมูล JSON ออกทางพอร์ต USB Serial (115200 baud) ให้ Raspberry Pi
 *  4. มีฟังก์ชัน WiFiManager เมื่อกดปุ่ม BOOT ค้างขณะเปิดเครื่อง
 *  5. ไฟ LED แสดงสถานะ: กะพริบ = โหมดตั้งค่า AP, ติดค้าง = โหมดปกติ (กะพริบรับข้อมูล)
 * ============================================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiManager.h>

// ==========================================
// 1. การกำหนดขาพิน (Hardware Pinout)
// ==========================================
#define LORA_SCK       18
#define LORA_MISO      19
#define LORA_MOSI      23
#define LORA_NSS        5   // CS
#define LORA_DIO0      26   // IRQ
#define LORA_RST       14

#define PIN_BOOT_BTN    0   // ปุ่ม BOOT บนบอร์ด ESP32
#define PIN_STATUS_LED  2   // Onboard LED (GPIO 2)

// ==========================================
// 2. การตั้งค่า LoRa
// ==========================================
#define LORA_BAND       433E6    // ความถี่ LoRa เดียวกันกับโหนดส่ง
#define LORA_SYNC_WORD  0xF3     // Sync Word ต้องตรงกัน
#define SPREADING_FACTOR 7
#define SIGNAL_BANDWIDTH 125E3
#define CODING_RATE      5

// ==========================================
// 3. ฟังก์ชันไฟแสดงสถานะ LED & WiFiManager
// ==========================================
void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(delayMs);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(delayMs);
  }
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("[WiFiManager] Receiver Node entered AP Config Mode");
  Serial.printf("[WiFiManager] Connect to SSID: %s | IP: %s\n", 
                myWiFiManager->getConfigPortalSSID().c_str(), 
                WiFi.softAPIP().toString().c_str());
}

void checkBootButtonForConfig() {
  pinMode(PIN_BOOT_BTN, INPUT_PULLUP);
  
  if (digitalRead(PIN_BOOT_BTN) == LOW) {
    Serial.println("[BOOT] Boot button hold detected. Checking duration...");
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
      wm.setConfigPortalTimeout(180);

      String apName = "SmartFarm_Rx_Setup_" + String((uint32_t)ESP.getEfuseMac(), HEX);
      wm.startConfigPortal(apName.c_str(), "smartfarm1234");
    }
  }
}

// ==========================================
// 4. Setup
// ==========================================
void setup() {
  // สื่อสารกับ Raspberry Pi ผ่าน USB Serial
  Serial.begin(115200);
  while (!Serial && millis() < 2000);

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // ตรวจสอบปุ่ม BOOT
  checkBootButtonForConfig();

  // กำหนดขา SPI สำหรับ LoRa ตามสเปก
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("{\"error\":\"LoRa init failed\",\"code\":500}");
    while (1) {
      blinkLed(1, 100);
    }
  }

  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.setSpreadingFactor(SPREADING_FACTOR);
  LoRa.setSignalBandwidth(SIGNAL_BANDWIDTH);
  LoRa.setCodingRate4(CODING_RATE);

  // โหมดปกติ: เปิดไฟ LED ค้าง
  digitalWrite(PIN_STATUS_LED, HIGH);
}

// ==========================================
// 5. Main Loop
// ==========================================
void loop() {
  // ตรวจสอบแพ็กเก็ต LoRa ที่เข้ามา
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incomingPayload = "";
    while (LoRa.available()) {
      incomingPayload += (char)LoRa.read();
    }

    // ตรวจสอบความถูกต้องของ JSON format
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, incomingPayload);

    if (error == DeserializationError::Ok) {
      // เพิ่มข้อมูลสัญญาณ LoRa ลงใน payload เพื่อส่งต่อให้ Raspberry Pi วิเคราะห์ Link Quality
      doc["rssi"] = LoRa.packetRssi();
      doc["snr"]  = LoRa.packetSnr();

      // ไฟกระพริบสั้นๆ แสดงการรับข้อมูล (RX Blink)
      digitalWrite(PIN_STATUS_LED, LOW);

      // ส่ง JSON ออกไปยัง Raspberry Pi ผ่านสาย USB Serial
      serializeJson(doc, Serial);
      Serial.println(); // ปิดท้ายด้วย newline สำหรับ buffer readline ของ Python
      Serial.flush();

      delay(30);
      digitalWrite(PIN_STATUS_LED, HIGH);
    } else {
      // หากแพ็กเก็ตเสียหายจากสัญญาณรบกวน
      // Serial.println("{\"error\":\"corrupted_packet\"}");
    }
  }
}
