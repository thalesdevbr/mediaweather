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
            forecast_days: 15,
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

/**
 * Calculate daily averages for 15-day forecast from Open-Meteo API
 * Computes statistics across all 15 days of daily forecast data
 */
function calculateDailyAverages(dailyForecastData = {}, days = 15) {
    const daily = Array.isArray(dailyForecastData) ? dailyForecastData : Object.values(dailyForecastData).filter(Boolean);
    const filteredDaily = daily.slice(0, days);
    
    if (filteredDaily.length === 0) {
        return null;
    }
    
    const count = filteredDaily.length;
    
    // Temperature statistics
    const tempMaxValues = filteredDaily
        .map(d => d.temperature_2m_max)
        .filter(v => typeof v === 'number');
    const tempMinValues = filteredDaily
        .map(d => d.temperature_2m_min)
        .filter(v => typeof v === 'number');
    
    // Precipitation statistics
    const precipValues = filteredDaily
        .map(d => d.precipitation_sum)
        .filter(v => typeof v === 'number');
    
    // Wind speed statistics
    const windSpeedMaxValues = filteredDaily
        .map(d => d.wind_speed_10m_max)
        .filter(v => typeof v === 'number');
    
    // UV index statistics
    const uvIndexMaxValues = filteredDaily
        .map(d => d.uv_index_max)
        .filter(v => typeof v === 'number');
    
    // Weather code statistics
    const weatherCodeValues = filteredDaily.map(d => d.weathercode);
    
    // Helper function to calculate average of array values
    const averageOf = arr => {
        const filtered = arr.filter(v => typeof v === 'number');
        return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : null;
    };
    
    // Count wet days (precipitation > 0)
    const wetDays = precipValues.filter(v => v > 0).length;
    const precipitationProbability = wetDays / count;
    
    return {
        source: 'daily-averages',
        numberOfDays: count,
        statistics: {
            averageTemperatureMax: roundToOneDecimal(averageOf(tempMaxValues)),
            averageTemperatureMin: roundToOneDecimal(averageOf(tempMinValues)),
            averagePrecipitation: roundToOneDecimal(averageOf(precipValues)),
            averageWindSpeedMax: roundToOneDecimal(averageOf(windSpeedMaxValues)),
            averageUVIndexMax: roundToOneDecimal(averageOf(uvIndexMaxValues)),
            wetDayCount: wetDays,
            wetDayPercentage: Math.round((precipitationProbability * 100) * 10) / 10,
            averageWeatherCodes: getWeatherDescription(
                weatherCodeValues.filter(Number).reduce((sum, code) => sum + code, 0) / weatherCodeValues.length
            )
        },
        timestamp: new Date().toISOString()
    };
}

function roundToOneDecimal(num) {
    if (num === null || num === undefined) return null;
    return Math.round(num * 10) / 10;
}

function parseOpenMeteoData(data, region = 'Rio de Janeiro') {
    const regionData = getRegionCoordinates(region);
    const currentWeather = data.current_weather || {};
    const hourly = data.hourly || {};
    const currentIndex = Array.isArray(hourly.time)
        ? hourly.time.findIndex(time => time === currentWeather.time)
        : -1;

    const dailyArray = data.daily && Array.isArray(data.daily.time)
        ? data.daily.time.map((time, index) => ({
            time,
            temperature_2m_max: data.daily.temperature_2m_max?.[index] ?? null,
            temperature_2m_min: data.daily.temperature_2m_min?.[index] ?? null,
            precipitation_sum: data.daily.precipitation_sum?.[index] ?? null,
            wind_speed_10m_max: data.daily.wind_speed_10m_max?.[index] ?? null,
            weathercode: data.daily.weathercode?.[index] ?? null,
            uv_index_max: data.daily.uv_index_max?.[index] ?? null
        }))
        : [];

    const dailyAverages = calculateDailyAverages(dailyArray, 15);

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
        dailyAverages: dailyAverages,
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

    const averagedDailyAverages = openMeteoData?.dailyAverages
        ? {
            source: 'average-daily',
            numberOfDays: openMeteoData.dailyAverages.numberOfDays,
            statistics: {
                averageTemperatureMax: openMeteoData.dailyAverages.statistics.averageTemperatureMax,
                averageTemperatureMin: openMeteoData.dailyAverages.statistics.averageTemperatureMin,
                averagePrecipitation: openMeteoData.dailyAverages.statistics.averagePrecipitation,
                averageWindSpeedMax: openMeteoData.dailyAverages.statistics.averageWindSpeedMax,
                averageUVIndexMax: openMeteoData.dailyAverages.statistics.averageUVIndexMax,
                wetDayCount: openMeteoData.dailyAverages.statistics.wetDayCount,
                wetDayPercentage: openMeteoData.dailyAverages.statistics.wetDayPercentage,
                averageWeatherCodes: openMeteoData.dailyAverages.statistics.averageWeatherCodes
            }
        }
        : null;

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
        dailyAverages: averagedDailyAverages,
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
