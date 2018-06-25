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
            console.error("Error in finding optimal: " + err.stack);
        }
        done(result);
    }
    else if(request.action === "findArbitraryCheapestToDest") {
        let result = 0;
        try{
            result = findArbitraryCheapestToDestCache(data.ctx, data.cities, data.dest);
        }
        catch(err){
            console.error("Error in finding arbitrary cheapest: " + err.stack);
        }
        done(result);
    }
    else if(request.action === "findCheapestRoute") {
        let result = 0;
        try{
            result = get(data.start[i].name + ">" + data.end.name)
        }
        catch(err){
            console.error("Error in finding route: " + err.stack);
        }
        done(result);
    }
    else {
        done("Invalid request! " + request.action);
    }
};

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

function findOptimalPurchaseCostOrderOfCitiesFaster(ctx, cities, dests) {
    // console.info("Searching...");

    // In the very edge case of no existing cities and one destination city, this function
    // will not work simply. Instead, just return a cost of 0, as there are no connections to make.
    if(dests.length === 1 && cities.length === 0) {
        return 0;
    }

    let bestCost = 999;
    let currentOrderings = generateOptions(ctx, cities, dests, [], 0);
    // console.info("First Set (" + currentOrderings.length + "): " + JSON.stringify(currentOrderings));
    let bestOrdering = undefined;
    let sortFunction = function(a, b) { return a.cost < b.cost;};
    currentOrderings.sort(sortFunction);
    let currentOrder = undefined;
    let memoizedOrders = new Array(50000);
    while(currentOrderings.length > 0) {
        currentOrder = currentOrderings.shift();
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
            let newOptions = generateOptions(ctx, currentOrder.cities, currentOrder.remaining,
                currentOrder.order, currentOrder.cost);
            currentOrderings = currentOrderings.concat(newOptions);
            // console.info("New Set: " + JSON.stringify(currentOrderings));
            currentOrderings.sort(sortFunction);
        }
    }

    console.log("Best ordering: " + bestOrdering + " at $" + bestCost + " for connections.");
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
        let additionCost = 0;
        if(cities.length !== 0)
            additionCost = findArbitraryCheapestToDestCache(ctx, cities, convertToCityObjects(cityName, ctx.cities));
        val = partialOrder(newOrder, newDests, prevCost + additionCost, newCities);
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
    // console.info(JSON.stringify(buckets));
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