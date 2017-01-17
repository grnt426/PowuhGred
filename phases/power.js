var util = require("../util.js");

/**
 * The Power (Bureaucracy) phase of the game.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {PowerPlant[]} powerPlants
 * @constructor
 * @this {Power}
 */
exports.Power = function (engine, comms, powerPlants) {

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
    this.powerCities = function (player, data) {
        if(this.playersPaid.indexOf(player.uid) != -1){
            // Alert player they can't make change their choice afterwards
        }
        else{
            var powerPlants = this.convertDataToPowerPlants(data);
            if(!this.ownsAllPlants(player, powerPlants)){
                // TODO: alert user they selected an invalid plant
            }
            else if(!this.canActivateAll(powerPlants)){
                // TODO: alert player they can't activate all their power plants
            }
            else{
                var powerableCities = 0;
                var resourcesConsumed = util.resourceList(0, 0, 0, 0);
                for(var p in powerPlants){
                    var plant = powerPlants[p];
                    powerableCities += plant.activate();
                    if(plant.type == "both"){
                        resourcesConsumed['coal'] += plant.selectedToBurn['coal'];
                        resourcesConsumed['oil'] += plant.selectedToBurn['oil'];
                    }
                    else{
                        resourcesConsumed[plant.type] += plant.requires;
                    }
                }

                // Players only get money for the number of actual cities they own and can power
                powerableCities = Math.min(player.cities.length, powerableCities);
                var payout = this.payTable[powerableCities];
                player.money += payout;
                this.comms.toAll(player.displayName + " earned $" + payout);
                this.playersPaid.push(player.uid);
                this.engine.returnUsedResources(resourcesConsumed);

                if(this.playersPaid.length == this.engine.getPlayerCount()){
                    this.playersPaid = [];
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
    this.convertDataToPowerPlants = function(data){

        /**
         * @type {PowerPlant[]}
         */
        var plants = [];
        for(var d in data){
            var cost = data[d];
            if(this.powerPlants[cost] != undefined){
                plants.push(this.powerPlants[cost]);
            }
            else{
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
    this.canActivateAll = function(plants){
        var activateAll = true;
        for(var p in plants){
            activateAll &= plants[p].canActivate();
        }
        return activateAll;
    };

    /**
     * @param {Player} player
     * @param {PowerPlant[]} plants
     * @returns {boolean}
     */
    this.ownsAllPlants = function(player, plants){
        var ownsAll = true;
        for(var p in plants){
            ownsAll &= player.plants[plants[p].cost] != undefined;
        }
        return ownsAll;
    };
};