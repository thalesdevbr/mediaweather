// Configuração inicial do servidor Express e Firebase
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

const app = express();
app.use(cors());
app.use(express.json());

// Inicialização do Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
  // databaseURL: 'https://<YOUR_PROJECT_ID>.firebaseio.com' // Descomente e ajuste se necessário
});

app.get('/', (req, res) => {
  res.send('API Weather Node.js + Firebase está rodando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// // APis
// OpenMeteo
// GET /weather (usa São Paulo como padrão)
// GET /weather?lat=-22.9&lon=-43.2 (para latitude/longitude customizada)//