import paho.mqtt.client as mqtt

import re



# ===== MQTT Settings =====

BROKER = "localhost"

PORT = 1883

MQTT_USER = "aiotchlorella"

MQTT_PASS = "P@$$w0rd2025"

CLIENT_ID = "mqtt_echo_client"



# แยกกลุ่ม Topic เพื่อให้ง่ายต่อการจัดการและซ่อมบำรุง

TOPIC_GROUPS = {

    "BATCH": [

        '/station1/batch/control'

    ],

    "LIGHT": [

        '/station1/light/status/control',

        '/station1/light/timer/control',

        '/station1/light/start/control',

        '/station1/light/end/control',

        '/station1/light/duration/control',

        '/station1/light/days/control'

    ],

    "PUMP": [

        '/station1/pump/status/control'

    ],

    "FAN": [

        '/station1/fan/status/control'

    ],

    "PH": [

        '/station1/ph/auto/control',

        '/station1/ph/minlow/control',

        '/station1/ph/minhigh/control',

        '/station1/ph/maxlow/control',

        '/station1/ph/maxhigh/control'

    ],

    "GAS": [

        '/station1/gas/auto/control',

        '/station1/gas/co2/status/control',

        '/station1/gas/co2/minlow/control',

        '/station1/gas/co2/minhigh/control',

        '/station1/gas/co2/maxlow/control',

        '/station1/gas/co2/maxhigh/control'

    ],

    "TEMPERATURE": [

        '/station1/temp/auto/control',

        '/station1/temp/minlow/control',

        '/station1/temp/minhigh/control',

        '/station1/temp/maxlow/control',

        '/station1/temp/maxhigh/control'

    ]

}



# Sensor value topics (รับค่าตัวเลขจากเซ็นเซอร์)

SENSOR_VALUE_TOPICS = [

    '/station1/temp/value',

    '/station1/light/value',

    '/station1/ph/value',

    '/station1/co2/value'

]



# สร้างรายการรวมสำหรับใช้ Subscribe MQTT

CONTROL_TOPICS = []

for group in TOPIC_GROUPS.values():

    CONTROL_TOPICS.extend(group)



# รวม topic ทั้งหมด (control + sensor values)

ALL_TOPICS = CONTROL_TOPICS + SENSOR_VALUE_TOPICS



# ===== Callbacks =====

def on_connect(client, userdata, flags, rc, properties=None):

    if rc == 0:

        print("[Connected] Status: Success")

        for topic in ALL_TOPICS:

            client.subscribe(topic)

            print(f"[Subscribed] {topic}")

    else:

        print(f"[Connected] Failed: {rc}")



def on_message(client, userdata, msg):

    payload = msg.payload.decode().strip()

    topic = msg.topic



    # Sensor value topics — แค่รับค่าและแสดงผล (ไม่ต้อง echo กลับ)

    if topic in SENSOR_VALUE_TOPICS:

        print(f"[SENSOR] {topic} | Value: {payload}")

        return



    # Control topics — เปลี่ยน /control เป็น /response (Pure Echo)

    response_topic = re.sub(r"/control$", "/response", topic)

    client.publish(response_topic, payload, retain=True)

    print(f"[ECHO] {topic} -> {response_topic} | Value: {payload}")



# ===== Start Client =====

# ใช้ VERSION2 ตามเวอร์ชันล่าสุดของ paho-mqtt

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, CLIENT_ID)

client.username_pw_set(MQTT_USER, MQTT_PASS)

client.on_connect = on_connect

client.on_message = on_message



try:

    print(f"Connecting to {BROKER}...")

    client.connect(BROKER, PORT, 60)

    client.loop_forever()

except KeyboardInterrupt:

    client.disconnect()

    print("\n[Stopped by User]")