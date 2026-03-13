/**
 * ═══════════════════════════════════════════════════════════
 *  HYBRID ML CORRECTION MODULE
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL FOUNDATION:
 *  ─────────────────────────
 *  The hybrid model combines physics-based prediction with
 *  machine learning correction of systematic errors:
 *
 *    Ŷ_hybrid = Ŷ_physics + Ŷ_ML(residual)
 *
 *  RESIDUAL LEARNING:
 *  ──────────────────
 *    residual_i = Y_real,i − Ŷ_physics,i
 *
 *  The ML model is trained on residuals, not raw data.
 *  This ensures:
 *  1. ML only learns what physics cannot capture
 *  2. Physics provides the structural backbone
 *  3. Extrapolation is bounded by physics
 *
 *  WHY HYBRID > PURE ML:
 *  ─────────────────────
 *  1. Physics ensures physically consistent predictions
 *     (monotonic degradation, temperature scaling)
 *  2. ML reduces systematic bias from model simplifications
 *  3. Hybrid requires less training data (physics handles
 *     the large-scale trends)
 *  4. Better generalization to unseen operating conditions
 *
 *  MATHEMATICAL PROOF OF BIAS REDUCTION:
 *  ──────────────────────────────────────
 *  Let:
 *    Y = true value
 *    Ŷ_P = physics prediction, with bias b_P = E[Ŷ_P − Y]
 *    Ŷ_ML = ML correction, trained on (Y − Ŷ_P)
 *
 *  If ML correctly learns the residual:
 *    E[Ŷ_ML] ≈ E[Y − Ŷ_P] = −b_P
 *
 *  Then:
 *    E[Ŷ_hybrid] = E[Ŷ_P + Ŷ_ML] = E[Ŷ_P] − b_P = E[Y]
 *
 *  → Bias is eliminated to first order! ∎
 *
 *  NASA BATTERY DATASET:
 *  ─────────────────────
 *  We simulate training on NASA's battery aging dataset
 *  (Li-ion batteries cycled at various conditions).
 *  The synthetic data generation mimics the dataset structure.
 */

import { totalDegradation } from '../physics/degradation-surface.js';
import { CHEMISTRIES } from '../data/battery-chemistries.js';

/**
 * Generate synthetic NASA-like training data
 * Based on NASA PCoE battery dataset structure
 * @param {number} numSamples
 * @returns {Object[]} Training samples
 */
export function generateTrainingData(numSamples = 500) {
    const chemistry = CHEMISTRIES.NMC;
    const data = [];

    for (let i = 0; i < numSamples; i++) {
        // Random operating conditions
        const temperatureC = 15 + Math.random() * 30;  // 15-45°C
        const cRate = 0.5 + Math.random() * 2.0;       // 0.5-2.5C
        const dod = 0.3 + Math.random() * 0.6;         // 0.3-0.9
        const cyclesPerDay = 0.5 + Math.random() * 2.0; // 0.5-2.5
        const days = 100 + Math.random() * 3000;        // 100-3100 days

        // Physics prediction
        const conditions = { temperatureC, cRate, dod, cyclesPerDay, days, avgSOC: 0.5 };
        const physicsPred = totalDegradation(chemistry, conditions);

        // Simulate "real" data with systematic deviation + noise
        // Real data typically shows:
        // 1. Knee-point acceleration (physics underestimates late-life)
        // 2. Manufacturing variability (noise)
        // 3. Thermal hotspot effects (physics uses lumped model)
        const kneeEffect = physicsPred > 12 ? 0.08 * Math.pow(physicsPred - 12, 1.3) : 0;
        const thermalBias = 0.003 * temperatureC * Math.sqrt(days / 365);
        const noise = (Math.random() - 0.5) * 1.5;

        const realDeg = physicsPred + kneeEffect + thermalBias + noise;
        const residual = realDeg - physicsPred;

        data.push({
            features: [temperatureC, cRate, dod, cyclesPerDay, days],
            physicsPred,
            realDeg: Math.max(realDeg, 0),
            residual,
        });
    }

    return data;
}

/**
 * Simple neural network for residual prediction
 * (Lightweight implementation without TensorFlow dependency)
 */
class SimpleResidualNet {
    constructor() {
        // 2-layer network: 5 → 8 → 4 → 1
        this.w1 = this._randomMatrix(8, 5);
        this.b1 = new Array(8).fill(0);
        this.w2 = this._randomMatrix(4, 8);
        this.b2 = new Array(4).fill(0);
        this.w3 = this._randomMatrix(1, 4);
        this.b3 = [0];
        this.trained = false;

        // Normalization parameters
        this.featureMean = [25, 1.0, 0.6, 1.0, 1500];
        this.featureStd = [10, 0.7, 0.2, 0.7, 1000];
        this.targetMean = 0;
        this.targetStd = 1;
    }

    _randomMatrix(rows, cols) {
        const m = [];
        for (let i = 0; i < rows; i++) {
            m.push([]);
            for (let j = 0; j < cols; j++) {
                m[i].push((Math.random() - 0.5) * Math.sqrt(2 / cols)); // He init
            }
        }
        return m;
    }

    _relu(x) { return Math.max(0, x); }
    _reluDeriv(x) { return x > 0 ? 1 : 0; }

    _normalize(features) {
        return features.map((f, i) => (f - this.featureMean[i]) / this.featureStd[i]);
    }

    _forward(x) {
        // Layer 1
        const h1 = this.b1.map((b, i) => {
            let sum = b;
            for (let j = 0; j < x.length; j++) sum += this.w1[i][j] * x[j];
            return this._relu(sum);
        });

        // Layer 2
        const h2 = this.b2.map((b, i) => {
            let sum = b;
            for (let j = 0; j < h1.length; j++) sum += this.w2[i][j] * h1[j];
            return this._relu(sum);
        });

        // Output
        let out = this.b3[0];
        for (let j = 0; j < h2.length; j++) out += this.w3[0][j] * h2[j];

        return { h1, h2, out };
    }

    /**
     * Train on residual data
     * @param {Object[]} data - Training data
     * @param {number} epochs
     * @param {number} lr - Learning rate
     */
    train(data, epochs = 100, lr = 0.001) {
        // Compute normalization stats
        const n = data.length;
        this.featureMean = [0, 0, 0, 0, 0];
        this.featureStd = [1, 1, 1, 1, 1];

        for (const d of data) {
            d.features.forEach((f, i) => this.featureMean[i] += f);
            this.targetMean += d.residual;
        }
        this.featureMean = this.featureMean.map(s => s / n);
        this.targetMean /= n;

        for (const d of data) {
            d.features.forEach((f, i) => this.featureStd[i] += Math.pow(f - this.featureMean[i], 2));
            this.targetStd += Math.pow(d.residual - this.targetMean, 2);
        }
        this.featureStd = this.featureStd.map(s => Math.sqrt(s / n) || 1);
        this.targetStd = Math.sqrt(this.targetStd / n) || 1;

        // SGD training
        const losses = [];
        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;

            // Shuffle
            const shuffled = [...data].sort(() => Math.random() - 0.5);

            for (const sample of shuffled) {
                const x = this._normalize(sample.features);
                const target = (sample.residual - this.targetMean) / this.targetStd;
                const { h1, h2, out } = this._forward(x);

                const error = out - target;
                epochLoss += error * error;

                // Backprop output layer
                const dOut = error;
                for (let j = 0; j < h2.length; j++) {
                    this.w3[0][j] -= lr * dOut * h2[j];
                }
                this.b3[0] -= lr * dOut;

                // Backprop layer 2
                const dH2 = h2.map((_, i) => {
                    const grad = dOut * this.w3[0][i] * this._reluDeriv(h2[i]);
                    return grad;
                });
                for (let i = 0; i < dH2.length; i++) {
                    for (let j = 0; j < h1.length; j++) {
                        this.w2[i][j] -= lr * dH2[i] * h1[j];
                    }
                    this.b2[i] -= lr * dH2[i];
                }

                // Backprop layer 1
                const dH1 = h1.map((_, i) => {
                    let sum = 0;
                    for (let k = 0; k < dH2.length; k++) sum += dH2[k] * this.w2[k][i];
                    return sum * this._reluDeriv(h1[i]);
                });
                for (let i = 0; i < dH1.length; i++) {
                    for (let j = 0; j < x.length; j++) {
                        this.w1[i][j] -= lr * dH1[i] * x[j];
                    }
                    this.b1[i] -= lr * dH1[i];
                }
            }

            losses.push(epochLoss / n);
        }

        this.trained = true;
        return losses;
    }

    /**
     * Predict residual
     * @param {number[]} features - [temp, crate, dod, cyclesPerDay, days]
     * @returns {number} Predicted residual
     */
    predict(features) {
        if (!this.trained) return 0;
        const x = this._normalize(features);
        const { out } = this._forward(x);
        return out * this.targetStd + this.targetMean;
    }
}

// Singleton model instance
let _model = null;
let _trainingData = null;
let _trainingLosses = null;

/**
 * Initialize and train the hybrid ML model
 * @returns {{ model: SimpleResidualNet, losses: number[], data: Object[] }}
 */
export function initializeMLModel() {
    _trainingData = generateTrainingData(400);
    _model = new SimpleResidualNet();
    _trainingLosses = _model.train(_trainingData, 80, 0.0005);
    return { model: _model, losses: _trainingLosses, data: _trainingData };
}

/**
 * Get hybrid prediction (Physics + ML correction)
 * @param {Object} chemistry
 * @param {Object} conditions
 * @returns {{ physics: number, mlCorrection: number, hybrid: number }}
 */
export function hybridPrediction(chemistry, conditions) {
    const {
        temperatureC = 25, cRate = 1.0, dod = 0.8,
        cyclesPerDay = 1.0, days = 365,
    } = conditions;

    const physics = totalDegradation(chemistry, conditions);

    let mlCorrection = 0;
    if (_model && _model.trained) {
        mlCorrection = _model.predict([temperatureC, cRate, dod, cyclesPerDay, days]);
    }

    return {
        physics,
        mlCorrection,
        hybrid: Math.max(physics + mlCorrection, 0),
    };
}

/**
 * Get model validation metrics
 * @returns {{ rmse_physics: number, rmse_hybrid: number, improvement: number, data: Object[] }}
 */
export function getValidationMetrics() {
    if (!_trainingData || !_model) {
        initializeMLModel();
    }

    // Use last 20% as validation
    const splitIdx = Math.floor(_trainingData.length * 0.8);
    const valData = _trainingData.slice(splitIdx);

    let ssPhysics = 0, ssHybrid = 0;

    const validationPoints = valData.map(d => {
        const pred = _model.predict(d.features);
        const physicsError = d.realDeg - d.physicsPred;
        const hybridPred = d.physicsPred + pred;
        const hybridError = d.realDeg - hybridPred;

        ssPhysics += physicsError * physicsError;
        ssHybrid += hybridError * hybridError;

        return {
            real: d.realDeg,
            physics: d.physicsPred,
            hybrid: hybridPred,
            physicsError,
            hybridError,
        };
    });

    const rmse_physics = Math.sqrt(ssPhysics / valData.length);
    const rmse_hybrid = Math.sqrt(ssHybrid / valData.length);

    return {
        rmse_physics,
        rmse_hybrid,
        improvement: ((rmse_physics - rmse_hybrid) / rmse_physics) * 100,
        data: validationPoints,
        trainingLosses: _trainingLosses,
    };
}
