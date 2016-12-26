exports.Power = function (engine, comms) {

    this.engine = engine;
    this.comms = comms;
    this.playersPaid = [];

    this.payTable = [10, 22, 33, 44, 54, 64, 73, 82, 90, 98, 105, 112, 118, 124, 129, 134, 138, 142, 145, 148, 150];

    /**
     *
     * @param player {Player} The player that requested what power plants to activate
     * @param data {Object} Cost of plants to activate
     */
    this.powerCities = function (player, data) {
        if(this.playersPaid.indexOf(player) != -1){
            // Alert player they can't make change their choice afterwards
        }
        else{
            if(!this.ownsAllPlants(player, data)){
                // TODO: alert user they selected an invalid plant
            }
            else if(!this.canActivateAll(data)){
                // TODO: alert player they can't activate all their power plants
            }
            else{
                var powerableCities = 0;
                for(var p in data){
                    powerableCities += data[p].activate();
                }

                // Players only get money for the number of actual cities they own and can power
                powerableCities = Math.min(this.player.cities.length, powerableCities);
                player.money += this.payTable[powerableCities];
            }
        }
    };

    this.canActivateAll = function(plants){
        var activateAll = true;
        for(var p in plants){
            activateAll &= plants[p].canActivate();
        }
        return activateAll;
    };

    /**
     * TODO: should implement to prevent messing with messages.
     * @param player
     * @param plants
     * @returns {boolean}
     */
    this.ownsAllPlants = function(player, plants){
        return true;
    };
};