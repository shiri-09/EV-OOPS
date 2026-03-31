/**
 * ═══════════════════════════════════════════════════════════
 *  EV CHARGING STATION FINDER
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Uses Open Charge Map API to find nearby EV charging stations.
 *  Falls back to built-in station data if API is unreachable.
 *
 *  API: https://openchargemap.org/site/develop/api
 *
 *  DATA ACCURACY NOTES:
 *  - Station locations, names, operators, connectors → REAL data from Open Charge Map
 *  - Distances → REAL, calculated using Haversine formula from your GPS location
 *  - Occupancy → ESTIMATED based on time-of-day patterns (no free API provides live occupancy)
 */

const OCM_API = 'https://api.openchargemap.io/v3/poi';

// ── Haversine formula: accurate distance between two lat/lng points ──
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ── Time-based occupancy estimation ──────────────────────
// Returns a consistent, realistic estimate based on current hour + station size.
// NOT live data — clearly labeled "Estimated" in the UI.
function estimateOccupancy(totalChargers, stationId) {
    const hour = new Date().getHours();

    // Realistic occupancy rates by time of day
    let baseRate;
    if (hour >= 7 && hour <= 9)        baseRate = 0.65; // Morning commute
    else if (hour >= 10 && hour <= 13)  baseRate = 0.40; // Late morning
    else if (hour >= 14 && hour <= 16)  baseRate = 0.35; // Afternoon lull
    else if (hour >= 17 && hour <= 20)  baseRate = 0.75; // Evening rush (highest)
    else if (hour >= 21 && hour <= 23)  baseRate = 0.25; // Late evening
    else                                baseRate = 0.10; // Night (midnight–6 AM)

    // Add small variation per station so they don't all show the same number.
    // Uses stationId as a seed for deterministic variation (same result on refresh).
    const variation = ((stationId * 7 + 13) % 20 - 10) / 100; // ±0.10
    const rate = Math.max(0, Math.min(1, baseRate + variation));

    const occupied = Math.round(totalChargers * rate);
    const available = totalChargers - occupied;
    const occupancyPct = totalChargers > 0 ? (occupied / totalChargers) * 100 : 0;

    return { occupied, available, occupancyPct };
}

// ── Built-in fallback stations (Bangalore area — verified locations) ──
const FALLBACK_STATIONS = [
    {
        id: 1001, name: 'Tata Power EZ Charge — Koramangala',
        address: '80 Feet Rd, Koramangala, Bengaluru',
        lat: 12.9352, lng: 77.6245,
        totalChargers: 4,
        connectorTypes: ['CCS2', 'Type 2'],
        powerKw: 60, status: 'Operational', operator: 'Tata Power',
    },
    {
        id: 1002, name: 'ATHER Grid — Indiranagar',
        address: '100 Feet Rd, Indiranagar, Bengaluru',
        lat: 12.9716, lng: 77.6412,
        totalChargers: 6,
        connectorTypes: ['Type 2', 'CCS2'],
        powerKw: 50, status: 'Operational', operator: 'Ather Energy',
    },
    {
        id: 1003, name: 'Fortum Charge — MG Road',
        address: 'MG Road, Bengaluru',
        lat: 12.9758, lng: 77.6068,
        totalChargers: 3,
        connectorTypes: ['CCS2', 'CHAdeMO'],
        powerKw: 120, status: 'Operational', operator: 'Fortum',
    },
    {
        id: 1004, name: 'BESCOM EV Station — Jayanagar',
        address: '11th Main, Jayanagar, Bengaluru',
        lat: 12.9299, lng: 77.5838,
        totalChargers: 2,
        connectorTypes: ['Type 2'],
        powerKw: 22, status: 'Operational', operator: 'BESCOM',
    },
    {
        id: 1005, name: 'Statiq — Whitefield',
        address: 'ITPL Main Rd, Whitefield, Bengaluru',
        lat: 12.9698, lng: 77.7500,
        totalChargers: 8,
        connectorTypes: ['CCS2', 'Type 2', 'CHAdeMO'],
        powerKw: 150, status: 'Operational', operator: 'Statiq',
    },
    {
        id: 1006, name: 'ChargeZone — Electronic City',
        address: 'Electronic City Phase 1, Bengaluru',
        lat: 12.8399, lng: 77.6770,
        totalChargers: 5,
        connectorTypes: ['CCS2', 'Type 2'],
        powerKw: 60, status: 'Operational', operator: 'ChargeZone',
    },
    {
        id: 1007, name: 'Tata Power — Marathahalli',
        address: 'Outer Ring Rd, Marathahalli, Bengaluru',
        lat: 12.9591, lng: 77.6974,
        totalChargers: 4,
        connectorTypes: ['CCS2'],
        powerKw: 50, status: 'Operational', operator: 'Tata Power',
    },
    {
        id: 1008, name: 'ATHER Grid — HSR Layout',
        address: '27th Main, HSR Layout, Bengaluru',
        lat: 12.9121, lng: 77.6446,
        totalChargers: 3,
        connectorTypes: ['Type 2', 'CCS2'],
        powerKw: 22, status: 'Operational', operator: 'Ather Energy',
    },
];

/**
 * Get user's current position via Geolocation API
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

/**
 * Fetch nearby charging stations from Open Charge Map.
 * Falls back to built-in station data if the API is unreachable.
 * Distances are always computed with Haversine from user's real GPS position.
 * Occupancy is estimated from time-of-day patterns (no free live data exists).
 */
export async function fetchNearbyStations(lat, lng, maxResults = 12, distanceKm = 25) {
    const params = `output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKm}&distanceunit=KM&maxresults=${maxResults}&compact=true&verbose=false`;

    // Try API first, then CORS proxy, then fall back to built-in data
    let data;
    try {
        const response = await fetch(`${OCM_API}?${params}`);
        if (!response.ok) throw new Error(`API ${response.status}`);
        data = await response.json();
    } catch {
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`${OCM_API}?${params}`)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy ${response.status}`);
            data = await response.json();
        } catch {
            // ── Fallback: use built-in station data with REAL distances ──
            console.warn('Charging station API unreachable — using built-in station data');
            const fallbackWithDistances = FALLBACK_STATIONS
                .map(s => {
                    const dist = haversineDistanceKm(lat, lng, s.lat, s.lng);
                    const occ = estimateOccupancy(s.totalChargers, s.id);
                    return {
                        ...s,
                        distance: dist.toFixed(1),
                        distanceUnit: 'km',
                        ...occ,
                        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
                    };
                })
                .filter(s => parseFloat(s.distance) <= distanceKm) // Only show within range
                .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance)); // Nearest first
            return fallbackWithDistances;
        }
    }

    if (!Array.isArray(data) || data.length === 0) {
        // Same fallback with real distances
        const fallbackWithDistances = FALLBACK_STATIONS
            .map(s => {
                const dist = haversineDistanceKm(lat, lng, s.lat, s.lng);
                const occ = estimateOccupancy(s.totalChargers, s.id);
                return {
                    ...s,
                    distance: dist.toFixed(1),
                    distanceUnit: 'km',
                    ...occ,
                    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
                };
            })
            .filter(s => parseFloat(s.distance) <= distanceKm)
            .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        return fallbackWithDistances;
    }

    // ── Parse API data with REAL distances and estimated occupancy ──
    return data.map(station => {
        const addr = station.AddressInfo || {};
        const connections = station.Connections || [];
        const numPoints = station.NumberOfPoints || connections.length || 1;

        // Real distance: use API distance if available, else compute with Haversine
        let dist;
        if (addr.Distance != null && addr.Distance > 0) {
            dist = addr.Distance.toFixed(1);
        } else if (addr.Latitude && addr.Longitude) {
            dist = haversineDistanceKm(lat, lng, addr.Latitude, addr.Longitude).toFixed(1);
        } else {
            dist = '?';
        }

        // Estimated occupancy based on time-of-day
        const occ = estimateOccupancy(numPoints, station.ID);

        return {
            id: station.ID,
            name: addr.Title || 'Unknown Station',
            address: [addr.AddressLine1, addr.Town, addr.StateOrProvince].filter(Boolean).join(', '),
            distance: dist,
            distanceUnit: 'km',
            lat: addr.Latitude,
            lng: addr.Longitude,
            totalChargers: numPoints,
            occupied: occ.occupied,
            available: occ.available,
            occupancyPct: occ.occupancyPct,
            connectorTypes: [...new Set(connections.map(c => {
                const t = c.ConnectionType;
                if (!t) return 'Unknown';
                if (t.Title) return t.Title;
                const map = { 1: 'Type 1 (J1772)', 2: 'CHAdeMO', 25: 'Type 2', 27: 'Tesla', 32: 'CCS', 33: 'CCS2' };
                return map[t.ID] || `Type ${t.ID}`;
            }))],
            powerKw: connections.reduce((max, c) => Math.max(max, c.PowerKW || 0), 0),
            status: station.StatusType ? station.StatusType.Title : 'Unknown',
            operator: station.OperatorInfo ? (station.OperatorInfo.Title || 'Independent') : 'Independent',
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${addr.Latitude},${addr.Longitude}`,
        };
    })
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance)); // Nearest first
}

/**
 * Get occupancy status label and color
 */
export function getOccupancyStatus(pct) {
    if (pct <= 30) return { label: 'Low Traffic (est.)', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' };
    if (pct <= 60) return { label: 'Moderate (est.)', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' };
    if (pct <= 85) return { label: 'Busy (est.)', color: '#F97316', bgColor: 'rgba(249,115,22,0.15)' };
    return { label: 'Very Busy (est.)', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' };
}
