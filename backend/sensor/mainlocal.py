# original
from datetime import datetime
import json
import logging
import random
import time
import struct 
import numpy as np
from collections import deque
import urllib.parse

from pymongo import MongoClient

from pymodbus.client import ModbusSerialClient
from pymodbus import FramerType
from pymodbus.exceptions import ModbusIOException

logging.basicConfig(
    format="%(asctime)s.%(msecs)03d - %(levelname)s - %(message)s",
    style="%",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)
MONGO_DB_NAME = "chlorella-aiot-cluster"
MONGO_PASSWORD = urllib.parse.quote("P@$$w0rd2025")
MONGO_URI = f"mongodb://aiotchlorella:{MONGO_PASSWORD}@119.59.99.233:27017/chlorella-aiot-cluster?authSource=chlorella-aiot-cluster"

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client[MONGO_DB_NAME]
mongo_collections = {}
backup_mongo_collections = {}

BACKUP_MONGO_URI = "mongodb://admin:password@localhost:27017/"
BACKUP_MONGO_DB_NAME = "chlorella-aiot-cluster"

backup_mongo_client = MongoClient(BACKUP_MONGO_URI)
backup_mongo_db = backup_mongo_client[BACKUP_MONGO_DB_NAME]

# Add function SlideWindowsAvarage
'''
window = SlidingWindowAverage(10)

print("Sliding Window Average (size=10)")
print("-" * 50)

# Simulate 15 readings
for i in range(1, 16):
    new_value = 20 + i  # Simulated sensor value
    avg = window.add_reading(new_value)
    
    status = window.get_window_status()
    print(f"Reading #{i}: Added {new_value:2d} | "
          f"Window: {status['readings']} | "
          f"Avg: {avg:.2f}")
'''
class SlidingWindowAverage:
    def __init__(self, window_size=10):
        self.window_size = window_size
        self.readings = []  # Will hold max 'window_size' readings
        self.total_readings = 0
    
    def add_reading(self, value):
        """Add a new reading and maintain window size"""
        self.readings.append(value)
        self.total_readings += 1
        
        # Keep only the last 'window_size' readings
        if len(self.readings) > self.window_size:
            self.readings.pop(0)  # Remove oldest
        
        return self.get_current_average()
    
    def get_current_average(self):
        """Calculate average of current window"""
        if not self.readings:
            return 0
        return sum(self.readings) / len(self.readings)
    
    def get_window_status(self):
        """Get current window information"""
        return {
            'window_size': self.window_size,
            'current_fill': len(self.readings),
            'is_full': len(self.readings) == self.window_size,
            'readings': self.readings.copy(),
            'average': self.get_current_average()
        }
    

# use SlidingWindows Average  array size 10
window = SlidingWindowAverage(10)


class SensorDataBuffer:
    def __init__(self, maxlen=11):
        self.buffers = {}
        self.maxlen = maxlen
        self.kernel = np.array([0.25, 0.5, 0.25])
        # self.kernel = np.ones(maxlen) / maxlen

    def update(self, sensor_name, value):
        if sensor_name not in self.buffers:
            self.buffers[sensor_name] = deque(maxlen=self.maxlen)
        self.buffers[sensor_name].append(value)

    def get_convolved_value(self, sensor_name):
        values = list(self.buffers.get(sensor_name, []))
        if len(values) < len(self.kernel):
            return values[-1] if values else None

        convolved = np.convolve(values, self.kernel, mode="valid")
        return convolved[-1]


buffer = SensorDataBuffer(maxlen=5)


def get_config(key: str, file_path: str = "config.json", delimiter: str = "."):
    try:
        with open(file_path, "r") as f:
            config = json.load(f)
        keys = key.split(delimiter)
        value = config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                logger.warning(f"Key '{key}' not found in configuration.")
                return None
        return value
    except FileNotFoundError:
        logger.error(f"The file {file_path} was not found.")


def clean_modbus_buffer(modbus_client):
    """Clean the Modbus receive buffer to prevent warnings"""
    try:
        if modbus_client and modbus_client.socket:
            # Set non-blocking to quickly check for pending data
            modbus_client.socket.timeout = 0.1
            modbus_client.socket.write_timeout = 0.1
            
            # Read and discard any pending data in buffer
            data_cleared = False
            while True:
                try:
                    data = modbus_client.socket.read(1024)
                    if not data:
                        break
                    data_cleared = True
                    logger.debug(f"Cleared {len(data)} bytes from Modbus buffer")
                except:
                    break
            
            if data_cleared:
                logger.debug("✅ Modbus buffer cleaned")
            
            # Reset timeouts to normal
            modbus_client.socket.timeout = 1
            modbus_client.socket.write_timeout = 1
            
    except Exception as e:
        logger.debug(f"Buffer cleanup warning: {e}")

'''
Read modbus function for holdind
'''
def robust_modbus_read_holding(modbus_client, address, count, slave_id, max_retries=5):
    """Robust Modbus read with retry logic and connection recovery"""
    logger.info(f"Slave id {slave_id} register {count} address {address}")
    for attempt in range(max_retries):
        try:
            # Clean buffer before each attempt
            clean_modbus_buffer(modbus_client)
            # exit try
            result = modbus_client.read_holding_registers(
                address=address, count=count, slave=slave_id
            )
           
            if result.isError():
                logger.warning(f"125 Attempt {attempt + 1}: Modbus read  for slave {slave_id}")
                time.sleep(1)
                continue
                
            # Verify the response is from the correct slave
            if hasattr(result, 'slave_id') and result.slave_id != slave_id:
                logger.warning(f"131 Attempt {attempt + 1}: Wrong slave ID. Expected {slave_id}, got {result.slave_id}")
                clean_modbus_buffer(modbus_client)
                time.sleep(0.3)
                continue
                
            return result
            
        except Exception as e:
            logger.warning(f"139 Attempt {attempt + 1}: Exception reading slave {slave_id}: {e}")
            if attempt < max_retries - 1:
                time.sleep(0.5)
    
    return None

'''
Read modbus function for input register
'''
def robust_modbus_read_input(modbus_client, address, count, slave_id, max_retries=5):
    """Robust Modbus read with retry logic and connection recovery"""
    logger.info(f"Slave id {slave_id} register {address}")
    for attempt in range(max_retries):
        try:
            # Clean buffer before each attempt
            clean_modbus_buffer(modbus_client)
            # exit try
            result = modbus_client.read_input_registers(
                address=address, count=count, slave=slave_id
            )
           
            if result.isError():
                logger.warning(f"164 Attempt {attempt + 1}: Modbus read  for slave {slave_id}")
                time.sleep(1)
                continue
                
            # Verify the response is from the correct slave
            if hasattr(result, 'slave_id') and result.slave_id != slave_id:
                logger.warning(f"170 Attempt {attempt + 1}: Wrong slave ID. Expected {slave_id}, got {result.slave_id}")
                clean_modbus_buffer(modbus_client)
                time.sleep(0.3)
                continue
                
            return result
            
        except Exception as e:
            logger.warning(f"178 Attempt {attempt + 1}: Exception reading slave {slave_id}: {e}")
            if attempt < max_retries - 1:
                time.sleep(0.5)
    
    return None

def read_sensor(sensor_name: str, modbus_client):
    '''
    sensor flow  
    read sensor data  ->  scale_value -> calibrate -> smooth convolue
    '''
    base = f"sensor_config.{sensor_name}"
    slave_id = get_config(f"{base}.slave_id")
    register = get_config(f"{base}.register")
    divide_by = get_config(f"{base}.divide_by") or 1.0
    offset = get_config(f"{base}.offset") or 0.0
    scale = get_config(f"{base}.scale") or 1.0
    logger.info(f"")
    logger.info(f"✅ 152 Try Reading Sensor: {sensor_name} / slave_id: {slave_id} / register: {register}")


    if slave_id is None or register is None:
        logger.warning(f"Sensor '{sensor_name}' slave {slave_id} missing required Modbus info.")
        return None

    try:
        if modbus_client:
            '''
            register_type	PyModbus Method	Function Code	Description
            "holding"	read_holding_registers()	FC03 (0x03)	Read Holding Registers
            "input"	read_input_registers()	FC04 (0x04)	Read Input Registers

            # result = modbus_client.read_holding_registers(
            #     address=register, count=1, slave=slave_id
            # )
            # อ่านค่าตาม slave_id
            '''
            # group senser reading with function F04
            if slave_id in [60, 61]:
                # Read one word
                response = robust_modbus_read_input(modbus_client, register, 1, slave_id)
                # ดึงค่า raw และคำนวณ
                raw_value = response.registers[0]
                offset_value = (raw_value / divide_by + offset) * scale

                # ถ้าต้องการปัดเศษ
                scaled_value = round(offset_value, 2)
            # group senser reading with function F03
            # no ponilomial
            #     
            elif slave_id in [32, 40, 41, 42]:
                # read one word
                response = robust_modbus_read_holding(modbus_client, register, 1, slave_id)
                # ดึงค่า raw และคำนวณ
                raw_value = response.registers[0]
                offset_value = (raw_value / divide_by + offset) * scale
                # ถ้าต้องการปัดเศษ
                scaled_value = round(offset_value, 2)
            #
            elif slave_id in [50, 51, 52]:
                # read one word
                response = robust_modbus_read_holding(modbus_client, register, 1, slave_id)

                # ดึงค่า raw และคำนวณ
                raw_value = response.registers[0]
                # Sensor pH register 1
                if (slave_id == 50 and register == 1):
                    offset_value = (raw_value / divide_by + offset) * scale
                    scaled_value = round(offset_value, 2)
                if (slave_id == 51 and register == 1):
                    offset_value = (raw_value / divide_by + offset) * scale
                    scaled_value = round(offset_value, 2)
                if (slave_id == 52 and register == 1):
                    offset_value = (raw_value / divide_by + offset) * scale
                    scaled_value = round(offset_value, 2)

                # Sensor Temp register 0
                # Apply polynomial function based on slave_id
                if (slave_id == 50 and register == 0):
                    # ID_50: y = 0.0099x² + 0.3565x + 6.6435
                    x = raw_value / divide_by + offset  # Apply divide and offset first
                    #scaled_value = 0.0099 * (x ** 2) + 0.3565 * x + 6.6435
                    scaled_value = x
                    scaled_value = round(scaled_value * scale, 2)  # Apply scale at the end
                    
                    
                elif (slave_id == 51 and register == 0):
                    # ID_51: y = 0.0191x² - 0.4988x + 20.351
                    x = raw_value / divide_by + offset
                    #scaled_value = 0.0191 * (x ** 2) - 0.4988 * x + 20.351
                    #scaled_value = 0.0099 * (x ** 2) + 0.3565 * x + 6.6435
                    scaled_value = x
                    scaled_value = round(scaled_value * scale, 2)
                    
                elif (slave_id == 52 and register == 0):
                    # ID_52: y = 0.0126x² + 0.2304x + 8.6874
                    x = raw_value / divide_by + offset
                    #scaled_value = 0.0126 * (x ** 2) + 0.2304 * x + 8.6874
                    scaled_value = x
                    scaled_value = round(scaled_value * scale, 2)
            # disolve oxygen   
            elif slave_id in [20]:
                logger.info(f"Reading Dissolved Oxygen sensor: {sensor_name}")
                # Read 2 words
                result = robust_modbus_read_holding(modbus_client, register, 2, slave_id)
                # 32 bit big endian
                if result and not result.isError():
                    register_2 = result.registers[1]
                    register_3 = result.registers[0]

                    logger.debug(f"Register 0x{register:04X}: {register_2} (0x{register_2:04X})")
                    logger.debug(f"Register 0x{register+1:04X}: {register_3} (0x{register_3:04X})")

                    # Convert to IEEE 754 float
                    float_bytes = struct.pack('<HH', register_2, register_3)
                    dissolved_oxygen = struct.unpack('<f', float_bytes)[0] 
                    scaled_value = round(dissolved_oxygen,2)
                    logger.info(f"Dissolved Oxygen: {scaled_value} mg/L")
                    
                    
                    buffer.update(sensor_name, scaled_value)
                    smoothed_value = buffer.get_convolved_value(sensor_name)
                    return smoothed_value
                else:
                    logger.warning(f"Failed to read Dissolved Oxygen sensor {sensor_name}")
                    # Return last known good value if available
                    last_value = buffer.get_latest_value(sensor_name)
                    return last_value
            else:
                logger.error(f"Unknown slave_id: {slave_id}")
                return None

            # ตรวจสอบ error ก่อน
            if response.isError():
                logger.error(f"Failed to read register {register} from slave {slave_id}: {response}")
                return None
                   

            

            logger.info(f"✅ 178 Success Reading Sensor: {sensor_name} / slave_id: {slave_id} / raw: {raw_value} / calibrated: {scaled_value}")

        #buffer.update(sensor_name, scaled_value)
        #smoothed_value = buffer.get_convolved_value(sensor_name)
        return scaled_value
        #return smoothed_value

    except Exception as e:
        logger.error(f"❌ 400 Error reading register: {e}")
        return None


def read_all_sensors(modbus_client):
    sensor_config = get_config("sensor_config")
    if not sensor_config:
        logger.error("No sensor_config found.")
        return {}

    sensor_values = {}
    for sensor_name in sensor_config.keys():
        value = read_sensor(sensor_name, modbus_client)
        # save data to array
        sensor_values[sensor_name] = value
        # adjust time read sensor 10 seconds
        time.sleep(10)

    return sensor_values


def ping_mongo():
    try:
        mongo_client.admin.command("ping")
        logger.info("✅ Connected to MongoDB.")
        return True
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        return False

def backup_ping_mongo():
    try:
        backup_mongo_client.admin.command("ping")
        logger.info("✅ Connected to Backup MongoDB.")
        return True
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        return False
    
def ensure_collections():
    sensor_config = get_config("sensor_config")
    for sensor_name in sensor_config:
        try:
            mongo_db.create_collection(sensor_name)
            backup_mongo_db.create_collection(sensor_name)
            logger.info(f"✅ Created collection: {sensor_name}")
        except Exception as e:
            if "already exists" not in str(e):
                logger.warning(f"❌ Collection already exists: {e}")
        mongo_collections[sensor_name] = mongo_db[sensor_name]
        backup_mongo_collections[sensor_name] = backup_mongo_db[sensor_name]

def check_backup_mongo_connection():
    """Check if backup MongoDB is actually available"""
    try:
        backup_mongo_client.admin.command('ping')
        logger.info("✅ Backup MongoDB connection verified")
        return True
    except Exception as e:
        logger.error(f"❌ Backup MongoDB connection failed: {e}")
        return False

'''
create collection automatic
'''
def ensure_average_collections_exist():
    """ตรวจสอบและสร้าง collections สำหรับค่าเฉลี่ยถ้ายังไม่มี"""
    global mongo_collections, backup_mongo_collections
    
    avg_collections = ["avg_sensor_ph_reactor", "avg_sensor_temp_reactor"]
    
    for collection_name in avg_collections:
        # สร้างใน primary MongoDB
        if collection_name not in mongo_collections:
            mongo_collections[collection_name] = mongo_db[collection_name]
            logger.info(f"✅ Created primary collection: {collection_name}")
        
        # สร้างใน backup MongoDB
        if collection_name not in backup_mongo_collections:
            backup_mongo_collections[collection_name] = backup_mongo_db[collection_name]
            logger.info(f"✅ Created backup collection: {collection_name}")


def insert_sensor_data(sensor_data):
    timestamp = datetime.now()
    device_id = get_config("device_id")
    batch_no = get_config("batch_no")

    logger.info("============================================")
    logger.info(f"🖥️  Device ID: {device_id}")
    logger.info(f"🗃️  Batch No: {batch_no}")
    logger.info(f"⏱️  Timestamp: {timestamp}")
    logger.info("============================================")
    
    sensor_config = get_config("sensor_config")
    
    # Verify connections before inserting
    primary_available = ping_mongo()
    backup_available = check_backup_mongo_connection()
    
    logger.info(f"📊 Connection Status - Primary: {primary_available}, Backup: {backup_available}")
    
    # Calculate averages for pH and temperature
    ph_sensors = ["sensor_ph_reactor_tank1", "sensor_ph_reactor_tank2", "sensor_ph_reactor_tank3"]
    temp_sensors = ["sensor_temp_reactor_tank1", "sensor_temp_reactor_tank2", "sensor_temp_reactor_tank3"]
    
    # Calculate pH average
    ph_values = []
    for sensor in ph_sensors:
        if sensor in sensor_data and sensor_data[sensor] is not None:
            ph_values.append(sensor_data[sensor])
            logger.info(f"📊 pH from {sensor}: {sensor_data[sensor]}")
    
    avg_ph = None
    if ph_values:
        avg_ph = sum(ph_values) / len(ph_values)
        sensor_data["avg_sensor_ph_reactor"] = round(avg_ph, 2)
        logger.info(f"📊 Average pH: {avg_ph:.2f} (from {len(ph_values)} tanks)")
    
    # Calculate temperature average
    temp_values = []
    for sensor in temp_sensors:
        if sensor in sensor_data and sensor_data[sensor] is not None:
            temp_values.append(sensor_data[sensor])
            logger.info(f"📊 Temperature from {sensor}: {sensor_data[sensor]}°C")
    
    avg_temp = None
    if temp_values:
        avg_temp = sum(temp_values) / len(temp_values)
        sensor_data["avg_sensor_temp_reactor"] = round(avg_temp, 2)
        logger.info(f"📊 Average Temperature: {avg_temp:.2f}°C (from {len(temp_values)} tanks)")
    
    # Insert regular sensor data
    for sensor_name in sensor_config.keys():
        try:
            if sensor_name not in sensor_data or sensor_data[sensor_name] is None:
                continue
                
            metadata = sensor_config[sensor_name]["metadata"]
            value = sensor_data[sensor_name]
            unit = metadata["unit"]
            
            doc = {
                "timestamp": timestamp,
                "value": round(value, 2),
                "device_id": device_id,
                "batch_no": batch_no,
                **metadata,
            }
            logger.info(f"📦 {sensor_name} => {value} {unit}")
            
            # Primary MongoDB insertion
            if primary_available:
                try:
                    mongo_collections[sensor_name].insert_one(doc)
                    logger.info(f"✅ Successfully inserted {sensor_name} [id {device_id}] to primary MongoDB")
                except Exception as primary_error:
                    logger.error(f"❌ Failed to insert {sensor_name} [id {device_id}] to primary MongoDB: {primary_error}")
                    primary_available = False
            else:
                logger.warning(f"⏸️  Skipping primary MongoDB - connection unavailable")
            
            # Backup MongoDB insertion
            if backup_available:
                try:
                    backup_mongo_collections[sensor_name].insert_one(doc)
                    logger.info(f"✅ Successfully inserted {sensor_name} [id {device_id}] to backup MongoDB")
                except Exception as backup_error:
                    logger.error(f"❌ Failed to insert {sensor_name} [id {device_id}] to backup MongoDB: {backup_error}")
                    backup_available = False
            else:
                logger.warning(f"⏸️  Skipping backup MongoDB - connection unavailable")
                
            if not primary_available and not backup_available:
                logger.error("🚨 Both primary and backup MongoDB connections failed!")
                
        except Exception as e:
            logger.warning(f"Cannot insert data {sensor_name}: {e}")
    
    # Insert average pH data to database
    if avg_ph is not None:
        avg_ph_doc = {
            "timestamp": timestamp,
            "value": round(avg_ph, 2),
            "device_id": device_id,
            "batch_no": batch_no,
            "location": "reactor",
            "unit": "pH",
            "sensor_type": "ph_average",
            "source_sensors": ph_sensors,
            "calculation_method": "average_of_3_tanks"
        }
        
        # Insert to primary MongoDB
        if primary_available:
            try:
                mongo_collections["avg_sensor_ph_reactor"].insert_one(avg_ph_doc)
                logger.info(f"✅ Successfully inserted avg pH [id {device_id}] to primary MongoDB")
            except Exception as e:
                logger.error(f"❌ Failed to insert avg pH to primary: {e}")
        
        # Insert to backup MongoDB
        if backup_available:
            try:
                backup_mongo_collections["avg_sensor_ph_reactor"].insert_one(avg_ph_doc)
                logger.info(f"✅ Successfully inserted avg pH [id {device_id}] to backup MongoDB")
            except Exception as e:
                logger.error(f"❌ Failed to insert avg pH to backup: {e}")
    
    # Insert average temperature data to database
    if avg_temp is not None:
        avg_temp_doc = {
            "timestamp": timestamp,
            "value": round(avg_temp, 2),
            "device_id": device_id,
            "batch_no": batch_no,
            "location": "reactor",
            "unit": "C",
            "sensor_type": "temperature_average",
            "source_sensors": temp_sensors,
            "calculation_method": "average_of_3_tanks"
        }
        
        # Insert to primary MongoDB
        if primary_available:
            try:
                mongo_collections["avg_sensor_temp_reactor"].insert_one(avg_temp_doc)
                logger.info(f"✅ Successfully inserted avg temperature [id {device_id}] to primary MongoDB")
            except Exception as e:
                logger.error(f"❌ Failed to insert avg temperature to primary: {e}")
        
        # Insert to backup MongoDB
        if backup_available:
            try:
                backup_mongo_collections["avg_sensor_temp_reactor"].insert_one(avg_temp_doc)
                logger.info(f"✅ Successfully inserted avg temperature [id {device_id}] to backup MongoDB")
            except Exception as e:
                logger.error(f"❌ Failed to insert avg temperature to backup: {e}")
    
    logger.info("============================================")


def insert_sensor_data_ori(sensor_data):
    timestamp = datetime.now()
    device_id = get_config("device_id")
    batch_no = get_config("batch_no")

    logger.info("============================================")
    logger.info(f"🖥️  Device ID: {device_id}")
    logger.info(f"🗃️  Batch No: {batch_no}")
    logger.info(f"⏱️  Timestamp: {timestamp}")
    logger.info("============================================")
    
    sensor_config = get_config("sensor_config")
    
    # Verify connections before inserting
    primary_available = ping_mongo()  # This will check primary connection
    backup_available = check_backup_mongo_connection()  # This checks backup
    
    logger.info(f"📊 Connection Status - Primary: {primary_available}, Backup: {backup_available}")
    
    for sensor_name in sensor_config.keys():
        try:
            metadata = sensor_config[sensor_name]["metadata"]
            #value = round(sensor_data[sensor_name], 2)
            value = sensor_data[sensor_name]
            unit = metadata["unit"]
            doc = {
                "timestamp": timestamp,
                "value": round(value,2),
                "device_id": device_id,
                "batch_no": batch_no,
                **metadata,
            }
            logger.info(f"📦 452 {sensor_name} => {value} {unit}")
            
            # Primary MongoDB insertion with error handling
            if primary_available:
                try:
                    mongo_collections[sensor_name].insert_one(doc)
                    logger.info(f"✅ 458 Successfully inserted {sensor_name} [id {device_id}] to primary MongoDB")
                except Exception as primary_error:
                    logger.error(f"❌ 460 Failed to insert {sensor_name} [id {device_id}] to primary MongoDB: {primary_error}")
                    # Mark primary as unavailable for next iterations
                    primary_available = False
            else:
                logger.warning(f"⏸️  Skipping primary MongoDB - connection unavailable")
            
            # Backup MongoDB insertion with error handling
            if backup_available:
                try:
                    backup_mongo_collections[sensor_name].insert_one(doc)
                    logger.info(f"✅ Successfully inserted {sensor_name} [id {device_id}] to backup MongoDB")
                except Exception as backup_error:
                    logger.error(f"❌ Failed to insert {sensor_name} [id {device_id}] to backup MongoDB: {backup_error}")
                    # Mark backup as unavailable for next iterations
                    backup_available = False
            else:
                logger.warning(f"⏸️  Skipping backup MongoDB - connection unavailable")
                
            # If both failed, we should try to reconnect next time
            if not primary_available and not backup_available:
                logger.error("🚨 Both primary and backup MongoDB connections failed!")
                
        except Exception as e:
            logger.warning(f"Cannot insert data {sensor_name}: {e}")

    logger.info("============================================")

def main():
    # Wait for MongoDB connections
    while True:
        if ping_mongo():
            break
        time.sleep(5)
    while True:
        if backup_ping_mongo():
            break
        time.sleep(5)
    ensure_collections()

    # Modbus connection with retry logic
    RESET_INTERVAL = 3600  # Reset every 1 hour (3600 seconds)
    
    while True:
        try:
            connection_start_time = time.time()
            
            client = ModbusSerialClient(
                port="/dev/ttyUSB_node1", 
                framer=FramerType.RTU, 
                baudrate=9600, 
                retries=5,
                timeout=1
            )
            
            if client.connect():
                clean_modbus_buffer(client)
                logger.info("✅ Modbus connected and buffer cleaned")
                
                last_publish_time = 0
                consecutive_errors = 0
                max_consecutive_errors = 5
                # สร้าง collections สำหรับค่าเฉลี่ย
                ensure_average_collections_exist()
                while True:
                    try:
                        # Check if it's time to reset the connection
                        current_time = time.time()
                        if current_time - connection_start_time >= RESET_INTERVAL:
                            logger.info("🕒 Modbus connection reset after 1 hour")
                            break  # Break inner loop to reconnect
                        
                        sensor_data = read_all_sensors(client)
                        
                        if current_time - last_publish_time > 30:
                            last_publish_time = current_time
                            insert_sensor_data(sensor_data)
                            
                        # Reset error counter on successful read
                        consecutive_errors = 0
                        
                        # Clean buffer periodically
                        clean_modbus_buffer(client)
                        time.sleep(30)
                        print("System wait 30 seconds have passed!")
                        
                    except Exception as e:
                        consecutive_errors += 1
                        logger.error(f"Error in main loop: {e}")
                        
                        if consecutive_errors >= max_consecutive_errors:
                            logger.error("Too many consecutive errors, reconnecting Modbus...")
                            break
                            
                        time.sleep(2)
                
            else:
                logger.error("Failed to connect to Modbus device.")
                
        except KeyboardInterrupt:
            logger.info("Program interrupted by user")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main: {e}")
        finally:
            if 'client' in locals():
                client.close()
                logger.info("Modbus connection closed")
        
        # Wait before reconnecting
        logger.info("Waiting 10 seconds before reconnecting...")
        time.sleep(10)

if __name__ == "__main__":
    main()
