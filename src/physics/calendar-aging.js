/**
 * ═══════════════════════════════════════════════════════════
 *  CALENDAR AGING MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Calendar aging occurs regardless of cycling, driven by:
 *  - SEI growth (dominant mechanism)
 *  - Cathode dissolution
 *  - Electrolyte oxidation
 *
 *    Q_cal(t) = k_cal(T, SOC) · √t
 *
 *  where:
 *    k_cal = calendar aging rate [%/√day]
 *
 *  TEMPERATURE DEPENDENCE (Arrhenius):
 *    k_cal(T) = k_cal,ref · exp[(Eₐ,cal/R)(1/T_ref − 1/T)]
 *
 *  SOC DEPENDENCE:
 *    The anode potential decreases with increasing SOC,
 *    accelerating parasitic reactions:
 *
 *    k_cal(T, SOC) = k_cal(T) · (1 + γ · SOC)
 *
 *    where γ is the SOC dependence factor.
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Keil et al., J. Electrochem. Soc., 163, A1872 (2016)
 *  [2] Schmalstieg et al., J. Power Sources, 257, 325 (2014)
 */

import { R_GAS, T_REF } from '../data/constants.js';
import { accelerationFactor } from './arrhenius.js';

/**
 * Compute calendar aging capacity loss
 *
 *   Q_cal(t) = k_cal(T, SOC) · √t
 *
 * @param {number} k_ref   - Calendar aging rate at ref conditions [%/√day]
 * @param {number} Ea      - Calendar aging activation energy [J/mol]
 * @param {number} T       - Operating temperature [K]
 * @param {number} t       - Time [days]
 * @param {number} avgSOC  - Average state of charge [0-1], default 0.5
 * @param {number} gamma   - SOC dependence factor, default 0.6
 * @returns {number} Capacity loss [%]
 */
export function calendarAgingLoss(k_ref, Ea, T, t, avgSOC = 0.5, gamma = 0.6) {
    if (t < 0) throw new RangeError('Time must be non-negative');
    const af = accelerationFactor(Ea, T);
    const socFactor = 1 + gamma * avgSOC;
    return k_ref * af * socFactor * Math.sqrt(t);
}

/**
 * Generate calendar aging curve
 * @param {Object} params - { k_ref, Ea, gamma }
 * @param {number} T      - Temperature [K]
 * @param {number} avgSOC  - Average SOC [0-1]
 * @param {number} maxDays - Maximum simulation time [days]
 * @param {number} steps   - Data points
 * @returns {{ days: number[], years: number[], loss: number[] }}
 */
export function calendarAgingCurve(params, T, avgSOC = 0.5, maxDays = 5475, steps = 200) {
    const days = [];
    const years = [];
    const loss = [];
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        days.push(t);
        years.push(t / 365.25);
        loss.push(calendarAgingLoss(params.k_ref, params.Ea, T, t, avgSOC, params.gamma || 0.6));
    }

    return { days, years, loss };
}
