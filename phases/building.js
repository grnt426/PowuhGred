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
            this.comms.toAll(this.engine.getCurrentPlayer().displayName + " has passed on purchasing cities.");
            this.engine.nextPlayer();
        }
        else{
            var cityErrors = [];
            var validPurchase = this.isValid(data, cityErrors);
            
            if(validPurchase !== true){
                this.comms.toCurrent(cityErrors[0]);
                return;
            }
            
            var totalCost = this.computeCost(data);
            var currentPlayer = this.engine.getCurrentPlayer();
            if(totalCost > currentPlayer.money){
                this.comms.toCurrent("The selected set of cities cost $" + totalCost + ", and you only have $" + currentPlayer.money);
            }

            // Otherwise, all good! Reserve the city slots and subtract the cost
            else{
                for(var i in data){
                    this.cities.purchaseCity(data[i], currentPlayer.uid);
                    currentPlayer.buildOnCity(this.cities.convertToCityObjects(data[i]));
                }
                this.comms.toAll(currentPlayer.displayName + " bought " + data);
                currentPlayer.money -= totalCost;
                this.engine.checkCityCounts(currentPlayer.cities.length);
                engine.nextPlayer();
            }
        }
    };

    this.computeCost = function(requestedCities){
        return this.cities.findOptimalPurchaseCostOrderOfCities(this.engine.getCurrentPlayer().cities, requestedCities) +
                this.cities.getTotalCostToBuild(requestedCities);
    };

    this.checkCost = function(requestedCities, player){
        return this.cities.findOptimalPurchaseCostOrderOfCities(player.cities, requestedCities) +
            this.cities.getTotalCostToBuild(requestedCities);
    };

    /**
     * Determines if the list of cities are all purchasable for that player.
     * @param {string[]} cities    The list of cities to check.
     * @param {string[]} errors
     * @returns {boolean}  True if all the cities are purchable, false if not.
     */
    this.isValid = function(cityNames, cityErrors){
        var city;
        var playerId = this.engine.getCurrentPlayer();
        var currentStep = this.engine.getCurrentStep(this.engine.BUILD);
        for(var name of cityNames){
            
            if(!this.cities.isCityActive(name, cityErrors)) {
                return false;
            }
            
            city = this.cities.convertToCityObjects(name);
            
            if(city.isPlayerHere(playerId)){
                cityErrors.push("Can't build at " + name + ", you have already have a house there.")
                return false;
            }
            
            if(!city.isThereFreeSpace(playerId, currentStep)){
                cityErrors.push("Can't build at " + name + ", it already has the maximum number of players for the current Step.")
                return false;
            }
        }
        
        return true;
    };
};