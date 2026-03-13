/**
 * ═══════════════════════════════════════════════════════════
 *  CARBON IMPACT MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  Carbon emissions from premature battery replacement:
 *
 *    CO₂_impact = CO₂_manufacturing × (N_replacements − N_baseline)
 *
 *  where:
 *    CO₂_manufacturing = CO₂_perKWh × PackSize [kg CO₂]
 *    N_replacements    = ceil(VehicleLife / BatteryLifespan)
 *    N_baseline        = ceil(VehicleLife / BaselineLifespan)
 *
 *  LIFETIME CO₂ COMPARISON:
 *  ─────────────────────────
 *    CO₂_total = CO₂_manufacturing + CO₂_recycling + CO₂_usage
 *    CO₂_usage = Daily_kWh × CO₂_grid × 365.25 × VehicleLife
 *
 *  CARBON SAVINGS FROM EXTENDED LIFE:
 *    ΔCO₂ = CO₂_manufacturing × (1/LifespanActual − 1/LifespanOptimal) × VehicleLife
 */

import { CO2_PER_KWH_PRODUCTION, CO2_PER_KWH_RECYCLING, CO2_GRID_AVERAGE, PACK_SIZE_DEFAULT, DAYS_PER_YEAR } from '../data/constants.js';
import { solveLifespan } from './lifespan-solver.js';

/**
 * Compute manufacturing carbon footprint
 * @param {number} packSizeKWh
 * @param {number} co2PerKWh - kg CO₂/kWh
 * @returns {number} kg CO₂
 */
export function manufacturingCO2(packSizeKWh = PACK_SIZE_DEFAULT, co2PerKWh = CO2_PER_KWH_PRODUCTION) {
    return packSizeKWh * co2PerKWh;
}

/**
 * Compute number of battery replacements over vehicle lifetime
 * @param {number} vehicleLifeYears - Expected vehicle lifetime [years]
 * @param {number} batteryLifeYears - Battery lifespan [years]
 * @returns {number} Number of replacement packs needed
 */
export function replacementCount(vehicleLifeYears, batteryLifeYears) {
    if (batteryLifeYears <= 0 || batteryLifeYears === Infinity) return 0;
    return Math.max(Math.ceil(vehicleLifeYears / batteryLifeYears) - 1, 0);
}

/**
 * Compute excess CO₂ from premature replacement
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} vehicleLifeYears - Vehicle lifetime [years]
 * @param {number} packSizeKWh
 * @returns {{ totalCO2: number, baselineCO2: number, excessCO2: number, replacements: number, baselineReplacements: number }}
 */
export function carbonImpact(chemistry, conditions, vehicleLifeYears = 15, packSizeKWh = PACK_SIZE_DEFAULT) {
    const co2_mfg = manufacturingCO2(packSizeKWh, chemistry.co2Manufacturing || CO2_PER_KWH_PRODUCTION);

    // Actual lifespan
    const actualDays = solveLifespan(chemistry, conditions);
    const actualYears = actualDays === Infinity ? vehicleLifeYears + 1 : actualDays / DAYS_PER_YEAR;

    // Baseline (optimal conditions)
    const baselineDays = solveLifespan(chemistry, {
        temperatureC: 25, cRate: 0.5, dod: 0.6, cyclesPerDay: 0.8, avgSOC: 0.5,
    });
    const baselineYears = baselineDays === Infinity ? vehicleLifeYears + 1 : baselineDays / DAYS_PER_YEAR;

    const actualRepl = replacementCount(vehicleLifeYears, actualYears);
    const baselineRepl = replacementCount(vehicleLifeYears, baselineYears);

    const totalCO2 = co2_mfg * (1 + actualRepl);
    const baselineCO2 = co2_mfg * (1 + baselineRepl);

    return {
        totalCO2,
        baselineCO2,
        excessCO2: totalCO2 - baselineCO2,
        replacements: actualRepl,
        baselineReplacements: baselineRepl,
        co2PerReplacement: co2_mfg,
        batteryLifeYears: actualYears,
        baselineLifeYears: baselineYears,
    };
}

/**
 * Compute carbon intensity comparison with ICE vehicle
 * @param {number} evCO2Lifetime    - Total EV CO₂ [kg]
 * @param {number} vehicleLifeYears
 * @param {number} annualKm         - Annual driving distance [km]
 * @param {number} iceEmissions     - ICE g CO₂/km, default 120
 * @returns {{ evAnnual: number, iceAnnual: number, savings: number, savingsPercent: number }}
 */
export function carbonComparison(evCO2Lifetime, vehicleLifeYears, annualKm = 15000, iceEmissions = 120) {
    const iceLifetime = iceEmissions * annualKm * vehicleLifeYears / 1000; // kg CO₂
    const evAnnual = evCO2Lifetime / vehicleLifeYears;
    const iceAnnual = iceLifetime / vehicleLifeYears;

    return {
        evAnnual,
        iceAnnual,
        savings: iceLifetime - evCO2Lifetime,
        savingsPercent: ((iceLifetime - evCO2Lifetime) / iceLifetime) * 100,
    };
}
