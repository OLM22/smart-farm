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

// สำหรับบอร์ด ESP32 ส่วนใหญ่ที่เป็น Active-LOW (LOW = ไฟติด, HIGH = ไฟดับ)
// หากบอร์ดของท่านเป็น Active-HIGH สามารถสลับค่าได้
#define LED_ON          LOW
#define LED_OFF         HIGH

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
    digitalWrite(PIN_STATUS_LED, LED_ON);
    delay(delayMs);
    digitalWrite(PIN_STATUS_LED, LED_OFF);
    delay(delayMs);
  }
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("\n[WiFiManager] Receiver Node entered AP Config Mode");
  Serial.printf("[WiFiManager] Connect to SSID: %s | IP: %s\n", 
                myWiFiManager->getConfigPortalSSID().c_str(), 
                WiFi.softAPIP().toString().c_str());
  Serial.println("[WiFiManager] Open browser to http://192.168.4.1 to configure WiFi");
}

// ตรวจสอบการกดปุ่ม BOOT แบบกดค้าง 3 วินาที (สามารถกดได้ตลอดเวลาขณะเครื่องทำงาน)
unsigned long bootButtonPressStart = 0;
bool bootButtonPressed = false;

void checkBootButtonLoop() {
  if (digitalRead(PIN_BOOT_BTN) == LOW) {
    if (!bootButtonPressed) {
      bootButtonPressed = true;
      bootButtonPressStart = millis();
      Serial.println("[BOOT] Button pressed. Hold for 3 seconds to enter WiFi Config...");
    } else {
      // กำลังกดค้างอยู่ ให้ไฟกะพริบเร็วๆ เตือน
      if ((millis() / 150) % 2 == 0) {
        digitalWrite(PIN_STATUS_LED, LED_ON);
      } else {
        digitalWrite(PIN_STATUS_LED, LED_OFF);
      }

      if (millis() - bootButtonPressStart >= 3000) {
        Serial.println("\n==========================================");
        Serial.println("[WiFiManager] Entering On-Demand Config Portal!");
        Serial.println("==========================================");
        
        // ไฟติดค้างก่อนเข้าพอร์ทัล
        digitalWrite(PIN_STATUS_LED, LED_ON);

        WiFiManager wm;
        wm.setAPCallback(configModeCallback);
        wm.setConfigPortalTimeout(180); // ปิด AP อัตโนมัติหลัง 3 นาทีหากไม่มีคนต่อ

        String apName = "SmartFarm_Rx_" + String((uint32_t)ESP.getEfuseMac(), HEX);
        wm.startConfigPortal(apName.c_str(), "smartfarm1234");

        Serial.println("[WiFiManager] Config portal closed. Resuming LoRa Receiver...");
        digitalWrite(PIN_STATUS_LED, LED_ON);
        bootButtonPressed = false;
      }
    }
  } else {
    if (bootButtonPressed) {
      // ปล่อยปุ่มก่อนครบ 3 วินาที ให้คืนสถานะไฟปกติ
      bootButtonPressed = false;
      digitalWrite(PIN_STATUS_LED, LED_ON);
      Serial.println("[BOOT] Released before 3 seconds. Cancelled.");
    }
  }
}

// ==========================================
// 4. Setup
// ==========================================
void setup() {
  // สื่อสารกับ Raspberry Pi และคอมพิวเตอร์ผ่าน USB Serial
  Serial.begin(115200);
  delay(1000); // รอให้ Serial พอร์ตพร้อมทำงาน

  Serial.println("\n==========================================");
  Serial.println("  Smart Farm - ESP32 LoRa Receiver Node");
  Serial.println("==========================================");

  pinMode(PIN_BOOT_BTN, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // เทสต์ไฟ LED ตอนเริ่มทำงาน (ติด 500ms แล้วดับ)
  digitalWrite(PIN_STATUS_LED, LED_ON);
  delay(500);
  digitalWrite(PIN_STATUS_LED, LED_OFF);

  // กำหนดขา SPI สำหรับ LoRa ตามสเปก
  Serial.println("[LoRa] Setting SPI pins: SCK=18, MISO=19, MOSI=23, NSS=5");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  Serial.print("[LoRa] Initializing LoRa transceiver at ");
  Serial.print(LORA_BAND / 1E6);
  Serial.println(" MHz...");

  while (!LoRa.begin(LORA_BAND)) {
    Serial.println("[LoRa] ERROR: Cannot detect SX1278 module!");
    Serial.println("       --> กรุณาตรวจสอบสาย: 3.3V, GND, NSS(5), RST(14), DIO0(26), SCK(18), MISO(19), MOSI(23)");
    blinkLed(2, 200);
    delay(2000);
  }

  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.setSpreadingFactor(SPREADING_FACTOR);
  LoRa.setSignalBandwidth(SIGNAL_BANDWIDTH);
  LoRa.setCodingRate4(CODING_RATE);

  // โหมดปกติ: เปิดไฟ LED ค้าง
  digitalWrite(PIN_STATUS_LED, LED_ON);
  Serial.println("[LoRa] SUCCESS: LoRa Receiver is ready and listening for packets!");
  Serial.println("[Status] Normal Mode Active (Status LED ON)");
  Serial.println("[Tip] สามารถกดปุ่ม BOOT ค้างไว้ 3 วินาที เพื่อเปิด WiFi AP ตั้งค่าได้ตลอดเวลา\n");
}

// ==========================================
// 5. Main Loop
// ==========================================
void loop() {
  // ตรวจจับปุ่ม BOOT (กดค้าง 3 วิเพื่อเปิด WiFi Portal)
  checkBootButtonLoop();

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

      // ไฟกระพริบสั้นๆ แสดงการรับข้อมูล (RX Blink ดับแวบ 40ms แล้วติด)
      digitalWrite(PIN_STATUS_LED, LED_OFF);

      // ส่ง JSON ออกไปยัง Raspberry Pi ผ่านสาย USB Serial
      serializeJson(doc, Serial);
      Serial.println(); // ปิดท้ายด้วย newline สำหรับ buffer readline ของ Python
      Serial.flush();

      delay(40);
      digitalWrite(PIN_STATUS_LED, LED_ON);
    } else {
      // หากแพ็กเก็ตเสียหายจากสัญญาณรบกวน
      // Serial.println("{\"error\":\"corrupted_packet\"}");
    }
  }
}
      // Serial.println("{\"error\":\"corrupted_packet\"}");
