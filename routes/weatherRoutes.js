// Weather and Safety Analysis Routes
// Provides API endpoints for weather data and ML safety analysis

const express = require('express');
const weatherApi = require('../weatherApi');
const mlSafetyAnalysis = require('../mlSafetyAnalysis');

const router = express.Router();

/**
 * GET /api/weather
 * Get current weather data for a specific coastal region
 * Query param: region (default: 'Zona Sul')
 */
router.get('/weather', async (req, res) => {
    try {
        const region = req.query.region || 'Zona Sul';
        const weatherData = await weatherApi.getWeatherData(region);
        res.json({
            success: true,
            data: weatherData
        });
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch weather data',
            message: error.message
        });
    }
});

/**
 * GET /api/safety-analysis
 * Get safety analysis and activity recommendations for a specific region
 * Query param: region (default: 'Zona Sul')
 */
router.get('/safety-analysis', async (req, res) => {
    try {
        const region = req.query.region || 'Zona Sul';
        const weatherData = await weatherApi.getWeatherData(region);
        const safetyReport = await mlSafetyAnalysis.analyzeSafety(weatherData);
        
        res.json({
            success: true,
            data: safetyReport
        });
    } catch (error) {
        console.error('Safety Analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform safety analysis',
            message: error.message
        });
    }
});

/**
 * GET /api/risk-assessment
 * Get detailed risk assessment for a specific region
 * Query param: region (default: 'Zona Sul')
 */
router.get('/risk-assessment', async (req, res) => {
    try {
        const region = req.query.region || 'Zona Sul';
        const weatherData = await weatherApi.getWeatherData(region);
        const riskAssessment = mlSafetyAnalysis.calculateRiskScore(weatherData);
        
        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                location: weatherData.location,
                riskAssessment: riskAssessment
            }
        });
    } catch (error) {
        console.error('Risk Assessment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate risk assessment',
            message: error.message
        });
    }
});

/**
 * GET /api/activity-recommendations
 * Get recommended activities based on current weather for a specific region
 * Query param: region (default: 'Zona Sul')
 */
router.get('/activity-recommendations', async (req, res) => {
    try {
        const region = req.query.region || 'Zona Sul';
        const weatherData = await weatherApi.getWeatherData(region);
        const riskAssessment = mlSafetyAnalysis.calculateRiskScore(weatherData);
        const recommendations = mlSafetyAnalysis.getActivityRecommendations(weatherData, riskAssessment);
        
        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                region: weatherData.location.region,
                riskLevel: riskAssessment.riskLevel,
                activities: recommendations
            }
        });
    } catch (error) {
        console.error('Activity Recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get activity recommendations',
            message: error.message
        });
    }
});

/**
 * GET /api/regions
 * Get list of available coastal regions
 */
router.get('/regions', (req, res) => {
    const regions = weatherApi.COASTAL_REGIONS;
    const regionsList = Object.entries(regions).map(([name, data]) => ({
        name: name,
        zone: data.zone,
        activities: data.activities,
        description: data.description
    }));
    
    res.json({
        success: true,
        data: regionsList
    });
});

module.exports = router;
