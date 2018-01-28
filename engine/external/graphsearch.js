const fs = require('fs');
const activeRegions = ['cyan', 'brown', 'red', 'yellow', 'blue', 'purple'].join(" ");

module.exports = function (request, done) {
    //console.info("Incoming Request: " + JSON.stringify(request));

    // TODO: we should leverage Memcached as a cache for our memoized search. For now, memoized results are thrown away.
    let data = request.data;
    if(request.action === "findOptimalPurchaseCostOrderOfCities") {
        data.ctx.regionKey = activeRegions;
        let result = 0;
        let contents = fs.readFileSync('data/pathcosts.txt', 'utf-8').toString();
        let timeStart = Date.now();
        buildMemoryCache(contents, data);
        console.info("Took " + (Date.now() - timeStart) + "ms to read file.");
        try {
            let timeStart = Date.now();
            result = findOptimalPurchaseCostOrderOfCitiesFaster(data.ctx, data.cities, data.dests);
            console.info("Total Time: " + (Date.now() - timeStart)/1000 + "s");
        }
        catch(err){
            console.error("Error in finding optimal: " + err);
        }
        done(result);
    }
    else if(request.action === "findArbitraryCheapestToDest") {
        let result = 0;
        try{
            result = findArbitraryCheapestToDest(data.ctx, data.cities, data.dest);
        }
        catch(err){
            console.error("Error in finding arbitrary cheapest: " + err);
        }
        done(result);
    }
    else if(request.action === "findCheapestRoute") {
        let result = 0;
        try{
            result = findCheapestRoute(data.ctx, data.start, data.end);
        }
        catch(err){
            console.error("Error in finding route: " + err);
        }
        done(result);
    }
    else {
        done("Invalid request! " + request.action);
    }
};

/**
 * Computes the lowest cost route from start to end. Note: does NOT account for the cost of buying the city.
 *
 * @param {City} start City to start from
 * @param {City} end   City to go to
 * @param {boolean} [debug=false]
 * @returns {Object}    The shortest route and its cost
 */
function findCheapestRoute(ctx, start, end, debug = false) {
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
        let cost = findCheapestRoute(ctx, cities[i], dest).cost;
        if(isNaN(cost)){
            console.info("Bad cost? " + cost);
        }
        if(cost < lowestCost)
            lowestCost = cost;
    }
    return lowestCost;
}

function findArbitraryCheapestToDestCache(ctx, cities, dest) {
    let lowestCost = 999;
    for(let i in cities) {
        let cost = undefined;
        // console.info(hash(cities[i].name + ">" + dest.name));
        cost = get(cities[i].name + ">" + dest.name);
        // cost = nodeCacheStore.get(cities[i].name + ">" + dest.name);
        // console.info("Cost: " + cost);
        if(isNaN(cost)){
            // console.info("Bad cost? " + cost);
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
    let totalOptions = 0;
    let totalTime = 0;
    let numberTimes = 0;
    while(!(next = possibleOrderings.next()).done) {
        totalOptions++;
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
            let timeStart = Date.now();
            cost += findArbitraryCheapestToDestCache(ctx, tempCities, convertToCityObjects(comb[i], ctx.cities));
            totalTime += (Date.now() - timeStart);
            numberTimes++;

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
    console.info("Total Options: " + totalOptions);
    console.log("Total Time findArbitraryCheapestToDestCache: " + totalTime/1000 + "s Avg: " + totalTime/numberTimes/1000 + "s");
    return totalCost;
}

function findOptimalPurchaseCostOrderOfCitiesFaster(ctx, cities, dests) {
    // console.info("Searching...");

    // In the very edge case of no existing cities and one destination city, this function
    // will not work simply. Instead, just return a cost of 0, as there are no connections to make.
    if(dests.length === 1 && cities.length === 0) {
        return 0;
    }

    let bestCost = 999;
    let totalOptions = 0;
    let currentOrderings = generateOptions(ctx, cities, dests, [], 0);
    // console.info("First Set (" + currentOrderings.length + "): " + JSON.stringify(currentOrderings));
    let bestOrdering = undefined;
    let sortFunction = function(a, b) { return a.cost < b.cost;};
    currentOrderings.sort(sortFunction);
    let currentOrder = undefined;
    let memoizedOrders = new Array(50000);
    let totalTime = 0;
    let numberTimes = 0;
    while(currentOrderings.length > 0) {
        currentOrder = currentOrderings.shift();
        if(currentOrder.remaining.length === 0) {
            totalOptions++;
            // console.info("Full Order considered: " + currentOrder.order + " Cost: " + currentOrder.cost);
        }
        // console.info("Current Order: " + JSON.stringify(currentOrder));
        // console.info("Remaining: " + currentOrder.remaining);
        if(inMemoizedOrders(memoizedOrders, currentOrder)) {
            continue;
        }
        else if(currentOrder.remaining.length === 0 && currentOrder.cost < bestCost) {
            // console.info("Found a candidate: " + currentOrder.order);
            bestCost = currentOrder.cost;
            bestOrdering = currentOrder;
        }
        else if(bestOrdering !== undefined && currentOrder.cost > bestCost) {
            continue;
        }

        if(currentOrder.remaining.length !== 0) {
            let timeStart = Date.now();
            let newOptions = generateOptions(ctx, currentOrder.cities, currentOrder.remaining,
                currentOrder.order, currentOrder.cost);
            totalTime += (Date.now() - timeStart);
            numberTimes++;
            currentOrderings = currentOrderings.concat(newOptions);
            // console.info("New Set: " + JSON.stringify(currentOrderings));
            currentOrderings.sort(sortFunction);
        }
    }

    console.log("Total Options: " + totalOptions);
    console.log("Total Time generating options: " + totalTime/1000 + "s Avg: " + totalTime/numberTimes/1000 + "s");
    // console.log(memoizedOrders);
    return bestOrdering.cost;
}

/**
 * Returns true if the current order is in the memoized map and is the same cost.
 * TODO: I *might* be able to save here and return true if the cost is also greater, but need to test this assumption.
 * @param memoizedOrders
 * @param order
 * @returns {boolean}
 */
function inMemoizedOrders(memoizedOrders, order) {

    // console.info("Order: " + JSON.stringify(order));
    if(order.order === undefined)
        return false;
    let len = order.order.length;
    if(len < 2) {
        return false;
    }

    // console.info("To Compare: " + toCompare);
    let name = deepCopy(order.order).sort().join("");
    let cost = memoizedOrders[hash(name)];
    if(cost === undefined) {
        memoizedOrders[hash(name)] = order.cost;
        return false;
    }
    else if(cost < order.cost)
        return true;
    else if(order.cost < cost) {
        memoizedOrders[hash(name)] = order.cost;
        return false;
    }

    memoizedOrders[hash(name)] = order.cost;
    return false;
}

function generateOptions(ctx, cities, dests, order, prevCost) {
    let options = [];
    // console.info("Dests (" + dests.length + "): " + dests);
    for(let i = 0; i < dests.length; i++) {
        // console.info("Adding...");
        let newOrder = deepCopy(order);
        let newDests = deepCopy(dests);
        let newCities = deepCopy(cities);
        let cityName = dests[i];
        newCities.push(convertToCityObjects(cityName, ctx.cities));
        newOrder.push(cityName);
        newDests.splice(i, 1);
        let val = partialOrder(newOrder, newDests,
            prevCost + findArbitraryCheapestToDestCache(ctx, cities, convertToCityObjects(cityName, ctx.cities)), newCities);
        // console.info("New Val: " + val);
        options.push(val);
    }
    // console.info("Options (" + options.length + "): " + options);
    return options;
}

/**
 *
 * @param {Array} order
 * @param {Array} remaining
 * @param {Number} cost
 * @param {Array} cities
 * @returns {{order: *, remaining: *, cost: *, cities: Object}}
 */
function partialOrder(order, remaining, cost, cities) {
    // console.info("Order: " + order + " remaining: " + remaining + " cost: " + cost + " cities: " + cities);
    if(remaining === undefined)
        remaining = [];
    return {order: order, remaining: remaining, cost: cost, cities:cities};
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


function NaiveDict(){
    this.keys = [];
    this.values = [];
}
NaiveDict.prototype.set = function(key, value){
    this.keys.push(key);
    this.values.push(value)
};
NaiveDict.prototype.get = function(lookupKey){
    for (let i=0;i<this.keys.length;i++){
        let key = this.keys[i];
        if (key === lookupKey) {
            return this.values[i];
        }
    }
};

let bucketCount = 100000;
let buckets = [];
let mem = [];
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
    // mem[hash(key)] = value;
}

function get(lookupKey){
    // return mem[hash(lookupKey)];
    return getBucket(lookupKey).get(lookupKey);
}

function buildMemoryCache(fileContent, request){

    console.info("Building memory cache...");
    let lines = fileContent.split("\n");
    console.info("# Lines: " + lines.length);
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
            set(names[0] + ">" + names[1], cost);
            set(names[1] + ">" + names[0], cost);
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