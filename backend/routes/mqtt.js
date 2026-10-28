const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const router = express.Router();
router.use(cors());
router.use(express.json());

const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_USER = 'aiotchlorella';
const MQTT_PASS = 'P@$$w0rd2025';

const client = mqtt.connect(MQTT_BROKER, {
  username: MQTT_USER,
  password: MQTT_PASS
});

// Setup ESP32 Local Broker for legacy device
const ESP_MQTT_BROKER = 'mqtt://localhost:1883';
const espClient = mqtt.connect(ESP_MQTT_BROKER);

espClient.on('connect', () => {
  console.log('Connected to ESP32 Local MQTT broker (localhost)');
  // Set G32 to OFF (HIGH) by default
  espClient.publish('G32', '1', { retain: true });
});

// In-memory control status for all devices
let controlStatus = {
  // Light control
  lightStatus: 'OFF', // 'ON' or 'OFF'
  lightTimerEnabled: false,
  lightSchedules: [], // Array of { start: string, duration: number, days: string[] }
  lightStart: null,
  lightEnd: null,
  lightDuration: null,  // hours
  lightDays: null,      // e.g. "Mon,Tue,Wed"

  // pH control
  phAuto: false,
  phMinLow: null,
  phMinHigh: null,
  phMaxLow: null,
  phMaxHigh: null,

  // Water (Temperature) control
  tempAuto: false,
  tempMinLow: null,
  tempMinHigh: null,
  tempMaxLow: null,
  tempMaxHigh: null,

  // Gas control
  gasAuto: false,
  gasco2Auto: false,
  co2Status: 'OFF', // 'ON' or 'OFF'
  co2MinLow: null,
  co2MinHigh: null,
  co2MaxLow: null,
  co2MaxHigh: null,

  // Batch control
  batch: null,

  // Device status (pump, fan)
  pumpStatus: 'OFF',
  fanStatus: 'OFF',
};

// In-memory sensor values (latest readings)
let sensorValues = {
  temp: null, temp1: null, temp2: null, temp3: null,
  light: null,
  ph: null, ph1: null, ph2: null, ph3: null,
  co2: null,
  ec: null, ec1: null, ec2: null, ec3: null,
};

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('/station1/batch/response');
  // Removed relay control subscriptions
  // Light control subtopics
  client.subscribe('/station1/light/status/response');
  client.subscribe('/station1/light/timer/response');
  client.subscribe('/station1/light/schedules/response');
  client.subscribe('/station1/light/start/response');
  client.subscribe('/station1/light/end/response');
  client.subscribe('/station1/light/duration/response');
  client.subscribe('/station1/light/days/response');

  // pH control subtopics
  client.subscribe('/station1/ph/auto/response');
  client.subscribe('/station1/ph/minlow/response');
  client.subscribe('/station1/ph/minhigh/response');
  client.subscribe('/station1/ph/maxlow/response');
  client.subscribe('/station1/ph/maxhigh/response');

  // Water (Temperature) control subtopics
  client.subscribe('/station1/temp/auto/response');
  client.subscribe('/station1/temp/minlow/response');
  client.subscribe('/station1/temp/minhigh/response');
  client.subscribe('/station1/temp/maxlow/response');
  client.subscribe('/station1/temp/maxhigh/response');

  // Gas control subtopics
  client.subscribe('/station1/gas/auto/response');
  client.subscribe('/station1/gas/co2/auto/response');
  client.subscribe('/station1/gas/co2/status/response');
  client.subscribe('/station1/gas/co2/minlow/response');
  client.subscribe('/station1/gas/co2/minhigh/response');
  client.subscribe('/station1/gas/co2/maxlow/response');
  client.subscribe('/station1/gas/co2/maxhigh/response');

  // Device status topics (pump, fan)
  client.subscribe('/station1/pump/status/response');
  client.subscribe('/station1/fan/status/response');

  // Sensor value topics (รับค่าตัวเลขจากเซ็นเซอร์)
  client.subscribe('/station1/temp/value');
  client.subscribe('/station1/temp/value1');
  client.subscribe('/station1/temp/value2');
  client.subscribe('/station1/temp/value3');
  
  client.subscribe('/station1/light/value');
  
  client.subscribe('/station1/ph/value');
  client.subscribe('/station1/ph/value1');
  client.subscribe('/station1/ph/value2');
  client.subscribe('/station1/ph/value3');
  
  client.subscribe('/station1/co2/value');
  
  client.subscribe('/station1/ec/value');
  client.subscribe('/station1/ec/value1');
  client.subscribe('/station1/ec/value2');
  client.subscribe('/station1/ec/value3');
});

client.on('message', (topic, message) => {
  const payload = message.toString();

  // Removed relay response handling

  // Handle batch response
  if (topic === '/station1/batch/response') {
    const batchNum = Number(payload);
    controlStatus.batch = isNaN(batchNum) ? payload : batchNum;
  }

  // Handle light control responses
  if (topic === '/station1/light/status/response') {
    controlStatus.lightStatus = payload; // ON or OFF
    espClient.publish('G25', payload === 'ON' ? '1' : '0'); // G25 = Light
  }
  if (topic === '/station1/light/timer/response') {
    controlStatus.lightTimerEnabled = payload; // ON or OFF
  }
  if (topic === '/station1/light/schedules/response') {
    try {
      controlStatus.lightSchedules = JSON.parse(payload);
    } catch(e) {
      console.error('Error parsing lightSchedules', e);
    }
  }
  if (topic === '/station1/light/start/response') {
    controlStatus.lightStart = payload;
  }
  if (topic === '/station1/light/end/response') {
    controlStatus.lightEnd = payload;
  }
  if (topic === '/station1/light/duration/response') {
    controlStatus.lightDuration = payload;
  }
  if (topic === '/station1/light/days/response') {
    controlStatus.lightDays = payload;
  }

  // Handle pH control responses
  if (topic === '/station1/ph/auto/response') {
    controlStatus.phAuto = payload; // ON or OFF
  }
  if (topic === '/station1/ph/minlow/response') {
    controlStatus.phMinLow = parseFloat(payload);
  }
  if (topic === '/station1/ph/minhigh/response') {
    controlStatus.phMinHigh = parseFloat(payload);
  }
  if (topic === '/station1/ph/maxlow/response') {
    controlStatus.phMaxLow = parseFloat(payload);
  }
  if (topic === '/station1/ph/maxhigh/response') {
    controlStatus.phMaxHigh = parseFloat(payload);
  }

  // Handle water temperature control responses
  if (topic === '/station1/temp/auto/response') {
    controlStatus.tempAuto = payload; // ON or OFF
  }
  if (topic === '/station1/temp/minlow/response') {
    controlStatus.tempMinLow = parseFloat(payload);
  }
  if (topic === '/station1/temp/minhigh/response') {
    controlStatus.tempMinHigh = parseFloat(payload);
  }
  if (topic === '/station1/temp/maxlow/response') {
    controlStatus.tempMaxLow = parseFloat(payload);
  }
  if (topic === '/station1/temp/maxhigh/response') {
    controlStatus.tempMaxHigh = parseFloat(payload);
  }

  // Handle gas control responses
  if (topic === '/station1/gas/auto/response') {
    controlStatus.gasAuto = payload; // ON or OFF
  }
  if (topic === '/station1/gas/co2/auto/response') {
    controlStatus.gasco2Auto = payload; // ON or OFF
  }
  if (topic === '/station1/gas/co2/status/response') {
    controlStatus.co2Status = payload; // ON or OFF
  }
  if (topic === '/station1/gas/co2/minlow/response') {
    controlStatus.co2MinLow = parseFloat(payload);
  }
  if (topic === '/station1/gas/co2/minhigh/response') {
    controlStatus.co2MinHigh = parseFloat(payload);
  }
  if (topic === '/station1/gas/co2/maxlow/response') {
    controlStatus.co2MaxLow = parseFloat(payload);
  }
  if (topic === '/station1/gas/co2/maxhigh/response') {
    controlStatus.co2MaxHigh = parseFloat(payload);
  }

  // Handle device status responses (pump, fan)
  if (topic === '/station1/pump/status/response') {
    controlStatus.pumpStatus = payload; // ON or OFF
    espClient.publish('G26', payload === 'ON' ? '1' : '0'); // G26 = Pump
  }
  if (topic === '/station1/fan/status/response') {
    controlStatus.fanStatus = payload; // ON or OFF
    espClient.publish('G33', payload === 'ON' ? '1' : '0'); // G33 = Fan
  }

  // Handle sensor value readings (ค่าตัวเลขจากเซ็นเซอร์)
  if (topic === '/station1/temp/value') sensorValues.temp = parseFloat(payload);
  if (topic === '/station1/temp/value1') sensorValues.temp1 = parseFloat(payload);
  if (topic === '/station1/temp/value2') sensorValues.temp2 = parseFloat(payload);
  if (topic === '/station1/temp/value3') sensorValues.temp3 = parseFloat(payload);

  if (topic === '/station1/light/value') sensorValues.light = parseFloat(payload);

  if (topic === '/station1/ph/value') sensorValues.ph = parseFloat(payload);
  if (topic === '/station1/ph/value1') sensorValues.ph1 = parseFloat(payload);
  if (topic === '/station1/ph/value2') sensorValues.ph2 = parseFloat(payload);
  if (topic === '/station1/ph/value3') sensorValues.ph3 = parseFloat(payload);

  if (topic === '/station1/co2/value') sensorValues.co2 = parseFloat(payload);

  if (topic === '/station1/ec/value') sensorValues.ec = parseFloat(payload);
  if (topic === '/station1/ec/value1') sensorValues.ec1 = parseFloat(payload);
  if (topic === '/station1/ec/value2') sensorValues.ec2 = parseFloat(payload);
  if (topic === '/station1/ec/value3') sensorValues.ec3 = parseFloat(payload);

  // Check device logic after updating values
  checkDeviceLogic();
});

// ====== Auto Light Timer Logic ======
// Maps JS getDay() (0=Sun,1=Mon,...) to day keys used by frontend
const JS_DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function checkLightTimer() {
  // Only run when timer is enabled
  if (
    controlStatus.lightTimerEnabled !== 'ON' &&
    controlStatus.lightTimerEnabled !== true
  ) return;

  const now = new Date();
  const todayKey = JS_DAY_MAP[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let shouldBeOn = false;
  const schedules = controlStatus.lightSchedules && controlStatus.lightSchedules.length > 0 
    ? controlStatus.lightSchedules 
    : [];

  // Fallback to legacy single schedule if lightSchedules is empty but legacy exists
  if (schedules.length === 0 && controlStatus.lightStart && controlStatus.lightDuration) {
    schedules.push({
      start: controlStatus.lightStart,
      duration: parseFloat(controlStatus.lightDuration),
      days: controlStatus.lightDays ? controlStatus.lightDays.split(',').map(d => d.trim()) : JS_DAY_MAP
    });
  }

  for (const sched of schedules) {
    // Check if today is a scheduled day
    if (sched.days && sched.days.length > 0) {
      if (!sched.days.includes(todayKey)) continue;
    }

    if (!sched.start || !sched.duration) continue;

    // Parse start time HH:mm
    const [startH, startM] = sched.start.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM)) continue;

    const durationHours = parseFloat(sched.duration);
    if (isNaN(durationHours) || durationHours <= 0) continue;

    // Calculate start and end in minutes since midnight
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + durationHours * 60;

    if (endMinutes <= 1440) {
      // Same day — simple range check
      if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
        shouldBeOn = true;
        break;
      }
    } else {
      // Crosses midnight (e.g. 22:00 + 8h = 06:00 next day)
      if (nowMinutes >= startMinutes || nowMinutes < (endMinutes - 1440)) {
        shouldBeOn = true;
        break;
      }
    }
  }

  const currentlyOn = controlStatus.lightStatus === 'ON';

  if (shouldBeOn && !currentlyOn) {
    client.publish('/station1/light/status/control', 'ON');
    console.log('[Timer] Within schedule — turning light ON');
  } else if (!shouldBeOn && currentlyOn) {
    client.publish('/station1/light/status/control', 'OFF');
    console.log('[Timer] Outside schedule — turning light OFF');
  }
}

// Check every 30 seconds
setInterval(checkLightTimer, 30000);

let prevPumpAutoMode = false; // Track previous auto mode state

// ====== Device Logic (Fan & Pump) ======
function checkDeviceLogic() {
  // Helper to extract valid sensor arrays for all tanks
  const getValidTemps = () => {
    return [sensorValues.temp, sensorValues.temp1, sensorValues.temp2, sensorValues.temp3]
      .filter(val => val !== null && !isNaN(val));
  };
  
  const getValidPhs = () => {
    return [sensorValues.ph, sensorValues.ph1, sensorValues.ph2, sensorValues.ph3]
      .filter(val => val !== null && !isNaN(val));
  };

  // 1. Fan Control Logic based on Temperature
  // Only override if Water Temp Control is in Auto mode
  if (controlStatus.tempAuto === 'ON') {
    const temps = getValidTemps();
    if (temps.length > 0) {
      const maxTemp = Math.max(...temps);

      if (controlStatus.tempMinHigh !== null && maxTemp > controlStatus.tempMinHigh) {
        if (controlStatus.fanStatus !== 'ON') {
          client.publish('/station1/fan/status/control', 'ON');
          controlStatus.fanStatus = 'ON';
          console.log('[Logic] ANY tank temp > tempMinHigh — turning fan ON');
        }
      } else if (controlStatus.tempMinLow !== null && maxTemp < controlStatus.tempMinLow) {
        // Only turn OFF if ALL tanks are < tempMinLow
        if (controlStatus.fanStatus !== 'OFF') {
          client.publish('/station1/fan/status/control', 'OFF');
          controlStatus.fanStatus = 'OFF';
          console.log('[Logic] ALL tanks temp < tempMinLow — turning fan OFF');
        }
      }
    }
  }

  // 2. Pump Logic (Carbon Valve)
  // Only override if any relevant control is in Auto mode.
  // If pH, CO2, and Temp are all in Manual Mode, the valve can be controlled independently.
  const isAutoMode = controlStatus.phAuto === 'ON' || 
                     controlStatus.gasco2Auto === 'ON' || 
                     controlStatus.gasAuto === 'ON' || 
                     controlStatus.tempAuto === 'ON';

  // Transition to Manual Mode: Turn OFF pump before releasing control
  if (prevPumpAutoMode && !isAutoMode) {
    if (controlStatus.pumpStatus !== 'OFF') {
      client.publish('/station1/pump/status/control', 'OFF');
      controlStatus.pumpStatus = 'OFF';
      console.log('[Logic] Pump Auto Mode disabled — turning pump OFF before releasing control');
    }
  }
  prevPumpAutoMode = isAutoMode;

  if (isAutoMode) {
    let shouldPumpBeOn = false;

    // Start by assuming the pump stays in its current state (Hysteresis baseline)
    if (controlStatus.pumpStatus === 'ON') {
      shouldPumpBeOn = true;
    }

    const phs = getValidPhs();
    const maxPh = phs.length > 0 ? Math.max(...phs) : null;
    const minPh = phs.length > 0 ? Math.min(...phs) : null;

    // --- 1. Evaluate ON Conditions ---
    // Condition A: Light is ON (plants need CO2)
    if (controlStatus.lightStatus === 'ON') {
      shouldPumpBeOn = true;
    }
    // Condition B: pH is too high (needs CO2 to lower it)
    if (controlStatus.phAuto === 'ON' && maxPh !== null && controlStatus.phMinHigh !== null) {
      if (maxPh >= controlStatus.phMinHigh) {
        shouldPumpBeOn = true;
      }
    }

    // --- 2. Evaluate OFF Conditions ---
    // Condition C: Light is OFF and pH is NOT high enough to warrant CO2.
    // If the pump was ON merely because of the Light, and now Light is OFF, we should turn it OFF,
    // UNLESS the pH is currently >= phMinHigh.
    // This allows it to turn OFF immediately when the Light turns OFF, avoiding wasting CO2.
    if (controlStatus.lightStatus === 'OFF') {
      if (controlStatus.phAuto !== 'ON') {
        shouldPumpBeOn = false;
      } else if (maxPh !== null && controlStatus.phMinHigh !== null && maxPh < controlStatus.phMinHigh) {
        // Here we break the hysteresis when the Light turns OFF, so it doesn't keep pumping
        // CO2 in the dark just to reach the phMinLow limit.
        shouldPumpBeOn = false;
      }
    }

    // Condition D: Safety Override - Room CO2 too high
    if (sensorValues.co2 !== null && controlStatus.co2MinHigh !== null) {
      if (controlStatus.co2MinHigh < sensorValues.co2) {
        shouldPumpBeOn = false;
      }
    }
    
    // Condition E: Safety Override - pH too acidic (Worst Case / Any)
    if (minPh !== null && controlStatus.phMinLow !== null) {
      // If ANY tank pH <= phMinLow, turn OFF Carbon Valve to prevent acid burn
      if (minPh <= controlStatus.phMinLow) {
        shouldPumpBeOn = false;
      }
    }

    // Apply the final computed state
    if (shouldPumpBeOn && controlStatus.pumpStatus !== 'ON') {
      client.publish('/station1/pump/status/control', 'ON');
      controlStatus.pumpStatus = 'ON';
      console.log('[Logic] Light is ON or pH is high — turning pump ON');
    } else if (!shouldPumpBeOn && controlStatus.pumpStatus === 'ON') {
      client.publish('/station1/pump/status/control', 'OFF');
      controlStatus.pumpStatus = 'OFF';
      console.log('[Logic] Conditions not met or override triggered — turning pump OFF');
    }
  }
}

// Check device logic periodically as well
setInterval(checkDeviceLogic, 30000);

router.post('/*/:command', (req, res) => {
  const command = req.params.command;
  // req.params[0] contains the topic, possibly with leading slash
  let topic = req.params[0];
  if (!topic.startsWith('/')) {
    topic = '/' + topic;
  }
  client.publish(topic, command, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to publish command', error: err.message });
    }

    // Immediately update controlStatus for timer-related topics
    if (topic === '/station1/light/schedules/control') {
      try {
        controlStatus.lightSchedules = JSON.parse(decodeURIComponent(command));
      } catch(e) {
        console.error('Error parsing lightSchedules control', e);
      }
    } else if (topic === '/station1/light/start/control') {
      controlStatus.lightStart = command;
    } else if (topic === '/station1/light/duration/control') {
      controlStatus.lightDuration = command;
    } else if (topic === '/station1/light/days/control') {
      controlStatus.lightDays = command;
    } else if (topic === '/station1/light/timer/control') {
      controlStatus.lightTimerEnabled = command;
      // When timer is turned OFF, also turn off the light
      if (command === 'OFF') {
        client.publish('/station1/light/status/control', 'OFF');
        controlStatus.lightStatus = 'OFF';
        console.log('[Timer] Timer disabled — turning light OFF');
      }
    } else if (topic === '/station1/light/status/control') {
      controlStatus.lightStatus = command;
      espClient.publish('G25', command === 'ON' ? '1' : '0');
    } else if (topic === '/station1/pump/status/control') {
      controlStatus.pumpStatus = command;
      espClient.publish('G26', command === 'ON' ? '1' : '0');
    } else if (topic === '/station1/fan/status/control') {
      controlStatus.fanStatus = command;
      espClient.publish('G33', command === 'ON' ? '1' : '0');
    }

    // Trigger timer check immediately
    if (topic.includes('/light/')) {
      checkLightTimer();
    }
    
    // Check device logic immediately
    checkDeviceLogic();

    res.json({ success: true, message: `Command '${command}' sent to topic '${topic}'` });
  });
});

// Removed relay status endpoint

// Endpoint to get light control status
router.get('/light/status', (req, res) => {
  res.json({
    success: true,
    status: {
      lightStatus: controlStatus.lightStatus,
      lightTimerEnabled: controlStatus.lightTimerEnabled,
      lightSchedules: controlStatus.lightSchedules,
      lightStart: controlStatus.lightStart,
      lightEnd: controlStatus.lightEnd,
      lightDuration: controlStatus.lightDuration,
      lightDays: controlStatus.lightDays
    }
  });
});

// Endpoint to get pH control status
router.get('/ph/status', (req, res) => {
  res.json({
    success: true,
    status: {
      phAuto: controlStatus.phAuto,
      phMinLow: controlStatus.phMinLow,
      phMinHigh: controlStatus.phMinHigh,
      phMaxLow: controlStatus.phMaxLow,
      phMaxHigh: controlStatus.phMaxHigh
    }
  });
});

// Endpoint to get water temperature control status
router.get('/temp/status', (req, res) => {
  res.json({
    success: true,
    status: {
      tempAuto: controlStatus.tempAuto,
      tempMinLow: controlStatus.tempMinLow,
      tempMinHigh: controlStatus.tempMinHigh,
      tempMaxLow: controlStatus.tempMaxLow,
      tempMaxHigh: controlStatus.tempMaxHigh
    }
  });
});

// Endpoint to get gas control status
router.get('/gas/status', (req, res) => {
  res.json({
    success: true,
    status: {
      gasAuto: controlStatus.gasAuto,
      gasco2Auto: controlStatus.gasco2Auto,
      co2Status: controlStatus.co2Status,
      co2MinLow: controlStatus.co2MinLow,
      co2MinHigh: controlStatus.co2MinHigh,
      co2MaxLow: controlStatus.co2MaxLow,
      co2MaxHigh: controlStatus.co2MaxHigh
    }
  });
});

// Endpoint to get latest sensor values (ค่าตัวเลขจากเซ็นเซอร์)
router.get('/sensor/values', (req, res) => {
  res.json({
    success: true,
    values: sensorValues
  });
});

// Endpoint to get device status (pump, light, fan)
router.get('/device/status', (req, res) => {
  res.json({
    success: true,
    status: {
      pump: controlStatus.pumpStatus,
      light: controlStatus.lightStatus,
      fan: controlStatus.fanStatus,
    }
  });
});

// Endpoint to get batch status
router.get('/batch/status', (req, res) => {
  res.json({ success: true, batch: controlStatus.batch });
});

// Endpoint to get all control statuses
router.get('/status', (req, res) => {
  res.json({ success: true, status: controlStatus });
});

router.getControlStatus = () => controlStatus;

module.exports = router;
