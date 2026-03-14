# ⚡ EV OOPS — EV Battery Longevity Intelligence Engine

> Predicts EV battery lifespan using NASA lithium-ion battery aging datasets and physics-based degradation models. Compares battery chemistries, shows nearby charging stations with crowd levels, and supports Raspberry Pi 5 integration for real-time battery monitoring.

---

## 🔬 What It Does

EV OOPS is a web-based dashboard that combines **electrochemical physics models**, **machine learning**, and **real-time sensor data** to predict how long an EV battery will last under different usage conditions.

### Key Features

- **Battery Lifespan Prediction** — Physics-based models (Arrhenius, SEI growth, lithium plating, resistance growth) estimate remaining battery life
- **State of Health (SOH) Calculator** — Real-time SOH estimation from voltage, current, and temperature data
- **Chemistry Comparison** — Side-by-side comparison of NMC, LFP, NCA, and other lithium-ion chemistries
- **Degradation Surface Visualization** — 3D Plotly surface plots showing how temperature and cycle depth affect aging
- **Charging Station Map** — Nearby EV charging stations with crowd/availability levels
- **Economic Analysis** — Battery replacement cost modeling and total cost of ownership
- **Carbon Footprint Model** — CO₂ impact analysis across battery lifecycle
- **Scenario Engine** — "What-if" simulations (e.g., fast charging vs. slow charging impact on lifespan)
- **Sensitivity Analysis** — Identifies which parameters most affect battery degradation
- **Raspberry Pi 5 Integration** — Real-time battery monitoring via DS18B20 temperature sensor and INA219 voltage/current sensor
- **NASA Dataset References** — Grounded in NASA PCoE lithium-ion battery aging research data

---

## 🏗️ Project Structure

```
EV OOPS/
├── index.html                  # Main dashboard page
├── style.css                   # Full styling (glassmorphism, emerald theme)
├── package.json                # Dependencies & scripts
│
├── src/
│   ├── main.js                 # Application controller & DOM orchestration
│   │
│   ├── physics/                # Electrochemical degradation models
│   │   ├── arrhenius.js        # Arrhenius temperature-dependent reaction rates
│   │   ├── calendar-aging.js   # Calendar (storage) aging model
│   │   ├── cycle-aging.js      # Cycle aging model (DoD, C-rate effects)
│   │   ├── sei-growth.js       # Solid-Electrolyte Interphase growth model
│   │   ├── lithium-plating.js  # Lithium plating risk model
│   │   ├── resistance-growth.js# Internal resistance increase model
│   │   ├── degradation-surface.js # 3D degradation surface generator
│   │   ├── soh-calculator.js   # State of Health estimator
│   │   ├── lifespan-solver.js  # Combined lifespan prediction solver
│   │   ├── economic-model.js   # Battery replacement economics
│   │   └── carbon-model.js     # Carbon footprint lifecycle model
│   │
│   ├── analysis/               # Higher-level analysis tools
│   │   ├── chemistry-comparator.js  # Compare NMC vs LFP vs NCA etc.
│   │   ├── scenario-engine.js       # What-if scenario simulations
│   │   └── sensitivity.js           # Parameter sensitivity analysis
│   │
│   ├── data/                   # Static datasets & constants
│   │   ├── nasa-datasets.js    # NASA PCoE battery aging dataset references
│   │   ├── battery-chemistries.js   # Chemistry specs (NMC, LFP, NCA, LCO, LMO, LTO)
│   │   ├── charging-stations.js     # Charging station locations & data
│   │   └── constants.js             # Physical & electrochemical constants
│   │
│   ├── ml/                     # Machine learning
│   │   └── hybrid-model.js     # Physics-informed neural network (hybrid model)
│   │
│   └── ui/                     # Frontend & rendering
│       ├── animations.js       # GSAP scroll animations & Lenis smooth scroll
│       └── scene-3d.js         # Three.js 3D background scene
│
├── raspberry_pi/               # Hardware integration
│   ├── battery_server.py       # Flask API server for sensor data
│   ├── requirements.txt        # Python dependencies
│   └── README.md               # Wiring guide & setup instructions
│
└── public/                     # Static assets
    ├── car-cursor.svg          # Custom EV cursor
    └── vite.svg                # Vite logo
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Build Tool** | Vite |
| **3D Graphics** | Three.js (Minimal, high-performance TextGeometry background) |
| **Interactive Maps** | Leaflet.js |
| **Animations** | GSAP + ScrollTrigger |
| **Smooth Scroll** | Lenis |
| **Charts** | Plotly.js (3D surfaces, line charts) |
| **Math Rendering** | KaTeX (LaTeX equations) |
| **Hardware** | Raspberry Pi 5 + DS18B20 + INA219 |
| **Sensor Server** | Python Flask (REST API) |
| **Styling** | Vanilla CSS (glassmorphism, emerald/teal palette) |

---

## 🚀 Getting Started

### Web Dashboard

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Raspberry Pi (Optional)

See [`raspberry_pi/README.md`](raspberry_pi/README.md) for full wiring guide.

```bash
cd raspberry_pi
pip install -r requirements.txt
python battery_server.py
```

The Pi runs a Flask server on port 5000 that streams real-time battery sensor data to the web dashboard. Runs in **simulation mode** if no sensors are connected.

---

## 📊 Physics Models

The degradation engine uses real electrochemical equations:

- **Arrhenius Equation** — Temperature-dependent reaction rate constant
- **SEI Layer Growth** — Solid-electrolyte interphase thickening (√t model)
- **Lithium Plating** — Risk assessment under low-temp / high-C-rate charging
- **Cycle Aging** — Depth-of-discharge and C-rate impact on capacity fade
- **Calendar Aging** — Storage degradation as function of temperature and SOC
- **Resistance Growth** — Internal resistance increase over time
- **Hybrid ML Model** — Physics-informed neural network combining data-driven and model-based predictions

---

## 📡 NASA Dataset References

EV OOPS references NASA Prognostics Center of Excellence (PCoE) battery datasets including:

- **B0005–B0018** — Li-ion cells cycled at various temperatures
- **Randomized charge/discharge** — Variable load cycling data
- **Impedance measurements** — EIS data for resistance tracking

---

## 👩‍💻 Author

**Sriraksha** — [@shiri-09](https://github.com/shiri-09)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
