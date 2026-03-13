/**
 * ═══════════════════════════════════════════════════════════
 *  SENSITIVITY ANALYSIS ENGINE
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Performs one-at-a-time (OAT) and multi-variable sensitivity
 *  analysis on the degradation model.
 *
 *  METHODOLOGY:
 *  ────────────
 *  For each parameter p_i:
 *    S_i = (∂D/∂p_i) × (p_i / D_base)   [Normalized sensitivity]
 *
 *  Numerically approximated via central differences:
 *    ∂D/∂p_i ≈ [D(p_i + Δ) − D(p_i − Δ)] / (2Δ)
 */

import { totalDegradation } from '../physics/degradation-surface.js';
import { lifespanYears } from '../physics/lifespan-solver.js';

/**
 * Single-parameter sensitivity (partial derivative)
 * @param {Object} chemistry
 * @param {Object} baseConditions
 * @param {string} paramName - Parameter to vary
 * @param {number} delta - Perturbation fraction (0.05 = 5%)
 * @returns {{ sensitivity: number, elasticity: number }}
 */
export function parameterSensitivity(chemistry, baseConditions, paramName, delta = 0.05) {
    const baseValue = baseConditions[paramName];
    if (baseValue === undefined) throw new Error(`Unknown parameter: ${paramName}`);

    const perturbation = Math.max(Math.abs(baseValue * delta), 0.01);

    const condPlus = { ...baseConditions, [paramName]: baseValue + perturbation };
    const condMinus = { ...baseConditions, [paramName]: baseValue - perturbation };

    const D_plus = totalDegradation(chemistry, condPlus);
    const D_minus = totalDegradation(chemistry, condMinus);
    const D_base = totalDegradation(chemistry, baseConditions);

    const sensitivity = (D_plus - D_minus) / (2 * perturbation);
    const elasticity = D_base !== 0 ? sensitivity * (baseValue / D_base) : 0;

    return { sensitivity, elasticity };
}

/**
 * Full sensitivity analysis across all parameters
 * @param {Object} chemistry
 * @param {Object} baseConditions
 * @returns {Object[]} Sorted by |elasticity|
 */
export function fullSensitivityAnalysis(chemistry, baseConditions) {
    const params = ['temperatureC', 'cRate', 'dod', 'cyclesPerDay'];
    const labels = {
        temperatureC: 'Temperature (°C)',
        cRate: 'C-Rate',
        dod: 'Depth of Discharge',
        cyclesPerDay: 'Daily Cycles',
    };

    const results = params.map(p => {
        const { sensitivity, elasticity } = parameterSensitivity(chemistry, baseConditions, p);
        return {
            parameter: p,
            label: labels[p],
            sensitivity,
            elasticity,
            absElasticity: Math.abs(elasticity),
        };
    });

    results.sort((a, b) => b.absElasticity - a.absElasticity);
    return results;
}

/**
 * Generate parameter sweep data
 * @param {Object} chemistry
 * @param {Object} baseConditions
 * @param {string} paramName
 * @param {number} minVal
 * @param {number} maxVal
 * @param {number} steps
 * @returns {{ values: number[], degradation: number[], lifespan: number[] }}
 */
export function parameterSweep(chemistry, baseConditions, paramName, minVal, maxVal, steps = 50) {
    const values = [];
    const degradation = [];
    const lifespan = [];
    const dv = (maxVal - minVal) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const v = minVal + i * dv;
        values.push(v);

        const cond = { ...baseConditions, [paramName]: v };
        degradation.push(totalDegradation(chemistry, cond));
        lifespan.push(lifespanYears(chemistry, cond));
    }

    return { values, degradation, lifespan };
}

/**
 * Tornado chart data (sensitivity ranking)
 * @param {Object} chemistry
 * @param {Object} baseConditions
 * @returns {{ labels: string[], low: number[], high: number[], base: number }}
 */
export function tornadoChart(chemistry, baseConditions) {
    const params = [
        { name: 'temperatureC', label: 'Temperature', low: 10, high: 45 },
        { name: 'cRate', label: 'C-Rate', low: 0.3, high: 2.5 },
        { name: 'dod', label: 'Depth of Discharge', low: 0.3, high: 0.95 },
        { name: 'cyclesPerDay', label: 'Daily Cycles', low: 0.3, high: 2.5 },
    ];

    const baseLifespan = lifespanYears(chemistry, baseConditions);
    const labels = [];
    const low = [];
    const high = [];

    params.forEach(p => {
        labels.push(p.label);
        low.push(lifespanYears(chemistry, { ...baseConditions, [p.name]: p.low }));
        high.push(lifespanYears(chemistry, { ...baseConditions, [p.name]: p.high }));
    });

    return { labels, low, high, base: baseLifespan };
}
