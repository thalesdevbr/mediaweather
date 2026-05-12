// Weather and Safety Analysis Routes
// Provides API endpoints for weather data and ML safety analysis

const express = require('express');
const weatherApi = require('../weatherApi');
const mlSafetyAnalysis = require('../mlSafetyAnalysis');

const router = express.Router();

/**
 * GET /api/weather
 * Get current weather data for Rio de Janeiro
 */
router.get('/weather', async (req, res) => {
    try {
        const weatherData = await weatherApi.getWeatherData();
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
 * Get safety analysis and trail recommendations for Rio de Janeiro
 */
router.get('/safety-analysis', async (req, res) => {
    try {
        const weatherData = await weatherApi.getWeatherData();
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
 * Get detailed risk assessment
 */
router.get('/risk-assessment', async (req, res) => {
    try {
        const weatherData = await weatherApi.getWeatherData();
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
 * GET /api/trail-recommendations
 * Get recommended trails based on current conditions
 */
router.get('/trail-recommendations', async (req, res) => {
    try {
        const weatherData = await weatherApi.getWeatherData();
        const riskAssessment = mlSafetyAnalysis.calculateRiskScore(weatherData);
        const recommendations = mlSafetyAnalysis.getTrailRecommendations(weatherData, riskAssessment);
        
        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                riskLevel: riskAssessment.riskLevel,
                recommendations: recommendations
            }
        });
    } catch (error) {
        console.error('Trail Recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trail recommendations',
            message: error.message
        });
    }
});

module.exports = router;
