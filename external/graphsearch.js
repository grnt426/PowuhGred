let memoryStore = undefined,
    nodeCacheStore = undefined;
const fs = require('fs'),
    perfect = require('perfect'),
    md5 = require('md5');
const REGION_ORDER = ['cyan', 'brown', 'red', 'yellow', 'blue', 'purple'];

module.exports = function (request, done) {
    console.info("Incoming Request: " + JSON.stringify(request));

    // TODO: we should leverage Memcached as a cache for our memoized search. For now, memoized results are thrown away.
    let data = request.data;

    if(data.ctx.run_mode === "debug"){

        if(nodeCacheStore === undefined){
            let NodeCache = require('node-cache');
            nodeCacheStore = new NodeCache();
        }
        console.info("Keys: " + JSON.stringify(nodeCacheStore.keys()));

        let regionKey = undefined;
        for(let i = 0; i < REGION_ORDER.length; i++){
            if(data.ctx.regions.indexOf(REGION_ORDER[i]) !== -1){
                if(regionKey !== undefined) {
                    regionKey = regionKey + " " + REGION_ORDER[i];
                }
                else{
                    regionKey = REGION_ORDER[i];
                }
            }
        }
        data.ctx.regionKey = regionKey;

        if(memoryStore === undefined) {
            fs.readFile('data/pathcosts.txt', 'utf-8', function(err, contents){
                if(err){
                    console.error("Error reading file: " + JSON.stringify(err));
                }
                else{
                    let timeStart = Date.now();
                    buildMemoryCache(contents, data);
                    console.info("Took " + (Date.now() - timeStart) + "ms to read file.");
                    let value = resolve(request, data);
                    done(value);
                }
            });
        }
        else{
            done(resolve(request, data));
        }

    }
    else{
        // build memcached client, if not defined
        if(nodeCacheStore === undefined){
            let NodeCache = require('node-cache');
            nodeCacheStore = new NodeCache();
        }

        done(resolve(request, data));
    }
};

function NaiveDict(){
    this.keys = [];
    this.values = [];
}
NaiveDict.prototype.set = function(key, value){
    this.keys.push(key);
    this.values.push(value)
};
NaiveDict.prototype.get = function(lookupKey){
    for (var i=0;i<this.keys.length;i++){
        var key = this.keys[i];
        if (key === lookupKey) {
            return this.values[i];
        }
    }
};

let bucketCount = 100000;
let buckets = [];
for (let i=0; i< bucketCount;i++){
    buckets.push(new NaiveDict());
}

function getBucketIndex(key){
    return hash(key) % bucketCount;
}
function getBucket(key){
    return buckets[getBucketIndex(key)];
}

function set(key, value){
    getBucket(key).set(key, value);
}

function get(lookupKey){
    return getBucket(lookupKey).get(lookupKey);
}

function buildMemoryCache(fileContent, request){

    console.info("Building memory cache...");
    let lines = fileContent.split("\n");
    // memoryStore = [];
    for(let i = 0; i < lines.length; i++){
        let line = lines[i];
        if(line.length !== 0) {
            let data = line.split("|");
            let regions = data[0];
            if(regions !== request.ctx.regionKey)
                continue;
            let path = data[1].split("=");
            let names = path[0].split(">");
            let cost = Number(path[1]);
            set(regions + "|" + names[0] + ">" + names[1], cost);
            set(regions + "|" + names[1] + ">" + names[0], cost);
            // nodeCacheStore.set(names[1] + ">" + names[0], cost);
            // nodeCacheStore.set(names[0] + ">" + names[1], cost);
        }
    }
    console.info(JSON.stringify(buckets));
    // console.info("Store: " + JSON.stringify(memoryStore));
}

function hash(key){
    let hash = 0;
    if (key.length === 0) return hash;
    for (let i = 0; i < key.length; i++) {
        hash = (hash<<5) - hash;
        hash = hash + key.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function resolve(request, data){
    if(request.action === "findOptimalPurchaseCostOrderOfCities") {
        let result = 0;

        try {
            let timeStart = Date.now();
            result = findOptimalPurchaseCostOrderOfCities(data.ctx, data.cities, data.dests);
            console.info("NEW: Took " + (Date.now() - timeStart) + "ms to resolve. With " + data.ctx.count + " lookups.");
            console.info("Stats: " + JSON.stringify(nodeCacheStore.getStats()));
            data.ctx.count = undefined;
            timeStart = Date.now();
            result = findOptimalPurchaseCostOrderOfCitiesOld(data.ctx, data.cities, data.dests);
            console.info("OLD: Took " + (Date.now() - timeStart) + "ms to resolve.");
        }
        catch(err){
            console.error("Error in finding optimal: " + err);
        }
        return result;
    }
    else if(request.action === "findArbitraryCheapestToDest") {
        let result = 0;
        try{
            result = findArbitraryCheapestToDest(data.ctx, data.cities, data.dest);
        }
        catch(err){
            console.error("Error in finding arbitrary cheapest: " + err);
        }
        return result;
    }
    else {
        return "Invalid request!";
    }
}

/**
 * Computes the lowest cost route from start to end. Note: does NOT account for the cost of buying the city.
 *
 * @param {City} start City to start from
 * @param {City} end   City to go to
 * @param {boolean} [debug=false]
 * @returns {Number}    The cost
 */
function findCheapestRoute(ctx, start, end, debug = false) {
    let cost = 999;

    return cost;
}

function findCheapestRouteOld(ctx, start, end, debug = false){
    if(debug) console.info("PATH " + JSON.stringify(start) + " => " + JSON.stringify(end));

    let startDict = ctx.cityDistDict[start.name.toLowerCase()];
    if(startDict === undefined) {
        startDict = ctx.cityDistDict[start.name.toLowerCase()] = {};
    }
    if(startDict[end.name.toLowerCase()] !== undefined) {
        return startDict[end.name.toLowerCase()];
    }

    let cheapestRoutes = [];
    let neighbors = start.connections;
    let visited = [];
    let shortest = {};
    visited[start.name.toLowerCase()] = 0;

    // Add all our neighbors
    for(let city in neighbors) {
        cheapestRoutes.push({
            path: [city],
            cost: neighbors[city]
        });
        visited[city] = neighbors[city];
    }

    while(cheapestRoutes.length > 0) {

        // We continuously re-evaluate which paths to look at by only looking at the currently cheapest path
        cheapestRoutes.sort(function(a, b) {
            return a.cost - b.cost
        });
        shortest = cheapestRoutes.shift();
        let lastCity = shortest.path[shortest.path.length - 1];
        let endName = end.name.toLowerCase();

        // We only want to terminate searching *after* the path we found is returned to us as the shortest path.
        // We don't want to terminate as soon as we find the end city anywhere, which is why we wait to terminate
        // until this if-statement.
        if(lastCity === endName)
            break;

        // Otherwise, we have to continue searching.
        neighbors = ctx.cities[lastCity].connections;

        // Iterate through all the neighbors of this new path
        for(let city in neighbors) {

            let cost = neighbors[city] + shortest.cost;

            // If we already visited this city, and we got to it cheaper, then we want to terminate searching on
            // this path; and kill cycles.
            if(visited[city] <= cost) {
                continue;
            }

            // Make a copy of the previous path that got us here, add the neighbor we just visited, and add this
            // for consideration later.
            let newPath = deepCopy(shortest.path);
            newPath.push(city);
            cheapestRoutes.push({path: newPath, cost: cost});
            visited[city] = cost;
        }
    }
    startDict[end.name.toLowerCase()] = shortest;
    return shortest;
}

/**
 * Finds the cheapest route from any of a player's cities to the destination city.
 *
 * @param cities    List of cities to try starting from
 * @param dest  City to path to
 * @returns {number}    The lowest cost found.
 */
function findArbitraryCheapestToDest(ctx, cities, dest) {
    let lowestCost = 999;
    for(let i in cities) {
        let cost = undefined;
        if(ctx.run_mode === "debug"){
            // console.info(hash(cities[i].name + ">" + dest.name));
            cost = get(cities[i].name + ">" + dest.name);
            // cost = nodeCacheStore.get(cities[i].name + ">" + dest.name);
            // console.info("Cost: " + cost);
        }
        else{

        }
        if(isNaN(cost)){
            // console.info("Bad cost? " + cost);
        }
        if(cost < lowestCost)
            lowestCost = cost;
    }
    return lowestCost;
}

function findArbitraryCheapestToDestOld(ctx, cities, dest) {
    let lowestCost = 999;
    for(let i in cities) {
        let cost = findCheapestRouteOld(ctx, cities[i], dest).cost;
        if(isNaN(cost)){
            // console.info("OLD Bad cost? " + cost);
        }
        if(cost < lowestCost)
            lowestCost = cost;
    }
    return lowestCost;
}

/**
 * Given a list of owned player cities and a list of destination cities, determine which ordering of purchases is
 * the most optimal so as to minimize cost.
 * @param cities    Cities owned by the player.
 * @param dests Destinations to purchase
 * @returns {number}    The cost to pay for connections to the given destinations.
 */
function findOptimalPurchaseCostOrderOfCities(ctx, cities, dests) {

    // In the very edge case of no existing cities and one destination city, this function
    // will not work simply. Instead, just return a cost of 0, as there are no connections to make.
    if(dests.length === 1 && cities.length === 0) {
        return 0;
    }

    let totalCost = 999;
    let possibleOrderings = allcombinations(dests);
    let next;
    let bestOrder = [];
    while(!(next = possibleOrderings.next()).done) {
        let cost = 0;
        let tempCities = deepCopy(cities);
        let comb = next.value;

        // In the special case where the player has no cities (beginning of the game), we need to seed the start
        // from the destination. This will mean every destination city will become a "start" city.
        if(tempCities.length === 0) {
            tempCities.push(convertToCityObjects(comb.pop(), ctx.cities));
        }

        for(let i in comb) {

            // Find the cheapest cost for this city given the cities we already have
            cost += findArbitraryCheapestToDest(ctx, tempCities, convertToCityObjects(comb[i], ctx.cities));

            // Then, add this city to cities we "have", so we recompute the next cheapest as this city a part of our
            // network.
            tempCities.push(convertToCityObjects(comb[i], ctx.cities));
        }
        if(cost < totalCost) {
            totalCost = cost;
            bestOrder = comb;
        }
    }
    console.log("Best ordering: " + bestOrder + " at $" + totalCost + " for connections.");
    return totalCost;
}

function findOptimalPurchaseCostOrderOfCitiesOld(ctx, cities, dests) {

    // In the very edge case of no existing cities and one destination city, this function
    // will not work simply. Instead, just return a cost of 0, as there are no connections to make.
    if(dests.length === 1 && cities.length === 0) {
        return 0;
    }

    let totalCost = 999;
    let possibleOrderings = allcombinations(dests);
    let next;
    let bestOrder = [];
    while(!(next = possibleOrderings.next()).done) {
        let cost = 0;
        let tempCities = deepCopy(cities);
        let comb = next.value;

        // In the special case where the player has no cities (beginning of the game), we need to seed the start
        // from the destination. This will mean every destination city will become a "start" city.
        if(tempCities.length === 0) {
            tempCities.push(convertToCityObjects(comb.pop(), ctx.cities));
        }

        for(let i in comb) {

            // Find the cheapest cost for this city given the cities we already have
            cost += findArbitraryCheapestToDestOld(ctx, tempCities, convertToCityObjects(comb[i], ctx.cities));

            // Then, add this city to cities we "have", so we recompute the next cheapest as this city a part of our
            // network.
            tempCities.push(convertToCityObjects(comb[i], ctx.cities));
        }
        if(cost < totalCost) {
            totalCost = cost;
            bestOrder = comb;
        }
    }
    console.log("Best ordering: " + bestOrder + " at $" + totalCost + " for connections.");
    return totalCost;
}

function convertToCityObjects(cityNames, cities) {
    if(!(cityNames instanceof Array)) {
        return cities[cityNames.toLowerCase()];
    }
    let citiesO = [];
    for(let name of cityNames) {
        citiesO.push(cities[name.toLowerCase()]);
    }
    return citiesO;
}

/**
 * From: https://github.com/seriousManual/allcombinations
 * Since we can't require inside worker threads, just copy-pasting this here is enough.
 * @param input
 */
function* allcombinations(input) {
    if (input.length === 1) {
        yield input;
        return
    }

    for (let i = 0; i < input.length; i++) {
        let tail = input.concat([]);
        let head = input[i];
        tail.splice(i, 1);

        for (let combination of allcombinations(tail)) {
            yield [head].concat(combination)
        }
    }
}

/**
 * A convenience function for performing a deep-copy of an object.
 * @param {Object} obj The object to deep-copy
 * @returns {Object} A deep-copy of the object
 */
function deepCopy(obj) {

    // Seems to be an issue with the else-block on empty arrays, so we need to handle this special-case
    if(obj.constructor === Array && obj.length === 0) {
        return [];
    }
    else {
        return JSON.parse(JSON.stringify(obj));
    }
}
