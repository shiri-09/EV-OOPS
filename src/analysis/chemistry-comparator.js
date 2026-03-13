/**
 * ═══════════════════════════════════════════════════════════
 *  CHEMISTRY COMPARATOR
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Compare NMC vs LFP vs Custom across multiple dimensions:
 *  - Lifespan under same conditions
 *  - Climate sensitivity
 *  - Charging pattern sensitivity
 *  - Economic comparison
 *  - Environmental comparison
 */

import { CHEMISTRIES } from '../data/battery-chemistries.js';
import { fullLifespanAnalysis } from '../physics/lifespan-solver.js';
import { sohTimeSeries } from '../physics/soh-calculator.js';
import { economicTimeSeries, degradationNPV } from '../physics/economic-model.js';
import { carbonImpact } from '../physics/carbon-model.js';

/**
 * Compare two chemistries under same conditions
 * @param {Object} chemA
 * @param {Object} chemB
 * @param {Object} conditions
 * @returns {Object} Comparative analysis
 */
export function compareChemistries(chemA, chemB, conditions) {
    const analysisA = fullLifespanAnalysis(chemA, conditions);
    const analysisB = fullLifespanAnalysis(chemB, conditions);

    const sohA = sohTimeSeries(chemA, conditions, 5475, 200);
    const sohB = sohTimeSeries(chemB, conditions, 5475, 200);

    const econA = economicTimeSeries(chemA, conditions);
    const econB = economicTimeSeries(chemB, conditions);

    const carbonA = carbonImpact(chemA, conditions);
    const carbonB = carbonImpact(chemB, conditions);

    const winner = analysisA.lifespanYears >= analysisB.lifespanYears ? chemA : chemB;
    const lifespanDiff = Math.abs(analysisA.lifespanYears - analysisB.lifespanYears);

    return {
        chemA: { chemistry: chemA, analysis: analysisA, soh: sohA, economic: econA, carbon: carbonA },
        chemB: { chemistry: chemB, analysis: analysisB, soh: sohB, economic: econB, carbon: carbonB },
        winner: winner.id,
        winnerName: winner.name,
        lifespanDifference: lifespanDiff,
        conditions,
    };
}

/**
 * Climate sensitivity comparison
 * @param {Object} chemA
 * @param {Object} chemB
 * @param {Object} baseConditions
 * @returns {{ temps: number[], lifespanA: number[], lifespanB: number[] }}
 */
export function climateSensitivityComparison(chemA, chemB, baseConditions) {
    const temps = [];
    const lifespanA = [];
    const lifespanB = [];

    for (let t = -10; t <= 50; t += 2) {
        temps.push(t);
        const cond = { ...baseConditions, temperatureC: t };
        const analA = fullLifespanAnalysis(chemA, cond);
        const analB = fullLifespanAnalysis(chemB, cond);
        lifespanA.push(analA.lifespanYears === Infinity ? 20 : analA.lifespanYears);
        lifespanB.push(analB.lifespanYears === Infinity ? 20 : analB.lifespanYears);
    }

    return { temps, lifespanA, lifespanB };
}

/**
 * C-rate sensitivity comparison
 * @param {Object} chemA
 * @param {Object} chemB
 * @param {Object} baseConditions
 * @returns {{ crates: number[], lifespanA: number[], lifespanB: number[] }}
 */
export function crateSensitivityComparison(chemA, chemB, baseConditions) {
    const crates = [];
    const lifespanA = [];
    const lifespanB = [];

    for (let c = 0.2; c <= 3.0; c += 0.1) {
        crates.push(parseFloat(c.toFixed(1)));
        const cond = { ...baseConditions, cRate: c };
        const analA = fullLifespanAnalysis(chemA, cond);
        const analB = fullLifespanAnalysis(chemB, cond);
        lifespanA.push(analA.lifespanYears === Infinity ? 20 : analA.lifespanYears);
        lifespanB.push(analB.lifespanYears === Infinity ? 20 : analB.lifespanYears);
    }

    return { crates, lifespanA, lifespanB };
}
