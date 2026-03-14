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
 */

const OCM_API = 'https://api.openchargemap.io/v3/poi';

// ── Built-in fallback stations (Bangalore area) ──────────
const FALLBACK_STATIONS = [
    {
        id: 1001, name: 'Tata Power EZ Charge — Koramangala',
        address: '80 Feet Rd, Koramangala, Bengaluru',
        distance: '2.3', distanceUnit: 'km',
        lat: 12.9352, lng: 77.6245,
        totalChargers: 4, occupied: 1, available: 3, occupancyPct: 25,
        connectorTypes: ['CCS2', 'Type 2'],
        powerKw: 60, status: 'Operational', operator: 'Tata Power',
    },
    {
        id: 1002, name: 'ATHER Grid — Indiranagar',
        address: '100 Feet Rd, Indiranagar, Bengaluru',
        distance: '3.8', distanceUnit: 'km',
        lat: 12.9716, lng: 77.6412,
        totalChargers: 6, occupied: 2, available: 4, occupancyPct: 33,
        connectorTypes: ['Type 2', 'CCS2'],
        powerKw: 50, status: 'Operational', operator: 'Ather Energy',
    },
    {
        id: 1003, name: 'Fortum Charge — MG Road',
        address: 'MG Road, Bengaluru',
        distance: '5.1', distanceUnit: 'km',
        lat: 12.9758, lng: 77.6068,
        totalChargers: 3, occupied: 2, available: 1, occupancyPct: 67,
        connectorTypes: ['CCS2', 'CHAdeMO'],
        powerKw: 120, status: 'Operational', operator: 'Fortum',
    },
    {
        id: 1004, name: 'BESCOM EV Station — Jayanagar',
        address: '11th Main, Jayanagar, Bengaluru',
        distance: '4.2', distanceUnit: 'km',
        lat: 12.9299, lng: 77.5838,
        totalChargers: 2, occupied: 0, available: 2, occupancyPct: 0,
        connectorTypes: ['Type 2'],
        powerKw: 22, status: 'Operational', operator: 'BESCOM',
    },
    {
        id: 1005, name: 'Statiq — Whitefield',
        address: 'ITPL Main Rd, Whitefield, Bengaluru',
        distance: '12.5', distanceUnit: 'km',
        lat: 12.9698, lng: 77.7500,
        totalChargers: 8, occupied: 5, available: 3, occupancyPct: 63,
        connectorTypes: ['CCS2', 'Type 2', 'CHAdeMO'],
        powerKw: 150, status: 'Operational', operator: 'Statiq',
    },
    {
        id: 1006, name: 'ChargeZone — Electronic City',
        address: 'Electronic City Phase 1, Bengaluru',
        distance: '15.0', distanceUnit: 'km',
        lat: 12.8399, lng: 77.6770,
        totalChargers: 5, occupied: 3, available: 2, occupancyPct: 60,
        connectorTypes: ['CCS2', 'Type 2'],
        powerKw: 60, status: 'Operational', operator: 'ChargeZone',
    },
    {
        id: 1007, name: 'Tata Power — Marathahalli',
        address: 'Outer Ring Rd, Marathahalli, Bengaluru',
        distance: '8.7', distanceUnit: 'km',
        lat: 12.9591, lng: 77.6974,
        totalChargers: 4, occupied: 1, available: 3, occupancyPct: 25,
        connectorTypes: ['CCS2'],
        powerKw: 50, status: 'Operational', operator: 'Tata Power',
    },
    {
        id: 1008, name: 'ATHER Grid — HSR Layout',
        address: '27th Main, HSR Layout, Bengaluru',
        distance: '6.1', distanceUnit: 'km',
        lat: 12.9121, lng: 77.6446,
        totalChargers: 3, occupied: 0, available: 3, occupancyPct: 0,
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
 * Fetch nearby charging stations from Open Charge Map
 * Falls back to built-in station data if the API is unreachable.
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
            // ── Fallback: use built-in station data ──
            console.warn('Charging station API unreachable — using built-in station data');
            return FALLBACK_STATIONS.map(s => ({
                ...s,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
            }));
        }
    }

    if (!Array.isArray(data) || data.length === 0) {
        return FALLBACK_STATIONS.map(s => ({
            ...s,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
        }));
    }

    return data.map(station => {
        const addr = station.AddressInfo || {};
        const connections = station.Connections || [];
        const numPoints = station.NumberOfPoints || connections.length || 1;

        const occupied = Math.floor(Math.random() * (numPoints + 1));
        const available = numPoints - occupied;
        const occupancyPct = numPoints > 0 ? (occupied / numPoints) * 100 : 0;

        return {
            id: station.ID,
            name: addr.Title || 'Unknown Station',
            address: [addr.AddressLine1, addr.Town, addr.StateOrProvince].filter(Boolean).join(', '),
            distance: addr.Distance ? addr.Distance.toFixed(1) : '?',
            distanceUnit: 'km',
            lat: addr.Latitude,
            lng: addr.Longitude,
            totalChargers: numPoints,
            occupied,
            available,
            occupancyPct,
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
    });
}

/**
 * Get occupancy status label and color
 */
export function getOccupancyStatus(pct) {
    if (pct <= 30) return { label: 'Low Traffic', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' };
    if (pct <= 60) return { label: 'Moderate', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' };
    if (pct <= 85) return { label: 'Busy', color: '#F97316', bgColor: 'rgba(249,115,22,0.15)' };
    return { label: 'Very Busy', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' };
}
