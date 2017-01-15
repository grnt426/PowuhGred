/**
 * Handles the Build phase of the game, where players purchase slots on cities.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {Cities} cities
 * @constructor
 * @this {Building}
 */
exports.Building = function (engine, comms, cities) {

    /**
     * @type {Engine}
     */
    this.engine = engine;

    /**
     * @type {Communications}
     */
    this.comms = comms;

    /**
     * @type {Cities}
     */
    this.cities = cities;

    /**
     * @param {Object} data either pass, or [cityname, cityname2, ...]
     */
    this.buildCities = function(data){

        // Players can always choose to not purchase any cities
        if(data == "pass") {
            this.engine.nextPlayer();
        }
        else{

            var totalCost = this.computeCost(data);
            var currentPlayer = this.engine.getCurrentPlayer();

            if(!this.isValid(data)){
                // TODO: alert player invalid selection
            }
            else if(totalCost > currentPlayer.money){
                // TODO: alert player their selection is too expensive
            }

            // Otherwise, all good! Reserve the city slots and subtract the cost
            else{
                for(var i in data){
                    this.cities.purchaseCity(data[i], currentPlayer.uid);
                    currentPlayer.buildOnCity(this.cities.convertToCityObjects(data[i]));
                }
                currentPlayer.money -= totalCost;
                engine.nextPlayer();
            }
        }
    };

    this.computeCost = function(requestedCities){
        return this.cities.findOptimalPurchaseCostOrderOfCities(this.engine.getCurrentPlayer().cities, requestedCities) +
                this.cities.getTotalCostToBuild(requestedCities);
    };

    this.isValid = function(cities){
        var valid = true;
        for(var i in cities){
            valid &= this.cities.isCityAvailableForPurchase(cities[i], this.engine.getCurrentPlayer());
        }
        return valid;
    };
};