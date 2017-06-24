module.exports = function (request, done) {
    console.info("Incoming Request: " + JSON.stringify(request));

    // TODO: we should leverage Memcached as a cache for our memoized search. For now, memoized results are thrown away.
    let data = request.data;
    if(request.action === "findOptimalPurchaseCostOrderOfCities") {
        let result = 0;
        try {
            result = findOptimalPurchaseCostOrderOfCities(data.ctx, data.cities, data.dests);
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