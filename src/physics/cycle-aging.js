/**
 * ═══════════════════════════════════════════════════════════
 *  CYCLE AGING MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Cycle aging depends on:
 *  - Number of equivalent full cycles (EFC)
 *  - Depth of Discharge (DoD)
 *  - C-rate
 *  - Temperature
 *
 *    Q_cyc(N) = k_cyc(T, C_rate) · σ_DoD · N
 *
 *  where:
 *    k_cyc      = cycle aging rate [%/EFC]
 *    σ_DoD      = DoD stress factor = DoD^κ (Wöhler curve)
 *    N          = equivalent full cycles
 *
 *  TEMPERATURE + C-RATE DEPENDENCE:
 *    k_cyc(T, C_rate) = k_cyc,ref · AF(T) · C_rate^η
 *
 *  where η is the C-rate sensitivity exponent.
 *
 *  EQUIVALENT FULL CYCLES (EFC):
 *  ─────────────────────────────
 *  EFC converts partial cycles to equivalent full cycles:
 *
 *    EFC = Σ (ΔDoD_i / 2)
 *
 *  For uniform cycling at fixed DoD:
 *    EFC = N_partial · DoD
 *
 *  COUPLING WITH CALENDAR AGING:
 *  ──────────────────────────────
 *  Total capacity loss = Q_cal(t) + Q_cyc(N)
 *  where N and t are related through usage pattern:
 *    N(t) = cycles_per_day · t
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Xu et al., Applied Energy, 204, 1205 (2017)
 *  [2] Petit et al., J. Energy Storage, 6, 59 (2016)
 */

import { accelerationFactor } from './arrhenius.js';
import { KAPPA_DOD } from '../data/constants.js';

/**
 * Compute DoD stress factor (Wöhler-type)
 *
 *   σ_DoD = DoD^κ
 *
 * @param {number} DoD   - Depth of discharge [0-1]
 * @param {number} kappa - DoD exponent, default 1.5
 * @returns {number} Stress factor (dimensionless)
 */
export function dodStressFactor(DoD, kappa = KAPPA_DOD) {
    return Math.pow(Math.max(DoD, 0.01), kappa);
}

/**
 * Compute cycle aging capacity loss
 *
 *   Q_cyc = k_cyc(T, C_rate) · σ_DoD · N_efc
 *
 * @param {number} k_ref  - Cycle aging rate at ref conditions [%/EFC]
 * @param {number} Ea     - Cycle aging activation energy [J/mol]
 * @param {number} T      - Operating temperature [K]
 * @param {number} Crate  - Charging C-rate [C]
 * @param {number} eta    - C-rate sensitivity exponent
 * @param {number} DoD    - Depth of discharge [0-1]
 * @param {number} N_efc  - Equivalent full cycles
 * @param {number} kappa  - DoD exponent
 * @returns {number} Capacity loss [%]
 */
export function cycleAgingLoss(k_ref, Ea, T, Crate, eta, DoD, N_efc, kappa = KAPPA_DOD) {
    const af = accelerationFactor(Ea, T);
    const crateFactor = Math.pow(Math.max(Crate, 0.1), eta);
    const dodFactor = dodStressFactor(DoD, kappa);
    return k_ref * af * crateFactor * dodFactor * N_efc;
}

/**
 * Convert daily usage to equivalent full cycles
 * @param {number} cyclesPerDay - Partial charge cycles per day
 * @param {number} DoD          - Average DoD [0-1]
 * @param {number} days         - Number of days
 * @returns {number} Equivalent full cycles
 */
export function equivalentFullCycles(cyclesPerDay, DoD, days) {
    return cyclesPerDay * DoD * days;
}

/**
 * Generate cycle aging curve
 * @param {Object} params - { k_ref, Ea, eta, kappa }
 * @param {number} T       - Temperature [K]
 * @param {number} Crate   - C-rate
 * @param {number} DoD     - Depth of discharge [0-1]
 * @param {number} cyclesPerDay - Cycles per day
 * @param {number} maxDays - Maximum simulation days
 * @param {number} steps   - Data points
 * @returns {{ days: number[], years: number[], loss: number[], efc: number[] }}
 */
export function cycleAgingCurve(params, T, Crate, DoD, cyclesPerDay, maxDays = 5475, steps = 200) {
    const days = [];
    const years = [];
    const loss = [];
    const efc = [];
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        const N = equivalentFullCycles(cyclesPerDay, DoD, t);
        days.push(t);
        years.push(t / 365.25);
        efc.push(N);
        loss.push(cycleAgingLoss(
            params.k_ref, params.Ea, T, Crate, params.eta || 1.4, DoD, N, params.kappa || KAPPA_DOD
        ));
    }

    return { days, years, loss, efc };
}
