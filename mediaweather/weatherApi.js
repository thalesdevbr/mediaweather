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

async function fetchOpenMeteoData(region = 'Rio de Janeiro') {
    try {
        const coordinates = getRegionCoordinates(region);
        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            current_weather: 'true',
            hourly: 'temperature_2m,relativehumidity_2m,precipitation,precipitation_probability,weathercode,wind_speed_10m,wind_gusts_10m,uv_index',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weathercode,uv_index_max',
            timezone: 'America/Sao_Paulo',
            forecast_days: 16
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
        forecast15: parseDailyForecast(data.daily || {}),
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
 * Parser da previsão diária estendida (máximo 15 dias) do Open-Meteo
 * Retorna array de objetos com data, temp_min, temp_max, precipitação, vento, código do tempo, UV
 */
function parseDailyForecast(daily = {}) {
    const times = daily.time || [];
    const forecasts = [];

    // Incluir dia de hoje (índice 0) como primeiro elemento
    for (let i = 0; i < times.length && forecasts.length < 15; i++) {
        forecasts.push({
            date: times[i],
            dayLabel: getDayLabel(times[i]),
            tempMin: daily.temperature_2m_min?.[i] ?? null,
            tempMax: daily.temperature_2m_max?.[i] ?? null,
            precipitation: daily.precipitation_sum?.[i] ?? null,
            precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
            windSpeed: daily.wind_speed_10m_max?.[i] ?? null,
            weatherCode: daily.weathercode?.[i] ?? null,
            condition: getWeatherDescription(daily.weathercode?.[i] ?? null),
            uvIndex: daily.uv_index_max?.[i] ?? null,
            isToday: i === 0
        });
    }

    return forecasts;
}

function getDayLabel(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.round((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';

    const ptBR = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return ptBR.format(date);
}

/**
 * Obtém descrição textual do código WMO de clima
 * @param {number|null} code
 */
function getWeatherDescription(code) {
    if (code === null || code === undefined) return '--';
    const codes = {
        0: 'Céu limpo',
        1: 'Principalmente limpo',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Nevoeiro',
        48: 'Nevoeiro com geada',
        51: 'Chuva fraca',
        53: 'Chuva moderada',
        55: 'Chuva forte',
        56: 'Chuva congelante fraca',
        57: 'Chuva congelante forte',
        61: 'Chuva fraca',
        63: 'Chuva moderada',
        65: 'Chuva forte',
        66: 'Chuva congelante fraca',
        67: 'Chuva congelante forte',
        71: 'Neve fraca',
        73: 'Neve moderada',
        75: 'Neve forte',
        77: 'Neve fina',
        80: 'Pancadas de chuva fracas',
        81: 'Pancadas de chuva moderadas',
        82: 'Pancadas de chuva fortes',
        85: 'Pancadas de neve fracas',
        86: 'Pancadas de neve fortes',
        95: 'Trovoada',
        96: 'Trovoada com granizo leve',
        99: 'Trovoada com granizo forte'
    };
    return codes[code] || 'Condição desconhecida';
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
        forecast15: openMeteoData?.forecast15 || [],
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
            const avg = averageWeatherData(openMeteoParsed, weatherApiParsed);
            // Registro não bloqueante de avaliação de precisão (chuva + vento)
            setImmediate(async () => {
                try {
                    const apiAccuracyTracker = require('./lib/apiAccuracyTracker');
                    const evaluation = {
                        openMeteo: apiAccuracyTracker.evaluateApiAccuracy(openMeteoParsed, avg.current, apiAccuracyTracker.DEFAULT_TOLERANCES),
                        weatherApi: apiAccuracyTracker.evaluateApiAccuracy(weatherApiParsed, avg.current, apiAccuracyTracker.DEFAULT_TOLERANCES),
                        average: apiAccuracyTracker.evaluateApiAccuracy(avg, avg.current, apiAccuracyTracker.DEFAULT_TOLERANCES)
                    };
                    await apiAccuracyTracker.recordAccuracyEvaluation(region, evaluation, { source: 'getWeatherData' });
                } catch (evalErr) {
                    console.warn('Accuracy evaluation skipped:', evalErr.message);
                }
            });
            return avg;
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
    parseDailyForecast,
    getDayLabel,
    getWeatherDescription,
    COASTAL_REGIONS
};
