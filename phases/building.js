exports.Building = function (engine, comms, cities) {

    this.engine = engine;
    this.comms = comms;
    this.cities = cities;

    /**
     *
     * @param {Object} data either pass, or [cityname, cityname2, ...]
     */
    this.buildCities = function(data){

        // Players can always choose to not purchase any cities
        if(data == "pass") {
            this.engine.nextPlayer();
        }
        else{

            var totalCost = this.computeCost(data);
            var currentPlayer = this.engine.getCurrentPlayer();

            if(!this.isValid(data)){
                // TODO: alert player invalid selection
            }
            else if(totalCost > currentPlayer.money){
                // TODO: alert player their selection is too expensive
            }

            // Otherwise, all good! Reserve the city slots and subtract the cost
            else{
                for(i in data){
                    this.cities.purchaseCity(data[i], currentPlayer.uid);
                    currentPlayer.buildOnCity(data[i]);
                }
                currentPlayer.money -= totalCost;
                engine.nextPlayer();
            }
        }
    };

    this.computeCost = function(requestedCities){
        return this.cities.findOptimalPurchaseCostOrderOfCities(this.engine.getCurrentPlayer().cities, requestedCities) +
                this.cities.getTotalCostToBuild(requestedCities);
    };

    this.isValid = function(cities){
        var valid = true;
        for(i in cities){
            valid &= this.cities.isCityAvailableForPurchase(cities[i], this.engine.getCurrentPlayer());
        }
        return valid;
    };
};