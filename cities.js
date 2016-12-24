
var fs = require("fs"),
    allcombinations = require('allcombinations'),
	cityjs = require("./city.js"),
    util = require("./util.js");

exports.Cities = function(){

	/**
	 * String (name of city) -> City
	 * @type {Object<string, City>}
	 */
	this.cities = {};
	
	/**
	 * String (name of city A) + String (name of city B) -> Distance
	 * @type {Object<string, Object<string, number>>}
	 */
    this.cityDistDict = {};

	this.addCity = function(city){
		this.cities[city.name.toLowerCase()] = city;
	};

    /**
     * Computes the lowest cost route from start to end. Note: does NOT account for the cost of buying the city.
     *
     * @param start City to start from
     * @param end   City to go to
     * @returns {Object}    The shortest route and its cost
     */
	this.findCheapestRoute = function(start, end){
	    
	    var startDict = this.cityDistDict[start.name.toLowerCase()];
	    if(startDict === undefined) 
	    { 
	        startDict = this.cityDistDict[start.name.toLowerCase()] = {};
	    }
	    if(startDict[end.name.toLowerCase()] !== undefined) 
	    {
	        return startDict[end.name.toLowerCase()];
	    }
	    
		var cheapestRoutes = [];
		var neighbors = start.connections;
		var visited = [];
        var shortest = undefined;
		visited[start.name.toLowerCase()] = 0;

		// Add all our neighbors
		for(var city in neighbors){
			cheapestRoutes.push({
				path : [city],
				cost : neighbors[city].connection
			});
			visited[city] = neighbors[city].connection;
		}

		while(cheapestRoutes.length > 0){

            // We continuously re-evaluate which paths to look at by only looking at the currently cheapest path
			cheapestRoutes.sort(function(a,b){return a.cost - b.cost});
			shortest = cheapestRoutes.shift();
            var lastCity = shortest.path[shortest.path.length-1];
            var endName = end.name.toLowerCase();

            // We only want to terminate searching *after* the path we found is returned to us as the shortest path.
            // We don't want to terminate as soon as we find the end city anywhere, which is why we wait to terminate
            // until this if-statement.
            if(lastCity == endName)
                break;

            // Otherwise, we have to continue searching.
			neighbors = this.cities[lastCity].connections;

			// Iterate through all the neighbors of this new path
			for(city in neighbors){

                var cost = neighbors[city].connection + shortest.cost;

                // If we already visited this city, and we got to it cheaper, then we want to terminate searching on
                // this path; and kill cycles.
                if(visited[city] <= cost) {
                    continue;
                }

                // Make a copy of the previous path that got us here, add the neighbor we just visited, and add this
                // for consideration later.
                var newPath = util.deepCopy(shortest.path);
                newPath.push(city);
                cheapestRoutes.push({path:newPath, cost:cost});
                visited[city] = cost;
			}
		}
	    startDict[end.name.toLowerCase()] = shortest;
		return shortest;
	};

    /**
     * Finds the cheapest route from any of a player's cities to the destination city.
     *
     * TODO: Memoization would help us greatly here.
     *
     * @param cities    List of cities to try starting from
     * @param dest  City to path to
     * @returns {number}    The lowest cost found.
     */
    this.findArbitraryCheapestToDest = function(cities, dest){
        var lowestCost = 999, i;
        for(i in cities){
            var cost = this.findCheapestRoute(cities[i], dest).cost;
            if(cost < lowestCost)
                lowestCost = cost;
        }
        return lowestCost;
    };

    /**
     * Given a list of owned player cities and a list of destination cities, determine which ordering of purchases is
     * the most optimal so as to minimize cost.
     * @param cities    Cities owned by the player.
     * @param dests Destinations to purchase
     * @returns {number}    The cost to pay for connections to the given destinations.
     */
    this.findOptimalPurchaseCostOrderOfCities = function(cities, dests){
        var totalCost = 999;
        var possibleOrderings = allcombinations(dests);
        var next;
        while(!(next = possibleOrderings.next()).done){
            var cost = 0;
            var tempCities = util.deepCopy(cities);
            var comb = next.value;
            for(var i in comb){

                // Find the cheapest cost for this city given the cities we already have
                cost += this.findArbitraryCheapestToDest(this.convertToCityObjects(tempCities), comb[i]);

                // Then, add this city to cities we "have", so we recompute the next cheapest as this city a part of our
                // network.
                tempCities.push(comb[i].name);
            }
            if(cost < totalCost)
                totalCost = cost;
        }
        return totalCost;
    };

    this.convertToCityObjects = function(cities){
        var citiesO = [];
        for(var i in cities){
            citiesO.push(this.cities[cities[i].toLowerCase()]);
        }
        return citiesO;
    };

	/**
	 * Adds connections to the cities. Assumes that all cities have already been
	 * processed and added to this.cities.
	 * @param connections	The file to parse.
	 */
	this.parseCities = function(connections){
		var data = fs.readFileSync(connections).toString().split('\n');
		for(var line in data){
			var cityData = data[line];
			var cityArgs = cityData.split(' ');
			var name = cityArgs[0];
			var cost = parseInt(cityArgs[2]);
			var conn = cityArgs[1];
			var startCity = this.cities[name];
			startCity.connections[conn] = {connection:cost};
            this.cities[conn].connections[name] = {connection:cost};
		}
	};

	/**
	 * Reads in all the city names, their position, and region.
	 * @param filename	The file to parse.
	 */
    this.parseCityList = function(filename){
        if (!filename) filename = "data/germany_cities.txt";
        var fs = require('fs'), i;
        var array = fs.readFileSync(filename).toString().split("\n");
        for(i in array) {
            if(array[i]){
                var oneLine = array[i].split(" ");
                if(oneLine.length == 4) {
                    var newCity = new cityjs.City(oneLine[2]);
                    newCity.x = oneLine[0];
                    newCity.y = oneLine[1];
                    newCity.region = oneLine[3].replace(/(\r\n|\n|\r)/gm,"");

                    this.addCity(newCity);
                }
            }
        }
    };

    /**
     * @param city  Name of city to buy.
     * @param player    UID of Player
     */
    this.purchaseCity = function(city, player){
        this.cities[city.toLowerCase()].buildForPlayer(player);
    };

    /**
     * @param city  Name of city to check
     * @returns {boolean}
     */
    this.isCityAvailableForPurchase = function(city){
        return this.cities[city.toLowerCase()].canBuild();
    };

    /**
     * @param city  Name of city to check
     * @returns {number}    Cost to build there.
     */
    this.costToBuildOnCity = function(city){
        return this.cities[city.toLowerCase()].costToBuild();
    }
};
