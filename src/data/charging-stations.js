/**
 * ═══════════════════════════════════════════════════════════
 *  EV CHARGING STATION FINDER
 *  EV OOPS — Battery Longevity Intelligence Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Uses Open Charge Map API to find nearby EV charging stations.
 *  Adds simulated real-time occupancy data for demonstration.
 *
 *  API: https://openchargemap.org/site/develop/api
 */

const OCM_API = 'https://api.openchargemap.io/v3/poi';

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
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxResults - Max stations to return
 * @param {number} distanceKm - Search radius in km
 * @returns {Promise<Array>} Processed station objects
 */
export async function fetchNearbyStations(lat, lng, maxResults = 12, distanceKm = 25) {
    const params = `output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKm}&distanceunit=KM&maxresults=${maxResults}&compact=true&verbose=false`;

    let data;
    // Try direct API call first
    try {
        const response = await fetch(`${OCM_API}?${params}`);
        if (!response.ok) throw new Error(`API ${response.status}`);
        data = await response.json();
    } catch {
        // Fallback: try via CORS proxy
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`${OCM_API}?${params}`)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy ${response.status}`);
            data = await response.json();
        } catch {
            throw new Error('Could not reach charging station API. Check your internet connection.');
        }
    }

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    return data.map(station => {
        const addr = station.AddressInfo || {};
        const connections = station.Connections || [];
        const numPoints = station.NumberOfPoints || connections.length || 1;

        // Simulate occupancy (since real-time data isn't publicly available)
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
                // Map common IDs
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
 * @param {number} pct - Occupancy percentage
 * @returns {{label: string, color: string, bgColor: string}}
 */
export function getOccupancyStatus(pct) {
    if (pct <= 30) return { label: 'Low Traffic', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' };
    if (pct <= 60) return { label: 'Moderate', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' };
    if (pct <= 85) return { label: 'Busy', color: '#F97316', bgColor: 'rgba(249,115,22,0.15)' };
    return { label: 'Very Busy', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' };
}
