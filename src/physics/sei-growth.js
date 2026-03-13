/**
 * ═══════════════════════════════════════════════════════════
 *  SEI (Solid Electrolyte Interphase) GROWTH MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  SEI layer growth follows a diffusion-limited parabolic law:
 *
 *    Q_SEI(t) = α_SEI · √t
 *
 *  where:
 *    Q_SEI(t) = capacity loss due to SEI growth [%]
 *    α_SEI    = SEI growth coefficient [%/√day]
 *    t        = time [days]
 *
 *  TEMPERATURE DEPENDENCE:
 *  ───────────────────────
 *  The growth coefficient follows Arrhenius kinetics:
 *
 *    α_SEI(T) = α_SEI,ref · exp[(E_SEI/R)(1/T_ref − 1/T)]
 *
 *  PHYSICAL BASIS:
 *  ───────────────
 *  The SEI is a passivation layer that forms on the anode
 *  during the first charge cycles. It continues to grow
 *  slowly throughout the battery's life, consuming lithium
 *  ions and increasing impedance.
 *
 *  The √t dependence arises from:
 *  - Diffusion of solvent molecules through existing SEI
 *  - Rate-limiting step is transport, not reaction
 *  - Fick's second law → parabolic growth profile
 *
 *  DIFFERENTIAL FORM:
 *  ──────────────────
 *    dQ_SEI/dt = α_SEI / (2√t)
 *
 *  This shows that SEI growth rate decreases over time
 *  (self-limiting process), but never fully stops.
 *
 *  ASSUMPTIONS:
 *  ────────────
 *  1. Uniform SEI across electrode surface
 *  2. Single-phase diffusion through SEI
 *  3. Constant electrolyte composition
 *  4. No mechanical cracking of SEI
 *
 *  LIMITATIONS:
 *  ────────────
 *  - At high C-rates, SEI may crack → accelerated growth
 *  - Calendar aging dominant at high SOC
 *  - Does not capture SEI dissolution at high T
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Pinson & Bazant, J. Electrochem. Soc., 160, A243 (2013)
 *  [2] Single et al., J. Electrochem. Soc., 165, A3026 (2018)
 */

import { R_GAS, T_REF, EA_SEI } from '../data/constants.js';
import { accelerationFactor } from './arrhenius.js';

/**
 * Compute SEI capacity loss at time t
 *
 *   Q_SEI(t) = α_SEI(T) · √t
 *
 * @param {number} alpha_ref - SEI growth coefficient at ref T [%/√day]
 * @param {number} t         - Time [days]
 * @param {number} T         - Operating temperature [K]
 * @param {number} Ea_sei    - SEI activation energy [J/mol]
 * @returns {number} Capacity loss [%]
 */
export function seiCapacityLoss(alpha_ref, t, T, Ea_sei = EA_SEI) {
    if (t < 0) throw new RangeError('Time must be non-negative');
    const af = accelerationFactor(Ea_sei, T);
    const alpha_T = alpha_ref * af;
    return alpha_T * Math.sqrt(t);
}

/**
 * Compute SEI growth rate at time t (differential form)
 *
 *   dQ_SEI/dt = α_SEI(T) / (2√t)
 *
 * @param {number} alpha_ref - SEI growth coefficient [%/√day]
 * @param {number} t         - Time [days] (must be > 0)
 * @param {number} T         - Operating temperature [K]
 * @param {number} Ea_sei    - SEI activation energy [J/mol]
 * @returns {number} Growth rate [%/day]
 */
export function seiGrowthRate(alpha_ref, t, T, Ea_sei = EA_SEI) {
    if (t <= 0) throw new RangeError('Time must be positive for rate calculation');
    const af = accelerationFactor(Ea_sei, T);
    const alpha_T = alpha_ref * af;
    return alpha_T / (2 * Math.sqrt(t));
}

/**
 * Generate SEI growth curve
 * @param {number} alpha_ref - SEI growth coefficient [%/√day]
 * @param {number} T         - Operating temperature [K]
 * @param {number} maxDays   - Maximum time [days]
 * @param {number} steps     - Number of data points
 * @returns {{ days: number[], loss: number[], rate: number[] }}
 */
export function seiGrowthCurve(alpha_ref, T, maxDays = 3650, steps = 200) {
    const days = [];
    const loss = [];
    const rate = [];
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = Math.max(i * dt, 0.01); // avoid t=0 for rate
        days.push(t);
        loss.push(seiCapacityLoss(alpha_ref, t, T));
        rate.push(seiGrowthRate(alpha_ref, t, T));
    }

    return { days, loss, rate };
}

/**
 * Time to reach a given SEI capacity loss
 *
 *   t* = (Q_target / α_SEI(T))²
 *
 * @param {number} alpha_ref - SEI growth coefficient [%/√day]
 * @param {number} Q_target  - Target capacity loss [%]
 * @param {number} T         - Operating temperature [K]
 * @returns {number} Time [days]
 */
export function seiTimeToLoss(alpha_ref, Q_target, T) {
    const af = accelerationFactor(EA_SEI, T);
    const alpha_T = alpha_ref * af;
    return Math.pow(Q_target / alpha_T, 2);
}
