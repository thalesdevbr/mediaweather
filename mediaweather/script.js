// Rio de Janeiro button selection
const cityButtons = document.querySelectorAll('.city-btn');
const cityNameDisplay = document.getElementById('city-name');
const tempDisplay = document.querySelector('.temp-value');
const conditionDisplay = document.getElementById('weather-condition');
const humidityDisplay = document.getElementById('humidity');
const windSpeedDisplay = document.getElementById('wind-speed');
const RIO_DE_JANEIRO = 'Rio de Janeiro';

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fetch weather data from backend
 */
async function fetchWeatherData(city) {
    try {
        console.log('Fetching weather data for:', city);
        
        const response = await fetch(`${API_BASE_URL}/weather`);
        if (!response.ok) throw new Error('Failed to fetch weather data');
        
        const result = await response.json();
        if (result.success) {
            displayWeatherData(result.data);
            await fetchAndDisplaySafetyAnalysis();
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError('Unable to load weather data. Make sure the backend server is running.');
    }
}

/**
 * Display weather data on UI
 */
function displayWeatherData(weatherData) {
    const current = weatherData.current;
    
    // Update temperature
    tempDisplay.textContent = `${Math.round(current.temperature)}°C`;
    
    // Update weather condition
    conditionDisplay.textContent = getWeatherDescription(current.weatherCode);
    
    // Update humidity
    humidityDisplay.textContent = `${Math.round(current.humidity)}%`;
    
    // Update wind speed
    windSpeedDisplay.textContent = `${Math.round(current.windSpeed)} km/h`;
    
    console.log('Weather data displayed:', current);
}

/**
 * Get weather description from code (WMO code)
 */
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy with rime',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown';
}

/**
 * Fetch and display ML safety analysis
 */
async function fetchAndDisplaySafetyAnalysis() {
    try {
        const response = await fetch(`${API_BASE_URL}/safety-analysis`);
        if (!response.ok) throw new Error('Failed to fetch safety analysis');
        
        const result = await response.json();
        if (result.success) {
            displaySafetyAnalysis(result.data);
        }
    } catch (error) {
        console.error('Error fetching safety analysis:', error);
    }
}

/**
 * Display safety analysis data
 */
function displaySafetyAnalysis(safetyData) {
    console.log('Safety Analysis:', safetyData);
    
    const analysis = safetyData.safetyAnalysis;
    const recommendations = safetyData.trailRecommendations;
    
    // Create safety info section
    const safetyInfo = document.createElement('div');
    safetyInfo.className = 'safety-analysis';
    safetyInfo.innerHTML = `
        <h3>Safety Analysis</h3>
        <p><strong>Risk Level:</strong> <span class="risk-${analysis.riskLevel.toLowerCase()}">${analysis.riskLevel}</span></p>
        <p><strong>Risk Score:</strong> ${analysis.riskScore}/100</p>
        <p><strong>Recommendation:</strong> ${analysis.recommendation}</p>
        ${recommendations.length > 0 ? '<p><strong>Recommended Trail Difficulty:</strong> ' + recommendations[0].difficulty + '</p>' : ''}
    `;
    
    // Remove previous safety info if exists
    const existingInfo = document.querySelector('.safety-analysis');
    if (existingInfo) existingInfo.remove();
    
    // Add to weather card
    const weatherContent = document.querySelector('.weather-content');
    if (weatherContent) {
        weatherContent.appendChild(safetyInfo);
    }
}

/**
 * Display error message
 */
function displayError(message) {
    tempDisplay.textContent = 'Error';
    conditionDisplay.textContent = message;
}

// Add click event to city buttons
cityButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove active class from all buttons
        cityButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Update city name display
        const selectedCity = this.dataset.city;
        cityNameDisplay.textContent = selectedCity;
        
        // Fetch weather and ML safety data
        fetchWeatherData(selectedCity);
    });
});

// Initialize - select Rio de Janeiro by default and fetch data
if (cityButtons.length > 0) {
    cityButtons[0].click();
}
