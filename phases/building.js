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

            var totalCost = this.computeCost(data);
            var currentPlayer = this.engine.getCurrentPlayer();

            var validPurchase = this.isValid(data);
            if(validPurchase !== true){
                this.comms.toCurrent((validPurchase.length == 1 ? "This city is " : " These cities are ")
                        + " not available for purchase: " + validPurchase);
            }
            else if(totalCost > currentPlayer.money){
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
                engine.nextPlayer();
            }
        }
    };

    this.computeCost = function(requestedCities){
        return this.cities.findOptimalPurchaseCostOrderOfCities(this.engine.getCurrentPlayer().cities, requestedCities) +
                this.cities.getTotalCostToBuild(requestedCities);
    };

    /**
     * Determines if the list of cities are all purchasable for that player.
     * @param {string[]} cities    The list of cities to check.
     * @returns {boolean|string[]}  True if all the cities are purchable, otherwise a list of the cities by name which
     *                              aren't valid are returned.
     */
    this.isValid = function(cities){
        var invalidCities = [];
        for(var i in cities){
            if(!this.cities.isCityAvailableForPurchase(cities[i], this.engine.getCurrentPlayer(), this.engine.getCurrentStep())){
                invalidCities.push(cities[i]);
            }
        }
        return invalidCities.length == 0 ? true : invalidCities;
    };
};