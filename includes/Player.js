/**
 *
 * @param uid {string}
 * @param comms {Communications}
 * @param socket {Socket}
 * @constructor
 * @this {Player}
 */
exports.Player = function(uid, comms, socket){

    /**
     * Used for binding a player uniquely.
     * @type {string}
     */
    this.uid = uid;

    /**
     * @type {Communications}
     */
    this.comms = comms;

    /**
     * Name shown to all players in chats and in public.
     * @type {string}
     */
    this.displayName = uid;

    /**
     * @type {Socket}
     */
    this.socket = socket;

    /**
     *
     * @type {Object<number, PowerPlant>}
     */
    this.plants = {};

    /**
     * @type {number}
     */
    this.money = 0;

    /**
     * @type {City[]}
     */
    this.cities = [];

    /**
     * What color the player is in the game.
     * @type {string}
     */
    this.color = undefined;

    this.buildOnCity = function(city){
        this.cities.push(city);
    };

    this.getPowerPlantCosts = function(){
        var costs = [];
        for(p in this.plants){
            costs.push(this.plants[p].cost);
        }
        return costs;
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
