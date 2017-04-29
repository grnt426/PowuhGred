const threads = require('threads'),
    threadsConfig = threads.config,
    Pool = threads.Pool,
    threadPool = new Pool(4),
    util = require("./util.js"),
    fs = require("fs"),
    cityjs = require("./city.js");

const GRAPH_SEARCH_JS = "external/graphsearch.js";

/**
 * Manages the cities of the game, including searching to determine optimal costs of building new cities.
 * @constructor
 * @this {Cities}
 */
exports.Cities = function() {

    /**
     * String (name of city) -> City
     * @type {Object<string, City>}
     */
    this.cities = {};

    /**
     * String (name of city) -> City, which has been deactivated due to being part of a region that's not used by the current game
     * @type {Object<string, City>}
     */
    this.deactivatedCities = {};

    /**
     * list of names of active regions for this game
     * @type {String[]}
     */
    this.activeRegions = [];

    /**
     * String (name of city A) + String (name of city B) -> Distance
     * @type {Object<string, Object<string, number>>}
     */
    this.cityDistDict = {};

    // Set base paths to thread scripts
    threadsConfig.set({
        basepath : {
            browser : 'http://myserver.local/thread-scripts',
            node    : __dirname + '/../thread-scripts'
        }
    });

    threadPool.run(GRAPH_SEARCH_JS);

    this.addCity = function(city) {
        this.cities[city.name.toLowerCase()] = city;
    };

    this.findCheapestRoute = function(start, end){
        threadPool
            .send({action:'findCheapestRoute',
                data:{ctx:{cities:this.cities, cityDistDict:cityDistDict}, start:start, end:end}})
            .promise()
    };


    this.findArbitraryCheapestToDest = function(cities, dest){
        threadPool
            .send({action:'findArbitraryCheapestToDest',
                data:{ctx:{cities:this.cities, cityDistDict:cityDistDict}, cities:cities, dest:dest}})
            .promise()
    };

    this.findOptimalPurchaseCostOrderOfCities = function(cities, dests){
        threadPool
            .send({action:'findOptimalPurchaseCostOrderOfCities',
                data:{ctx:{cities:this.cities, cityDistDict:cityDistDict}, cities:cities, dests:dests}})
            .promise()
    };

    /**
     * Computes the total cost to just build the cities, but not its path from/to anywhere.
     * @param {string[]} cityNames    The cities to purchase
     * @returns {number}    The cost to build.
     */
    this.getTotalCostToBuild = function(cityNames) {
        var cost = 0;
        for(var name of cityNames) {
            cost += this.costToBuildOnCity(name);
        }
        return cost;
    };

    this.convertToCityObjects = function(cityNames) {
        if(!(cityNames instanceof Array)) {
            return this.cities[cityNames.toLowerCase()];
        }
        let citiesO = [];
        for(let name of cityNames) {
            citiesO.push(this.cities[name.toLowerCase()]);
        }
        return citiesO;
    };

    /**
     * Adds connections to the cities. Assumes that all cities have already been
     * processed and added to this.cities.
     * @param connections    The file to parse.
     */
    this.parseCities = function(connections) {
        var data = fs.readFileSync(connections).toString().split('\n');
        for(var line in data) {
            var cityData = data[line];
            var cityArgs = cityData.split(' ');
            var name = cityArgs[0];
            var cost = parseInt(cityArgs[2]);
            var conn = cityArgs[1];
            var startCity = this.cities[name];
            startCity.connections[conn] = cost;
            this.cities[conn].connections[name] = cost;
        }
    };

    /**
     * Reads in all the city names, their position, and region.
     * @param filename    The file to parse.
     */
    this.parseCityList = function(filename) {
        if(!filename) filename = "data/germany_cities.txt";
        var fs = require('fs'), i;
        var array = fs.readFileSync(filename).toString().split("\n");
        for(i in array) {
            if(array[i]) {
                var oneLine = array[i].split(" ");
                if(oneLine.length == 4) {
                    var newCity = new cityjs.City(oneLine[2]);
                    newCity.x = oneLine[0];
                    newCity.y = oneLine[1];
                    newCity.region = oneLine[3].replace(/(\r\n|\n|\r)/gm, "");

                    this.addCity(newCity);
                }
            }
        }
    };

    /**
     * @param {string} cityName  Name of city to buy.
     * @param player    UID of Player
     */
    this.purchaseCity = function(cityName, player) {
        this.cities[cityName.toLowerCase()].buildForPlayer(player);
    };

    /**
     * @param {string} cityName  Name of city to check
     * @returns {number}    Cost to build there.
     */
    this.costToBuildOnCity = function(cityName) {
        return this.cities[cityName.toLowerCase()].costToBuild();
    };

    /**
     * culls cities not included in this game
     * @param {string[]} names of active regions
     */
    this.onlyUseTheseRegions = function(activeRegions) {
        this.activeRegions = activeRegions;  // TODO: this should be picked (and validated against # players) before starting the game, hard coding for now
        for(var name in this.cities) {
            if(!this.activeRegions.includes(this.cities[name].region)) {
                this.deactivateCity(name);
            }
        }
    };

    /**
     * deactives a single city, moving it to this.deactivatedCities and deleting connections to it
     * @param {string} cityName name of the city to deactivate
     */
    this.deactivateCity = function(cityName) {
        this.deactivatedCities[cityName] = this.cities[cityName];
        for(var connCityName in this.cities[cityName].connections) {
            delete this.cities[connCityName].connections[cityName];
        }
        delete this.cities[cityName];
    };

    /**
     * deactives a single city, moving it to this.deactivatedCities and deleting connections to it
     * @param {string} cityName name of the city to check
     * @param {string[]} cityError error message if not active
     * @returns {boolean} true if city is active, false otherwise
     */
    this.isCityActive = function(cityName, cityErrors) {
        var city = this.cities[cityName];
        if(city === undefined) {
            city = this.deactivatedCities[cityName];
            if(city === undefined) {
                cityErrors.push("Can't build at " + cityName + ", that city does not exist.")
            }
            else {
                cityErrors.push("Can't build at " + cityName + ", the " + city.region + " region is not enabled for this game.")
            }
            return false;
        }
        return true;
    };
};
