/**
 * ═══════════════════════════════════════════════════════════
 *  MULTI-VARIABLE DEGRADATION SURFACE
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  The total degradation is a coupled function of 5 variables:
 *
 *    D(T, C_rate, DoD, N, t) = Q_calendar(T, t) + Q_cycle(T, C_rate, DoD, N) + Q_plating(C_rate, T, N)
 *
 *  DECOMPOSITION:
 *  ──────────────
 *    Q_calendar(T, t) = k_cal(T) · (1 + γ·SOC_avg) · √t
 *    Q_cycle(T, C_rate, DoD, N) = k_cyc(T) · C_rate^η · DoD^κ · N
 *    Q_plating(C_rate, T, N) = φ(C_rate, T) · N · δ_plate
 *
 *  COUPLING INTERACTIONS:
 *  ──────────────────────
 *  1. Calendar + Cycle: Both share SEI growth mechanism
 *     → Not purely additive at high utilization
 *  2. Temperature + C-rate: High C-rate at high T
 *     → Synergistic degradation acceleration
 *  3. DoD + Cycles: Deep cycles at high frequency
 *     → Mechanical stress compounding
 *  4. Temperature + Plating: Low T enables plating
 *     → Discontinuous behavior transition
 *
 *  This module generates the full degradation surface
 *  for 3D visualization and analysis.
 */

import { calendarAgingLoss } from './calendar-aging.js';
import { cycleAgingLoss, equivalentFullCycles, dodStressFactor } from './cycle-aging.js';
import { platingRiskIndex, platingCapacityLoss } from './lithium-plating.js';
import { celsiusToKelvin } from './arrhenius.js';

/**
 * Compute total degradation D at given conditions
 * @param {Object} chemistry - Battery chemistry profile
 * @param {Object} conditions - Operating conditions
 * @returns {number} Total capacity loss [%]
 */
export function totalDegradation(chemistry, conditions) {
    const {
        temperatureC = 25,
        cRate = 1.0,
        dod = 0.8,
        cyclesPerDay = 1.0,
        days = 365,
        avgSOC = 0.5,
    } = conditions;

    const T = celsiusToKelvin(temperatureC);
    const N_efc = equivalentFullCycles(cyclesPerDay, dod, days);

    // Calendar aging
    const Q_cal = calendarAgingLoss(
        chemistry.calendarAging.k_ref,
        chemistry.arrhenius.Ea_calendar,
        T, days, avgSOC,
        chemistry.calendarAging.sodependence
    );

    // Cycle aging
    const Q_cyc = cycleAgingLoss(
        chemistry.cycleAging.k_ref,
        chemistry.arrhenius.Ea_cycle,
        T, cRate,
        chemistry.cycleAging.crateSensitivity,
        dod, N_efc,
        chemistry.dodStress.kappa
    );

    // Lithium plating
    const phi = platingRiskIndex(
        chemistry.plating.beta,
        cRate, T,
        chemistry.plating.Ea
    );
    const Q_plate = platingCapacityLoss(phi, N_efc);

    return Q_cal + Q_cyc + Q_plate;
}

/**
 * Decompose degradation into components
 * @param {Object} chemistry - Battery chemistry profile
 * @param {Object} conditions - Operating conditions
 * @returns {Object} { calendar, cycle, plating, total }
 */
export function degradationComponents(chemistry, conditions) {
    const {
        temperatureC = 25,
        cRate = 1.0,
        dod = 0.8,
        cyclesPerDay = 1.0,
        days = 365,
        avgSOC = 0.5,
    } = conditions;

    const T = celsiusToKelvin(temperatureC);
    const N_efc = equivalentFullCycles(cyclesPerDay, dod, days);

    const Q_cal = calendarAgingLoss(
        chemistry.calendarAging.k_ref,
        chemistry.arrhenius.Ea_calendar,
        T, days, avgSOC,
        chemistry.calendarAging.sodependence
    );

    const Q_cyc = cycleAgingLoss(
        chemistry.cycleAging.k_ref,
        chemistry.arrhenius.Ea_cycle,
        T, cRate,
        chemistry.cycleAging.crateSensitivity,
        dod, N_efc,
        chemistry.dodStress.kappa
    );

    const phi = platingRiskIndex(chemistry.plating.beta, cRate, T, chemistry.plating.Ea);
    const Q_plate = platingCapacityLoss(phi, N_efc);

    return {
        calendar: Q_cal,
        cycle: Q_cyc,
        plating: Q_plate,
        total: Q_cal + Q_cyc + Q_plate,
    };
}

/**
 * Generate degradation surface: Temperature vs C-rate at fixed time
 * @param {Object} chemistry
 * @param {Object} fixedConditions - { dod, cyclesPerDay, days, avgSOC }
 * @param {number} tempMinC
 * @param {number} tempMaxC
 * @param {number} crateMax
 * @param {number} steps
 * @returns {{ temps: number[], crates: number[], degradation: number[][] }}
 */
export function degradationSurface(chemistry, fixedConditions, tempMinC = -10, tempMaxC = 50, crateMax = 3, steps = 30) {
    const temps = [];
    const crates = [];
    const degradation = [];

    for (let j = 0; j < steps; j++) {
        temps.push(tempMinC + (j / (steps - 1)) * (tempMaxC - tempMinC));
    }
    for (let i = 0; i < steps; i++) {
        crates.push(0.1 + (i / (steps - 1)) * (crateMax - 0.1));
    }

    for (let j = 0; j < steps; j++) {
        const row = [];
        for (let i = 0; i < steps; i++) {
            const d = totalDegradation(chemistry, {
                ...fixedConditions,
                temperatureC: temps[j],
                cRate: crates[i],
            });
            row.push(d);
        }
        degradation.push(row);
    }

    return { temps, crates, degradation };
}

/**
 * Generate time-series degradation curve
 * @param {Object} chemistry
 * @param {Object} conditions
 * @param {number} maxDays
 * @param {number} steps
 * @returns {{ days: number[], years: number[], total: number[], calendar: number[], cycle: number[], plating: number[] }}
 */
export function degradationTimeSeries(chemistry, conditions, maxDays = 5475, steps = 300) {
    const result = {
        days: [], years: [], total: [],
        calendar: [], cycle: [], plating: [],
    };
    const dt = maxDays / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        const comps = degradationComponents(chemistry, { ...conditions, days: t });
        result.days.push(t);
        result.years.push(t / 365.25);
        result.total.push(comps.total);
        result.calendar.push(comps.calendar);
        result.cycle.push(comps.cycle);
        result.plating.push(comps.plating);
    }

    return result;
}
