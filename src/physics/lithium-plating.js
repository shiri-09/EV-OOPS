/**
 * ═══════════════════════════════════════════════════════════
 *  LITHIUM PLATING RISK MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Lithium plating occurs when metallic lithium deposits on
 *  the anode surface instead of intercalating into graphite.
 *
 *  Risk function:
 *    φ_plating = β · C_rate² · exp(−E_plating / (R·T))
 *
 *  where:
 *    φ_plating = plating risk index [dimensionless, 0-1]
 *    β         = plating severity coefficient
 *    C_rate    = charging C-rate [C]
 *    E_plating = activation energy for plating [J/mol]
 *    R         = gas constant [J/(mol·K)]
 *    T         = temperature [K]
 *
 *  CAPACITY LOSS FROM PLATING:
 *  ───────────────────────────
 *    Q_plating(N) = φ_plating · N · δ_plate
 *
 *  where:
 *    N        = number of cycles
 *    δ_plate  = plating loss per affected cycle [%/cycle]
 *
 *  PHYSICAL BASIS:
 *  ───────────────
 *  - High C-rate → overpotential exceeds nucleation threshold
 *  - Low T → reduced Li⁺ diffusivity in graphite
 *  - Combined effect: kinetic limitation forces deposition
 *  - Plated Li is often irreversible (dead lithium)
 *  - Can cause dendrite growth → internal short circuit risk
 *
 *  CRITICAL CONDITIONS:
 *  ────────────────────
 *  Plating risk escalates when:
 *  1. C_rate > C_threshold (typically 1.5C for NMC)
 *  2. T < T_threshold (typically 10°C for NMC)
 *  3. SOC > 80% (reduced intercalation sites)
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Waldmann et al., J. Power Sources, 262, 129 (2014)
 *  [2] Petzl et al., J. Power Sources, 275, 799 (2015)
 */

import { R_GAS } from '../data/constants.js';

/**
 * Compute lithium plating risk index
 *
 *   φ = β · C_rate² · exp(−E_plating / (R·T))
 *
 * @param {number} beta    - Plating severity coefficient
 * @param {number} Crate   - Charging C-rate [C]
 * @param {number} T       - Temperature [K]
 * @param {number} Ea      - Plating activation energy [J/mol]
 * @returns {number} Risk index [0-1], clamped
 */
export function platingRiskIndex(beta, Crate, T, Ea) {
    const raw = beta * Crate * Crate * Math.exp(-Ea / (R_GAS * T));
    // Normalize to [0, 1] — saturates at high risk
    return Math.min(raw * 1e4, 1.0);
}

/**
 * Compute capacity loss from lithium plating
 *
 *   Q_plating = φ · N · δ_plate
 *
 * @param {number} riskIndex - Plating risk index [0-1]
 * @param {number} cycles    - Number of cycles
 * @param {number} deltaPlate- Loss per affected cycle [%/cycle], default 0.005
 * @returns {number} Capacity loss [%]
 */
export function platingCapacityLoss(riskIndex, cycles, deltaPlate = 0.005) {
    return riskIndex * cycles * deltaPlate;
}

/**
 * Classify plating risk level
 * @param {number} riskIndex - [0-1]
 * @returns {{ level: string, description: string, color: string }}
 */
export function classifyPlatingRisk(riskIndex) {
    if (riskIndex < 0.15) {
        return {
            level: 'LOW',
            description: 'Minimal plating risk. Normal operating conditions.',
            color: '#51cf66'
        };
    } else if (riskIndex < 0.45) {
        return {
            level: 'MODERATE',
            description: 'Elevated plating risk. Consider reducing fast charging in cold conditions.',
            color: '#ffd43b'
        };
    } else if (riskIndex < 0.75) {
        return {
            level: 'HIGH',
            description: 'Significant plating risk. Reduce C-rate or warm battery before charging.',
            color: '#ff922b'
        };
    } else {
        return {
            level: 'CRITICAL',
            description: 'Severe plating risk. Immediate degradation and safety concern.',
            color: '#ff6b6b'
        };
    }
}

/**
 * Generate plating risk surface data (C-rate vs Temperature)
 * @param {Object} params - Plating parameters { beta, Ea }
 * @param {number} crateMax - Max C-rate
 * @param {number} tempMinC - Min temp °C
 * @param {number} tempMaxC - Max temp °C
 * @param {number} steps    - Grid resolution
 * @returns {{ crates: number[], temps: number[], risk: number[][] }}
 */
export function platingRiskSurface(params, crateMax = 3, tempMinC = -10, tempMaxC = 45, steps = 30) {
    const crates = [];
    const temps = [];
    const risk = [];

    for (let i = 0; i < steps; i++) {
        crates.push((i / (steps - 1)) * crateMax);
    }
    for (let j = 0; j < steps; j++) {
        temps.push(tempMinC + (j / (steps - 1)) * (tempMaxC - tempMinC));
    }

    for (let j = 0; j < steps; j++) {
        const row = [];
        const Tk = temps[j] + 273.15;
        for (let i = 0; i < steps; i++) {
            row.push(platingRiskIndex(params.beta, crates[i], Tk, params.Ea));
        }
        risk.push(row);
    }

    return { crates, temps, risk };
}
