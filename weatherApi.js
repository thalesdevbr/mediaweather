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
 * Supports up to 16 days forecast
 */
async function fetchOpenMeteoData(region = 'Zona Sul') {
    try {
        const coordinates = getRegionCoordinates(region);

        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,apparent_temperature',
            hourly: 'temperature_2m,precipitation_probability,weather_code,uv_index',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,uv_index_max',
            timezone: 'America/Sao_Paulo',
            forecast_days: 10
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
 * Fetch weather data from WeatherAPI (requires API key)
 * Supports up to 10 days forecast
 */
async function fetchWeatherApiData(region = 'Zona Sul') {
    try {
        const coordinates = getRegionCoordinates(region);
        const apiKey = process.env.WEATHERAPI_KEY || 'YOUR_API_KEY_HERE';

        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${coordinates.latitude},${coordinates.longitude}&days=10&aqi=no&alerts=no`
        );

        if (!response.ok) throw new Error('WeatherAPI API error');

        return await response.json();
    } catch (error) {
        console.error('Error fetching WeatherAPI data:', error);
        throw error;
    }
}

/**
 * Parse WeatherAPI data into standardized format
 */
function parseWeatherApiData(data, region = 'Zona Sul') {
    const location = data.location;
    const current = data.current;

    return {
        source: 'weatherapi',
        current: {
            temperature: current.temp_c,
            humidity: current.humidity,
            windSpeed: current.wind_kph / 3.6, // Convert to m/s
            windGusts: current.gust_kph ? current.gust_kph / 3.6 : null, // Convert to m/s
            apparentTemperature: current.feelslike_c,
            precipitation: current.precip_mm,
            weatherCode: current.condition.code,
            time: current.last_updated
        },
        daily: {
            time: data.forecast.forecastday.map(day => day.date),
            temperature_2m_max: data.forecast.forecastday.map(day => day.day.maxtemp_c),
            temperature_2m_min: data.forecast.forecastday.map(day => day.day.mintemp_c),
            precipitation_sum: data.forecast.forecastday.map(day => day.day.totalprecip_mm),
            wind_speed_10m_max: data.forecast.forecastday.map(day => day.day.maxwind_kph / 3.6),
            weather_code: data.forecast.forecastday.map(day => day.day.condition.code),
            uv_index_max: data.forecast.forecastday.map(day => day.day.uv_index)
        },
        location: {
            region: location.name || region,
            zone: location.region || '',
            latitude: location.lat,
            longitude: location.lon,
            activities: getRegionCoordinates(region).activities,
            description: getRegionCoordinates(region).description
        },
        timestamp: new Date().toISOString()
    };
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
            windGusts: current.wind_gusts_10m,
            apparentTemperature: current.apparent_temperature,
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
 * Calculate median between two arrays
 */
function medianOfArrays(arr1, arr2) {
    if (!arr1 || !arr2) return arr1 || arr2;
    return arr1.map((value, index) => (value + arr2[index]) / 2);
}

/**
 * Average weather data from both APIs
 */
function averageWeatherData(openMeteoData, weatherApiData) {
    const averaged = {
        source: 'averaged',
        current: {
            temperature: (openMeteoData.current.temperature + weatherApiData.current.temperature) / 2,
            humidity: (openMeteoData.current.humidity + weatherApiData.current.humidity) / 2,
            windSpeed: (openMeteoData.current.windSpeed + weatherApiData.current.windSpeed) / 2,
            windGusts: (openMeteoData.current.windGusts + weatherApiData.current.windGusts) / 2,
            apparentTemperature: (openMeteoData.current.apparentTemperature + weatherApiData.current.apparentTemperature) / 2,
            precipitation: (openMeteoData.current.precipitation + weatherApiData.current.precipitation) / 2,
            weatherCode: Math.round((openMeteoData.current.weatherCode + weatherApiData.current.weatherCode) / 2),
            time: openMeteoData.current.time
        },
        daily: {
            time: openMeteoData.daily.time,
            temperature_2m_max: medianOfArrays(openMeteoData.daily.temperature_2m_max, weatherApiData.daily.temperature_2m_max),
            temperature_2m_min: medianOfArrays(openMeteoData.daily.temperature_2m_min, weatherApiData.daily.temperature_2m_min),
            precipitation_sum: medianOfArrays(openMeteoData.daily.precipitation_sum, weatherApiData.daily.precipitation_sum),
            wind_speed_10m_max: medianOfArrays(openMeteoData.daily.wind_speed_10m_max, weatherApiData.daily.wind_speed_10m_max),
            weather_code: openMeteoData.daily.weather_code.map((code, index) => Math.round((code + weatherApiData.daily.weather_code[index]) / 2)),
            uv_index_max: medianOfArrays(openMeteoData.daily.uv_index_max, weatherApiData.daily.uv_index_max)
        },
        location: openMeteoData.location,
        timestamp: new Date().toISOString()
    };

    return averaged;
}

/**
 * Get weather data for a specific region
 */
async function getWeatherData(region = 'Zona Sul') {
    try {
        const meteoData = await fetchOpenMeteoData(region);
        const parsedOpenMeteoData = parseOpenMeteoData(meteoData, region);

        // Only fetch WeatherAPI if API key is configured
        if (process.env.WEATHERAPI_KEY) {
            const weatherApiRawData = await fetchWeatherApiData(region);
            const parsedWeatherApiData = parseWeatherApiData(weatherApiRawData, region);
            return averageWeatherData(parsedOpenMeteoData, parsedWeatherApiData);
        }

        return parsedOpenMeteoData;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
    }
}

module.exports = {
    getWeatherData,
    fetchOpenMeteoData,
    fetchWeatherApiData,
    parseOpenMeteoData,
    parseWeatherApiData,
    averageWeatherData,
    getRegionCoordinates,
    COASTAL_REGIONS
};
