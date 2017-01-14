var res = require("../State/Resources.js");

/**
 * Handles the market phase of the game, where players purchase resources to add to their power plants.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {PowerPlant[]} powerPlants
 * @constructor
 * @this {Market}
 */
exports.Market = function (engine, comms, powerPlants) {

    this.engine = engine;
    this.comms = comms;
    this.powerPlants = powerPlants;

    // The resources available for purchase.
    this.resources = {};

    /**
     * For now, the starting resources are assumed for the Germany map.
     *
     * TODO: Should take in a mapping of starting resources from a data file, as starting resources can vary per map played.
     */
    this.setupStartingResources = function () {
        this.resources[res.COAL] = 24;
        this.resources[res.OIL] = 18;
        this.resources[res.GARBAGE] = 6;
        this.resources[res.URANIUM] = 2;
    };

    /**
     * The expected data is either
     *    {P1:{coal:W, oil:X, garbage:Y, uranium:Z}, P2:{coal:W2, oil:X2, garbage:Y2, uranium:Z2}, ...}
     * or
     *    pass
     * @param data  The request from the user.
     */
    this.buyResources = function (data) {

        // It is ALWAYS valid for players to not purchase any resources
        if (data == "pass") {
            engine.nextPlayer();
        }

        else if(!this.validateRequest(data)){
            // TODO alert player of bad choice
        }

        // Otherwise, the player has requested resources
        else {
            var cost = this.computeTotalCost(data);
            var currentPlayer = this.engine.getCurrentPlayer();

            // Both conditions shouldn't be possible unless the UI has a bug or the player is spoofing messages.
            if (currentPlayer.money < cost) {
                console.info("Invalid purchase. Money: " + currentPlayer.money + ". Request: " + data);
            }
            else {
                console.info(currentPlayer.uid + " purchasing resources, at " + cost + " money");
                currentPlayer.money -= cost;
                for(var plant in data){
                    this.powerPlants[plant].addResources(data[plant]);
                    this.subtractResources(data[plant]);
                }
                engine.nextPlayer();
            }
        }
    };

    /**
     * TODO: Implement this.
     */
    this.replenishResources = function(){

    };

    this.subtractResources = function(resources){
        for(var type in resources){
            this.resources[type] -= resources[type];
        }
    };

    this.validateRequest = function(data){
        this.comms.debug(true, JSON.stringify(data));
        if(!this.validatePurchase(data)){
            this.comms.debug(true, "Not enough resources, or incorrect type of resource requested.");
            return false;
        }
        else if(!this.checkPowerPlantsCanStoreResources(data)){
            this.comms.debug(true, "Can not store requested resources.");
            return false;
        }
        else if(!this.checkPlayerOwnsPlants(data)){
            this.comms.debug(true, "...you don't own the power plant?");
            return false;
        }
        return true;
    };

    /**
     * Validates there are enough resources available to make the purchase, and that the kind of resource requested
     * is valid.
     *
     * @param data {Object} of type {P1:{coal:W, oil:X, garbage:Y, uranium:Z}, P2:{coal:W2, oil:X2, garbage:Y2, uranium:Z2}, ...}
     * @returns {boolean} True if those resources are available.
     */
    this.validatePurchase = function (data) {
        var valid = true;
        for(var plant in data) {

            // Check if the requested resources exist and are available to buy in quantities asked
            var resources = data[plant];
            for(var type in resources) {
                if (type != res.COAL && type != res.OIL && type != res.GARBAGE && type != res.URANIUM) {
                    return false;
                }
                var amt = resources[type];
                valid &= this.resources[type] >= amt;
            }
        }
        return valid;
    };

    this.checkPowerPlantsCanStoreResources = function(data){
        for(var plant in data) {
            // Check if the power plant can actually add all the resources requested.
            if (!this.powerPlants[plant].canAddResources(data[plant])) {
                return false;
            }
        }
        return true;
    };

    this.checkPlayerOwnsPlants = function(data){
        for(var plant in data) {
            var currentPlayer = this.engine.getCurrentPlayer();

            // Check if they own the power plant.
            if (currentPlayer.plants[plant] == undefined) {
                return false;
            }
        }
        return true;
    };

    /**
     * A convenience function which computes the total cost of all resources requested.
     * @param data {Object} of type {P1:{coal:W, oil:X, garbage:Y, uranium:Z}, P2:{coal:W2, oil:X2, garbage:Y2, uranium:Z2}, ...}
     * @returns {number} The total cost
     */
    this.computeTotalCost = function (data) {
        var cost = 0;
        for(var plantCost in data) {
            for(var type in data[plantCost]) {
                cost += this.computeCost(data[plantCost][type], type);
            }
        }
        return cost;
    };

    /**
     * Returns the total cost to purchase a particular type of resource.
     * @param amt   The amount to buy.
     * @param type  The kind of resource to buy.
     * @returns {number}    The cost to purchase.
     */
    this.computeCost = function (amt, type) {
        var cost = 0;
        for (var i = amt; i > 0; i--) {
            var available = this.resources[type];
            if (type == res.URANIUM) {
                if (available < 5) {
                    cost += 10 + 2 * (4 - available);
                }
                else {
                    cost += 8 - (available - 5);
                }
            }
            else {
                cost += 9 - Math.ceil(available / 3);
            }

            this.resources[type] -= 1;
        }

        // After computing the amount, put back what we subtracted to compute the answer.
        this.resources[type] += amt;
        return cost;
    };
};