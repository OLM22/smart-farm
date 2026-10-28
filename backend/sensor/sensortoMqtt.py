import minimalmodbus
import paho.mqtt.client as mqtt
import time
import serial

# --- ตั้งค่า MQTT ---
MQTT_BROKER = "127.0.0.1" 
MQTT_PORT = 1883

# --- ตั้งค่า Modbus ---
instrument = minimalmodbus.Instrument('COM3', 1) # เปลี่ยน COM3 เป็น Port ของคุณ
instrument.serial.baudrate = 9600
instrument.serial.timeout = 0.5

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT)

def publish_data(topic, value):
    # ส่งค่าไปที่ Topic (ตัวอักษรสีแดงในภาพ)
    client.publish(topic, str(value))
    print(f"Published: {topic} -> {value}")

def run_system():
    while True:
        # 1. กลุ่ม Air Inflow (ID 60)
        try:
            instrument.address = 60
            regs = instrument.read_registers(1, 3, functioncode=4)
            publish_data("sensor_temp_inflow", regs[0] / 10.0)
            publish_data("sensor_humid_inflow", regs[1] / 10.0)
            publish_data("sensor_co2_inflow", regs[2])
        except: print("Error ID 60")

        # 2. กลุ่ม Air Outflow (ID 61)
        try:
            instrument.address = 61
            regs = instrument.read_registers(1, 3, functioncode=4)
            publish_data("sensor_temp_out", regs[0] / 10.0)
            publish_data("sensor_humid_outflow", regs[1] / 10.0) # ตามชื่อในภาพ
            publish_data("sensor_co2_outflow", regs[2])
        except: print("Error ID 61")

        # 3. Water CO2 (ID 32)
        try:
            instrument.address = 32
            val = instrument.read_register(1, functioncode=3)
            publish_data("sensor_co2_reactor", val)
        except: print("Error ID 32")

        # 4. กลุ่ม EC (ID 40, 41, 42)
        for i, s_id in enumerate([40, 41, 42], 1):
            try:
                instrument.address = s_id
                val = instrument.read_register(1, functioncode=3)
                publish_data(f"sensor_ec_reactor_tank{i}", val)
            except: print(f"Error ID {s_id}")

        # 5. กลุ่ม pH & Temp (ID 50, 51, 52)
        for i, s_id in enumerate([50, 51, 52], 1):
            try:
                instrument.address = s_id
                regs = instrument.read_registers(0, 2, functioncode=3)
                publish_data(f"sensor_ph_reactor_tank{i}", regs[1] / 10.0)
                publish_data(f"sensor_temp_reactor_tank{i}", regs[0] / 10.0)
            except: print(f"Error ID {s_id}")

        # 6. Water O2 (ID 20)
        try:
            instrument.address = 20
            # อ่าน DO Concentration จาก Register 2 (float)
            val = instrument.read_float(2, functioncode=3, number_of_registers=2)
            publish_data("sensor_o2_reactor", round(val, 2))
        except: print("Error ID 20")

        print("-" * 30)
        time.sleep(10) # อ่านทุก 10 วินาที

if __name__ == "__main__":
    print("System Running... Press Ctrl+C to stop")
    try:
        run_system()
    except KeyboardInterrupt:
        client.disconnect()