/**
 * ═══════════════════════════════════════════════════════════
 *  SCENARIO SIMULATION ENGINE
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Predefined usage scenarios for rapid comparison.
 */

import { fullLifespanAnalysis } from '../physics/lifespan-solver.js';
import { economicTimeSeries, degradationNPV } from '../physics/economic-model.js';
import { carbonImpact } from '../physics/carbon-model.js';

export const SCENARIOS = {
    gentle: {
        name: 'Gentle Commuter',
        icon: '🌿',
        description: 'Short daily commute, home L2 charging, moderate climate',
        conditions: {
            temperatureC: 22,
            cRate: 0.3,
            dod: 0.4,
            cyclesPerDay: 0.7,
            avgSOC: 0.55,
        },
    },
    average: {
        name: 'Average Driver',
        icon: '🚗',
        description: 'Typical daily use, mix of L2 and occasional DC fast charging',
        conditions: {
            temperatureC: 25,
            cRate: 0.8,
            dod: 0.65,
            cyclesPerDay: 1.0,
            avgSOC: 0.5,
        },
    },
    aggressive: {
        name: 'Aggressive User',
        icon: '⚡',
        description: 'Heavy daily use, frequent fast charging, deep discharges',
        conditions: {
            temperatureC: 30,
            cRate: 1.8,
            dod: 0.9,
            cyclesPerDay: 1.5,
            avgSOC: 0.6,
        },
    },
    hotClimate: {
        name: 'Hot Climate',
        icon: '🌡️',
        description: 'High ambient temperature region (Arizona, Middle East)',
        conditions: {
            temperatureC: 42,
            cRate: 1.0,
            dod: 0.7,
            cyclesPerDay: 1.0,
            avgSOC: 0.5,
        },
    },
    coldClimate: {
        name: 'Cold Climate',
        icon: '❄️',
        description: 'Cold region with frequent fast charging (Scandinavia, Canada)',
        conditions: {
            temperatureC: -5,
            cRate: 1.5,
            dod: 0.7,
            cyclesPerDay: 1.0,
            avgSOC: 0.5,
        },
    },
    rideshare: {
        name: 'Rideshare / Taxi',
        icon: '🚕',
        description: 'Continuous high-utilization, frequent DC fast charging',
        conditions: {
            temperatureC: 30,
            cRate: 2.0,
            dod: 0.85,
            cyclesPerDay: 2.5,
            avgSOC: 0.55,
        },
    },
};

/**
 * Run full scenario comparison
 * @param {Object} chemistry
 * @returns {Object[]} Array of scenario results
 */
export function runScenarioComparison(chemistry) {
    return Object.entries(SCENARIOS).map(([key, scenario]) => {
        const analysis = fullLifespanAnalysis(chemistry, scenario.conditions);
        const carbon = carbonImpact(chemistry, scenario.conditions);
        return {
            key,
            ...scenario,
            analysis,
            carbon,
        };
    });
}
