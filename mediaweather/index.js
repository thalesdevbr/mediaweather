// Configuração inicial do servidor Express e Firebase
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

// Import weather and ML routes
const weatherRoutes = require('../routes/weatherRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Inicialização do Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
  // databaseURL: 'https://<YOUR_PROJECT_ID>.firebaseio.com' // Descomente e ajuste se necessário
});

// Health check
app.get('/', (req, res) => {
  res.send('MediaWeather API - Rio de Janeiro Focus. Use /api/weather, /api/safety-analysis, /api/trail-recommendations');
});

// Weather and Safety Analysis API Routes
app.use('/api', weatherRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MediaWeather API rodando na porta ${PORT}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`  GET /api/weather?region=<region> - Dados meteorológicos atuais`);
  console.log(`  GET /api/safety-analysis?region=<region> - Análise completa de segurança`);
  console.log(`  GET /api/risk-assessment?region=<region> - Avaliação de risco detalhada`);
  console.log(`  GET /api/activity-recommendations?region=<region> - Recomendações de atividades`);
  console.log(`  GET /api/regions - Lista de regiões disponíveis`);
  console.log(`\nRegiões disponíveis:`);
  console.log(`  - Zona Sul (padrão)`);
  console.log(`  - Zona Oeste`);
  console.log(`  - Saquarema`);
  console.log(`  - Arraial do Cabo`);
  console.log(`  - Ilha Grande`);
});