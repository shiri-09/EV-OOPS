"""
═══════════════════════════════════════════════════════════
 EV OOPS — Raspberry Pi 5 Battery Sensor Server
 Battery Longevity Intelligence Engine
═══════════════════════════════════════════════════════════

 Reads real sensor data from:
 - DS18B20 temperature sensor (1-Wire GPIO)
 - INA219 voltage/current sensor (I2C)

 Serves a REST API for the EV OOPS web dashboard.

 SETUP:
 1. Connect DS18B20 data pin to GPIO4 (pin 7)
 2. Connect INA219 to I2C (SDA=GPIO2, SCL=GPIO3)
 3. Enable 1-Wire and I2C in raspi-config
 4. pip install -r requirements.txt
 5. python battery_server.py

 API Endpoints:
 GET /api/battery → Current sensor readings
 GET /api/health  → Server health check
═══════════════════════════════════════════════════════════
"""

from flask import Flask, jsonify
from flask_cors import CORS
import time
import os
import glob
import json

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from web dashboard

# ── DS18B20 Temperature Sensor ──────────────────────────
# 1-Wire interface setup
os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

W1_BASE_DIR = '/sys/bus/w1/devices/'
W1_DEVICE_FOLDER = None
W1_DEVICE_FILE = None

def init_ds18b20():
    """Initialize DS18B20 sensor path"""
    global W1_DEVICE_FOLDER, W1_DEVICE_FILE
    try:
        device_folders = glob.glob(W1_BASE_DIR + '28*')
        if device_folders:
            W1_DEVICE_FOLDER = device_folders[0]
            W1_DEVICE_FILE = W1_DEVICE_FOLDER + '/w1_slave'
            print(f"✅ DS18B20 found: {W1_DEVICE_FOLDER}")
            return True
        else:
            print("⚠️  DS18B20 not found. Using simulated temperature.")
            return False
    except Exception as e:
        print(f"⚠️  DS18B20 init error: {e}")
        return False

def read_ds18b20_raw():
    """Read raw data from DS18B20"""
    try:
        with open(W1_DEVICE_FILE, 'r') as f:
            return f.readlines()
    except:
        return None

def read_temperature():
    """Read temperature from DS18B20 in °C"""
    if W1_DEVICE_FILE is None:
        # Simulate temperature if no sensor
        import random
        return round(25.0 + random.uniform(-3, 5), 1)
    
    lines = read_ds18b20_raw()
    if lines is None:
        return None
    
    # Wait for valid reading
    retries = 0
    while lines[0].strip()[-3:] != 'YES' and retries < 5:
        time.sleep(0.2)
        lines = read_ds18b20_raw()
        retries += 1
    
    # Parse temperature
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos + 2:]
        temp_c = float(temp_string) / 1000.0
        return round(temp_c, 1)
    
    return None


# ── INA219 Voltage/Current Sensor ───────────────────────
INA219_AVAILABLE = False

try:
    from ina219 import INA219
    SHUNT_OHMS = 0.1  # 0.1 ohm shunt resistor
    ina = INA219(SHUNT_OHMS)
    ina.configure()
    INA219_AVAILABLE = True
    print("✅ INA219 sensor initialized")
except Exception as e:
    print(f"⚠️  INA219 not available: {e}. Using simulated voltage/current.")

def read_voltage():
    """Read bus voltage in V"""
    if INA219_AVAILABLE:
        try:
            return round(ina.voltage(), 2)
        except:
            pass
    # Simulate: typical EV battery cell voltage
    import random
    return round(3.7 + random.uniform(-0.3, 0.2), 2)

def read_current():
    """Read current in mA"""
    if INA219_AVAILABLE:
        try:
            return round(ina.current(), 1)
        except:
            pass
    # Simulate: typical draw/charge current
    import random
    return round(random.uniform(-500, 2000), 1)


# ── Battery State Estimation ────────────────────────────
battery_age_days = 365 * 2  # Assume 2-year-old battery (configurable)

def estimate_soc(voltage):
    """Estimate State of Charge from voltage (simplified)"""
    # Linear approximation for Li-ion: 3.0V = 0%, 4.2V = 100%
    soc = max(0, min(100, (voltage - 3.0) / (4.2 - 3.0) * 100))
    return round(soc, 1)


# ── API Endpoints ───────────────────────────────────────

@app.route('/api/battery', methods=['GET'])
def get_battery_data():
    """Main endpoint: returns all sensor readings"""
    temp = read_temperature()
    voltage = read_voltage()
    current = read_current()
    soc = estimate_soc(voltage)
    
    return jsonify({
        'temperature': temp,        # °C
        'voltage': voltage,          # V
        'current': current,          # mA (positive = discharge, negative = charge)
        'soc': soc,                  # % (estimated from voltage)
        'batteryAgeDays': battery_age_days,
        'timestamp': time.time(),
        'sensors': {
            'ds18b20': W1_DEVICE_FILE is not None,
            'ina219': INA219_AVAILABLE,
        },
        'status': 'ok'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'uptime': time.time(),
        'sensors': {
            'temperature': W1_DEVICE_FILE is not None,
            'voltage_current': INA219_AVAILABLE,
        }
    })

@app.route('/', methods=['GET'])
def index():
    """Info page"""
    return jsonify({
        'name': 'EV OOPS Battery Sensor Server',
        'version': '1.0.0',
        'endpoints': ['/api/battery', '/api/health'],
        'sensors': {
            'DS18B20': 'Connected' if W1_DEVICE_FILE else 'Simulated',
            'INA219': 'Connected' if INA219_AVAILABLE else 'Simulated',
        }
    })


# ── Main ────────────────────────────────────────────────

if __name__ == '__main__':
    has_temp = init_ds18b20()
    
    print("\n" + "═" * 55)
    print("  EV OOPS — Battery Sensor Server")
    print("═" * 55)
    print(f"  Temperature: {'DS18B20 (real)' if has_temp else 'Simulated'}")
    print(f"  Voltage/Current: {'INA219 (real)' if INA219_AVAILABLE else 'Simulated'}")
    print(f"  Battery Age: {battery_age_days} days ({battery_age_days/365:.1f} years)")
    print(f"  Server: http://0.0.0.0:5000")
    print("═" * 55 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
