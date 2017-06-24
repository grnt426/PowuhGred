var res = require("./Resources.js");

/**
 *
 * @param cost {number}
 * @param type {string}
 * @param requires {number}
 * @param powers {number}
 * @constructor
 * @this {PowerPlant}
 */
exports.PowerPlant = function(cost = 0, type = '', requires = 0, powers = 0) {

    /**
     * Minimum cost to buy this power plant.
     * @type {number}
     */
    this.cost = cost;

    /**
     * What kind of resources does this plant burn.
     * @type {string}
     */
    this.type = type;

    /**
     * The number of resources this plant consumes to activate.
     * @type {number}
     */
    this.requires = requires;

    /**
     * The number of cities this power plant can activate for.
     * @type {number}
     */
    this.powers = powers;

    /**
     * Used exclusively by plants that can burn both coal and oil.
     * @type {Object.<String, number>}
     */
    this.selectedToBurn = {};
    this.selectedToBurn[res.COAL] = 0;
    this.selectedToBurn[res.OIL] = 0;

    /**
     * The amount of resources available for consumption on this power plant.
     * @type {Object<String, number>}
     */
    this.resources = {};
    this.resources[res.COAL] = 0;
    this.resources[res.OIL] = 0;
    this.resources[res.GARBAGE] = 0;
    this.resources[res.URANIUM] = 0;

    this.addResources = function(resources) {
        for(let r in resources) {
            this.resources[r] += resources[r];
        }
    };

    this.canAddResources = function(resources) {

        // Power Plants which don't require resources to activate can't have resources on them
        if(this.type === "free")
            return false;

        // Some power plants can burn both coal and oil, which we can handle as a special case
        if(this.type === "both") {
            return resources[res.COAL] + resources[res.OIL] +
                this.resources[res.COAL] + this.resources[res.OIL] <= this.requires * 2;
        }

        // TODO: Should only check the only resource we can have on this power plant
        for(let r in resources) {
            if(resources[r] !== 0 && r !== this.type)
                return false;
            if(this.resources[r] + resources[r] > this.requires * 2)
                return false;
        }

        return true;
    };

    this.removeResources = function(resources) {
        for(let r in resources) {
            this.resources[r] -= resources[r];
        }
    };

    this.canRemoveResources = function(resources) {

        // Power Plants which don't require resources couldn't even have resources on them
        if(this.type === "free")
            return false;

        for(let r in resources) {
            if(this.resources[r] - resources[r] < 0)
                return false;
        }

        return true;
    };

    /**
     * Determines if this plant has the resources available to activate.
     * @returns {boolean}   True if sufficient resources are available to activate, otherwise false.
     */
    this.canActivate = function() {

        // Free power plants can always be activated
        if(this.type === "free")
            return true;
        else if(this.type === "both") {
            return this.resources[res.COAL] + this.resources[res.OIL] >= this.requires;
        }
        return this.resources[this.type] >= this.requires;
    };

    /**
     * Removes resources from itself, and returns the number of cities it could power.
     * @returns {number}    A positive number of cities that could be powered by this plant after activation.
     */
    this.activate = function() {
        if(this.type !== "free") {
            if(this.type === "both") {
                for(type in this.selectedToBurn) {
                    this.resources[type] -= this.selectedToBurn[type];
                }
                this.selectedToBurn = {};
            }
            else {
                this.resources[this.type] -= this.requires;
            }
        }
        return this.powers;
    };

    this.createCopy = function(plant){
        this.cost = plant.cost;
        this.powers = plant.powers;
        this.requires = plant.requires;
        this.type = plant.type;
    };
};