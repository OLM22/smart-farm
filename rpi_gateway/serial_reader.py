"""
Serial Reader for Raspberry Pi Gateway
Listens to the ESP32 LoRa Receiver Node via USB Serial.
"""

import sys
import time
import json
import logging
import serial
import serial.tools.list_ports

logger = logging.getLogger("SerialReader")

class SerialReader:
    def __init__(self, config: dict, mongo_handler):
        self.cfg = config.get("serial", {})
        self.preferred_port = self.cfg.get("port", "/dev/ttyUSB0")
        self.baudrate = self.cfg.get("baudrate", 115200)
        self.timeout = self.cfg.get("timeout", 1.0)
        self.auto_detect = self.cfg.get("auto_detect", True)
        self.mongo = mongo_handler
        self.ser = None

    def find_serial_port(self):
        """Finds valid USB serial port."""
        ports = serial.tools.list_ports.comports()
        if not ports:
            return None

        # Try to find ESP32 or USB-Serial chips (CP210x, CH340, FTDI)
        for p in ports:
            desc = p.description.lower()
            if any(k in desc for k in ["cp210", "ch340", "ftdi", "usb", "esp32"]):
                logger.info(f"Auto-detected ESP32 Serial Port: {p.device} ({p.description})")
                return p.device

        # Fallback to configured or first available
        return self.preferred_port if any(p.device == self.preferred_port for p in ports) else ports[0].device

    def connect(self):
        port_to_use = self.find_serial_port() if self.auto_detect else self.preferred_port
        if not port_to_use:
            logger.warning("No serial port available. Waiting for ESP32 connection...")
            return False

        try:
            self.ser = serial.Serial(port=port_to_use, baudrate=self.baudrate, timeout=self.timeout)
            logger.info(f"Serial connected to {port_to_use} @ {self.baudrate} baud.")
            return True
        except serial.SerialException as e:
            logger.error(f"Cannot open serial port {port_to_use}: {e}")
            self.ser = None
            return False

    def read_one_line(self):
        if self.ser is None or not self.ser.is_open:
            if not self.connect():
                time.sleep(2.0)
                return None

        try:
            raw_line = self.ser.readline()
            if not raw_line:
                return None

            line_str = raw_line.decode("utf-8", errors="ignore").strip()
            if not line_str.startswith("{") or not line_str.endswith("}"):
                # Debug or status message from ESP32
                if line_str:
                    logger.debug(f"[ESP32 Console]: {line_str}")
                return None

            # Parse JSON
            payload = json.loads(line_str)
            if "id" in payload and "data" in payload:
                logger.info(f"Received valid JSON packet from node: {payload.get('id')}")
                self.mongo.insert_sensor_packet(payload)
                return payload
            else:
                logger.warning(f"Ignored non-farm JSON packet: {line_str}")

        except json.JSONDecodeError:
            logger.warning(f"Malformed JSON received: {line_str}")
        except serial.SerialException as e:
            logger.error(f"Serial connection lost: {e}")
            if self.ser:
                try:
                    self.ser.close()
                except Exception:
                    pass
            self.ser = None
            time.sleep(2.0)

        return None
