var util = require("../util.js");

/**
 * The Power (Bureaucracy) phase of the game.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {PowerPlant[]} powerPlants
 * @constructor
 * @this {Power}
 */
exports.Power = function(engine, comms, powerPlants) {

    /**
     * @type {Engine}
     */
    this.engine = engine;

    /**
     * @type {Communications}
     */
    this.comms = comms;

    /**
     * @type {PowerPlant[]}
     */
    this.powerPlants = powerPlants;

    /**
     * List of UIDs.
     * @type {String[]}
     */
    this.playersPaid = [];

    this.payTable = [10, 22, 33, 44, 54, 64, 73, 82, 90, 98, 105, 112, 118, 124, 129, 134, 138, 142, 145, 148, 150];

    /**
     * Players indicate which power plants to activate, their plants burn resources, and the player gets the money.
     * @param {Player} player The player that requested what power plants to activate
     * @param {number[]} data Cost of plants to activate
     */
    this.powerCities = function(player, data) {
        if(this.playersPaid.indexOf(player.uid) != -1) {
            // Alert player they can't make change their choice afterwards
        }
        else {
            var powerPlants = this.convertDataToPowerPlants(data);
            if(!this.ownsAllPlants(player, powerPlants)) {
                this.comms.toCurrent("You do not own all the power plants selected...?");
            }
            else if(!this.canActivateAll(powerPlants)) {
                this.comms.toCurrent("Not all the plants selected can be activated.");
            }
            else {
                var powerableCities = 0;
                var resourcesConsumed = util.resourceList(0, 0, 0, 0);
                for(var p in powerPlants) {
                    var plant = powerPlants[p];
                    if(plant.type == "both") {
                        resourcesConsumed['coal'] += plant.selectedToBurn['coal'];
                        resourcesConsumed['oil'] += plant.selectedToBurn['oil'];
                    }
                    else {
                        resourcesConsumed[plant.type] += plant.requires;
                    }
                    powerableCities += plant.activate();
                }

                // Players only get money for the number of actual cities they own and can power
                powerableCities = Math.min(player.cities.length, powerableCities);
                var payout = this.payTable[powerableCities];
                player.money += payout;
                this.comms.toAll(player.displayName + " earned $" + payout);
                this.playersPaid.push(player.uid);
                this.engine.returnUsedResources(resourcesConsumed);

                if(this.playersPaid.length == this.engine.getPlayerCount()) {
                    this.playersPaid = [];
                    this.engine.removePowerPlantFromRoundEnd();
                    this.engine.nextAction();
                }
            }
        }
    };

    /**
     * Will convert a list of power plant costs into PowerPlant objects.
     * @param {number[]} data list of costs of the power plant
     * @returns {boolean|PowerPlant[]}
     */
    this.convertDataToPowerPlants = function(data) {

        /**
         * @type {PowerPlant[]}
         */
        var plants = [];
        for(var d in data) {
            var cost = d;
            var plant = this.powerPlants[cost];
            if(plant != undefined) {
                plants.push(plant);
                plant.selectedToBurn = data[d];
            }
            else {
                return false;
            }
        }
        return plants;
    };

    /**
     *
     * @param {PowerPlant[]} plants
     * @returns {boolean}
     */
    this.canActivateAll = function(plants) {
        var activateAll = true;
        for(var p in plants) {
            activateAll &= plants[p].canActivate();
        }
        return activateAll;
    };

    /**
     * @param {Player} player
     * @param {PowerPlant[]} plants
     * @returns {boolean}
     */
    this.ownsAllPlants = function(player, plants) {
        var ownsAll = true;
        for(var p in plants) {
            ownsAll &= player.plants[plants[p].cost] !== undefined;
        }
        return ownsAll;
    };

    this.whoCanPowerTheMost = function() {
        var mostPowered = [];
        var mostPowerableAmount = -1;
        for(var p in this.engine.players) {
            var player = this.engine.players[p];
            var canPower = 0;
            for(var plantCost in player.plants) {
                var plant = player.plants[plantCost];
                if(plant.canActivate()) {
                    canPower += plant.powers;
                }
            }
            canPower = Math.min(player.cities.length, canPower);
            if(canPower > mostPowerableAmount) {
                mostPowered = [player];
                mostPowerableAmount = canPower;
            }
            else if(canPower >= mostPowerableAmount) {
                mostPowered.push(player);
            }
        }
        return mostPowered;
    };
};