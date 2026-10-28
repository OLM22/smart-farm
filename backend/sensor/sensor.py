from datetime import datetime, timedelta
import json
import logging
import time
import urllib.parse
from pymongo import MongoClient
import paho.mqtt.client as paho_mqtt

logging.basicConfig(
    format="%(asctime)s.%(msecs)03d - %(levelname)s - %(message)s",
    style="%",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)

# ====== MongoDB Setup ======
MONGO_DB_NAME = "chlorella-aiot-cluster"
MONGO_PASSWORD = urllib.parse.quote("P@$$w0rd2025")
MONGO_URI = f"mongodb://aiotchlorella:{MONGO_PASSWORD}@119.59.99.233:27017/{MONGO_DB_NAME}?authSource=chlorella-aiot-cluster"
BACKUP_MONGO_URI = "mongodb://admin:password@localhost:27017/"

# ใช้ serverSelectionTimeoutMS ต่ำๆ เพื่อให้สลับไป Backup ได้เร็วขึ้นถ้า Primary ล่ม
try:
    primary_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    primary_db = primary_client[MONGO_DB_NAME]
except Exception as e:
    logger.error(f"Failed to setup Primary MongoDB client: {e}")

try:
    backup_client = MongoClient(BACKUP_MONGO_URI, serverSelectionTimeoutMS=2000)
    backup_db = backup_client[MONGO_DB_NAME]
except Exception as e:
    logger.error(f"Failed to setup Backup MongoDB client: {e}")

# ====== MQTT Setup ======
MQTT_BROKER_HOST = "119.59.99.233"
MQTT_BROKER_PORT = 1883
MQTT_USER = "aiotchlorella"
MQTT_PASS = "P@$$w0rd2025"

mqtt_client = paho_mqtt.Client()
mqtt_client.username_pw_set(MQTT_USER, MQTT_PASS)

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
        return None

def connect_mqtt():
    try:
        mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT)
        mqtt_client.loop_start()
        logger.info(f"✅ Connected to MQTT broker {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to connect MQTT broker: {e}")
        return False

def check_db_connection(client, name="MongoDB"):
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.warning(f"⚠️ {name} connection ping failed: {e}")
        return False

def check_timestamp(doc):
    """ตรวจสอบว่าข้อมูลเพิ่งถูกอัปเดตไม่เกิน 10 นาที (ป้องกันการส่งข้อมูลเก่าค้าง)"""
    if not doc or 'timestamp' not in doc or 'value' not in doc:
        return None
    
    # คำนวณความต่างของเวลาจากตอนนี้เทียบกับใน DB (สมมติว่า timezone เดียวกัน)
    time_diff = datetime.now() - doc['timestamp']
    
    if time_diff.total_seconds() <= 600:  # ข้อมูลต้องไม่เก่าเกิน 600 วิ (10 นาที)
        return doc['value']
    else:
        return None

def fetch_latest_from_db(sensor_name):
    """Fetch the latest value for a given sensor from MongoDB"""
    # 1. ลองดึงจาก Primary
    try:
        col = primary_db[sensor_name]
        doc = col.find_one({}, sort=[("timestamp", -1)])
        val = check_timestamp(doc)
        if val is not None:
             return val
    except Exception as e:
        logger.debug(f"Failed to read {sensor_name} from primary DB: {e}")

    # 2. ถ้า Primary พัง ลองดึงจาก Backup
    try:
        col = backup_db[sensor_name]
        doc = col.find_one({}, sort=[("timestamp", -1)])
        val = check_timestamp(doc)
        if val is not None:
             return val
    except Exception as e:
        logger.debug(f"Failed to read {sensor_name} from backup DB: {e}")

    return None

def fetch_all_sensors():
    sensor_config = get_config("sensor_config")
    if not sensor_config:
        logger.error("No sensor_config found.")
        return {}

    logger.info("============================================")
    logger.info(f"🔍 Fetching latest sensor data from MongoDB...")
    
    sensor_values = {}
    for sensor_name in sensor_config.keys():
        value = fetch_latest_from_db(sensor_name)
        if value is not None:
            sensor_values[sensor_name] = value
            unit = sensor_config[sensor_name].get("metadata", {}).get("unit", "")
            logger.info(f"📦 DB [{sensor_name}] => {value} {unit}")
            
    return sensor_values

def calculate_averages(sensor_data):
    """Calculate average values for pH, temperature, and EC from 3 tanks"""
    logger.info("--------------------------------------------")
    
    # Calculate pH average
    ph_sensors = ["sensor_ph_reactor_tank1", "sensor_ph_reactor_tank2", "sensor_ph_reactor_tank3"]
    ph_values = [sensor_data[s] for s in ph_sensors if s in sensor_data]
    if ph_values:
        avg_ph = sum(ph_values) / len(ph_values)
        sensor_data["avg_sensor_ph_reactor"] = round(avg_ph, 2)
        logger.info(f"📊 Calculated Avg pH: {avg_ph:.2f} (from {len(ph_values)} tanks)")

    # Calculate temperature average
    temp_sensors = ["sensor_temp_reactor_tank1", "sensor_temp_reactor_tank2", "sensor_temp_reactor_tank3"]
    temp_values = [sensor_data[s] for s in temp_sensors if s in sensor_data]
    if temp_values:
        avg_temp = sum(temp_values) / len(temp_values)
        sensor_data["avg_sensor_temp_reactor"] = round(avg_temp, 2)
        logger.info(f"📊 Calculated Avg Temperature: {avg_temp:.2f}°C (from {len(temp_values)} tanks)")

    # Calculate EC average
    ec_sensors = ["sensor_ec_reactor_tank1", "sensor_ec_reactor_tank2", "sensor_ec_reactor_tank3"]
    ec_values = [sensor_data[s] for s in ec_sensors if s in sensor_data]
    if ec_values:
        avg_ec = sum(ec_values) / len(ec_values)
        sensor_data["avg_sensor_ec_reactor"] = round(avg_ec, 2)
        logger.info(f"📊 Calculated Avg EC: {avg_ec:.2f} µS/cm (from {len(ec_values)} tanks)")

    logger.info("--------------------------------------------")

def publish_to_mqtt(sensor_data):
    """Publish avg Temperature, avg pH, CO2, avg EC to MQTT for real-time Dashboard display"""
    topics = {
        "avg_sensor_temp_reactor": "/station1/temp/value",
        "avg_sensor_ph_reactor": "/station1/ph/value",
        "sensor_co2_inflow": "/station1/co2/value",
        "avg_sensor_ec_reactor": "/station1/ec/value",
    }
    
    published_count = 0
    for sensor_key, topic in topics.items():
        value = sensor_data.get(sensor_key)
        if value is not None:
            try:
                mqtt_client.publish(topic, str(round(value, 2)))
                logger.info(f"📡 MQTT Published {topic} → {round(value, 2)}")
                published_count += 1
            except Exception as e:
                logger.error(f"❌ MQTT publish failed for {topic}: {e}")
                
    if published_count > 0:
         logger.info(f"✅ Successfully published {published_count} topics to MQTT")
    logger.info("============================================")

def main():
    logger.info("🚀 Starting sensor.py (MongoDB Reader -> MQTT Publisher mode) 🚀")
    logger.info("📌 (This script no longer reads Modbus directly to prevent port collision)")
    
    # Wait for MongoDB to be accessible
    while True:
        primary_ok = check_db_connection(primary_client, "Primary DB")
        backup_ok = check_db_connection(backup_client, "Backup DB")
        if primary_ok or backup_ok:
            logger.info("✅ Connected to MongoDB")
            break
        logger.warning("⏳ Waiting for MongoDB connection...")
        time.sleep(5)

    # Connect to MQTT broker
    while not connect_mqtt():
        logger.warning("⏳ Waiting for MQTT connection...")
        time.sleep(5)

    # Main Loop (Every 30 seconds)
    while True:
        try:
            # 1. Fetch latest raw data from MongoDB
            sensor_data = fetch_all_sensors()
            
            if sensor_data:
                # 2. Calculate necessary averages
                calculate_averages(sensor_data)
                
                # 3. Publish results to MQTT
                publish_to_mqtt(sensor_data)
            else:
                logger.warning("⚠️ No recent sensor data retrieved from MongoDB this cycle (either DB is empty or data is older than 10 mins).")
                
        except Exception as e:
            logger.error(f"❌ Error in main loop: {e}", exc_info=True)
            
        logger.info("System wait 30 seconds have passed!")
        time.sleep(30)

if __name__ == "__main__":
    main()