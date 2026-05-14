// ML Safety Analysis Module
// Analyzes weather patterns and environmental factors for trail and travel safety in Rio de Janeiro

const fs = require('fs');
const path = require('path');

/**
 * Risk factors for trails and outdoor activities
 */
const RISK_FACTORS = {
    WIND_SPEED: {
        LOW: { threshold: 20, risk: 'low', description: 'Safe for all trails' },
        MEDIUM: { threshold: 40, risk: 'medium', description: 'Caution advised on exposed trails' },
        HIGH: { threshold: 60, risk: 'high', description: 'Dangerous wind conditions' }
    },
    PRECIPITATION: {
        LOW: { threshold: 0.5, risk: 'low', description: 'Minimal precipitation' },
        MEDIUM: { threshold: 2.0, risk: 'medium', description: 'Moderate precipitation - slippery surfaces' },
        HIGH: { threshold: 5.0, risk: 'high', description: 'Heavy precipitation - risk of floods' }
    },
    TEMPERATURE: {
        COLD: { threshold: 10, risk: 'medium', description: 'Cold conditions' },
        MODERATE: { threshold: 35, risk: 'low', description: 'Safe temperature range' },
        HOT: { threshold: 38, risk: 'high', description: 'Heat stroke risk' }
    },
    HUMIDITY: {
        LOW: { threshold: 30, risk: 'low', description: 'Dry conditions' },
        MODERATE: { threshold: 70, risk: 'low', description: 'Comfortable humidity' },
        HIGH: { threshold: 80, risk: 'medium', description: 'High humidity - physical strain' }
    }
};

// WMO weather code → risk score mapping
const WEATHER_CODE_RISK = {
    99: { score: 50, description: 'Thunderstorm with heavy hail - stay indoors' },
    96: { score: 45, description: 'Thunderstorm with hail - extremely dangerous' },
    95: { score: 40, description: 'Thunderstorm - dangerous for outdoor activities' },
    82: { score: 25, description: 'Violent rain showers - flooding risk' },
    81: { score: 15, description: 'Moderate rain showers - slippery conditions' },
    80: { score: 10, description: 'Rain showers - take care on trails' },
    65: { score: 20, description: 'Heavy rain - flooding risk' },
    63: { score: 12, description: 'Moderate rain - caution on exposed areas' },
    61: { score: 8,  description: 'Light rain - minor risk' },
    77: { score: 12, description: 'Snow grains - rare but slippery' },
    75: { score: 20, description: 'Heavy snow - activity not recommended' },
    73: { score: 15, description: 'Moderate snow - caution' },
    71: { score: 10, description: 'Light snow - caution' },
    48: { score: 10, description: 'Freezing fog - reduced visibility' },
    45: { score: 8,  description: 'Fog - reduced visibility on trails' }
};

function getWeatherCodeRisk(code) {
    return WEATHER_CODE_RISK[code] || { score: 0, description: null };
}

function analyzeTrend(hourlyData, currentTime) {
    if (!hourlyData || !hourlyData.time || !currentTime) return null;

    const currentIndex = hourlyData.time.findIndex(t => t >= currentTime);
    if (currentIndex < 0) return null;

    const next6h = (hourlyData.precipitation_probability || []).slice(currentIndex + 1, currentIndex + 7);
    const avgPrecipProb = next6h.length > 0
        ? Math.round(next6h.reduce((a, b) => a + b, 0) / next6h.length)
        : 0;

    const upcomingCodes = (hourlyData.weather_code || []).slice(currentIndex + 1, currentIndex + 4);
    const worsening = upcomingCodes.some(c => c >= 61) || avgPrecipProb > 60;

    return { precipitationProbability6h: avgPrecipProb, worsening };
}

/**
 * Calculate risk score based on weather data
 * @param {Object} weatherData - Current weather data
 * @param {number|null} uvIndex - Today's max UV index
 * @param {Object|null} trend - Hourly trend analysis
 * @returns {Object} Risk assessment
 */
function calculateRiskScore(weatherData, uvIndex = null, trend = null) {
    const current = weatherData.current;
    let riskScore = 0;
    const riskFactors = [];

    // Wind speed analysis
    if (current.windSpeed >= RISK_FACTORS.WIND_SPEED.HIGH.threshold) {
        riskScore += 30;
        riskFactors.push(RISK_FACTORS.WIND_SPEED.HIGH.description);
    } else if (current.windSpeed >= RISK_FACTORS.WIND_SPEED.MEDIUM.threshold) {
        riskScore += 15;
        riskFactors.push(RISK_FACTORS.WIND_SPEED.MEDIUM.description);
    }

    // Wind gusts analysis
    if (current.windGusts >= 70) {
        riskScore += 20;
        riskFactors.push(`Dangerous wind gusts (${Math.round(current.windGusts)} km/h)`);
    } else if (current.windGusts >= 50) {
        riskScore += 10;
        riskFactors.push(`Strong wind gusts (${Math.round(current.windGusts)} km/h)`);
    }

    // Precipitation analysis
    if (current.precipitation >= RISK_FACTORS.PRECIPITATION.HIGH.threshold) {
        riskScore += 35;
        riskFactors.push(RISK_FACTORS.PRECIPITATION.HIGH.description);
    } else if (current.precipitation >= RISK_FACTORS.PRECIPITATION.MEDIUM.threshold) {
        riskScore += 20;
        riskFactors.push(RISK_FACTORS.PRECIPITATION.MEDIUM.description);
    }

    // Temperature analysis
    if (current.temperature >= RISK_FACTORS.TEMPERATURE.HOT.threshold) {
        riskScore += 20;
        riskFactors.push(RISK_FACTORS.TEMPERATURE.HOT.description);
    } else if (current.temperature < RISK_FACTORS.TEMPERATURE.COLD.threshold) {
        riskScore += 10;
        riskFactors.push(RISK_FACTORS.TEMPERATURE.COLD.description);
    }

    // Humidity analysis
    if (current.humidity >= RISK_FACTORS.HUMIDITY.HIGH.threshold) {
        riskScore += 10;
        riskFactors.push(RISK_FACTORS.HUMIDITY.HIGH.description);
    }

    // Weather code analysis (WMO codes — previously missing)
    const codeRisk = getWeatherCodeRisk(current.weatherCode);
    if (codeRisk.score > 0) {
        riskScore += codeRisk.score;
        riskFactors.push(codeRisk.description);
    }

    // UV index analysis
    if (uvIndex !== null) {
        if (uvIndex >= 11) {
            riskScore += 20;
            riskFactors.push(`Extreme UV index (${uvIndex}) - minimize sun exposure`);
        } else if (uvIndex >= 8) {
            riskScore += 10;
            riskFactors.push(`Very high UV index (${uvIndex}) - sun protection essential`);
        } else if (uvIndex >= 6) {
            riskScore += 5;
            riskFactors.push(`High UV index (${uvIndex}) - sun protection recommended`);
        }
    }

    // Trend analysis
    if (trend && trend.worsening) {
        riskScore += 10;
        riskFactors.push(`Worsening conditions expected (${trend.precipitationProbability6h}% rain probability next 6h)`);
    }

    return {
        riskScore: Math.min(riskScore, 100),
        riskLevel: getRiskLevel(riskScore),
        factors: riskFactors,
        recommendation: getRecommendation(riskScore)
    };
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score) {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    if (score >= 10) return 'LOW';
    return 'MINIMAL';
}

/**
 * Get safety recommendation based on risk score
 */
function getRecommendation(score) {
    if (score >= 70) {
        return 'NOT RECOMMENDED: Outdoor activities strongly discouraged. Stay indoors.';
    } else if (score >= 50) {
        return 'HIGH CAUTION: Limited activities. Only for experienced adventurers.';
    } else if (score >= 30) {
        return 'MODERATE CAUTION: Most activities possible. Check conditions regularly.';
    } else if (score >= 10) {
        return 'SAFE: Good conditions for most outdoor activities.';
    } else {
        return 'IDEAL: Excellent conditions for all types of activities.';
    }
}

/**
 * Get activity recommendations by region and weather
 */
function getActivityRecommendations(weatherData, riskAssessment) {
    const region = weatherData.location;
    const wind = weatherData.current.windSpeed;
    const temp = weatherData.current.temperature;
    const precipitation = weatherData.current.precipitation;
    const recommendations = [];

    // ILHA GRANDE - Beach, Diving, Snorkeling, Hiking
    if (region.region === 'Ilha Grande') {
        if (riskAssessment.riskScore < 30 && wind < 25) {
            recommendations.push({
                activity: 'Diving & Snorkeling',
                locations: ['Big Beach (Praia Grande)', 'Lopez Mendes', 'Dark Beach (Praia Preta)'],
                reason: 'Perfect underwater visibility',
                safety: 'Safe'
            });
        }
        if (riskAssessment.riskScore < 50) {
            recommendations.push({
                activity: 'Beach Activities',
                locations: ['Praia Grande', 'Praia do Abraão', 'Lagoa Azul'],
                reason: 'Good beach conditions',
                safety: 'Moderate'
            });
        }
    }
    
    // ZONA OESTE - Surfing, Water Sports
    else if (region.region === 'Zona Oeste (West Zone)') {
        if (wind >= 12 && wind <= 25 && riskAssessment.riskScore < 50) {
            recommendations.push({
                activity: 'Surfing',
                locations: ['Recreio Beach', 'Barra Beach', 'Prainha'],
                reason: 'Good wave conditions',
                safety: 'Check tide'
            });
        }
        if (riskAssessment.riskScore < 40) {
            recommendations.push({
                activity: 'Water Sports',
                locations: ['Barra Beach', 'Recreio Beach'],
                reason: 'Suitable conditions for water activities',
                safety: 'Safe'
            });
        }
    }
    
    // ZONA SUL - Beach, Hiking, Climbing
    else if (region.region === 'Zona Sul (South Zone)') {
        if (riskAssessment.riskScore < 35 && wind < 20) {
            recommendations.push({
                activity: 'Beach Days',
                locations: ['Copacabana', 'Ipanema', 'Leblon'],
                reason: 'Perfect beach weather',
                safety: 'Safe'
            });
        }
        if (riskAssessment.riskScore < 45 && wind < 18) {
            recommendations.push({
                activity: 'Hiking & Climbing',
                locations: ['Morro dos Irmãos', 'Pedra da Gávea', 'Pico da Tijuca'],
                reason: 'Good conditions for trails',
                safety: 'Experienced recommended'
            });
        }
    }
    
    // SAQUAREMA - Surfing, Windsurfing
    else if (region.region === 'Saquarema') {
        if (wind >= 12 && wind <= 28 && riskAssessment.riskScore < 50) {
            recommendations.push({
                activity: 'Surfing & Windsurfing',
                locations: ['Main Beach', 'Itaúna Beach', 'Lagoa Lake'],
                reason: 'Ideal wind and wave conditions',
                safety: 'Check conditions'
            });
        }
        if (riskAssessment.riskScore < 40) {
            recommendations.push({
                activity: 'Beach & Lake Activities',
                locations: ['Saquarema Beach', 'Lagoa Lake'],
                reason: 'Good conditions for water activities',
                safety: 'Safe'
            });
        }
    }
    
    // ARRAIAL DO CABO - Diving, Snorkeling, Boat Tours
    else if (region.region === 'Arraial do Cabo') {
        if (riskAssessment.riskScore < 30 && wind < 20) {
            recommendations.push({
                activity: 'Diving & Snorkeling',
                locations: ['Gruta do Cabo', 'Praia Grande', 'Tartaruga Beach'],
                reason: 'Crystal clear waters',
                safety: 'Safe - excellent visibility'
            });
        }
        if (riskAssessment.riskScore < 45) {
            recommendations.push({
                activity: 'Boat Tours & Beach',
                locations: ['Praia Grande', 'Farol Beach', 'Banana Island'],
                reason: 'Great for exploration',
                safety: 'Check sea conditions'
            });
        }
    }

    return recommendations;
}

/**
 * Regional activity recommendations based on weather and location
 */

/**
 * Store weather data for ML training
 */
function storeWeatherDataForML(weatherData, riskAssessment) {
    const dataEntry = {
        timestamp: new Date().toISOString(),
        weather: weatherData.current,
        riskAssessment: riskAssessment,
        location: weatherData.location
    };

    try {
        const dataDir = path.join(__dirname, 'ml-data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const fileName = `weather-${new Date().toISOString().split('T')[0]}.json`;
        const filePath = path.join(dataDir, fileName);

        let data = [];
        if (fs.existsSync(filePath)) {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        data.push(dataEntry);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log('Weather data stored for ML training');
    } catch (error) {
        console.error('Error storing weather data:', error);
    }
}

/**
 * Analyze safety and get full report
 */
async function analyzeSafety(weatherData) {
    const uvIndex = weatherData.daily?.uv_index_max?.[0] ?? null;
    const trend = analyzeTrend(weatherData.hourly, weatherData.current.time);
    const riskAssessment = calculateRiskScore(weatherData, uvIndex, trend);
    const activityRecommendations = getActivityRecommendations(weatherData, riskAssessment);

    // Store data for future ML model training
    storeWeatherDataForML(weatherData, riskAssessment);

    return {
        timestamp: new Date().toISOString(),
        location: weatherData.location,
        currentWeather: weatherData.current,
        safetyAnalysis: riskAssessment,
        activityRecommendations: activityRecommendations,
        uvIndex,
        trend
    };
}

module.exports = {
    calculateRiskScore,
    getRiskLevel,
    getRecommendation,
    getActivityRecommendations,
    storeWeatherDataForML,
    analyzeSafety,
    RISK_FACTORS
};
