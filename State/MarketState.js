var res = require("./Resources.js");

function MarketState(){

    // The resources available for purchase. String -> Int
    this.resources = {};

    this.setupStartingResources = function(){
        this.resources[res.COAL] = 24;
        this.resources[res.OIL] = 18;
        this.resources[res.GARBAGE] = 6;
        this.resources[res.URANIUM] = 2;
    };

    this.generateStartResourcesForPlayer = function(){
        var playerRes = {};
        playerRes[res.COAL] = 0;
        playerRes[res.OIL] = 0;
        playerRes[res.GARBAGE] = 0;
        playerRes[res.URANIUM] = 0;

        return playerRes;
    };

    this.calculateCost = function(totalResources){
        var totalCost = 0;

        // Calculate totals...

        return totalCost;
    }
};

exports.MarketState = MarketState;