# Raspberry Pi 5 — Battery Sensor Setup Guide

## Hardware Required
| Component | Purpose | Price |
|-----------|---------|-------|
| DS18B20 temperature sensor | Battery/ambient temperature | ~₹100 |
| 4.7kΩ resistor | Pull-up for DS18B20 | ~₹5 |
| INA219 module | Voltage & current sensing | ~₹200 |
| Jumper wires | Connections | ~₹50 |

## Wiring

### DS18B20 Temperature Sensor
```
DS18B20          Raspberry Pi 5
───────          ───────────────
VCC (Red)    →   3.3V (Pin 1)
GND (Black)  →   GND  (Pin 6)
DATA (Yellow)→   GPIO4 (Pin 7)

* Connect 4.7kΩ resistor between VCC and DATA
```

### INA219 Voltage/Current Sensor
```
INA219           Raspberry Pi 5
──────           ───────────────
VCC          →   3.3V (Pin 1)
GND          →   GND  (Pin 9)
SDA          →   GPIO2 (Pin 3)
SCL          →   GPIO3 (Pin 5)

* Connect VIN+ and VIN- in series with battery lead
```

## Software Setup

1. **Enable interfaces** on Pi:
```bash
sudo raspi-config
# → Interface Options → 1-Wire → Enable
# → Interface Options → I2C → Enable
sudo reboot
```

2. **Install dependencies**:
```bash
cd raspberry_pi
pip install -r requirements.txt
```

3. **Run the server**:
```bash
python battery_server.py
```

4. **Update your web app** — In `main.js`, set `PI_URL` to your Pi's IP:
```javascript
const PI_URL = 'http://<your-pi-ip>:5000';
```

## Testing
- Open `http://<pi-ip>:5000/api/battery` in browser
- You should see JSON with temperature, voltage, current, SOC

## Notes
- Without sensors connected, the server runs in **simulation mode** (random but realistic values)
- The server runs on port 5000 and accepts CORS requests from your web dashboard
