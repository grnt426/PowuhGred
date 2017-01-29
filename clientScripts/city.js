var cityjs = {}

cityjs.citiesDef = {};
cityjs.selectedCity = undefined;
cityjs.selectedCities = [];
cityjs.inactiveRegions = undefined;

cityjs.isCityActive = function(city) {
    return (cityjs.inactiveRegions.indexOf(city.region) == -1)
}