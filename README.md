# MediaWeather - Rio de Janeiro Coastal Regions Safety Analysis

Um aplicativo inteligente de análise de segurança para atividades costeiras no Rio de Janeiro, utilizando dados meteorológicos em tempo real e Machine Learning.

## Regiões Litorâneas Suportadas

1. **Zona Sul** (Padrão) - Copacabana, Ipanema, Leblon
   - Praias icônicas e trilhas de montanha
   - Atividades: Beach, Hiking, Climbing, Water Sports

2. **Zona Oeste** - Recreio, Barra, Prainha
   - Excelentes condições para surf
   - Atividades: Surfing, Beach, Hiking, Water Sports

3. **Saquarema** - Lagos e praias para esportes aquáticos
   - Região ideal para windsurfe
   - Atividades: Surfing, Windsurfing, Beach, Kitesurfing

4. **Arraial do Cabo** - Águas cristalinas do litoral leste
   - Paradise para mergulho e snorkel
   - Atividades: Diving, Snorkeling, Beach, Boat Tours

5. **Ilha Grande** - Ilha paradisíaca na costa sul
   - Natureza intocada e vida marinha
   - Atividades: Beach, Diving, Snorkeling, Hiking

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
- Coordenadas específicas para cada região litorânea

### 2. **Análise de Segurança com ML**
O sistema analisa fatores de risco:
- **Velocidade do vento**: Determina segurança para water sports (surf, windsurfe)
- **Precipitação**: Alerta para visibilidade em mergulho e snorkel
- **Temperatura da água**: Importante para atividades aquáticas
- **Umidade**: Avalia conforto para atividades de praia

### 3. **Recomendações de Atividades por Região**

#### Illa Grande
- **Merging & Snorkel**: Águas cristalinas (até 25m visibilidade)
- **Atividades de Praia**: Praias intocadas e isoladas
- **Trilhas**: Vegetação nativa e fauna silvestre

#### Zona Oeste
- **Surf**: Ondas consistentes especialmente em Prainha e Recreio
- **Esportes Aquáticos**: Condições variadas para diferentes níveis
- **Caminhadas**: Praias selvagens e vista panorâmica

#### Zona Sul
- **Praias**: Água mais cálida, infraestrutura completa
- **Trilhas de Montanha**: Vistas urbanas e natureza
- **Escalada**: Picos rochosos com desafio técnico

#### Saquarema
- **Surf & Windsurfe**: Condições ideais com ventos específicos
- **Kitesurfe**: Lagoas com ventos fortes
- **Atividades Aquáticas**: Água calma ou agitada conforme necessário

#### Arraial do Cabo
- **Mergulho & Snorkel**: Biodiversidade marinha excepcional
- **Passeios de Barco**: Tours para ilhas e cavernas submarinas
- **Praia**: Água cristalina e preservação marinha

### 4. **Coleta de Dados para ML**
- Todos os dados analisados são armazenados em `ml-data/weather-YYYY-MM-DD.json`
- Padrão: Um arquivo por dia com múltiplas entradas de análise
- Pronto para treino de modelos de previsão mais sofisticados

## API REST Endpoints

### GET `/api/regions`
Lista todas as regiões litorâneas disponíveis.

### GET `/api/weather?region=<region>`
Retorna dados meteorológicos atuais de uma região específica.

**Query Parameters:**
- `region` (string, default: 'Zona Sul') - Nome da região

### GET `/api/safety-analysis?region=<region>`
Realiza análise completa de segurança e retorna recomendações de atividades.

**Query Parameters:**
- `region` (string, default: 'Zona Sul') - Nome da região

### GET `/api/risk-assessment?region=<region>`
Retorna apenas a avaliação de risco detalhada.

**Query Parameters:**
- `region` (string, default: 'Zona Sul') - Nome da região

### GET `/api/activity-recommendations?region=<region>`
Retorna apenas as recomendações de atividades para a região.

**Query Parameters:**
- `region` (string, default: 'Zona Sul') - Nome da região

**Exemplo de Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-05-12T15:30:00Z",
    "region": "Arraial do Cabo",
    "riskLevel": "LOW",
    "activities": [
      {
        "activity": "Diving & Snorkeling",
        "locations": ["Gruta do Cabo", "Praia Grande", "Tartaruga Beach"],
        "reason": "Crystal clear waters",
        "safety": "Safe - excellent visibility"
      },
      {
        "activity": "Boat Tours & Beach",
        "locations": ["Praia Grande", "Farol Beach", "Banana Island"],
        "reason": "Great for exploration",
        "safety": "Check sea conditions"
      }
    ]
  }
}
```

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
   - Identificar horários/épocas mais seguras para atividades costeiras
   - Correlações entre condições climáticas e acidentes marítimos

3. **Recomendações Personalizadas**
   - Basear-se no histórico de usuários
   - Sugerir atividades específicas por experiência

4. **Alertas em Tempo Real**
   - Notificar usuários sobre mudanças de risco
   - Avisos de tempestades/condições perigosas

5. **Análise Marinha Avançada**
   - Integrar dados de ondas e marés
   - Correntes marítimas e segurança de mergulho

## Créditos

- Dados meteorológicos: **Open-Meteo** e **WeatherAPI**
- Análise de segurança: Machine Learning customizado
- Localização: Regiões costeiras do Rio de Janeiro, Brasil

## Licença

MIT

## Contato

Para dúvidas ou sugestões: [@thalesdevbr](https://github.com/thalesdevbr)
