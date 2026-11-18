// API Accuracy Tracker - MediaWeather
// Avalia precisão das APIs Open-Meteo e WeatherAPI para chuva e vento
// Armazena resultados no Firestore (gratuito)

const admin = require('firebase-admin');

let db = null;

// Tolerâncias para considerar "acertou"
// Chuva: diferença em mm <= toleranciaChuva
// Vento: diferença em km/h <= toleranciaVento
const DEFAULT_TOLERANCES = {
    precipitation: 2,   // mm
    windSpeed: 3        // km/h
};

/**
 * Inicializa Firebase Admin com serviceAccountKey.json
 * @param {string} projectId - ID do projeto Firebase (ex: 'mediaweather-d72ab')
 */
function initFirebase(projectId) {
    if (admin.apps.length > 0) {
        db = admin.firestore();
        return db;
    }

    try {
        const serviceAccount = require('../mediaweather/serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId || 'mediaweather-d72ab'
        });
    } catch (err) {
        console.error('❌ Erro ao inicializar Firebase Admin:', err.message);
        throw err;
    }

    db = admin.firestore();
    console.log('✅ Firebase Admin inicializado para relatório de precisão');
    return db;
}

/**
 * Retorna a instância do Firestore
 */
function getDb() {
    if (!db) {
        throw new Error('Firestore não inicializado. Chame initFirebase() primeiro.');
    }
    return db;
}

/**
 * Compara dois valores e determina se "acertou" baseado na tolerância
 */
function evaluateMetric(value, reference, tolerance) {
    if (value === null || reference === null || value === undefined || reference === undefined) {
        return { acertou: null, diferenca: null, dentroTolerancia: false };
    }

    const diferenca = Math.abs(value - reference);
    const acertou = diferenca <= tolerance;

    return {
        acertou,
        diferenca: parseFloat(diferenca.toFixed(2)),
        dentroTolerancia: acertou
    };
}

/**
 * Avalia precisão de chuva e vento para um conjunto de APIs
 */
function evaluateApiAccuracy(parsedData, averages, tolerances = DEFAULT_TOLERANCES) {
    const sources = {};

    if (!parsedData || !parsedData.current) return sources;

    const current = parsedData.current;
    const metrics = {
        precipitation: { value: current.precipitation, reference: averages.precipitation },
        windSpeed: { value: current.windSpeed, reference: averages.windSpeed }
    };

    Object.entries(metrics).forEach(([key, { value, reference }]) => {
        const tolerance = tolerances[key];
        sources[key] = evaluateMetric(value, reference, tolerance);
    });

    return sources;
}

/**
 * Registra uma avaliação de precisão no Firestore
 */
async function recordAccuracyEvaluation(region, evaluation, metadata = {}) {
    const firestore = getDb();
    const docRef = firestore.collection('accuracy_evaluations').doc();

    const entry = {
        region,
        ...evaluation,
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata
        },
        createdAt: new Date()
    };

    await docRef.set(entry);
    return { id: docRef.id, ...entry };
}

/**
 * Gera relatório de precisão agregado para uma região
 */
async function getAccuracyReport(region, days = 7) {
    const firestore = getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const snapshot = await firestore
        .collection('accuracy_evaluations')
        .where('region', '==', region)
        .where('createdAt', '>=', cutoffDate)
        .orderBy('createdAt', 'desc')
        .get();

    const report = {
        region,
        period: `${days} dias`,
        totalEvaluations: 0,
        byApi: {
            openMeteo: { precipitation: { correct: 0, incorrect: 0, total: 0 }, wind: { correct: 0, incorrect: 0, total: 0 } },
            weatherApi: { precipitation: { correct: 0, incorrect: 0, total: 0 }, wind: { correct: 0, incorrect: 0, total: 0 } },
            average: { precipitation: { correct: 0, incorrect: 0, total: 0 }, wind: { correct: 0, incorrect: 0, total: 0 } }
        },
        evaluations: []
    };

    snapshot.forEach(doc => {
        const data = doc.data();
        report.totalEvaluations++;
        report.evaluations.push({
            id: doc.id,
            timestamp: data.metadata?.timestamp,
            precipitation: data.precipitation,
            windSpeed: data.windSpeed
        });

        Object.entries(data).forEach(([key, metric]) => {
            if (key === 'region' || key === 'metadata' || key === 'createdAt') return;

            const apiName = key;
            if (!report.byApi[apiName]) {
                report.byApi[apiName] = { precipitation: { correct: 0, incorrect: 0, total: 0 }, wind: { correct: 0, incorrect: 0, total: 0 } };
            }

            if (metric.precipitation?.acertou !== undefined && metric.precipitation?.acertou !== null) {
                if (metric.precipitation.acertou) report.byApi[apiName].precipitation.correct++;
                else report.byApi[apiName].precipitation.incorrect++;
                report.byApi[apiName].precipitation.total++;
            }

            if (metric.windSpeed?.acertou !== undefined && metric.windSpeed?.acertou !== null) {
                if (metric.windSpeed.acertou) report.byApi[apiName].wind.correct++;
                else report.byApi[apiName].wind.incorrect++;
                report.byApi[apiName].wind.total++;
            }
        });
    });

    Object.entries(report.byApi).forEach(([apiName, metrics]) => {
        Object.entries(metrics).forEach(([metricName, counts]) => {
            counts.accuracy = counts.total > 0 ? Math.round((counts.correct / counts.total) * 100) : 0;
        });
    });

    report.insights = generateInsights(report.byApi);

    return report;
}

/**
 * Gera insights automáticos baseado nos dados
 */
function generateInsights(byApi) {
    const insights = [];

    const apis = Object.keys(byApi).filter(a => a !== 'average');
    if (apis.length < 2) return insights;

    const [a1, a2] = apis;

    const p1 = byApi[a1].precipitation.accuracy;
    const p2 = byApi[a2].precipitation.accuracy;
    if (p1 > p2) {
        insights.push(`${a1.toUpperCase()} é mais preciso que ${a2.toUpperCase()} para previsão de chuva (${p1}% vs ${p2}%)`);
    } else if (p2 > p1) {
        insights.push(`${a2.toUpperCase()} é mais preciso que ${a1.toUpperCase()} para previsão de chuva (${p2}% vs ${p1}%)`);
    } else {
        insights.push(`${a1.toUpperCase()} e ${a2.toUpperCase()} têm precisão semelhante para chuva (${p1}%)`);
    }

    const w1 = byApi[a1].wind.accuracy;
    const w2 = byApi[a2].wind.accuracy;
    if (w1 > w2) {
        insights.push(`${a1.toUpperCase()} é mais preciso que ${a2.toUpperCase()} para previsão de vento (${w1}% vs ${w2}%)`);
    } else if (w2 > w1) {
        insights.push(`${a2.toUpperCase()} é mais preciso que ${a1.toUpperCase()} para previsão de vento (${w2}% vs ${w1}%)`);
    } else {
        insights.push(`${a1.toUpperCase()} e ${a2.toUpperCase()} têm precisão semelhante para vento (${w1}%)`);
    }

    return insights;
}

/**
 * Exporta relatório em CSV
 */
async function exportAccuracyCsv(region, days = 7) {
    const report = await getAccuracyReport(region, days);

    let csv = 'timestamp,api,metric,acertou,diferenca,valor,referencia\n';

    report.evaluations.forEach(eval => {
        ['openMeteo', 'weatherApi', 'average'].forEach(api => {
            if (!eval[api]) return;
            ['precipitation', 'windSpeed'].forEach(metric => {
                const m = eval[api][metric];
                if (m.acertou === undefined || m.acertou === null) return;
                csv += `${eval.timestamp},${api},${metric},${m.acertou ? 'SIM' : 'NÃO'},${m.diferenca || ''},,\n`;
            });
        });
    });

    return csv;
}

module.exports = {
    initFirebase,
    getDb,
    evaluateMetric,
    evaluateApiAccuracy,
    recordAccuracyEvaluation,
    getAccuracyReport,
    exportAccuracyCsv,
    DEFAULT_TOLERANCES
};
