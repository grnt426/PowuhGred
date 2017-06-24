var util = require("./util.js");

/**
 *
 * @param uid {string}
 * @param name {string}
 * @param comms {Communications}
 * @param socket {Socket}
 * @constructor
 * @this {Player}
 */
exports.Player = function(uid, name, comms, socket) {

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
    this.displayName = name;

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

    this.buildOnCity = function(city) {
        this.cities.push(city);
    };

    this.getPowerPlantCosts = function() {
        var costs = [];
        for(var p in this.plants) {
            costs.push(this.plants[p].cost);
        }
        return costs;
    };

    this.removePowerPlant = function(cost) {
        delete this.plants[cost];
    };

    this.getHighestCostPowerPlant = function() {
        var high = 0;
        for(var key in this.plants) {
            if(key > high)
                high = key;
        }
        return high;
    };

    this.awardPlant = function(plant, bidCost) {
        this.plants[plant.cost] = plant;
        this.money -= bidCost;
    };

    this.getPlantCount = function() {
        return util.olen(this.plants);
    };

    this.getMoney = function() {
        return this.money;
    };

    this.getPowerPlants = function() {
        return this.plants;
    };
};
