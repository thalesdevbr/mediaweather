// Weather API Integration - WeatherAPI and Open-Meteo
// Provides real-time weather data for Rio de Janeiro coastal regions

// Coastal regions of Rio de Janeiro
const COASTAL_REGIONS = {
    'Ilha Grande': {
        latitude: -23.1611,
        longitude: -44.2030,
        region: 'Ilha Grande',
        zone: 'South Coast',
        activities: ['Beach', 'Diving', 'Snorkeling', 'Hiking'],
        description: 'Island paradise with pristine beaches and marine life'
    },
    'Zona Oeste': {
        latitude: -23.0265,
        longitude: -43.6253,
        region: 'Zona Oeste (West Zone)',
        zone: 'West Coast',
        activities: ['Surfing', 'Beach', 'Hiking', 'Water Sports'],
        description: 'West zone with great waves and beautiful beaches'
    },
    'Zona Sul': {
        latitude: -23.0285,
        longitude: -43.1961,
        region: 'Zona Sul (South Zone)',
        zone: 'South Coast',
        activities: ['Beach', 'Hiking', 'Climbing', 'Water Sports'],
        description: 'Iconic beaches and mountain trails near the city'
    },
    'Saquarema': {
        latitude: -22.9333,
        longitude: -42.5000,
        region: 'Saquarema',
        zone: 'Lakes Region',
        activities: ['Surfing', 'Windsurfing', 'Beach', 'Kitesurfing'],
        description: 'Known for ideal surfing conditions and lakes'
    },
    'Arraial do Cabo': {
        latitude: -22.9667,
        longitude: -42.0333,
        region: 'Arraial do Cabo',
        zone: 'East Coast',
        activities: ['Diving', 'Snorkeling', 'Beach', 'Boat Tours'],
        description: 'Crystal clear waters and underwater attractions'
    }
};

/**
 * Get coordinates for a specific region
 */
function getRegionCoordinates(region) {
    const regionData = COASTAL_REGIONS[region];
    if (!regionData) {
        throw new Error(`Region "${region}" not found. Available: ${Object.keys(COASTAL_REGIONS).join(', ')}`);
    }
    return regionData;
}

/**
 * Fetch weather data from Open-Meteo (free, no API key needed)
 */
async function fetchOpenMeteoData(region = 'Zona Sul') {
    try {
        const coordinates = getRegionCoordinates(region);
        
        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation',
            hourly: 'temperature_2m,precipitation_probability,weather_code',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code',
            timezone: 'America/Sao_Paulo'
        });

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`
        );
        
        if (!response.ok) throw new Error('Open-Meteo API error');
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching Open-Meteo data:', error);
        throw error;
    }
}

/**
 * Parse Open-Meteo data into standardized format
 */
function parseOpenMeteoData(data, region = 'Zona Sul') {
    const current = data.current;
    const regionData = getRegionCoordinates(region);
    
    return {
        source: 'open-meteo',
        current: {
            temperature: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            precipitation: current.precipitation,
            weatherCode: current.weather_code,
            time: current.time
        },
        hourly: data.hourly,
        daily: data.daily,
        location: {
            region: regionData.region,
            zone: regionData.zone,
            latitude: regionData.latitude,
            longitude: regionData.longitude,
            activities: regionData.activities,
            description: regionData.description
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Get weather data for a specific region
 */
async function getWeatherData(region = 'Zona Sul') {
    try {
        const meteoData = await fetchOpenMeteoData(region);
        const parsedData = parseOpenMeteoData(meteoData, region);
        return parsedData;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
    }
}

module.exports = {
    getWeatherData,
    fetchOpenMeteoData,
    parseOpenMeteoData,
    getRegionCoordinates,
    COASTAL_REGIONS
};
