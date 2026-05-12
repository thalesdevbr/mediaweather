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
        HIGH: { threshold: Infinity, risk: 'high', description: 'Dangerous wind conditions' }
    },
    PRECIPITATION: {
        LOW: { threshold: 0.5, risk: 'low', description: 'Minimal precipitation' },
        MEDIUM: { threshold: 2.0, risk: 'medium', description: 'Moderate precipitation - slippery surfaces' },
        HIGH: { threshold: Infinity, risk: 'high', description: 'Heavy precipitation - risk of floods' }
    },
    TEMPERATURE: {
        COLD: { threshold: 10, risk: 'medium', description: 'Cold conditions' },
        MODERATE: { threshold: 35, risk: 'low', description: 'Safe temperature range' },
        HOT: { threshold: Infinity, risk: 'high', description: 'Heat stroke risk' }
    },
    HUMIDITY: {
        LOW: { threshold: 30, risk: 'low', description: 'Dry conditions' },
        MODERATE: { threshold: 70, risk: 'low', description: 'Comfortable humidity' },
        HIGH: { threshold: Infinity, risk: 'medium', description: 'High humidity - physical strain' }
    }
};

/**
 * Calculate risk score based on weather data
 * @param {Object} weatherData - Current weather data
 * @returns {Object} Risk assessment
 */
function calculateRiskScore(weatherData) {
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

    // Precipitation analysis
    if (current.precipitation >= RISK_FACTORS.PRECIPITATION.HIGH.threshold) {
        riskScore += 35;
        riskFactors.push(RISK_FACTORS.PRECIPITATION.HIGH.description);
    } else if (current.precipitation >= RISK_FACTORS.PRECIPITATION.MEDIUM.threshold) {
        riskScore += 20;
        riskFactors.push(RISK_FACTORS.PRECIPITATION.MEDIUM.description);
    }

    // Temperature analysis
    if (current.temperature > RISK_FACTORS.TEMPERATURE.HOT.threshold) {
        riskScore += 20;
        riskFactors.push(RISK_FACTORS.TEMPERATURE.HOT.description);
    } else if (current.temperature < RISK_FACTORS.TEMPERATURE.COLD.threshold) {
        riskScore += 10;
        riskFactors.push(RISK_FACTORS.TEMPERATURE.COLD.description);
    }

    // Humidity analysis
    if (current.humidity >= 80) {
        riskScore += 10;
        riskFactors.push(RISK_FACTORS.HUMIDITY.HIGH.description);
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
        return 'HIGH CAUTION: Only experienced hikers on well-known trails. Avoid solo activities.';
    } else if (score >= 30) {
        return 'MODERATE CAUTION: Suitable for experienced hikers. Check conditions regularly.';
    } else if (score >= 10) {
        return 'SAFE: Good conditions for outdoor activities. Beginner-friendly trails recommended.';
    } else {
        return 'IDEAL: Excellent conditions for all types of outdoor activities.';
    }
}

/**
 * Trail recommendation based on safety analysis
 */
function getTrailRecommendations(weatherData, riskAssessment) {
    const recommendations = [];

    // High-difficulty trails
    if (riskAssessment.riskScore < 30) {
        recommendations.push({
            difficulty: 'HIGH',
            trails: ['Pico da Tijuca', 'Pedra da Gávea', 'Morro dos Dois Irmãos'],
            reason: 'Excellent conditions for challenging hikes'
        });
    }

    // Medium-difficulty trails
    if (riskAssessment.riskScore < 50) {
        recommendations.push({
            difficulty: 'MEDIUM',
            trails: ['Trilha da Floresta da Tijuca', 'Escada do Urca', 'Mirante Dona Marta'],
            reason: 'Good conditions for intermediate hikes'
        });
    }

    // Easy trails
    if (riskAssessment.riskScore < 70) {
        recommendations.push({
            difficulty: 'EASY',
            trails: ['Passeio Público', 'Caminho do Corte', 'Lagoa Rodrigo de Freitas'],
            reason: 'Suitable for casual walks and easy trails'
        });
    }

    return recommendations;
}

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
    const riskAssessment = calculateRiskScore(weatherData);
    const trailRecommendations = getTrailRecommendations(weatherData, riskAssessment);
    
    // Store data for future ML model training
    storeWeatherDataForML(weatherData, riskAssessment);

    return {
        timestamp: new Date().toISOString(),
        location: weatherData.location,
        currentWeather: weatherData.current,
        safetyAnalysis: riskAssessment,
        trailRecommendations: trailRecommendations
    };
}

module.exports = {
    calculateRiskScore,
    getRiskLevel,
    getRecommendation,
    getTrailRecommendations,
    storeWeatherDataForML,
    analyzeSafety,
    RISK_FACTORS
};
