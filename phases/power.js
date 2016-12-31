/**
 * The Power (Bureaucracy) phase of the game.
 * @param {Engine} engine
 * @param {Communications} comms
 * @param {PowerPlant[]} powerPlants
 * @constructor
 * @this {Power}
 */
exports.Power = function (engine, comms, powerPlants) {

    this.engine = engine;
    this.comms = comms;
    this.powerPlants = powerPlants;
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
                for(var p in powerPlants){
                    powerableCities += powerPlants[p].activate();
                }

                // Players only get money for the number of actual cities they own and can power
                powerableCities = Math.min(player.cities.length, powerableCities);
                player.money += this.payTable[powerableCities];
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
            if(this.powerPlants.indexOf(cost) != -1){
                plants.push(powerPlants[cost]);
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
            ownsAll &= player.plants.indexOf(p) != -1;
        }
        return ownsAll;
    };
};