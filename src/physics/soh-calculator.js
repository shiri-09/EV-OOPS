/**
 * ═══════════════════════════════════════════════════════════
 *  STATE OF HEALTH (SOH) CALCULATOR
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *    SOH(t) = (Q_current(t) / Q_rated) × 100
 *
 *  where:
 *    Q_current(t) = Q_rated − Q_loss(t)
 *    Q_loss(t)    = D(T, C_rate, DoD, N(t), t)
 *
 *  Therefore:
 *    SOH(t) = 100 − D(T, C_rate, DoD, N(t), t)
 *
 *  THRESHOLDS:
 *  ───────────
 *    SOH = 100%  → New battery
 *    SOH = 80%   → End of Life (EV standard)
 *    SOH = 70%   → Warranty threshold (most OEMs)
 *    SOH < 60%   → Critical / second-life consideration
 */

import { totalDegradation, degradationComponents } from './degradation-surface.js';

/**
 * Compute SOH at given conditions
 * @param {Object} chemistry - Battery chemistry profile
 * @param {Object} conditions - Operating conditions (includes days)
 * @returns {number} SOH [%]
 */
export function computeSOH(chemistry, conditions) {
    const D = totalDegradation(chemistry, conditions);
    return Math.max(100 - D, 0);
}

/**
 * Compute SOH with component breakdown
 * @param {Object} chemistry
 * @param {Object} conditions
 * @returns {Object} { soh, calendar, cycle, plating, total }
 */
export function computeSOHDetailed(chemistry, conditions) {
    const comps = degradationComponents(chemistry, conditions);
    return {
        soh: Math.max(100 - comps.total, 0),
        ...comps,
    };
}

/**
 * Generate SOH time series
 * @param {Object} chemistry
 * @param {Object} conditions - Operating conditions (days will be overridden)
 * @param {number} maxDays
 * @param {number} steps
 * @returns {{ days: number[], years: number[], soh: number[], components: Object }}
 */
export function sohTimeSeries(chemistry, conditions, maxDays = 5475, steps = 300) {
    const result = {
        days: [], years: [], soh: [],
        calendar: [], cycle: [], plating: [],
    };
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        const detailed = computeSOHDetailed(chemistry, { ...conditions, days: t });
        result.days.push(t);
        result.years.push(t / 365.25);
        result.soh.push(detailed.soh);
        result.calendar.push(detailed.calendar);
        result.cycle.push(detailed.cycle);
        result.plating.push(detailed.plating);
    }

    return result;
}

/**
 * Classify SOH status
 * @param {number} soh - SOH [%]
 * @returns {{ status: string, color: string, description: string }}
 */
export function classifySOH(soh) {
    if (soh >= 90) return { status: 'EXCELLENT', color: '#51cf66', description: 'Battery in excellent condition' };
    if (soh >= 80) return { status: 'GOOD', color: '#94d82d', description: 'Battery functioning normally' };
    if (soh >= 70) return { status: 'DEGRADED', color: '#ffd43b', description: 'Noticeable capacity reduction' };
    if (soh >= 60) return { status: 'POOR', color: '#ff922b', description: 'Significant degradation — consider second-life' };
    return { status: 'CRITICAL', color: '#ff6b6b', description: 'Below operational threshold' };
}
