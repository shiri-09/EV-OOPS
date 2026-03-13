/**
 * ═══════════════════════════════════════════════════════════
 *  ARRHENIUS TEMPERATURE ACCELERATION MODEL
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FORMULATION:
 *  ─────────────────────────
 *  The Arrhenius equation models the temperature dependence
 *  of electrochemical reaction rates:
 *
 *    k(T) = A · exp(−Eₐ / (R·T))
 *
 *  where:
 *    k(T) = reaction rate constant at temperature T [1/s]
 *    A    = pre-exponential (frequency) factor [1/s]
 *    Eₐ   = activation energy [J/mol]
 *    R    = universal gas constant = 8.314 J/(mol·K)
 *    T    = absolute temperature [K]
 *
 *  ACCELERATION FACTOR:
 *  ────────────────────
 *  The acceleration factor relative to a reference temperature:
 *
 *    AF(T) = k(T) / k(T_ref)
 *          = exp[ (Eₐ/R) · (1/T_ref − 1/T) ]
 *
 *  This quantifies how much faster degradation occurs at T
 *  compared to the reference temperature T_ref.
 *
 *  ASSUMPTIONS:
 *  ────────────
 *  1. Single dominant reaction pathway (one Eₐ)
 *  2. Constant activation energy over SOH range
 *  3. Temperature uniform across cell (lumped thermal model)
 *  4. Valid for T ∈ [−20°C, 60°C]
 *
 *  LIMITATIONS:
 *  ────────────
 *  - At extreme temperatures (<−10°C), lithium plating
 *    dominates over Arrhenius kinetics
 *  - Multiple competing reactions may require multi-Arrhenius
 *  - Does not capture thermal runaway transitions
 *
 *  REFERENCES:
 *  ───────────
 *  [1] Waldmann et al., J. Power Sources, 262, 129-135 (2014)
 *  [2] Bloom et al., J. Power Sources, 101, 238-247 (2001)
 */

import { R_GAS, T_REF } from '../data/constants.js';

/**
 * Compute Arrhenius rate constant k(T)
 * @param {number} A  - Pre-exponential factor [1/s or 1/day^0.5]
 * @param {number} Ea - Activation energy [J/mol]
 * @param {number} T  - Absolute temperature [K]
 * @returns {number} Rate constant k(T)
 */
export function arrheniusRate(A, Ea, T) {
    if (T <= 0) throw new RangeError('Temperature must be positive (Kelvin)');
    return A * Math.exp(-Ea / (R_GAS * T));
}

/**
 * Compute temperature acceleration factor AF(T) relative to T_ref
 *
 *   AF(T) = exp[ (Eₐ/R) · (1/T_ref − 1/T) ]
 *
 * @param {number} Ea    - Activation energy [J/mol]
 * @param {number} T     - Operating temperature [K]
 * @param {number} Tref  - Reference temperature [K], default 298.15
 * @returns {number} Acceleration factor (dimensionless)
 */
export function accelerationFactor(Ea, T, Tref = T_REF) {
    if (T <= 0 || Tref <= 0) throw new RangeError('Temperatures must be positive (Kelvin)');
    return Math.exp((Ea / R_GAS) * (1 / Tref - 1 / T));
}

/**
 * Convert Celsius to Kelvin
 * @param {number} celsius - Temperature in °C
 * @returns {number} Temperature in K
 */
export function celsiusToKelvin(celsius) {
    return celsius + 273.15;
}

/**
 * Generate Arrhenius curve data for plotting
 * @param {number} Ea   - Activation energy [J/mol]
 * @param {number} Tmin - Min temperature [°C]
 * @param {number} Tmax - Max temperature [°C]
 * @param {number} steps - Number of data points
 * @returns {{ temperatures: number[], factors: number[] }}
 */
export function arrheniusCurve(Ea, Tmin = -20, Tmax = 60, steps = 100) {
    const temperatures = [];
    const factors = [];
    const dt = (Tmax - Tmin) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const Tc = Tmin + i * dt;
        const Tk = celsiusToKelvin(Tc);
        temperatures.push(Tc);
        factors.push(accelerationFactor(Ea, Tk));
    }

    return { temperatures, factors };
}

/**
 * Compute ∂AF/∂T (sensitivity of acceleration factor to temperature)
 *
 *   ∂AF/∂T = AF(T) · Eₐ / (R·T²)
 *
 * @param {number} Ea - Activation energy [J/mol]
 * @param {number} T  - Absolute temperature [K]
 * @returns {number} Temperature sensitivity [1/K]
 */
export function temperatureSensitivity(Ea, T) {
    const af = accelerationFactor(Ea, T);
    return af * Ea / (R_GAS * T * T);
}
