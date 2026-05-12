// Weather API Integration - WeatherAPI and Open-Meteo
// Provides real-time weather data for Rio de Janeiro

const RIO_COORDINATES = {
    latitude: -22.9068,
    longitude: -43.1729,
    city: 'Rio de Janeiro'
};

/**
 * Fetch weather data from Open-Meteo (free, no API key needed)
 */
async function fetchOpenMeteoData() {
    try {
        const params = new URLSearchParams({
            latitude: RIO_COORDINATES.latitude,
            longitude: RIO_COORDINATES.longitude,
            current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation',
            hourly: 'temperature_2m,precipitation_probability,weather_code',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
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
function parseOpenMeteoData(data) {
    const current = data.current;
    
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
            city: RIO_COORDINATES.city,
            latitude: RIO_COORDINATES.latitude,
            longitude: RIO_COORDINATES.longitude
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Get weather data for Rio de Janeiro
 */
async function getWeatherData() {
    try {
        const meteoData = await fetchOpenMeteoData();
        const parsedData = parseOpenMeteoData(meteoData);
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
    RIO_COORDINATES
};
