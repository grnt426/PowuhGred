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

    this.buildOnCity = function(city){
        this.cities.push(city);
    };

    this.replacePowerPlant = function(newPlant, oldPlant){
        delete this.plants[oldPlant.cost];
        this.plants[newPlant.cost] = newPlant;
    };

    this.getHighestCostPowerPlant = function(){
        var high = 0;
        for(var key in this.plants){
            if(key > high)
                high = key;
        }
        return high;
    };

    this.awardPlant = function(plant, bidCost){
        this.plants[plant.cost] = plant;
        this.money -= bidCost;
    };
};
