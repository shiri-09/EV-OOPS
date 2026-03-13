/**
 * ═══════════════════════════════════════════════════════════
 *  ECONOMIC DEGRADATION MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Economic cost of capacity degradation:
 *
 *    Cost_loss(t) = C_replacement × (1 − SOH(t)/100)
 *
 *  where:
 *    C_replacement = C_pack × C_perKWh + C_labor
 *    C_pack        = pack size [kWh]
 *    C_perKWh      = cost per kWh [$]
 *    C_labor       = labor cost [$]
 *
 *  ANNUAL DEPRECIATION RATE:
 *  ─────────────────────────
 *    δ_annual(y) = Cost_loss(y) − Cost_loss(y−1)
 *
 *  TOTAL COST OF OWNERSHIP IMPACT:
 *    TCO_degradation = Σ δ_annual(y) / (1+r)^y
 *
 *    where r = discount rate (time value of money)
 *
 *  VALUE RETENTION:
 *    V(t) = V_base × (SOH(t)/100)^α
 *
 *    where α ≈ 1.5 (non-linear value perception)
 */

import { computeSOH } from './soh-calculator.js';
import { BATTERY_COST_PER_KWH, PACK_SIZE_DEFAULT, REPLACEMENT_LABOR, DAYS_PER_YEAR } from '../data/constants.js';

/**
 * Compute replacement cost
 * @param {number} packSizeKWh - Battery pack size [kWh]
 * @param {number} costPerKWh  - Cost per kWh [$]
 * @param {number} laborCost   - Labor cost [$]
 * @returns {number} Total replacement cost [$]
 */
export function replacementCost(packSizeKWh = PACK_SIZE_DEFAULT, costPerKWh = BATTERY_COST_PER_KWH, laborCost = REPLACEMENT_LABOR) {
    return packSizeKWh * costPerKWh + laborCost;
}

/**
 * Compute economic loss at given time
 *
 *   Cost_loss(t) = C_replacement × (1 − SOH(t)/100)
 *
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} packSizeKWh
 * @param {number} costPerKWh
 * @returns {number} Economic loss [$]
 */
export function economicLoss(chemistry, conditions, packSizeKWh = PACK_SIZE_DEFAULT, costPerKWh) {
    const cost = costPerKWh || chemistry.costPerKwh || BATTERY_COST_PER_KWH;
    const C_repl = replacementCost(packSizeKWh, cost);
    const soh = computeSOH(chemistry, conditions);
    return C_repl * (1 - soh / 100);
}

/**
 * Generate economic loss time series
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} packSizeKWh
 * @param {number} maxYears
 * @param {number} steps
 * @returns {{ years: number[], loss: number[], soh: number[], annualRate: number[] }}
 */
export function economicTimeSeries(chemistry, conditions, packSizeKWh = PACK_SIZE_DEFAULT, maxYears = 15, steps = 200) {
    const result = { years: [], loss: [], soh: [], annualRate: [] };
    const cost = chemistry.costPerKwh || BATTERY_COST_PER_KWH;
    const C_repl = replacementCost(packSizeKWh, cost);
    const dt = (maxYears * DAYS_PER_YEAR) / (steps - 1);

    let prevLoss = 0;
    for (let i = 0; i < steps; i++) {
        const days = i * dt;
        const years = days / DAYS_PER_YEAR;
        const soh = computeSOH(chemistry, { ...conditions, days });
        const loss = C_repl * (1 - soh / 100);
        const annualRate = i > 0 ? (loss - prevLoss) * (DAYS_PER_YEAR / dt) : 0;

        result.years.push(years);
        result.loss.push(loss);
        result.soh.push(soh);
        result.annualRate.push(annualRate);
        prevLoss = loss;
    }

    return result;
}

/**
 * Compute present value of degradation costs
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} packSizeKWh
 * @param {number} discountRate - Annual discount rate [0-1]
 * @param {number} years - Analysis period
 * @returns {number} Net present value of degradation costs [$]
 */
export function degradationNPV(chemistry, conditions, packSizeKWh = PACK_SIZE_DEFAULT, discountRate = 0.05, years = 10) {
    const cost = chemistry.costPerKwh || BATTERY_COST_PER_KWH;
    const C_repl = replacementCost(packSizeKWh, cost);
    let npv = 0;

    for (let y = 1; y <= years; y++) {
        const days = y * DAYS_PER_YEAR;
        const soh_curr = computeSOH(chemistry, { ...conditions, days });
        const soh_prev = computeSOH(chemistry, { ...conditions, days: (y - 1) * DAYS_PER_YEAR });
        const annualLoss = C_repl * (soh_prev - soh_curr) / 100;
        npv += annualLoss / Math.pow(1 + discountRate, y);
    }

    return npv;
}
