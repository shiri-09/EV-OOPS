/**
 * ═══════════════════════════════════════════════════════════════
 *  EV OOPS — Main Application Controller
 *  Battery Longevity Intelligence Engine
 *  Premium 3D Scroll-Driven Architecture
 * ═══════════════════════════════════════════════════════════════
 */

// import Plotly from 'plotly.js-dist-min'; // Using CDN instead due to Vite bundle issues
import { CHEMISTRIES } from './data/battery-chemistries.js';
import { DAYS_PER_YEAR } from './data/constants.js';
import { sohTimeSeries, classifySOH, computeSOH, computeSOHDetailed } from './physics/soh-calculator.js';
import { degradationComponents } from './physics/degradation-surface.js';
import { fullLifespanAnalysis, lifespanYears } from './physics/lifespan-solver.js';
import { economicTimeSeries } from './physics/economic-model.js';
import { carbonImpact } from './physics/carbon-model.js';
import { runScenarioComparison } from './analysis/scenario-engine.js';
import { compareChemistries, climateSensitivityComparison, crateSensitivityComparison } from './analysis/chemistry-comparator.js';
import { fullSensitivityAnalysis, parameterSweep, tornadoChart } from './analysis/sensitivity.js';
import { NASA_DATASETS, NASA_COLORS, RESEARCH_PAPERS } from './data/nasa-datasets.js';
import { getUserLocation, fetchNearbyStations, getOccupancyStatus } from './data/charging-stations.js';

import { initScene } from './ui/scene-3d.js';
import { initSmoothScroll, initScrollAnimations, initScrollSpy } from './ui/animations.js';

// ── Plotly Theme (matches 3C Deep Teal) ───────────────────
const PLOTLY_LAYOUT = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif', color: '#7FAEA3', size: 12 },
    margin: { t: 30, r: 30, b: 50, l: 60 },
    xaxis: {
        type: 'linear',
        gridcolor: 'rgba(16,185,129,0.06)',
        zerolinecolor: 'rgba(16,185,129,0.1)',
        tickfont: { size: 11 },
    },
    yaxis: {
        type: 'linear',
        gridcolor: 'rgba(16,185,129,0.06)',
        zerolinecolor: 'rgba(16,185,129,0.1)',
        tickfont: { size: 11 },
    },
    legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 11, color: '#7FAEA3' } },
    hoverlabel: {
        bgcolor: '#0F2626',
        bordercolor: '#10B981',
        font: { family: 'Inter', color: '#E8F5F0', size: 13 },
    },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

// ── State ─────────────────────────────────────────────────
let currentChemistry = 'NMC';
let sensitivityRendered = false;

function getConditions() {
    return {
        temperatureC: parseFloat(document.getElementById('slider-temp').value),
        cRate: parseFloat(document.getElementById('slider-crate').value),
        dod: parseFloat(document.getElementById('slider-dod').value),
        cyclesPerDay: parseFloat(document.getElementById('slider-cycles').value),
        avgSOC: 0.5,
        days: parseFloat(document.getElementById('slider-years').value) * DAYS_PER_YEAR,
    };
}

function getChemistry() {
    return CHEMISTRIES[currentChemistry];
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function updateDashboard() {
    console.log("updateDashboard Executing!");
    try {
        const chem = getChemistry();
        const cond = getConditions();
        const analysis = fullLifespanAnalysis(chem, cond);

        const currentSOH = 100 - degradationComponents(chem, cond).total;
        const sohClamped = Math.max(currentSOH, 0).toFixed(1);
        const sohClass = classifySOH(currentSOH);

        document.getElementById('kpi-soh-value').textContent = `${sohClamped}%`;
        document.getElementById('kpi-soh-value').style.color = sohClass.color;
        document.getElementById('kpi-soh-status').textContent = sohClass.status;
        document.getElementById('kpi-soh-status').style.color = sohClass.color;

        const lyStr = analysis.lifespanYears === Infinity ? '20+' : analysis.lifespanYears.toFixed(1);
        document.getElementById('kpi-lifespan-value').textContent = lyStr;

        const dafStr = analysis.daf <= 0 ? '< 1.0×' : analysis.daf.toFixed(2) + '×';
        document.getElementById('kpi-daf-value').textContent = dafStr;
        document.getElementById('kpi-daf-status').textContent = analysis.risk.level;
        document.getElementById('kpi-daf-status').style.color = analysis.risk.color;

        document.getElementById('kpi-risk-value').textContent = analysis.risk.level;
        document.getElementById('kpi-risk-value').style.color = analysis.risk.color;
        document.getElementById('kpi-risk-desc').textContent = analysis.risk.description;

        const econ = economicTimeSeries(chem, cond, 60, parseFloat(document.getElementById('slider-years').value));
        const lastLoss = econ.loss[econ.loss.length - 1] || 0;
        document.getElementById('kpi-cost-value').textContent = '$' + Math.round(lastLoss).toLocaleString();

        const carbon = carbonImpact(chem, cond);
        document.getElementById('kpi-co2-value').textContent = Math.round(carbon.excessCO2) + ' kg';

        const recList = document.getElementById('recommendations-list');
        recList.innerHTML = '';
        analysis.recommendations.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            recList.appendChild(li);
        });

        renderSOHChart(chem, cond);
        renderBreakdownChart(chem, cond);
        renderEconomicChart(chem, cond);
    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}

function renderSOHChart(chem, cond) {
    const maxDays = parseFloat(document.getElementById('slider-years').value) * DAYS_PER_YEAR;
    const soh = sohTimeSeries(chem, cond, maxDays, 250);

    Plotly.react('chart-soh-main', [
        {
            x: soh.years, y: soh.soh, name: 'SOH',
            type: 'scatter', mode: 'lines',
            line: { color: '#10B981', width: 3 },
            fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.06)',
        },
        {
            x: [soh.years[0], soh.years[soh.years.length - 1]], y: [80, 80],
            name: 'EOL Threshold (80%)',
            type: 'scatter', mode: 'lines',
            line: { color: '#F43F5E', width: 2, dash: 'dash' },
        },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Years' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'SOH (%)', range: [50, 102], autorange: false, dtick: 10 },
        showlegend: true,
        legend: { ...PLOTLY_LAYOUT.legend, x: 0.02, y: 0.02, xanchor: 'left', yanchor: 'bottom' },
    }, PLOTLY_CONFIG);
}

function renderBreakdownChart(chem, cond) {
    const maxDays = parseFloat(document.getElementById('slider-years').value) * DAYS_PER_YEAR;
    const steps = 200;
    const dt = maxDays / (steps - 1);
    const years = [], cal = [], cyc = [], plate = [];

    for (let i = 0; i < steps; i++) {
        const t = i * dt;
        years.push(t / DAYS_PER_YEAR);
        const c = degradationComponents(chem, { ...cond, days: t });
        cal.push(c.calendar); cyc.push(c.cycle); plate.push(c.plating);
    }

    Plotly.react('chart-breakdown', [
        { x: years, y: cal, name: 'Calendar', stackgroup: 'one', line: { color: '#F59E0B' }, fillcolor: 'rgba(245,158,11,0.3)' },
        { x: years, y: cyc, name: 'Cycle', stackgroup: 'one', line: { color: '#2DD4BF' }, fillcolor: 'rgba(45,212,191,0.3)' },
        { x: years, y: plate, name: 'Li Plating', stackgroup: 'one', line: { color: '#F43F5E' }, fillcolor: 'rgba(244,63,94,0.3)' },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Years' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Capacity Loss (%)' },
        showlegend: true,
        legend: { ...PLOTLY_LAYOUT.legend, orientation: 'h', y: 1.12 },
    }, PLOTLY_CONFIG);
}

function renderEconomicChart(chem, cond) {
    const maxYears = parseFloat(document.getElementById('slider-years').value);
    const econ = economicTimeSeries(chem, cond, 60, maxYears, 150);

    Plotly.react('chart-economic', [
        {
            x: econ.years, y: econ.loss, name: 'Cumulative Loss ($)',
            type: 'scatter', mode: 'lines',
            line: { color: '#FB7185', width: 2.5 },
            fill: 'tozeroy', fillcolor: 'rgba(251,113,133,0.06)',
        },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Years' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Economic Loss ($)' },
        showlegend: false,
    }, PLOTLY_CONFIG);
}

// ═══════════════════════════════════════════════════════════
//  SCENARIOS
// ═══════════════════════════════════════════════════════════
function renderScenarios() {
    const chem = getChemistry();
    const results = runScenarioComparison(chem);
    const container = document.getElementById('scenario-grid');
    container.innerHTML = '';

    results.forEach(s => {
        const lyStr = s.analysis.lifespanYears === Infinity ? '20+' : s.analysis.lifespanYears.toFixed(1);
        const card = document.createElement('div');
        card.className = 'scenario-card';
        card.innerHTML = `
      <div class="sc-header">
        <span class="sc-icon">${s.icon}</span>
        <span class="sc-name">${s.name}</span>
      </div>
      <p class="sc-desc">${s.description}</p>
      <div class="sc-stats">
        <div class="sc-stat"><div class="sc-stat-label">Lifespan</div><div class="sc-stat-value">${lyStr} yr</div></div>
        <div class="sc-stat"><div class="sc-stat-label">Risk</div><div class="sc-stat-value" style="color:${s.analysis.risk.color}">${s.analysis.risk.level}</div></div>
        <div class="sc-stat"><div class="sc-stat-label">CO₂ Excess</div><div class="sc-stat-value">${Math.round(s.carbon.excessCO2)} kg</div></div>
        <div class="sc-stat"><div class="sc-stat-label">DAF</div><div class="sc-stat-value">${s.analysis.daf <= 0 ? '<1×' : s.analysis.daf.toFixed(1) + '×'}</div></div>
      </div>`;
        container.appendChild(card);
    });
}



// ═══════════════════════════════════════════════════════════
//  LIFESPAN FORECAST
// ═══════════════════════════════════════════════════════════
function runForecast() {
    const tempC = parseFloat(document.getElementById('ls-temp').value);
    const cRate = parseFloat(document.getElementById('ls-crate').value);
    const fastPct = parseFloat(document.getElementById('ls-fastpct').value) / 100;
    const dod = parseFloat(document.getElementById('ls-dod').value) / 100;
    const cycles = parseFloat(document.getElementById('ls-cycles').value);
    const chemId = document.getElementById('ls-chemistry').value;
    const chem = CHEMISTRIES[chemId];
    const effectiveCRate = cRate * fastPct + 0.3 * (1 - fastPct);

    const conditions = { temperatureC: tempC, cRate: effectiveCRate, dod, cyclesPerDay: cycles, avgSOC: 0.5 };
    const analysis = fullLifespanAnalysis(chem, conditions);

    const lyStr = analysis.lifespanYears === Infinity ? '20+' : analysis.lifespanYears.toFixed(1);
    document.getElementById('ls-result-years').textContent = lyStr;
    document.getElementById('ls-result-years').style.color = analysis.risk.color;
    document.getElementById('ls-result-year').textContent = analysis.yearToEOL || '—';
    document.getElementById('ls-result-daf').textContent = analysis.daf <= 0 ? '< 1.0×' : analysis.daf.toFixed(2) + '×';
    document.getElementById('ls-result-risk').textContent = analysis.risk.level;
    document.getElementById('ls-result-risk').style.color = analysis.risk.color;

    const tbody = document.getElementById('ls-milestones-body');
    tbody.innerHTML = '';
    analysis.milestones.forEach(m => {
        const cls = classifySOH(m.soh);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${m.year}</td><td style="color:${cls.color};font-weight:600">${m.soh.toFixed(1)}%</td><td style="color:${cls.color}">${cls.status}</td>`;
        tbody.appendChild(row);
    });

    const recList = document.getElementById('ls-recommendations');
    recList.innerHTML = '';
    analysis.recommendations.forEach(r => { const li = document.createElement('li'); li.textContent = r; recList.appendChild(li); });

    const maxDays = Math.min((analysis.lifespanYears === Infinity ? 20 : analysis.lifespanYears * 1.3), 20) * DAYS_PER_YEAR;
    const soh = sohTimeSeries(chem, conditions, maxDays, 250);

    const traces = [
        { x: soh.years, y: soh.soh, name: 'SOH Forecast', line: { color: '#10B981', width: 3, shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.05)' },
        { x: [0, soh.years[soh.years.length - 1]], y: [80, 80], name: '80% EOL', line: { color: '#F43F5E', width: 2, dash: 'dash' } },
    ];

    if (analysis.lifespanYears !== Infinity && analysis.lifespanYears <= 20) {
        traces.push({ x: [analysis.lifespanYears], y: [80], name: 'EOL Point', mode: 'markers', marker: { color: '#F43F5E', size: 12, symbol: 'x', line: { width: 2 } } });
    }

    Plotly.react('chart-lifespan', traces, {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Years' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'SOH (%)', range: [50, 102] },
        showlegend: true,
        legend: { ...PLOTLY_LAYOUT.legend, x: 0.02, y: 0.02, xanchor: 'left', yanchor: 'bottom' },
    }, PLOTLY_CONFIG);
}

// ═══════════════════════════════════════════════════════════
//  COMPARE
// ═══════════════════════════════════════════════════════════
function runComparison() {
    const chemA = CHEMISTRIES[document.getElementById('cmp-chem-a').value];
    const chemB = CHEMISTRIES[document.getElementById('cmp-chem-b').value];
    const cond = getConditions();
    const result = compareChemistries(chemA, chemB, cond);

    const lyA = result.chemA.analysis.lifespanYears === Infinity ? '20+' : result.chemA.analysis.lifespanYears.toFixed(1);
    const lyB = result.chemB.analysis.lifespanYears === Infinity ? '20+' : result.chemB.analysis.lifespanYears.toFixed(1);

    // Compute additional metrics for detailed comparison
    const carbonA = carbonImpact(chemA, cond);
    const carbonB = carbonImpact(chemB, cond);
    const maxYears = parseFloat(document.getElementById('slider-years').value);
    const econA = economicTimeSeries(chemA, cond, 60, maxYears);
    const econB = economicTimeSeries(chemB, cond, 60, maxYears);
    const lossA = econA.loss[econA.loss.length - 1] || 0;
    const lossB = econB.loss[econB.loss.length - 1] || 0;
    const sohAtEnd = (chem, c) => { const d = degradationComponents(chem, c); return Math.max(100 - d.total, 0).toFixed(1); };
    const sohAt5 = (chem, c) => { const d = degradationComponents(chem, { ...c, days: 5 * DAYS_PER_YEAR }); return Math.max(100 - d.total, 0).toFixed(1); };

    const winColor = result.winner === chemA.id ? '#F97316' : '#10B981';
    const diffStr = result.lifespanDifference === Infinity ? '—' : result.lifespanDifference.toFixed(1);

    document.getElementById('cmp-winner').innerHTML = `
      <h3 style="color:${winColor};font-size:1.4rem;margin-bottom:0.75rem;border:none;">🏆 ${result.winnerName} wins by ${diffStr} years</h3>
      <table class="data-table" style="margin-top:1rem;">
        <thead>
          <tr><th>Metric</th><th style="color:#F97316">${chemA.name}</th><th style="color:#10B981">${chemB.name}</th></tr>
        </thead>
        <tbody>
          <tr><td>Lifespan (years to 80%)</td><td style="font-weight:700;color:#F97316">${lyA}</td><td style="font-weight:700;color:#10B981">${lyB}</td></tr>
          <tr><td>SOH after 5 years</td><td>${sohAt5(chemA, cond)}%</td><td>${sohAt5(chemB, cond)}%</td></tr>
          <tr><td>SOH after ${maxYears} years</td><td>${sohAtEnd(chemA, cond)}%</td><td>${sohAtEnd(chemB, cond)}%</td></tr>
          <tr><td>Risk Level</td><td style="color:${result.chemA.analysis.risk.color}">${result.chemA.analysis.risk.level}</td><td style="color:${result.chemB.analysis.risk.color}">${result.chemB.analysis.risk.level}</td></tr>
          <tr><td>DAF</td><td>${result.chemA.analysis.daf <= 0 ? '<1×' : result.chemA.analysis.daf.toFixed(2) + '×'}</td><td>${result.chemB.analysis.daf <= 0 ? '<1×' : result.chemB.analysis.daf.toFixed(2) + '×'}</td></tr>
          <tr><td>Economic Loss (${maxYears}yr)</td><td>$${Math.round(lossA).toLocaleString()}</td><td>$${Math.round(lossB).toLocaleString()}</td></tr>
          <tr><td>CO₂ Excess</td><td>${Math.round(carbonA.excessCO2)} kg</td><td>${Math.round(carbonB.excessCO2)} kg</td></tr>
        </tbody>
      </table>`;

    const maxDays = parseFloat(document.getElementById('slider-years').value) * DAYS_PER_YEAR;
    const sohA = sohTimeSeries(chemA, cond, maxDays, 200);
    const sohB = sohTimeSeries(chemB, cond, maxDays, 200);

    // Clamp SOH values to valid range
    const clampSOH = arr => arr.map(v => Math.max(0, Math.min(100, v)));

    Plotly.react('chart-compare-soh', [
        { x: sohA.years, y: clampSOH(sohA.soh), name: chemA.name, type: 'scatter', mode: 'lines', line: { color: '#F97316', width: 3, shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(249,115,22,0.04)' },
        { x: sohB.years, y: clampSOH(sohB.soh), name: chemB.name, type: 'scatter', mode: 'lines', line: { color: '#10B981', width: 3, shape: 'spline' }, fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.04)' },
        { x: [0, sohA.years[sohA.years.length - 1]], y: [80, 80], name: '80% EOL', type: 'scatter', mode: 'lines', line: { color: '#F43F5E', dash: 'dash', width: 2 } },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Years', dtick: 1 },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'State of Health (%)', range: [50, 102], autorange: false, dtick: 10 },
        showlegend: true,
        legend: { ...PLOTLY_LAYOUT.legend, x: 0.02, y: 0.02, xanchor: 'left', yanchor: 'bottom' },
    }, PLOTLY_CONFIG);

    const climate = climateSensitivityComparison(chemA, chemB, cond);
    const capLife = v => v === Infinity ? 20 : Math.min(v, 20);
    Plotly.react('chart-compare-climate', [
        { x: climate.temps, y: climate.lifespanA.map(capLife), name: chemA.name, type: 'scatter', mode: 'lines', line: { color: '#F97316', width: 2.5 } },
        { x: climate.temps, y: climate.lifespanB.map(capLife), name: chemB.name, type: 'scatter', mode: 'lines', line: { color: '#10B981', width: 2.5 } },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Temperature (°C)' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Lifespan (years)', range: [0, 21], autorange: false },
        showlegend: true,
    }, PLOTLY_CONFIG);

    const crates = crateSensitivityComparison(chemA, chemB, cond);
    Plotly.react('chart-compare-crate', [
        { x: crates.crates, y: crates.lifespanA.map(capLife), name: chemA.name, type: 'scatter', mode: 'lines', line: { color: '#F97316', width: 2.5 } },
        { x: crates.crates, y: crates.lifespanB.map(capLife), name: chemB.name, type: 'scatter', mode: 'lines', line: { color: '#10B981', width: 2.5 } },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'C-Rate' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Lifespan (years)', range: [0, 21], autorange: false },
        showlegend: true,
    }, PLOTLY_CONFIG);
}


// ═══════════════════════════════════════════════════════════
//  SENSITIVITY
// ═══════════════════════════════════════════════════════════
function renderSensitivity() {
    if (sensitivityRendered) return;
    sensitivityRendered = true;

    const chem = getChemistry();
    const baseCond = { temperatureC: 25, cRate: 1.0, dod: 0.7, cyclesPerDay: 1.0, avgSOC: 0.5, days: 3650 };
    const tornado = tornadoChart(chem, baseCond);
    const barColors = ['#10B981', '#2DD4BF', '#F59E0B', '#F43F5E'];

    const indices = tornado.labels.map((_, i) => i);
    indices.sort((a, b) => Math.abs(tornado.high[b] - tornado.low[b]) - Math.abs(tornado.high[a] - tornado.low[a]));

    const capVal = v => (v === Infinity || v > 20) ? 20 : v;
    const sortedLabels = indices.map(i => tornado.labels[i]);
    const sortedLow = indices.map(i => tornado.low[i]);
    const sortedHigh = indices.map(i => tornado.high[i]);

    Plotly.react('chart-tornado', [
        { y: sortedLabels, x: sortedLow.map(capVal), name: 'Favorable', type: 'bar', orientation: 'h', marker: { color: 'rgba(16,185,129,0.7)' } },
        { y: sortedLabels, x: sortedHigh.map(capVal), name: 'Adverse', type: 'bar', orientation: 'h', marker: { color: 'rgba(244,63,94,0.7)' } },
        { y: sortedLabels, x: sortedLabels.map(() => capVal(tornado.base)), name: 'Baseline', mode: 'lines+markers', line: { color: '#F59E0B', width: 2 }, marker: { color: '#F59E0B', size: 8 } },
    ], { ...PLOTLY_LAYOUT, xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Lifespan (years)', type: 'linear', range: [0, 21], autorange: false, dtick: 5 }, yaxis: { ...PLOTLY_LAYOUT.yaxis, type: 'category' }, barmode: 'group', showlegend: true, legend: { ...PLOTLY_LAYOUT.legend, orientation: 'h', y: 1.15 } }, PLOTLY_CONFIG);

    const sweepConfigs = [
        { id: 'chart-sweep-temp', param: 'temperatureC', min: -10, max: 50, xLabel: 'Temperature (°C)' },
        { id: 'chart-sweep-crate', param: 'cRate', min: 0.2, max: 3.0, xLabel: 'C-Rate' },
        { id: 'chart-sweep-dod', param: 'dod', min: 0.2, max: 0.95, xLabel: 'Depth of Discharge' },
        { id: 'chart-sweep-cycles', param: 'cyclesPerDay', min: 0.2, max: 3.0, xLabel: 'Daily Cycles' },
    ];

    sweepConfigs.forEach((cfg, i) => {
        const sweep = parameterSweep(chem, baseCond, cfg.param, cfg.min, cfg.max, 40);
        const cappedLifespan = sweep.lifespan.map(v => v === Infinity ? 20 : Math.min(v, 20));
        Plotly.react(cfg.id, [
            { x: sweep.values, y: cappedLifespan, type: 'scatter', mode: 'lines', line: { color: barColors[i], width: 2.5 }, fill: 'tozeroy', fillcolor: `${barColors[i]}11` },
        ], { ...PLOTLY_LAYOUT, xaxis: { ...PLOTLY_LAYOUT.xaxis, title: cfg.xLabel }, yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Lifespan (years)', range: [0, 21], autorange: false, dtick: 5 }, showlegend: false }, PLOTLY_CONFIG);
    });

    const elasticities = fullSensitivityAnalysis(chem, baseCond);
    const tbody = document.getElementById('elasticity-body');
    tbody.innerHTML = '';
    elasticities.forEach((e, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>#${i + 1}</td><td>${e.label}</td><td style="color:${Math.abs(e.elasticity) > 0.5 ? '#F43F5E' : '#22C55E'}">${e.elasticity.toFixed(3)}</td><td>${e.elasticity > 0 ? '+' : ''}${(e.elasticity).toFixed(2)}% degradation per +1% ${e.label}</td>`;
        tbody.appendChild(row);
    });
}

// ═══════════════════════════════════════════════════════════
//  SLIDERS
// ═══════════════════════════════════════════════════════════
function initSliders() {
    const sliders = [
        { id: 'slider-temp', display: 'val-temp', suffix: '°C' },
        { id: 'slider-crate', display: 'val-crate', suffix: 'C' },
        { id: 'slider-dod', display: 'val-dod', suffix: '%', transform: v => (v * 100).toFixed(0) },
        { id: 'slider-cycles', display: 'val-cycles', suffix: '/day' },
        { id: 'slider-years', display: 'val-years', suffix: ' years' },
    ];

    sliders.forEach(s => {
        const el = document.getElementById(s.id);
        const disp = document.getElementById(s.display);
        const update = () => {
            const raw = parseFloat(el.value);
            disp.textContent = (s.transform ? s.transform(raw) : raw) + s.suffix;
        };
        update();
        el.addEventListener('input', () => { update(); debounceUpdate(); });
    });

    document.getElementById('select-chemistry').addEventListener('change', e => {
        currentChemistry = e.target.value;
        updateDashboard();
        renderScenarios();
    });
}

let _debounceTimer = null;
function debounceUpdate() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => updateDashboard(), 80);
}

// ═══════════════════════════════════════════════════════════
//  RESEARCH PAPERS
// ═══════════════════════════════════════════════════════════
function renderResearchPapers() {
    const container = document.getElementById('research-grid');
    if (!container) return;

    RESEARCH_PAPERS.forEach(paper => {
        const card = document.createElement('div');
        card.className = 'research-card glass-card';
        card.innerHTML = `
            <div class="research-card-header">
                <span class="research-badge" style="background:${paper.badgeColor}">${paper.badge}</span>
                <span class="research-year">${paper.year}</span>
            </div>
            <h3 class="research-title">${paper.title}</h3>
            <p class="research-authors">${paper.authors}</p>
            <p class="research-desc">${paper.description}</p>
            <div class="research-footer">
                <span class="research-source">${paper.source}</span>
                <a href="${paper.url}" target="_blank" rel="noopener" class="research-link">View Paper →</a>
            </div>
            <div class="research-datasets">
                ${paper.datasets.map(d => `<span class="dataset-tag">${d}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}



// ═══════════════════════════════════════════════════════════
//  CHARGING STATIONS
// ═══════════════════════════════════════════════════════════
let chargingMap = null;
let mapMarkers = [];

async function findAndRenderStations() {
    const statusEl = document.getElementById('charging-status');
    const locationEl = document.getElementById('charging-location');
    const gridEl = document.getElementById('stations-grid');
    const mapEl = document.getElementById('charging-map');
    const btn = document.getElementById('btn-find-stations');

    btn.disabled = true;
    btn.textContent = '⚡ Detecting location...';
    statusEl.innerHTML = '<span class="status-loading">⏳ Getting your location...</span>';
    gridEl.innerHTML = '';
    if (mapEl) mapEl.style.display = 'none';

    try {
        const { lat, lng } = await getUserLocation();
        locationEl.innerHTML = `<span class="location-icon">📍</span><span class="location-text">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</span>`;
        statusEl.innerHTML = '<span class="status-loading">⚡ Searching for nearby stations...</span>';
        btn.textContent = '⚡ Searching...';

        const stations = await fetchNearbyStations(lat, lng, 12, 25);

        if (stations.length === 0) {
            statusEl.innerHTML = '<span class="status-error">❌ No stations found within 25 km. Try a different location.</span>';
            btn.disabled = false;
            btn.textContent = '⚡ Find Nearby Stations';
            return;
        }

        statusEl.innerHTML = `<span class="status-success">✅ Found ${stations.length} stations nearby</span>`;
        if (mapEl) mapEl.style.display = 'block';

        if (window.L) {
            if (!chargingMap) {
                chargingMap = L.map('charging-map').setView([lat, lng], 13);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap &copy; CARTO',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(chargingMap);
            } else {
                chargingMap.setView([lat, lng], 13);
                mapMarkers.forEach(m => chargingMap.removeLayer(m));
                mapMarkers = [];
            }

            const userMarker = L.circleMarker([lat, lng], {
                radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, opacity: 1, fillOpacity: 1
            }).addTo(chargingMap);
            userMarker.bindPopup('<b>📍 Your Location</b>');
            mapMarkers.push(userMarker);

            // Adjust map view properly when container becomes visible
            setTimeout(() => chargingMap.invalidateSize(), 100);
        }

        stations.forEach(station => {
            const occ = getOccupancyStatus(station.occupancyPct);
            const card = document.createElement('div');
            card.className = 'station-card glass-card';
            card.innerHTML = `
                <div class="station-header">
                    <div class="station-name">⚡ ${station.name}</div>
                    <span class="station-distance">${station.distance} ${station.distanceUnit}</span>
                </div>
                <div class="station-address">${station.address}</div>
                <div class="station-operator">${station.operator}</div>
                <div class="station-occupancy">
                    <div class="occ-header">
                        <span class="occ-label">Occupancy <small style="opacity:0.6;font-weight:400">(Estimated)</small></span>
                        <span class="occ-status" style="color:${occ.color};background:${occ.bgColor}">${occ.label}</span>
                    </div>
                    <div class="occ-bar">
                        <div class="occ-fill" style="width:${station.occupancyPct}%;background:${occ.color}"></div>
                    </div>
                    <div class="occ-counts">
                        <span>🔌 ${station.available} available</span>
                        <span>👥 ${station.occupied} / ${station.totalChargers} in use</span>
                    </div>
                </div>
                <div class="station-connectors">
                    ${station.connectorTypes.map(c => `<span class="connector-tag">${c}</span>`).join('')}
                    ${station.powerKw > 0 ? `<span class="power-tag">⚡ ${station.powerKw} kW</span>` : ''}
                </div>
                <a href="${station.googleMapsUrl}" target="_blank" rel="noopener" class="station-directions">🗺️ Get Directions →</a>
            `;
            gridEl.appendChild(card);

            if (window.L && chargingMap) {
                const markerHtml = `<div style="background-color: ${occ.color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${occ.color};"></div>`;
                const customIcon = L.divIcon({
                    html: markerHtml, className: 'custom-station-icon', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8]
                });
                const stationMarker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(chargingMap);
                stationMarker.bindPopup(`
                    <h3>⚡ ${station.name}</h3>
                    <p style="margin:4px 0">${station.distance} ${station.distanceUnit}</p>
                    <p style="margin:4px 0;color:${occ.color}">${occ.label}</p>
                    <a href="${station.googleMapsUrl}" target="_blank" rel="noopener" style="color:#2dd4bf;display:inline-block;margin-top:6px;font-weight:500;">🗺️ Directions</a>
                `);
                mapMarkers.push(stationMarker);
            }
        });

    } catch (err) {
        statusEl.innerHTML = `<span class="status-error">❌ ${err.message || 'Could not get location. Please allow location access.'}</span>`;
    }

    btn.disabled = false;
    btn.textContent = '⚡ Find Nearby Stations';
}

// ═══════════════════════════════════════════════════════════
//  LIVE BATTERY MONITOR (Raspberry Pi Integration)
// ═══════════════════════════════════════════════════════════
const PI_URL = 'http://raspberrypi.local:5000'; // Change to your Pi's IP
let monitorInterval = null;
let piConnected = false;

function getMonitorChemistry() {
    const sel = document.getElementById('monitor-chemistry');
    return CHEMISTRIES[sel ? sel.value : 'NMC'];
}

function getTempColor(tempC) {
    if (tempC < 0) return '#3B82F6';
    if (tempC < 10) return '#60A5FA';
    if (tempC < 20) return '#2DD4BF';
    if (tempC <= 30) return '#10B981';
    if (tempC <= 40) return '#F59E0B';
    return '#EF4444';
}

function getTempStatus(tempC) {
    if (tempC < -10) return '❄️ Extreme cold — battery very stressed';
    if (tempC < 0) return '❄️ Sub-zero — plating risk high';
    if (tempC < 10) return '🥶 Cold — reduced performance';
    if (tempC < 20) return '🌤️ Cool — good conditions';
    if (tempC <= 30) return '✅ Optimal temperature range';
    if (tempC <= 40) return '🌡️ Warm — slight stress';
    if (tempC <= 50) return '🔥 Hot — accelerated aging';
    return '🔥 Extreme heat — critical!';
}

function simulateSensorData() {
    // Realistic simulation for demo when Pi is not connected
    const hour = new Date().getHours();
    const baseTemp = 25 + Math.sin(hour / 24 * Math.PI * 2) * 8; // Varies 17-33°C
    return {
        temperature: Math.round((baseTemp + (Math.random() - 0.5) * 2) * 10) / 10,
        voltage: Math.round((3.72 + (Math.random() - 0.5) * 0.3) * 100) / 100,
        current: Math.round((500 + Math.random() * 1500) * 10) / 10,
        soc: null, // Will be calculated from voltage
        batteryAgeDays: 730, // 2 years
        sensors: { ds18b20: false, ina219: false },
        status: 'simulated',
    };
}

async function fetchPiData() {
    try {
        const res = await fetch(`${PI_URL}/api/battery`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('Pi offline');
        piConnected = true;
        return await res.json();
    } catch {
        piConnected = false;
        return simulateSensorData();
    }
}

function updateMonitorUI(data) {
    const chem = getMonitorChemistry();
    const tempC = data.temperature;
    const voltage = data.voltage;
    const ageDays = data.batteryAgeDays || 730;
    const soc = data.soc || Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100));

    // Connection indicator
    const connEl = document.getElementById('conn-indicator');
    const connText = document.getElementById('conn-text');
    if (piConnected) {
        connEl.className = 'conn-indicator connected';
        connText.textContent = '🟢 Raspberry Pi Connected — Live Sensor Data';
    } else {
        connEl.className = 'conn-indicator simulated';
        connText.textContent = '🟡 Simulation Mode — Connect Pi for live data';
    }

    // Temperature
    document.getElementById('live-temp').textContent = tempC.toFixed(1) + '°C';
    document.getElementById('live-temp').style.color = getTempColor(tempC);
    document.getElementById('live-temp-status').textContent = getTempStatus(tempC);

    // Compute SOH using physics engine
    const conditions = {
        temperatureC: tempC,
        cRate: 1.0,
        dod: 0.8,
        cyclesPerDay: 1.0,
        avgSOC: 0.5,
        days: ageDays,
    };
    const sohDetail = computeSOHDetailed(chem, conditions);
    const status = classifySOH(sohDetail.soh);

    document.getElementById('live-soh').textContent = sohDetail.soh.toFixed(1) + '%';
    document.getElementById('live-soh').style.color = status.color;
    document.getElementById('live-soh-status').textContent = `${status.status} — ${status.description}`;

    // Lifetime
    const analysis = fullLifespanAnalysis(chem, conditions);
    const lifeYears = analysis.lifespanYears;
    const remaining = lifeYears === Infinity ? '20+' : Math.max(0, lifeYears - ageDays / 365.25).toFixed(1);
    document.getElementById('live-lifetime').textContent = lifeYears === Infinity ? '20+ yrs' : lifeYears.toFixed(1) + ' yrs';
    document.getElementById('live-lifetime-sub').textContent = `~${remaining} years remaining`;

    // Voltage & SOC
    document.getElementById('live-voltage').textContent = voltage.toFixed(2) + ' V';
    document.getElementById('live-soc-sub').textContent = `SOC: ${soc.toFixed(0)}%`;

    // Recommendations
    const recsEl = document.getElementById('live-recommendations');
    const recs = analysis.recommendations;
    recsEl.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
}

function renderTempRangeChart() {
    const chem = getMonitorChemistry();
    const temps = [];
    const lifespans = [];
    const sohValues = [];
    const colors = [];

    for (let t = -20; t <= 60; t += 5) {
        const cond = { temperatureC: t, cRate: 1.0, dod: 0.8, cyclesPerDay: 1.0, avgSOC: 0.5, days: 730 };
        const soh = computeSOH(chem, cond);
        const life = lifespanYears(chem, cond);

        temps.push(t);
        sohValues.push(soh);
        lifespans.push(life === Infinity ? 20 : life);
        colors.push(getTempColor(t));
    }

    Plotly.react('chart-temp-range', [
        {
            x: temps, y: lifespans,
            name: 'Battery Lifespan (yrs)',
            type: 'bar',
            marker: { color: colors, line: { width: 0 } },
            hovertemplate: '%{x}°C → %{y:.1f} years<extra></extra>',
        },
        {
            x: temps, y: sohValues,
            name: 'SOH after 2 years (%)',
            yaxis: 'y2',
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#2DD4BF', width: 2.5 },
            marker: { size: 5, color: '#2DD4BF' },
            hovertemplate: '%{x}°C → SOH: %{y:.1f}%<extra></extra>',
        },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Temperature (°C)', range: [-25, 65] },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Lifespan (years)', range: [0, 21], autorange: false },
        yaxis2: {
            title: 'SOH after 2 years (%)',
            overlaying: 'y', side: 'right',
            range: [50, 100], autorange: false,
            titlefont: { color: '#2DD4BF' },
            tickfont: { color: '#2DD4BF', size: 10 },
            gridcolor: 'rgba(45,212,191,0.1)',
        },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0)' },
    }, PLOTLY_CONFIG);
}

function initBatteryMonitor() {
    // Initial render
    renderTempRangeChart();

    // Start polling
    const poll = async () => {
        const data = await fetchPiData();
        updateMonitorUI(data);
    };
    poll();
    monitorInterval = setInterval(poll, 3000);

    // Update chart when chemistry changes
    document.getElementById('monitor-chemistry').addEventListener('change', () => {
        renderTempRangeChart();
        poll();
    });
}

// ═══════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════
function boot() {
    console.log("BOOT RUNNING");
    console.log("Is Plotly available?", typeof Plotly);
    const statusEl = document.getElementById('loader-status');

    statusEl.textContent = 'Initializing 3D scene...';
    setTimeout(() => statusEl.textContent = 'Loading physics engine...', 400);
    setTimeout(() => statusEl.textContent = 'Calibrating degradation models...', 800);
    setTimeout(() => statusEl.textContent = 'Computing baseline scenarios...', 1200);

    setTimeout(() => {
        // Init 3D scene
        initScene('bg-canvas');

        // Init smooth scroll
        initSmoothScroll();

        // Init sliders and buttons
        initSliders();
        document.getElementById('btn-forecast').addEventListener('click', runForecast);
        document.getElementById('btn-compare').addEventListener('click', runComparison);
        document.getElementById('btn-find-stations').addEventListener('click', findAndRenderStations);

        // Compute dashboard
        updateDashboard();
        renderScenarios();

        // Render sensitivity eagerly
        renderSensitivity();

        // Eagerly pre-populate forecast and comparison to avoid blank charts
        runForecast();
        runComparison();

        // Init live battery monitor
        initBatteryMonitor();

        // Hide loader
        statusEl.textContent = 'Ready.';
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');

            // Init scroll animations AFTER overlay hidden
            setTimeout(() => {
                initScrollAnimations();
                initScrollSpy();
            }, 300);
        }, 400);
    }, 1800);
}

document.addEventListener('DOMContentLoaded', boot);

// ═══════════════════════════════════════════════════════════
//  CUSTOM EV CURSOR SYSTEM
// ═══════════════════════════════════════════════════════════
(() => {
    const cursor = document.getElementById('ev-cursor');
    const trail = document.getElementById('ev-cursor-trail');
    if (!cursor || !trail) return;

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;
    let visible = false;

    // Track mouse position
    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!visible) {
            visible = true;
            cursor.classList.add('active');
            trail.classList.add('active');
        }
    });

    // Hide when mouse leaves window
    document.addEventListener('mouseleave', () => {
        visible = false;
        cursor.classList.remove('active');
        trail.classList.remove('active');
    });

    document.addEventListener('mouseenter', () => {
        visible = true;
        cursor.classList.add('active');
        trail.classList.add('active');
    });

    // Smooth animation loop
    function animateCursor() {
        // Car cursor follows immediately
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';

        // Trail follows with smooth delay (lerp)
        trailX += (mouseX - trailX) * 0.15;
        trailY += (mouseY - trailY) * 0.15;
        trail.style.left = trailX + 'px';
        trail.style.top = trailY + 'px';

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover detection for interactive elements
    const interactiveSelector = 'a, button, .primary-btn, .styled-select, .nav-link, .glass-card, .station-card, .research-card, .kpi-card, .scenario-card, .compare-card, input, select, [role="button"]';

    document.addEventListener('mouseover', e => {
        if (e.target.closest(interactiveSelector)) {
            cursor.classList.add('hovering');
            trail.classList.add('hovering');
        }
    });

    document.addEventListener('mouseout', e => {
        if (e.target.closest(interactiveSelector)) {
            cursor.classList.remove('hovering');
            trail.classList.remove('hovering');
        }
    });
})();
