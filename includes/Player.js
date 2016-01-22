var res = require("./../State/Resources.js");

exports.Player = function(uid, comms, socket){

    this.uid = uid;
    this.comms = comms;
    this.displayName = uid;

    // Used only by comms to talk to that player directly.
    this.socket = socket;

    this.plants = [];
    this.money = 0;
    this.cities = [];
    this.resources = {};

    this.buildOnCity = function(city){
        this.cities.push(city.name);
    };

    this.replacePowerPlant = function(newPlant, oldPlant){
        delete this.plants[oldPlant.cost];
        this.plants[newPlant.cost] = newPlant;
    };

    this.getHighestCostPowerPlant = function(){
        var high = 0;
        for(var key in this.plants){
            if(this.plants[key].cost > high)
                high = this.plants[key].cost;
        }
        return high;
    };

    // TODO: check for more than allowed plants and allow player to trash plants if so
    this.awardPlant = function(plantCost, bidCost){
        this.plants.push(plantCost);
        this.money -= bidCost;
    };
};
