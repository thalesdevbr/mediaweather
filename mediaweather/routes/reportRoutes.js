// Report Routes - MediaWeather API
// GET /api/reports/accuracy?region=<region>&days=7
// GET /api/reports/export?region=<region>&format=csv|json&days=7

const express = require('express');
const router = express.Router();
const apiAccuracyTracker = require('../lib/apiAccuracyTracker');

/**
 * GET /api/reports/accuracy?region=<region>&days=7
 * Returns accuracy report for a region over last N days
 */
router.get('/accuracy', async (req, res) => {
    const { region, days } = req.query;
    const regionName = region || 'Zona Sul';
    const periodDays = parseInt(days) || 7;

    try {
        const report = await apiAccuracyTracker.getAccuracyReport(regionName, periodDays);
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error getting accuracy report:', error);
        
        // Se o erro for Firestore não inicializado, retorne um relatório de placeholder com instruções
        if (error.message.includes('Firestore não inicializado')) {
            return res.json({
                success: true,
                data: {
                    region: regionName,
                    period: `${periodDays} dias`,
                    totalEvaluations: 0,
                    byApi: {
                        openMeteo: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } },
                        weatherApi: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } },
                        average: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } }
                    },
                    evaluations: [],
                    insights: [],
                    note: 'Firestore não ativado. Para dados reais de precisão, ative o Firestore no console do Firebase (mediaweather-d72ab) e chame initFirebase().'
                }
            });
        }
        
        // Outros erros
        res.status(500).json({
            success: false,
            error: 'Failed to generate accuracy report',
            message: error.message
        });
    }
});

/**
 * GET /api/reports/export?region=<region>&format=csv|json&days=7
 * Export CSV or JSON of accuracy reports
 */
router.get('/export', async (req, res) => {
    const { region, format, days } = req.query;
    const regionName = region || 'Zona Sul';
    const exportFormat = format || 'json';
    const periodDays = parseInt(days) || 7;

    try {
        if (exportFormat === 'csv') {
            try {
                const csv = await apiAccuracyTracker.exportAccuracyCsv(regionName, periodDays);
                res.setHeader('Content-Type', 'text/csv');
                return res.send(csv);
            } catch (csvErr) {
                if (csvErr.message.includes('Firestore não inicializado')) {
                    // Return sample CSV for demo
                    let sampleCsv = 'timestamp,api,metric,acertou,diferenca,valor,referencia\n';
                    sampleCsv += '2026-01-01T00:00:00Z,average,precipitation,NÃO,2.5,0.0,2.5\n';
                    sampleCsv += '2026-01-01T00:00:00Z,average,windSpeed,NÃO,4.2,0.0,4.2\n';
                    sampleCsv += '2026-01-02T00:00:00Z,average,precipitation,SIM,1.1,2.0,0.9\n';
                    sampleCsv += '2026-01-02T00:00:00Z,average,windSpeed,SIM,2.8,12.0,9.2\n';
                    res.setHeader('Content-Type', 'text/csv');
                    return res.send(sampleCsv);
                }
                throw csvErr;
            }
        } else {
            try {
                const report = await apiAccuracyTracker.getAccuracyReport(regionName, periodDays);
                res.json(report);
            } catch (jsonErr) {
                if (jsonErr.message.includes('Firestore não inicializado')) {
                    // Return sample JSON for demo
                    return res.json({
                        region: regionName,
                        period: `${periodDays} dias`,
                        totalEvaluations: 0,
                        byApi: {
                            openMeteo: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } },
                            weatherApi: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } },
                            average: { precipitation: { correct: 0, incorrect: 0, total: 0, accuracy: 0 }, wind: { correct: 0, incorrect: 0, total: 0, accuracy: 0 } }
                        },
                        evaluations: [],
                        insights: [],
                        note: 'Firestore não ativado. Para dados reais de precisão, ative o Firestore no console do Firebase (mediaweather-d72ab) e chame initFirebase().'
                    });
                }
                throw jsonErr;
            }
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export accuracy report',
            message: error.message
        });
    }
});

module.exports = router;
