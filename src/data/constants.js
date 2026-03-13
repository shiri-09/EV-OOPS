/**
 * ═══════════════════════════════════════════════════════════
 *  PHYSICAL & ELECTROCHEMICAL CONSTANTS
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  All constants sourced from electrochemical literature:
 *  - Bloom et al. (2001), J. Power Sources
 *  - Birkl et al. (2017), J. Power Sources
 *  - Barré et al. (2013), J. Power Sources
 */

// ── Universal Physical Constants ──────────────────────────
export const R_GAS = 8.314;           // J/(mol·K)  — Universal gas constant
export const FARADAY = 96485;         // C/mol      — Faraday constant
export const BOLTZMANN = 1.381e-23;   // J/K        — Boltzmann constant

// ── Reference Conditions ─────────────────────────────────
export const T_REF = 298.15;         // K (25°C)   — Reference temperature
export const T_REF_C = 25;           // °C

// ── Arrhenius Parameters ─────────────────────────────────
// Activation energies from Waldmann et al. (2014)
export const EA_CALENDAR = 24500;    // J/mol — Calendar aging activation energy
export const EA_CYCLE = 31700;       // J/mol — Cycle aging activation energy
export const EA_SEI = 28000;         // J/mol — SEI growth activation energy
export const EA_PLATING = 35000;     // J/mol — Li plating activation energy

// Pre-exponential factors (calibrated to NMC baseline)
export const A_CALENDAR = 7.543e3;   // 1/day^0.5
export const A_CYCLE = 3.152e-4;     // 1/cycle
export const A_SEI = 1.823e3;        // 1/day^0.5

// ── SEI Layer Growth ─────────────────────────────────────
// Q_SEI(t) = α_SEI · √t  (parabolic growth law)
export const ALPHA_SEI_NMC = 0.033;  // %/√day — NMC SEI growth coefficient
export const ALPHA_SEI_LFP = 0.018;  // %/√day — LFP SEI growth coefficient

// ── Lithium Plating Parameters ───────────────────────────
export const BETA_PLATING = 0.015;   // Plating severity coefficient
export const CRATE_THRESHOLD = 1.5;  // C-rate above which plating risk escalates
export const T_PLATING_THRESHOLD = 283.15; // K (10°C) — Temperature threshold

// ── Internal Resistance ──────────────────────────────────
export const R0_NMC = 0.05;         // Ω — Initial NMC cell resistance
export const R0_LFP = 0.04;         // Ω — Initial LFP cell resistance
export const KR_NMC = 2.1e-5;       // Ω/day — NMC resistance growth rate
export const KR_LFP = 1.4e-5;       // Ω/day — LFP resistance growth rate

// ── Depth of Discharge Stress Factor ─────────────────────
// Wöhler-type relationship: σ_DoD = (DoD)^κ
export const KAPPA_DOD = 1.5;       // DoD exponent (Xu et al., 2018)

// ── Economic Parameters ──────────────────────────────────
export const BATTERY_COST_PER_KWH = 139;   // $/kWh (2024 market average)
export const PACK_SIZE_DEFAULT = 60;         // kWh — Default pack size
export const REPLACEMENT_LABOR = 1500;       // $ — Labor cost for replacement

// ── Carbon Impact Parameters ─────────────────────────────
export const CO2_PER_KWH_PRODUCTION = 73;   // kg CO₂/kWh (manufacturing)
export const CO2_PER_KWH_RECYCLING = 12;    // kg CO₂/kWh (recycling)
export const CO2_GRID_AVERAGE = 0.42;       // kg CO₂/kWh (grid electricity)

// ── SOH Thresholds ───────────────────────────────────────
export const SOH_EOL = 80;          // % — End-of-life threshold
export const SOH_WARRANTY = 70;     // % — Typical warranty threshold
export const SOH_CRITICAL = 60;     // % — Critical degradation level

// ── Simulation Defaults ──────────────────────────────────
export const DEFAULT_SIMULATION_YEARS = 15;
export const DAYS_PER_YEAR = 365.25;
export const HOURS_PER_DAY = 24;
