# MediaWeather - Rio de Janeiro Safety Analysis

Um aplicativo inteligente de análise de segurança para viagens e trilhas no Rio de Janeiro, utilizando dados meteorológicos em tempo real e Machine Learning.

## Arquitetura do Projeto

```
mediaweather/
├── index.html              # Frontend - Interface principal
├── script.js               # Frontend - Lógica da interface e integração com APIs
├── styles.css              # Frontend - Estilos
├── index.js                # Backend - Servidor Express
├── weatherApi.js           # Integração com Open-Meteo (API de clima)
├── mlSafetyAnalysis.js     # Análise de segurança com ML
├── routes/
│   └── weatherRoutes.js    # Rotas da API REST
└── ml-data/                # Dados coletados para treino do ML (auto-criado)
```

## Funcionalidades

### 1. **Integração com APIs de Clima**
- **Open-Meteo**: API gratuita de previsão do tempo
- Dados coletados: temperatura, umidade, velocidade do vento, precipitação
- Coordenadas de Rio de Janeiro: -22.9068°S, -43.1729°O

### 2. **Análise de Segurança com ML**
O sistema analisa fatores de risco:
- **Velocidade do vento**: Determina se é seguro em trilhas expostas
- **Precipitação**: Alerta para superfícies escorregadias e risco de enchentes
- **Temperatura**: Identifica risco de hipotermia ou insolação
- **Umidade**: Avalia esforço físico necessário

### 3. **Recomendações de Trilhas**
Com base na análise de risco, o sistema recomenda:
- Trilhas de alta dificuldade (Pico da Tijuca, Pedra da Gávea, Morro dos Dois Irmãos)
- Trilhas de média dificuldade (Floresta da Tijuca, Escada do Urca)
- Trilhas fáceis (Passeio Público, Lagoa Rodrigo de Freitas)

### 4. **Coleta de Dados para ML**
- Todos os dados analisados são armazenados em `ml-data/weather-YYYY-MM-DD.json`
- Serve como dataset para treinar modelos ML mais sofisticados no futuro
- Padrão: Um arquivo por dia com múltiplas entradas de análise

## API REST Endpoints

### GET `/api/weather`
Retorna dados meteorológicos atuais do Rio de Janeiro.

**Response:**
```json
{
  "success": true,
  "data": {
    "source": "open-meteo",
    "current": {
      "temperature": 28.5,
      "humidity": 75,
      "windSpeed": 15,
      "precipitation": 0.2,
      "weatherCode": 2,
      "time": "2026-05-12T15:30:00Z"
    },
    "location": {
      "city": "Rio de Janeiro",
      "latitude": -22.9068,
      "longitude": -43.1729
    }
  }
}
```

### GET `/api/safety-analysis`
Realiza análise completa de segurança e retorna recomendações de trilhas.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-05-12T15:30:00Z",
    "location": { "city": "Rio de Janeiro", ... },
    "currentWeather": { ... },
    "safetyAnalysis": {
      "riskScore": 25,
      "riskLevel": "LOW",
      "factors": ["Good conditions"],
      "recommendation": "SAFE: Good conditions for outdoor activities. Beginner-friendly trails recommended."
    },
    "trailRecommendations": [
      {
        "difficulty": "HIGH",
        "trails": ["Pico da Tijuca", "Pedra da Gávea", "Morro dos Dois Irmãos"],
        "reason": "Excellent conditions for challenging hikes"
      }
    ]
  }
}
```

### GET `/api/risk-assessment`
Retorna apenas a avaliação de risco detalhada.

### GET `/api/trail-recommendations`
Retorna apenas as recomendações de trilhas.

## Níveis de Risco

| Nível | Score | Descrição |
|-------|-------|-----------|
| MINIMAL | 0-9 | Ideal para todas as atividades |
| LOW | 10-29 | Seguro para iniciantes |
| MEDIUM | 30-49 | Cuidado necessário, experientes recomendado |
| HIGH | 50-69 | Atividades não recomendadas |
| CRITICAL | 70-100 | Extremamente perigoso, ficar em casa |

## Instalação e Execução

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar o Servidor
```bash
# Da raiz do projeto
node mediaweather/index.js
```

O servidor estará disponível em `http://localhost:3000`

### 3. Abrir o Frontend
```bash
# Abrir mediaweather/index.html no navegador
# ou acessar http://localhost:3000
```

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **APIs**: Open-Meteo (clima), Firebase Admin SDK (para futuro armazenamento)
- **Data Storage**: JSON (ml-data para treino de ML)
- **CORS**: Habilitado para chamadas cross-origin

## Próximos Passos - Modelos ML

1. **Treino de Modelo Predictivo**
   - Usar dados armazenados em `ml-data/` para treinar modelo de previsão de segurança
   - Tecnologias: TensorFlow.js, scikit-learn (Python backend)

2. **Análise de Padrões Históricos**
   - Identificar horários/épocas mais seguras para trilhas
   - Correlações entre condições climáticas e acidentes

3. **Recomendações Personalizadas**
   - Basear-se no histórico de usuários
   - Sugerir trilhas específicas por nível de experiência

4. **Alertas em Tempo Real**
   - Notificar usuários sobre mudanças de risco
   - Avisos de tempestades/condições perigosas

## Créditos

- Dados meteorológicos: **Open-Meteo** e **WeatherAPI**
- Análise de segurança: Machine Learning customizado
- Localização: Rio de Janeiro, Brasil

## Licença

MIT

## Contato

Para dúvidas ou sugestões: [@thalesdevbr](https://github.com/thalesdevbr)
