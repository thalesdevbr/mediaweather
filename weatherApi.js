require('dotenv').config();

const fetch = global.fetch || require('node-fetch');
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
const WEATHERAPI_BASE_URL = process.env.WEATHERAPI_BASE_URL || 'https://api.weatherapi.com/v1';

const COASTAL_REGIONS = {
    'Rio de Janeiro': {
        latitude: -22.9068,
        longitude: -43.1729,
        region: 'Rio de Janeiro',
        zone: 'South Coast',
        activities: ['Beach', 'Hiking', 'Water Sports'],
        description: 'City beaches and iconic coastal neighborhoods'
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

function getRegionCoordinates(region) {
    const regionData = COASTAL_REGIONS[region];
    if (!regionData) {
        throw new Error(`Region "${region}" not found. Available: ${Object.keys(COASTAL_REGIONS).join(', ')}`);
    }
    return regionData;
}

/**
 * Get weather description from WMO weather code
 */
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy with rime',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown';
}

async function fetchOpenMeteoData(region = 'Rio de Janeiro') {
    try {
        const coordinates = getRegionCoordinates(region);
        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            current_weather: 'true',
            hourly: 'temperature_2m,relativehumidity_2m,precipitation,precipitation_probability,weathercode,wind_speed_10m,wind_gusts_10m,uv_index',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode,uv_index_max',
            timezone: 'America/Sao_Paulo'
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching Open-Meteo data:', error);
        throw error;
    }
}

function parseOpenMeteoData(data, region = 'Rio de Janeiro') {
    const regionData = getRegionCoordinates(region);
    const currentWeather = data.current_weather || {};
    const hourly = data.hourly || {};
    const currentIndex = Array.isArray(hourly.time)
        ? hourly.time.findIndex(time => time === currentWeather.time)
        : -1;

    return {
        source: 'open-meteo',
        current: {
            temperature: currentWeather.temperature ?? null,
            humidity: currentIndex >= 0 ? hourly.relativehumidity_2m?.[currentIndex] ?? null : null,
            windSpeed: currentWeather.windspeed ?? null,
            windGusts: currentIndex >= 0 ? hourly.wind_gusts_10m?.[currentIndex] ?? null : null,
            apparentTemperature: currentIndex >= 0 ? hourly.temperature_2m?.[currentIndex] ?? null : currentWeather.temperature ?? null,
            precipitation: currentIndex >= 0 ? hourly.precipitation?.[currentIndex] ?? null : null,
            weatherCode: currentWeather.weathercode ?? null,
            condition: getWeatherDescription(currentWeather.weathercode),
            time: currentWeather.time ?? null
        },
        hourly: hourly,
        daily: data.daily || {},
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

async function fetchWeatherAPIData(region = 'Rio de Janeiro') {
    if (!WEATHERAPI_KEY) {
        console.warn('WEATHERAPI_KEY is not configured. WeatherAPI data will be skipped.');
        return null;
    }

    try {
        const coordinates = getRegionCoordinates(region);
        const params = new URLSearchParams({
            key: WEATHERAPI_KEY,
            q: `${coordinates.latitude},${coordinates.longitude}`,
            aqi: 'no'
        });

        const response = await fetch(`${WEATHERAPI_BASE_URL}/current.json?${params}`);
        if (!response.ok) {
            throw new Error(`WeatherAPI error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching WeatherAPI data:', error);
        return null;
    }
}

function parseWeatherAPIData(data, region = 'Rio de Janeiro') {
    const regionData = getRegionCoordinates(region);
    const current = data.current || {};

    return {
        source: 'weatherapi',
        current: {
            temperature: current.temp_c ?? null,
            humidity: current.humidity ?? null,
            windSpeed: current.wind_kph ?? null,
            windGusts: current.gust_kph ?? null,
            apparentTemperature: current.feelslike_c ?? null,
            precipitation: current.precip_mm ?? null,
            weatherCode: current.condition?.code ?? null,
            condition: current.condition?.text ?? null,
            time: current.last_updated ?? null
        },
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

function averageWeatherData(openMeteoData, weatherApiData) {
    const sources = [openMeteoData, weatherApiData].filter(Boolean);
    if (sources.length === 0) {
        throw new Error('No weather sources available to calculate averages.');
    }

    const average = valueKey => {
        const values = sources
            .map(source => source.current[valueKey])
            .filter(value => typeof value === 'number');
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };

    const openMeteoCode = openMeteoData?.current?.weatherCode;
    const openMeteoCondition = openMeteoData?.current?.condition;
    const weatherApiCondition = weatherApiData?.current?.condition;

    return {
        source: 'average',
        current: {
            temperature: average('temperature'),
            humidity: average('humidity'),
            windSpeed: average('windSpeed'),
            windGusts: average('windGusts'),
            apparentTemperature: average('apparentTemperature'),
            precipitation: average('precipitation'),
            weatherCode: openMeteoCode ?? weatherApiData?.current?.weatherCode ?? null,
            condition: weatherApiCondition || openMeteoCondition || getWeatherDescription(openMeteoCode),
            time: openMeteoData?.current?.time || weatherApiData?.current?.time || null
        },
        hourly: openMeteoData?.hourly || {},
        daily: openMeteoData?.daily || {},
        location: openMeteoData?.location || weatherApiData?.location,
        sources: sources.map(source => source.source),
        timestamp: new Date().toISOString()
    };
}

async function getWeatherData(region = 'Rio de Janeiro') {
    try {
        const [openMeteoRaw, weatherApiRaw] = await Promise.all([
            fetchOpenMeteoData(region),
            fetchWeatherAPIData(region)
        ]);

        const openMeteoParsed = parseOpenMeteoData(openMeteoRaw, region);
        const weatherApiParsed = weatherApiRaw ? parseWeatherAPIData(weatherApiRaw, region) : null;

        if (weatherApiParsed) {
            return averageWeatherData(openMeteoParsed, weatherApiParsed);
        }

        return openMeteoParsed;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
    }
}

function getRegionsList() {
    return Object.entries(COASTAL_REGIONS).map(([name, data]) => ({
        name,
        zone: data.zone,
        activities: data.activities,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude
    }));
}

module.exports = {
    getWeatherData,
    fetchOpenMeteoData,
    parseOpenMeteoData,
    fetchWeatherAPIData,
    parseWeatherAPIData,
    averageWeatherData,
    getRegionCoordinates,
    getRegionsList,
    getWeatherDescription,
    COASTAL_REGIONS
};
