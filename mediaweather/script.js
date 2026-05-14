// Coastal regions selection and management
const regionsContainer = document.querySelector('.regions-list');
let regionButtons = [];
const cityNameDisplay = document.getElementById('city-name');
const tempDisplay = document.querySelector('.temp-value');
const conditionDisplay = document.getElementById('weather-condition');
const humidityDisplay = document.getElementById('humidity');
const windSpeedDisplay = document.getElementById('wind-speed');
const zoneDisplay = document.getElementById('zone-type');
const activitiesDisplay = document.getElementById('region-activities');
const descriptionDisplay = document.getElementById('region-description');

// API Base URL (relative path for same-origin deployment)
const API_BASE_URL = '/api';

// Current selected region
let currentRegion = 'Zona Sul';

// Map state
let map = null;
const regionMarkers = {};

/**
 * Fetch weather data from backend for a specific region
 */
async function fetchWeatherData(region) {
    setLoading(true);
    try {
        console.log('Fetching weather data for:', region);
        
        const response = await fetch(`${API_BASE_URL}/weather?region=${encodeURIComponent(region)}`);
        if (!response.ok) throw new Error('Failed to fetch weather data');
        
        const result = await response.json();
        if (result.success) {
            displayWeatherData(result.data);
            await fetchAndDisplaySafetyAnalysis(region);
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayError('Unable to load weather data. Make sure the backend server is running.');
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    const weatherContent = document.querySelector('.weather-content');
    const weatherCard = document.querySelector('.weather-card');
    if (!weatherContent || !weatherCard) return;

    if (isLoading) {
        weatherCard.classList.add('is-loading');
        regionButtons.forEach(btn => btn.disabled = true);
    } else {
        weatherCard.classList.remove('is-loading');
        regionButtons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Display weather data on UI
 */
function displayWeatherData(weatherData) {
    const current = weatherData.current;
    const location = weatherData.location;
    
    // Update temperature
    tempDisplay.textContent = `${Math.round(current.temperature)}°C`;
    
    // Update weather condition
    conditionDisplay.textContent = getWeatherDescription(current.weatherCode);
    
    // Update humidity
    humidityDisplay.textContent = `${Math.round(current.humidity)}%`;
    
    // Update wind speed
    windSpeedDisplay.textContent = `${Math.round(current.windSpeed)} km/h`;
    
    // Update region info
    cityNameDisplay.textContent = location.region;
    zoneDisplay.textContent = location.zone;
    activitiesDisplay.textContent = location.activities.join(', ');
    descriptionDisplay.textContent = location.description;
    updateMapMarker(currentRegion);

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
async function fetchAndDisplaySafetyAnalysis(region) {
    try {
        const response = await fetch(`${API_BASE_URL}/safety-analysis?region=${encodeURIComponent(region)}`);
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
 * Display safety analysis and activity recommendations
 */
function displaySafetyAnalysis(safetyData) {
    console.log('Safety Analysis:', safetyData);

    const analysis = safetyData.safetyAnalysis;
    const recommendations = safetyData.activityRecommendations;
    const uvIndex = safetyData.uvIndex ?? null;
    const trend = safetyData.trend ?? null;

    const uvLevel = uvIndex !== null
        ? (uvIndex >= 11 ? 'Extreme' : uvIndex >= 8 ? 'Very High' : uvIndex >= 6 ? 'High' : uvIndex >= 3 ? 'Moderate' : 'Low')
        : null;

    // Create safety info section
    let safetyHTML = `
        <h3>Safety Analysis</h3>
        <p><strong>Risk Level:</strong> <span class="risk-${analysis.riskLevel.toLowerCase()}">${analysis.riskLevel}</span></p>
        <p><strong>Risk Score:</strong> ${analysis.riskScore}/100</p>
        ${uvLevel ? `<p><strong>UV Index:</strong> <span class="uv-badge uv-${uvLevel.toLowerCase().replace(' ', '-')}">${uvIndex} — ${uvLevel}</span></p>` : ''}
        ${trend && trend.worsening ? `<p class="trend-warning">&#9888; Rain expected: ${trend.precipitationProbability6h}% probability in next 6h</p>` : ''}
        <p><strong>Recommendation:</strong> ${analysis.recommendation}</p>
    `;
    
    // Add activity recommendations
    if (recommendations.length > 0) {
        safetyHTML += '<h4 style="margin-top: 15px;">Recommended Activities</h4>';
        recommendations.forEach(rec => {
            safetyHTML += `
                <div class="activity-recommendation">
                    <p><strong>${rec.activity}</strong> - <span class="safety-badge">${rec.safety}</span></p>
                    <p style="margin: 5px 0; font-size: 13px;">📍 ${rec.locations.join(', ')}</p>
                    <p style="margin: 5px 0; font-size: 12px; color: #666;">${rec.reason}</p>
                </div>
            `;
        });
    }
    
    const safetyInfo = document.createElement('div');
    safetyInfo.className = 'safety-analysis';
    safetyInfo.innerHTML = safetyHTML;
    
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

function initMap(regions) {
    if (map) return;
    map = L.map('map', { zoomControl: true }).setView([-23.0, -43.2], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
    }).addTo(map);

    regions.forEach(region => {
        if (!region.latitude || !region.longitude) return;
        const marker = L.circleMarker([region.latitude, region.longitude], {
            radius: 10,
            fillColor: '#0066cc',
            color: '#004499',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(`<strong>${region.name}</strong><br><em>${region.zone}</em>`);
        marker.on('click', () => {
            const btn = [...regionButtons].find(b => b.dataset.region === region.name);
            if (btn) btn.click();
        });
        regionMarkers[region.name] = marker;
    });
}

function updateMapMarker(regionName) {
    if (!map) return;
    Object.values(regionMarkers).forEach(marker => {
        marker.setStyle({ fillColor: '#0066cc', radius: 10, fillOpacity: 0.8 });
        marker.closePopup();
    });
    const marker = regionMarkers[regionName];
    if (marker) {
        marker.setStyle({ fillColor: '#ff6600', radius: 14, fillOpacity: 1 });
        marker.openPopup();
        map.panTo(marker.getLatLng(), { animate: true });
    }
}

function bindRegionButtons() {
    regionButtons = document.querySelectorAll('.region-btn');
    regionButtons.forEach(button => {
        button.addEventListener('click', function() {
            regionButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentRegion = this.dataset.region;
            fetchWeatherData(currentRegion);
        });
    });
}

async function loadRegions() {
    try {
        const response = await fetch(`${API_BASE_URL}/regions`);
        if (!response.ok) throw new Error('Failed to load region list');

        const result = await response.json();
        if (!result.success) throw new Error('Invalid region response');

        initMap(result.data);
        regionsContainer.innerHTML = result.data.map((region, index) => {
            return `<button class="region-btn${index === 0 ? ' active' : ''}" data-region="${region.name}">${region.name}</button>`;
        }).join('');

        bindRegionButtons();

        if (regionButtons.length > 0) {
            currentRegion = regionButtons[0].dataset.region;
            regionButtons[0].click();
        }
    } catch (error) {
        console.error('Error loading regions:', error);
        regionsContainer.innerHTML = '<p>Unable to load regions.</p>';
    }
}

loadRegions();
