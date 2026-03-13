/**
 * ═══════════════════════════════════════════════════════════
 *  LIFESPAN SOLVER
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Find t* such that:
 *
 *    SOH(t*) = SOH_target (default 80%)
 *
 *  Equivalently, solve:
 *
 *    100 − D(T, C_rate, DoD, N(t*), t*) = SOH_target
 *    D(T, C_rate, DoD, N(t*), t*) = 100 − SOH_target = 20%
 *
 *  SOLUTION METHOD:
 *  ────────────────
 *  Since D(t) is monotonically increasing, we use the
 *  bisection method (guaranteed convergence):
 *
 *  1. Set [a, b] = [0, t_max]
 *  2. While |b − a| > ε:
 *     - c = (a + b) / 2
 *     - If D(c) < D_target → a = c
 *     - Else → b = c
 *  3. t* = (a + b) / 2
 *
 *  Convergence: O(log₂(t_max/ε)) iterations
 *  For ε = 1 day, t_max = 20 years: ~14 iterations
 *
 *  DEGRADATION ACCELERATION FACTOR:
 *  ─────────────────────────────────
 *    DAF = t*_ref / t*_actual
 *
 *    where t*_ref is lifespan under ideal conditions (25°C, 0.5C, 60% DoD)
 *    DAF > 1 → degradation faster than baseline
 *    DAF < 1 → degradation slower than baseline
 *
 *  RISK INDEX:
 *  ───────────
 *    Based on DAF:
 *    DAF < 1.2 → LOW risk
 *    DAF < 2.0 → MEDIUM risk
 *    DAF ≥ 2.0 → HIGH risk
 */

import { totalDegradation } from './degradation-surface.js';
import { computeSOH } from './soh-calculator.js';
import { DAYS_PER_YEAR, SOH_EOL } from '../data/constants.js';

/**
 * Solve for lifespan using bisection method
 *
 *   Find t* where SOH(t*) = SOH_target
 *
 * @param {Object} chemistry - Battery chemistry profile
 * @param {Object} conditions - Operating conditions (days will be overridden)
 * @param {number} sohTarget - Target SOH [%], default 80
 * @param {number} maxDays - Maximum search range [days], default 20 years
 * @param {number} tolerance - Convergence tolerance [days], default 1
 * @returns {number} Lifespan in days, or Infinity if not reached
 */
export function solveLifespan(chemistry, conditions, sohTarget = SOH_EOL, maxDays = 7300, tolerance = 1) {
    const D_target = 100 - sohTarget; // capacity loss target

    // Check if degradation exceeds target within search range
    const D_max = totalDegradation(chemistry, { ...conditions, days: maxDays });
    if (D_max < D_target) {
        return Infinity; // Battery outlasts search range
    }

    // Bisection method
    let a = 0;
    let b = maxDays;

    while (b - a > tolerance) {
        const c = (a + b) / 2;
        const D_c = totalDegradation(chemistry, { ...conditions, days: c });

        if (D_c < D_target) {
            a = c;
        } else {
            b = c;
        }
    }

    return (a + b) / 2;
}

/**
 * Compute lifespan in years
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} sohTarget
 * @returns {number} Lifespan in years
 */
export function lifespanYears(chemistry, conditions, sohTarget = SOH_EOL) {
    const days = solveLifespan(chemistry, conditions, sohTarget);
    return days === Infinity ? Infinity : days / DAYS_PER_YEAR;
}

/**
 * Compute reference lifespan under ideal conditions
 * @param {Object} chemistry
 * @returns {number} Reference lifespan in days
 */
export function referenceLifespan(chemistry) {
    const idealConditions = {
        temperatureC: 25,
        cRate: 0.5,
        dod: 0.6,
        cyclesPerDay: 0.8,
        avgSOC: 0.5,
    };
    return solveLifespan(chemistry, idealConditions);
}

/**
 * Compute Degradation Acceleration Factor (DAF)
 *
 *   DAF = t*_ref / t*_actual
 *
 * @param {Object} chemistry
 * @param {Object} conditions
 * @returns {number} DAF (dimensionless)
 */
export function degradationAccelerationFactor(chemistry, conditions) {
    const t_ref = referenceLifespan(chemistry);
    const t_actual = solveLifespan(chemistry, conditions);

    if (t_actual === Infinity) return 0; // No degradation to target
    if (t_ref === Infinity) return 1;

    return t_ref / t_actual;
}

/**
 * Classify risk based on DAF
 * @param {number} daf
 * @returns {{ level: string, color: string, description: string }}
 */
export function classifyRisk(daf) {
    if (daf <= 0) return { level: 'MINIMAL', color: '#51cf66', description: 'Battery exceeds typical lifespan expectations' };
    if (daf < 1.2) return { level: 'LOW', color: '#51cf66', description: 'Degradation within normal range' };
    if (daf < 1.6) return { level: 'MODERATE', color: '#ffd43b', description: 'Moderately accelerated degradation' };
    if (daf < 2.0) return { level: 'HIGH', color: '#ff922b', description: 'Significantly accelerated degradation' };
    return { level: 'CRITICAL', color: '#ff6b6b', description: 'Severe degradation acceleration — immediate action recommended' };
}

/**
 * Generate usage recommendations based on conditions
 * @param {Object} chemistry
 * @param {Object} conditions
 * @returns {string[]} Array of recommendations
 */
export function generateRecommendations(chemistry, conditions) {
    const recommendations = [];
    const {
        temperatureC = 25,
        cRate = 1.0,
        dod = 0.8,
        cyclesPerDay = 1.0,
    } = conditions;

    if (temperatureC > 35) {
        recommendations.push('⚠️ High ambient temperature accelerates aging. Park in shade or garage when possible.');
    }
    if (temperatureC < 5) {
        recommendations.push('❄️ Cold temperature increases lithium plating risk. Precondition battery before fast charging.');
    }
    if (cRate > 1.5) {
        recommendations.push('⚡ Frequent fast charging (>' + cRate.toFixed(1) + 'C) accelerates degradation. Limit to <20% of charges.');
    }
    if (dod > 0.85) {
        recommendations.push('🔋 Deep discharges increase mechanical stress. Keep DoD below 80% when possible.');
    }
    if (cyclesPerDay > 1.5) {
        recommendations.push('🔄 High cycling frequency compounds aging. Consider off-peak charging strategies.');
    }
    if (dod < 0.5 && cRate < 0.8 && temperatureC >= 15 && temperatureC <= 30) {
        recommendations.push('✅ Current usage pattern is optimal for battery longevity.');
    }

    if (recommendations.length === 0) {
        recommendations.push('✅ Usage parameters are within recommended ranges.');
    }

    return recommendations;
}

/**
 * Full lifespan analysis
 * @param {Object} chemistry
 * @param {Object} conditions
 * @returns {Object} Complete analysis results
 */
export function fullLifespanAnalysis(chemistry, conditions) {
    const days = solveLifespan(chemistry, conditions);
    const years = days === Infinity ? Infinity : days / DAYS_PER_YEAR;
    const daf = degradationAccelerationFactor(chemistry, conditions);
    const risk = classifyRisk(daf);
    const recommendations = generateRecommendations(chemistry, conditions);

    // SOH at various milestones
    const milestones = [1, 2, 3, 5, 8, 10, 12, 15].map(y => ({
        year: y,
        days: y * DAYS_PER_YEAR,
        soh: computeSOH(chemistry, { ...conditions, days: y * DAYS_PER_YEAR }),
    }));

    return {
        lifespanDays: days,
        lifespanYears: years,
        yearToEOL: years === Infinity ? 'Beyond 20 years' : (new Date().getFullYear() + Math.floor(years)),
        daf,
        risk,
        recommendations,
        milestones,
    };
}
