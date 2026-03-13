/**
 * ═══════════════════════════════════════════════════════════
 *  BATTERY CHEMISTRY PROFILES
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  6 chemistry profiles with calibrated parameters for:
 *  - Arrhenius kinetics (NASA PCoE validated)
 *  - SEI growth
 *  - Cycle aging
 *  - Lithium plating susceptibility
 *  - Internal resistance evolution
 *  - Economic & environmental data
 *
 *  References:
 *  - NASA PCoE Battery Dataset (Saha & Goebel, 2007)
 *  - Fricke et al., "Accelerated Life Testing Dataset", NASA TRS, 2023
 *  - Birkl et al., "Degradation diagnostics for Li-ion cells", J. Power Sources, 2017
 *  - Xu et al., "Modeling the effect of two-stage fast charging", J. Energy Storage, 2022
 */

export const CHEMISTRIES = {
    NMC: {
        id: 'NMC',
        name: 'NMC (Nickel Manganese Cobalt)',
        fullName: 'LiNi₀.₆Mn₀.₂Co₀.₂O₂',
        description: 'High energy density, widely used in premium EVs (BMW i4, VW ID.4). Higher degradation sensitivity to temperature and fast charging.',
        usedIn: 'BMW i4, VW ID.4, Hyundai Ioniq 5',

        // ── Electrochemical Parameters ──
        nominalVoltage: 3.7,          // V
        specificEnergy: 250,          // Wh/kg
        specificPower: 680,           // W/kg
        cycleLife: 1500,              // cycles at 1C, 25°C, 80% DoD
        ratedCapacity: 60,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 24500,         // J/mol — NASA PCoE validated
            Ea_cycle: 31700,            // J/mol
            A_calendar: 7.543e3,        // pre-exponential
            A_cycle: 3.152e-4,          // pre-exponential
        },
        sei: {
            alpha: 0.033,               // %/√day
            Ea: 28000,                  // J/mol
        },
        plating: {
            beta: 0.015,
            Ea: 35000,                  // J/mol
            crateThreshold: 1.5,        // C
            tempThreshold: 283.15,      // K (10°C)
        },
        resistance: {
            R0: 0.050,                  // Ω
            kR: 2.1e-5,                 // Ω/day
        },
        dodStress: {
            kappa: 1.5,                 // DoD exponent
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0041,             // %/day^0.5 at reference T
            sodependence: 0.6,          // SOC-dependence factor
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.012,              // %/EFC at reference conditions
            crateSensitivity: 1.4,     // C-rate exponent
        },

        // ── Economic ──
        costPerKwh: 152,             // $/kWh
        recycleCost: 18,             // $/kWh
        co2Manufacturing: 73,        // kg CO₂/kWh

        // ── Visual ──
        color: '#ff6b6b',
        colorLight: '#ff8e8e',
        gradient: ['#ff6b6b', '#ee5a24'],
    },

    LFP: {
        id: 'LFP',
        name: 'LFP (Lithium Iron Phosphate)',
        fullName: 'LiFePO₄',
        description: 'Superior cycle life and thermal stability. Lower energy density but significantly longer lifespan. Preferred for fleet and budget EVs.',
        usedIn: 'Tesla Model 3 SR, BYD Blade, Rivian (fleet)',

        // ── Electrochemical Parameters ──
        nominalVoltage: 3.2,          // V
        specificEnergy: 170,          // Wh/kg
        specificPower: 520,           // W/kg
        cycleLife: 3500,              // cycles at 1C, 25°C, 80% DoD
        ratedCapacity: 60,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 22000,         // J/mol — lower sensitivity
            Ea_cycle: 28500,            // J/mol
            A_calendar: 4.321e3,
            A_cycle: 1.876e-4,
        },
        sei: {
            alpha: 0.018,               // %/√day — thinner SEI
            Ea: 25000,                  // J/mol
        },
        plating: {
            beta: 0.008,                // Lower plating susceptibility
            Ea: 33000,                  // J/mol
            crateThreshold: 2.0,        // C — higher tolerance
            tempThreshold: 278.15,      // K (5°C) — more resilient
        },
        resistance: {
            R0: 0.040,                  // Ω — lower initial
            kR: 1.4e-5,                 // Ω/day — slower growth
        },
        dodStress: {
            kappa: 1.2,                 // Lower DoD sensitivity
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0024,             // %/day^0.5 — slower
            sodependence: 0.35,
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.006,              // %/EFC — significantly lower
            crateSensitivity: 1.1,     // Less C-rate sensitive
        },

        // ── Economic ──
        costPerKwh: 98,              // $/kWh — cheaper
        recycleCost: 12,             // $/kWh
        co2Manufacturing: 58,        // kg CO₂/kWh — lower

        // ── Visual ──
        color: '#51cf66',
        colorLight: '#69db7c',
        gradient: ['#51cf66', '#2ecc71'],
    },

    NCA: {
        id: 'NCA',
        name: 'NCA (Nickel Cobalt Aluminium)',
        fullName: 'LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂',
        description: 'Highest energy density among commercial chemistries. Used by Tesla for long-range vehicles. Moderate cycle life with excellent power output.',
        usedIn: 'Tesla Model S/X, Panasonic 2170/4680',

        // ── Electrochemical Parameters ──
        nominalVoltage: 3.65,         // V
        specificEnergy: 280,          // Wh/kg — highest
        specificPower: 720,           // W/kg
        cycleLife: 1200,              // cycles at 1C, 25°C, 80% DoD
        ratedCapacity: 75,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 26000,         // J/mol — more temp sensitive
            Ea_cycle: 33000,            // J/mol
            A_calendar: 8.9e3,
            A_cycle: 3.8e-4,
        },
        sei: {
            alpha: 0.038,               // %/√day — faster SEI growth
            Ea: 29000,                  // J/mol
        },
        plating: {
            beta: 0.018,                // Higher plating risk
            Ea: 34500,                  // J/mol
            crateThreshold: 1.3,        // C — lower threshold
            tempThreshold: 285.15,      // K (12°C)
        },
        resistance: {
            R0: 0.055,                  // Ω
            kR: 2.5e-5,                 // Ω/day — faster growth
        },
        dodStress: {
            kappa: 1.6,                 // Higher DoD sensitivity
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0048,             // %/day^0.5
            sodependence: 0.65,
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.015,              // %/EFC — higher
            crateSensitivity: 1.55,    // More C-rate sensitive
        },

        // ── Economic ──
        costPerKwh: 165,             // $/kWh — premium
        recycleCost: 22,             // $/kWh
        co2Manufacturing: 82,        // kg CO₂/kWh

        // ── Visual ──
        color: '#F59E0B',
        colorLight: '#FBBF24',
        gradient: ['#F59E0B', '#D97706'],
    },

    LTO: {
        id: 'LTO',
        name: 'LTO (Lithium Titanate)',
        fullName: 'Li₄Ti₅O₁₂',
        description: 'Extreme cycle life (20,000+) and fastest charging capability. Lower energy density but virtually zero lithium plating risk. Ideal for buses and grid storage.',
        usedIn: 'Toshiba SCiB, Microvast, Electric Buses',

        // ── Electrochemical Parameters ──
        nominalVoltage: 2.4,          // V — lower
        specificEnergy: 80,           // Wh/kg — lowest
        specificPower: 900,           // W/kg — highest power
        cycleLife: 20000,             // cycles — extreme
        ratedCapacity: 40,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 18000,         // J/mol — very low sensitivity
            Ea_cycle: 22000,            // J/mol
            A_calendar: 2.1e3,
            A_cycle: 0.8e-4,
        },
        sei: {
            alpha: 0.008,               // %/√day — minimal SEI
            Ea: 21000,                  // J/mol
        },
        plating: {
            beta: 0.001,                // Near-zero plating risk
            Ea: 40000,                  // J/mol
            crateThreshold: 5.0,        // C — can handle extreme rates
            tempThreshold: 263.15,      // K (−10°C) — works in cold
        },
        resistance: {
            R0: 0.035,                  // Ω — very low
            kR: 0.5e-5,                 // Ω/day — minimal growth
        },
        dodStress: {
            kappa: 0.9,                 // Very low DoD sensitivity
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0010,             // %/day^0.5 — extremely slow
            sodependence: 0.15,
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.002,              // %/EFC — lowest
            crateSensitivity: 0.7,     // Minimal C-rate sensitivity
        },

        // ── Economic ──
        costPerKwh: 280,             // $/kWh — expensive
        recycleCost: 25,             // $/kWh
        co2Manufacturing: 95,        // kg CO₂/kWh

        // ── Visual ──
        color: '#845EF7',
        colorLight: '#9775FA',
        gradient: ['#845EF7', '#7048E8'],
    },

    LMO: {
        id: 'LMO',
        name: 'LMO (Lithium Manganese Oxide)',
        fullName: 'LiMn₂O₄ (Spinel)',
        description: 'Good power delivery and thermal stability. Used in Nissan Leaf Gen 1. Lower cost but moderate cycle life. Often blended with NMC.',
        usedIn: 'Nissan Leaf (Gen 1), Chevrolet Volt, e-bikes',

        // ── Electrochemical Parameters ──
        nominalVoltage: 3.7,          // V
        specificEnergy: 150,          // Wh/kg
        specificPower: 800,           // W/kg — good power
        cycleLife: 1000,              // cycles — moderate
        ratedCapacity: 40,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 27000,         // J/mol — high temp sensitivity
            Ea_cycle: 34000,            // J/mol
            A_calendar: 1.05e4,
            A_cycle: 4.2e-4,
        },
        sei: {
            alpha: 0.030,               // %/√day
            Ea: 27000,                  // J/mol
        },
        plating: {
            beta: 0.012,
            Ea: 34000,                  // J/mol
            crateThreshold: 1.8,        // C
            tempThreshold: 283.15,      // K (10°C)
        },
        resistance: {
            R0: 0.048,                  // Ω
            kR: 2.8e-5,                 // Ω/day — faster
        },
        dodStress: {
            kappa: 1.7,                 // High DoD sensitivity
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0052,             // %/day^0.5 — faster aging
            sodependence: 0.7,
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.018,              // %/EFC — higher
            crateSensitivity: 1.3,
        },

        // ── Economic ──
        costPerKwh: 110,             // $/kWh — affordable
        recycleCost: 10,             // $/kWh
        co2Manufacturing: 62,        // kg CO₂/kWh

        // ── Visual ──
        color: '#FF6B9D',
        colorLight: '#FF85B1',
        gradient: ['#FF6B9D', '#E05280'],
    },

    'Na-Ion': {
        id: 'Na-Ion',
        name: 'Na-Ion (Sodium-Ion)',
        fullName: 'Na₂Fe₂(SO₄)₃ / Hard Carbon',
        description: 'Zero lithium, ultra-low cost, abundant materials. Emerging technology for budget EVs and stationary storage. Lower energy density but excellent cold-weather performance.',
        usedIn: 'CATL Chery iCar, HiNa Battery, BYD Seagull (planned)',

        // ── Electrochemical Parameters ──
        nominalVoltage: 3.1,          // V
        specificEnergy: 140,          // Wh/kg — lower
        specificPower: 450,           // W/kg
        cycleLife: 2500,              // cycles — decent
        ratedCapacity: 45,            // kWh (pack level)

        // ── Degradation Model Parameters ──
        arrhenius: {
            Ea_calendar: 20000,         // J/mol
            Ea_cycle: 26000,            // J/mol
            A_calendar: 3.5e3,
            A_cycle: 1.5e-4,
        },
        sei: {
            alpha: 0.022,               // %/√day — moderate SEI
            Ea: 23000,                  // J/mol
        },
        plating: {
            beta: 0.005,                // Low plating risk (Na dendrites less likely)
            Ea: 30000,                  // J/mol
            crateThreshold: 2.5,        // C
            tempThreshold: 253.15,      // K (−20°C) — excellent cold performance
        },
        resistance: {
            R0: 0.060,                  // Ω — higher initial
            kR: 1.8e-5,                 // Ω/day
        },
        dodStress: {
            kappa: 1.1,                 // Low DoD sensitivity
        },

        // ── Calendar Aging ──
        calendarAging: {
            k_ref: 0.0028,             // %/day^0.5
            sodependence: 0.30,
        },

        // ── Cycle Aging ──
        cycleAging: {
            k_ref: 0.008,              // %/EFC
            crateSensitivity: 1.0,     // Low sensitivity
        },

        // ── Economic ──
        costPerKwh: 65,              // $/kWh — cheapest
        recycleCost: 8,              // $/kWh
        co2Manufacturing: 42,        // kg CO₂/kWh — lowest

        // ── Visual ──
        color: '#20C997',
        colorLight: '#38D9A9',
        gradient: ['#20C997', '#12B886'],
    },
};

/**
 * Create a custom battery chemistry profile
 * @param {Object} overrides - Parameter overrides
 * @returns {Object} Complete chemistry profile
 */
export function createCustomChemistry(overrides = {}) {
    const base = {
        id: 'CUSTOM',
        name: 'Custom Chemistry',
        fullName: 'User-Defined',
        description: 'Custom battery chemistry with user-specified parameters.',
        usedIn: 'User-defined application',
        nominalVoltage: 3.5,
        specificEnergy: 200,
        specificPower: 600,
        cycleLife: 2000,
        ratedCapacity: 60,
        arrhenius: {
            Ea_calendar: 23000,
            Ea_cycle: 30000,
            A_calendar: 5.5e3,
            A_cycle: 2.5e-4,
        },
        sei: { alpha: 0.025, Ea: 26500 },
        plating: { beta: 0.012, Ea: 34000, crateThreshold: 1.7, tempThreshold: 280.15 },
        resistance: { R0: 0.045, kR: 1.8e-5 },
        dodStress: { kappa: 1.35 },
        calendarAging: { k_ref: 0.0032, sodependence: 0.48 },
        cycleAging: { k_ref: 0.009, crateSensitivity: 1.25 },
        costPerKwh: 125,
        recycleCost: 15,
        co2Manufacturing: 65,
        color: '#ffd43b',
        colorLight: '#ffe066',
        gradient: ['#ffd43b', '#fab005'],
    };

    return { ...base, ...overrides };
}

export default CHEMISTRIES;
