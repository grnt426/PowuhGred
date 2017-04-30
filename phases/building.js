const util = require('../util.js');

/**
 * Handles the Build phase of the game, where players purchase slots on cities.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {Cities} cities
 * @constructor
 * @this {Building}
 */
exports.Building = function(engine, comms, cities) {

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
    this.buildCities = function(data) {

        // Players can always choose to not purchase any cities
        if(data === "pass") {
            this.comms.toAll(this.engine.getCurrentPlayer().displayName + " has passed on purchasing cities.");
            this.engine.nextPlayer();
        }
        else {
            let cityErrors = [];
            let validPurchase = this.isValid(data, cityErrors);

            if(validPurchase !== true) {
                this.comms.toCurrent(cityErrors[0]);
                return;
            }

            let playerCities = this.engine.getCurrentPlayer().cities;
            let self = this;
            Promise
                .resolve(this.cities.findOptimalPurchaseCostOrderOfCities(playerCities, data))
                .then(function(result){
                    let totalCost = result + self.cities.getTotalCostToBuild(data);
                    let currentPlayer = self.engine.getCurrentPlayer();
                    if(totalCost > currentPlayer.money) {
                        self.comms.toCurrent("The selected set of cities cost $" + totalCost + ", and you only have $" + currentPlayer.money);
                    }

                    // Otherwise, all good! Reserve the city slots and subtract the cost
                    else {
                        let citiesRequested = data;
                        for(let i in citiesRequested) {
                            self.cities.purchaseCity(citiesRequested[i], currentPlayer.uid);
                            currentPlayer.buildOnCity(self.cities.convertToCityObjects(citiesRequested[i]));
                        }
                        self.comms.toAll(currentPlayer.displayName + " bought " + citiesRequested + " for $" + totalCost);
                        currentPlayer.money -= totalCost;
                        self.engine.checkCityCounts(currentPlayer.cities.length);
                        engine.nextPlayer();
                        engine.broadcastGameState();
                    }
                })
                .catch(function(err){
                    console.error("Error in processing building request: " + err);
                });
        }
    };

    /**
     * Determines if the list of cities are all purchasable for that player.
     * @param {string[]} cities    The list of cities to check.
     * @param {string[]} errors
     * @returns {boolean}  True if all the cities are purchable, false if not.
     */
    this.isValid = function(cityNames, cityErrors) {
        var city;
        var playerId = this.engine.getCurrentPlayer();
        var currentStep = this.engine.getCurrentStep(this.engine.BUILD);
        for(var name of cityNames) {

            if(!this.cities.isCityActive(name, cityErrors)) {
                return false;
            }

            city = this.cities.convertToCityObjects(name);

            if(city.isPlayerHere(playerId)) {
                cityErrors.push("Can't build at " + name + ", you have already have a house there.");
                return false;
            }

            if(!city.isThereFreeSpace(playerId, currentStep)) {
                cityErrors.push("Can't build at " + name + ", it already has the maximum number of players for the current Step.");
                return false;
            }
        }

        return true;
    };
};