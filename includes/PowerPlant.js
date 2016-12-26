var res = require("./../State/Resources.js");

exports.PowerPlant = function(cost, type, requires, powers){

    this.cost = cost;
    this.type = type;
    this.requires = requires;
    this.powers = powers;
    this.resources = {};
    this.resources[res.COAL] = 0;
    this.resources[res.OIL] = 0;
    this.resources[res.GARBAGE] = 0;
    this.resources[res.URANIUM] = 0;

    this.addResources = function(resources){
        for(var r in resources){
            this.resources[r] += resources[r];
        }
    };

    this.canAddResources = function(resources){

        // Power Plants which don't require resources to activate can't have resources on them
        if(this.type == "free")
            return false;

        // Some power plants can burn both coal and oil, which we can handle as a special
        if(this.type == "both"){
            if(resources.indexOf(res.COAL) != -1 && resources.indexOf(res.OIL) != -1){
                return resources[res.COAL] + resources[res.OIL] +
                    this.resources[res.COAL] + this.resources[res.OIL] <= this.resources * 2;
            }
        }

        // TODO: Should only check the only resource we can have on this power plant
        for(var r in resources){
            if(this.resources[r] + resources[r] > this.requires * 2)
                return false;
        }

        return true;
    };


    this.canActivate = function(){

        // Free power plants can always be activated
        if(this.type == "free")
            return true;


        return false;
    };

    /**
     * Removes resources from itself, and returns the number of cities it could power.
     * @returns {number}    A positive number of cities that could be powered by this plant after activation.
     */
    this.activate = function(){
        if(this.type != "free"){
            // remove resources
        }
        return this.powers;
    };
};