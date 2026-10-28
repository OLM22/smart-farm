import json
import sqlite3
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request, Form, status, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import paho.mqtt.client as mqtt

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# ----------------- Database Setup -----------------
def init_db():
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS nodes (
            device_id TEXT PRIMARY KEY, 
            node_type TEXT, 
            firmware_version TEXT,
            ip_address TEXT, 
            sensor_types TEXT, 
            relay_count INT, 
            channels_info TEXT,
            status TEXT, 
            last_seen DATETIME
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_rules (
            rule_id INTEGER PRIMARY KEY AUTOINCREMENT, 
            rule_name TEXT,
            sensor_device_id TEXT, 
            sensor_type TEXT, 
            operator TEXT,
            threshold_value REAL, 
            target_relay_device_id TEXT, 
            target_channel INT,
            action TEXT, 
            is_active INT DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timer_schedules (
            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT, 
            schedule_name TEXT,
            target_relay_device_id TEXT, 
            target_channel INT, 
            on_time TEXT, 
            off_time TEXT,
            is_active INT DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_history (
            history_id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            timestamp DATETIME,
            sensor_type TEXT,
            value REAL
        )
    ''')
    
    # DB Migration: Add latest_readings column to nodes table if not exists
    try:
        cursor.execute("ALTER TABLE nodes ADD COLUMN latest_readings TEXT")
    except sqlite3.OperationalError:
        pass # already exists
        
    conn.commit()
    conn.close()

init_db()

# ----------------- Pydantic Models for JSON APIs -----------------
class RuleCreate(BaseModel):
    rule_name: str
    sensor_device_id: str
    sensor_type: str
    operator: str
    threshold_value: float
    target_relay_device_id: str
    target_channel: int
    action: str

class ScheduleCreate(BaseModel):
    schedule_name: str
    target_relay_device_id: str
    target_channel: int
    on_time: str
    off_time: str

# ----------------- MQTT & Automation Logic -----------------
def send_relay_command(device_id: str, channel: int, action: str):
    payload = json.dumps({"channel": channel, "command": action})
    mqtt_client.publish(f"farm/relay/{device_id}/control", payload)

def evaluate_sensor_rules(sensor_device_id: str, sensor_type: str, current_val: float):
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT target_relay_device_id, target_channel, operator, threshold_value, action 
        FROM sensor_rules 
        WHERE sensor_device_id = ? AND sensor_type = ? AND is_active = 1
    ''', (sensor_device_id, sensor_type))
    
    rules = cursor.fetchall()
    conn.close()
    
    for relay_id, ch, op, threshold, action in rules:
        triggered = False
        if op == '<' and current_val < threshold: triggered = True
        elif op == '>' and current_val > threshold: triggered = True
        elif op == '<=' and current_val <= threshold: triggered = True
        elif op == '>=' and current_val >= threshold: triggered = True
        
        if triggered:
            send_relay_command(relay_id, ch, action)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic = msg.topic

        # ลงทะเบียน Node จาก ESP32
        if topic == "farm/nodes/register":
            device_id = payload.get("device_id")
            node_type = payload.get("type")
            version = payload.get("version")
            ip = payload.get("ip")
            sensor_types = json.dumps(payload.get("sensor_types", []))
            relay_count = payload.get("relay_count", 0)
            incoming_channels = payload.get("channels", [])
            
            conn = sqlite3.connect('farm_local.db')
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Fetch existing channels_info to preserve custom names
            cursor.execute("SELECT channels_info FROM nodes WHERE device_id = ?", (device_id,))
            row = cursor.fetchone()
            
            existing_channels = []
            if row and row["channels_info"]:
                try:
                    existing_channels = json.loads(row["channels_info"])
                except Exception:
                    pass
            
            # Merge logic: preserve existing name if channel exists in DB
            merged_channels = []
            for incoming in incoming_channels:
                ch_num = incoming.get("ch")
                existing_match = next((c for c in existing_channels if c.get("ch") == ch_num), None)
                if existing_match and existing_match.get("name"):
                    merged_channels.append({"ch": ch_num, "name": existing_match["name"]})
                else:
                    merged_channels.append({"ch": ch_num, "name": incoming.get("name", f"CH{ch_num}")})
            
            final_channels_json = json.dumps(merged_channels)
            
            cursor.execute('''
                INSERT INTO nodes (device_id, node_type, firmware_version, ip_address, sensor_types, relay_count, channels_info, status, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?)
                ON CONFLICT(device_id) DO UPDATE SET
                    firmware_version=excluded.firmware_version,
                    ip_address=excluded.ip_address,
                    sensor_types=excluded.sensor_types,
                    relay_count=excluded.relay_count,
                    channels_info=?,
                    status='ONLINE', 
                    last_seen=excluded.last_seen
            ''', (
                device_id, node_type, version, ip, sensor_types, relay_count, final_channels_json,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                final_channels_json
            ))
            conn.commit()
            conn.close()

        # รับค่าเซนเซอร์แล้วอัปเดตและเทียบ Rule
        elif "sensors/data" in topic:
            device_id = payload.get("device_id")
            readings = payload.get("readings", {})
            
            conn = sqlite3.connect('farm_local.db')
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE nodes 
                SET latest_readings = ?, last_seen = ?, status = 'ONLINE' 
                WHERE device_id = ?
            ''', (json.dumps(readings), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), device_id))
            
            # Log readings to sensor_history table
            for sensor_type, val in readings.items():
                cursor.execute('''
                    INSERT INTO sensor_history (device_id, timestamp, sensor_type, value)
                    VALUES (?, ?, ?, ?)
                ''', (device_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), sensor_type, float(val)))
                
            conn.commit()
            conn.close()
            
            for sensor_type, val in readings.items():
                evaluate_sensor_rules(device_id, sensor_type, float(val))

    except Exception as e:
        print(f"Error in on_message: {e}")

mqtt_client = mqtt.Client()
mqtt_client.on_message = on_message
mqtt_client.connect("mosquitto", 1883, 60)
mqtt_client.subscribe("farm/nodes/register")
mqtt_client.subscribe("farm/+/sensors/data")
mqtt_client.loop_start()

# ----------------- Timer Schedules Loop -----------------
last_checked_minute = ""

async def check_timer_schedules_loop():
    global last_checked_minute
    while True:
        try:
            now_time = datetime.now()
            now_str = now_time.strftime("%H:%M")
            if now_str != last_checked_minute:
                last_checked_minute = now_str
                conn = sqlite3.connect('farm_local.db')
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM timer_schedules WHERE is_active = 1")
                schedules = cursor.fetchall()
                conn.close()
                
                for s in schedules:
                    if s["on_time"] == now_str:
                        send_relay_command(s["target_relay_device_id"], s["target_channel"], "ON")
                        print(f"[Timer Log] CH {s['target_channel']} on {s['target_relay_device_id']} turned ON")
                    elif s["off_time"] == now_str:
                        send_relay_command(s["target_relay_device_id"], s["target_channel"], "OFF")
                        print(f"[Timer Log] CH {s['target_channel']} on {s['target_relay_device_id']} turned OFF")
        except Exception as e:
            print(f"Error in check_timer_schedules_loop: {e}")
        await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_timer_schedules_loop())

# ----------------- Web Routes -----------------
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    if username == "admin" and password == "farm1234":
        res = RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)
        res.set_cookie(key="session_user", value=username)
        return res
    return RedirectResponse(url="/login?error=1", status_code=status.HTTP_302_FOUND)

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    user = request.cookies.get("session_user")
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("dashboard.html", {"request": request})

# ----------------- JSON API Endpoints -----------------
@app.get("/api/nodes")
async def get_nodes(request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    conn = sqlite3.connect('farm_local.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM nodes")
    rows = cursor.fetchall()
    conn.close()
    
    nodes_list = []
    for r in rows:
        nodes_list.append({
            "device_id": r["device_id"],
            "node_type": r["node_type"],
            "firmware_version": r["firmware_version"],
            "ip_address": r["ip_address"],
            "sensor_types": json.loads(r["sensor_types"]) if r["sensor_types"] else [],
            "relay_count": r["relay_count"],
            "channels_info": json.loads(r["channels_info"]) if r["channels_info"] else [],
            "status": r["status"],
            "last_seen": r["last_seen"],
            "latest_readings": json.loads(r["latest_readings"]) if r["latest_readings"] else {}
        })
    return nodes_list

@app.post("/api/relay/manual")
async def manual_relay(request: Request, device_id: str = Form(...), channel: int = Form(...), action: str = Form(...)):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    send_relay_command(device_id, channel, action)
    return {"status": "success"}

class RelayRename(BaseModel):
    device_id: str
    channel: int
    name: str

@app.post("/api/relay/rename")
async def rename_relay(payload: RelayRename, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    conn = sqlite3.connect('farm_local.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT channels_info FROM nodes WHERE device_id = ?", (payload.device_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Device not found")
        
    channels = []
    if row["channels_info"]:
        try:
            channels = json.loads(row["channels_info"])
        except Exception:
            pass
            
    # Find and update the channel name, or add it if it doesn't exist
    found = False
    for ch in channels:
        if ch.get("ch") == payload.channel:
            ch["name"] = payload.name
            found = True
            break
            
    if not found:
        channels.append({"ch": payload.channel, "name": payload.name})
        
    cursor.execute('''
        UPDATE nodes 
        SET channels_info = ? 
        WHERE device_id = ?
    ''', (json.dumps(channels), payload.device_id))
    
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/rules")
async def get_rules(request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_rules")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/rules")
async def create_rule(rule: RuleCreate, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sensor_rules (rule_name, sensor_device_id, sensor_type, operator, threshold_value, target_relay_device_id, target_channel, action, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ''', (rule.rule_name, rule.sensor_device_id, rule.sensor_type, rule.operator, rule.threshold_value, rule.target_relay_device_id, rule.target_channel, rule.action))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: int, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE sensor_rules SET is_active = 1 - is_active WHERE rule_id = ?", (rule_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensor_rules WHERE rule_id = ?", (rule_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/schedules")
async def get_schedules(request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM timer_schedules")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/schedules")
async def create_schedule(schedule: ScheduleCreate, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO timer_schedules (schedule_name, target_relay_device_id, target_channel, on_time, off_time, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    ''', (schedule.schedule_name, schedule.target_relay_device_id, schedule.target_channel, schedule.on_time, schedule.off_time))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/schedules/{schedule_id}/toggle")
async def toggle_schedule(schedule_id: int, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE timer_schedules SET is_active = 1 - is_active WHERE schedule_id = ?", (schedule_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, request: Request):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect('farm_local.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timer_schedules WHERE schedule_id = ?", (schedule_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/sensor-history")
async def get_sensor_history(request: Request, device_id: str = None, sensor_type: str = None, limit: int = 50):
    user = request.cookies.get("session_user")
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect('farm_local.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM sensor_history WHERE 1=1"
    params = []
    if device_id:
        query += " AND device_id = ?"
        params.append(device_id)
    if sensor_type:
        query += " AND sensor_type = ?"
        params.append(sensor_type)
        
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    # Convert to chronological order for charts
    return list(reversed([dict(r) for r in rows]))

