/**
 * ═══════════════════════════════════════════════════════════
 *  INTERNAL RESISTANCE GROWTH MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Internal resistance increases linearly with time:
 *
 *    R(t) = R₀ + k_R · t
 *
 *  where:
 *    R(t) = internal resistance at time t [Ω]
 *    R₀   = initial cell resistance [Ω]
 *    k_R  = resistance growth rate [Ω/day]
 *    t    = time [days]
 *
 *  TEMPERATURE DEPENDENCE:
 *    k_R(T) = k_R,ref · exp[(Eₐ,R/R)(1/T_ref − 1/T)]
 *
 *  POWER FADE:
 *  ───────────
 *  Resistance growth causes power fade:
 *
 *    P_max(t) = V² / (4·R(t))     (matched load)
 *    Power_fade(t) = 1 − R₀/R(t)  [%]
 *
 *  IMPLICATIONS:
 *  ─────────────
 *  - Reduced acceleration performance
 *  - Increased heat generation: Q = I²·R(t)
 *  - Reduced energy efficiency
 *  - Positive feedback: more heat → faster aging
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Birkl et al., J. Power Sources, 341, 373 (2017)
 *  [2] Barré et al., J. Power Sources, 241, 680 (2013)
 */

import { accelerationFactor } from './arrhenius.js';
import { EA_CALENDAR } from '../data/constants.js';

/**
 * Compute internal resistance at time t
 *
 *   R(t) = R₀ + k_R(T) · t
 *
 * @param {number} R0      - Initial resistance [Ω]
 * @param {number} kR_ref  - Resistance growth rate at ref T [Ω/day]
 * @param {number} T       - Operating temperature [K]
 * @param {number} t       - Time [days]
 * @param {number} Ea      - Activation energy [J/mol]
 * @returns {number} Resistance [Ω]
 */
export function internalResistance(R0, kR_ref, T, t, Ea = EA_CALENDAR) {
    const af = accelerationFactor(Ea, T);
    return R0 + kR_ref * af * t;
}

/**
 * Compute resistance growth ratio R(t)/R₀
 * @param {number} R0     - Initial resistance [Ω]
 * @param {number} kR_ref - Growth rate [Ω/day]
 * @param {number} T      - Temperature [K]
 * @param {number} t      - Time [days]
 * @returns {number} Resistance ratio (dimensionless)
 */
export function resistanceGrowthRatio(R0, kR_ref, T, t) {
    return internalResistance(R0, kR_ref, T, t) / R0;
}

/**
 * Compute power fade percentage
 *
 *   Power_fade = 1 − R₀/R(t)
 *
 * @param {number} R0     - Initial resistance [Ω]
 * @param {number} kR_ref - Growth rate [Ω/day]
 * @param {number} T      - Temperature [K]
 * @param {number} t      - Time [days]
 * @returns {number} Power fade [fraction, 0-1]
 */
export function powerFade(R0, kR_ref, T, t) {
    const Rt = internalResistance(R0, kR_ref, T, t);
    return 1 - R0 / Rt;
}

/**
 * Generate resistance growth curve
 * @param {number} R0     - Initial resistance [Ω]
 * @param {number} kR_ref - Growth rate [Ω/day]
 * @param {number} T      - Temperature [K]
 * @param {number} maxDays - Max simulation time
 * @param {number} steps   - Data points
 * @returns {{ days: number[], years: number[], resistance: number[], powerFade: number[] }}
 */
export function resistanceCurve(R0, kR_ref, T, maxDays = 5475, steps = 200) {
    const days = [];
    const years = [];
    const resistance = [];
    const fade = [];
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        days.push(t);
        years.push(t / 365.25);
        resistance.push(internalResistance(R0, kR_ref, T, t));
        fade.push(powerFade(R0, kR_ref, T, t) * 100); // as %
    }

    return { days, years, resistance, powerFade: fade };
}
