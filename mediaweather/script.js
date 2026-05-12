// City button selection
const cityButtons = document.querySelectorAll('.city-btn');
const citySearch = document.getElementById('city-search');
const cityNameDisplay = document.getElementById('city-name');

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
        
        // You can trigger weather API call here
        console.log('Selected city:', selectedCity);
        // fetchWeatherData(selectedCity);
    });
});

// Search functionality
citySearch.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    cityButtons.forEach(button => {
        const cityName = button.dataset.city.toLowerCase();
        
        if (cityName.includes(searchTerm)) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });
});

// Placeholder for weather API function
function fetchWeatherData(city) {
    // This function will be called when a city is selected
    // You can integrate it with your backend API
    console.log('Fetching weather data for:', city);
}

// Initialize - select first city by default
if (cityButtons.length > 0) {
    cityButtons[0].click();
}
