let fs = require('fs');

module.exports = function (request, done) {
    console.info("Incoming Request: " + JSON.stringify(request));

    // TODO: we should leverage Memcached as a cache for our memoized search. For now, memoized results are thrown away.
    let data = request.data;
    if(request.action === "findOptimalPurchaseCostOrderOfCities") {
        let result = 0;
        try {
            computeEverything(data.ctx);
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
    else {
        done("Invalid request!");
    }
};

function computeEverything(ctx){
    let result = "";
    let allRegionSelections =
        [
            "cyan brown red yellow blue purple",
            "cyan red yellow blue purple",
            "brown red yellow blue purple",
            "cyan brown yellow blue purple",
            "cyan brown red blue purple",
            "cyan brown red yellow purple",
            "cyan brown red yellow blue",
            "red yellow blue purple",
            "cyan yellow blue purple",
            "brown red yellow blue",
            "cyan red blue purple",
            "cyan red yellow purple",
            "cyan red yellow blue",
            "cyan brown yellow purple",
            "cyan brown yellow blue",
            "cyan brown red blue",
            "cyan brown red yellow",
            "brown yellow blue purple",
            "brown red yellow purple",
            "cyan brown red",
            "cyan brown yellow",
            "cyan red yellow",
            "cyan red blue",
            "cyan yellow blue",
            "cyan yellow purple",
            "brown red yellow",
            "brown yellow blue",
            "brown yellow purple",
            "red yellow blue",
            "red yellow purple",
            "red blue purple",
            "yellow blue purple"
        ];

    let originalCopy = ctx.cities;
    for(let regionSelection in allRegionSelections){
        let workingCities = copyCities(originalCopy);
        console.info("Working set: " + JSON.stringify(workingCities));
        let regionSelectionArr = allRegionSelections[regionSelection].split(" ");
        console.info("Region selection: " + JSON.stringify(allRegionSelections[regionSelection]));
        onlyUseTheseRegions(regionSelectionArr, workingCities);
        console.info("Working set before breaking into keys: " + JSON.stringify(workingCities));
        let cityNames = Object.keys(workingCities);
        console.info("City Names: " + JSON.stringify(cityNames));
        for(let start = 0; start < cityNames.length; start++){
            for(let end = start + 1; end < cityNames.length; end++){
                console.info(start + " -> " + end);
                let startCity = workingCities[cityNames[start]];
                let endCity = workingCities[cityNames[end]];
                console.info("S: " + JSON.stringify(startCity) + " E: " + JSON.stringify(endCity));
                result = result + allRegionSelections[regionSelection] + "|" + startCity.name + ">" + endCity.name +
                    "=" + findCheapestRoute({cities:workingCities, cityDistDict:{}}, startCity, endCity).cost + "\n";
            }
        }
    }

    fs.writeFile("pathcosts.txt", result, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
}

function copyCities(cities){
    console.info("Making copy of " + JSON.stringify(cities));
    let citiesCopy = {};
    for(let name in cities){
        let city = cities[name];
        let copy = makeCopy(city);
        citiesCopy[name] = copy;
    }
    return citiesCopy;
}

function makeCopy(city){

    let connectionsCopy = {};
    for(let c in city.connections){
        connectionsCopy[c] = city.connections[c];
    }
    console.info("Connections copy: " + JSON.stringify(connectionsCopy));
    return { connections:connectionsCopy, name:city.name, region:city.region };
}

function onlyUseTheseRegions(activeRegions, cities) {
    for(let name in cities) {
        if(!activeRegions.includes(cities[name].region)) {
            deactivateCity(name, cities);
        }
    }
}

function deactivateCity(cityName, cities) {
    console.info("Delete: " + cityName);
    for(let connCityName in cities[cityName].connections) {
        delete cities[connCityName].connections[cityName];
    }
    delete cities[cityName];
}

/**
 * Computes the lowest cost route from start to end. Note: does NOT account for the cost of buying the city.
 *
 * @param {City} start City to start from
 * @param {City} end   City to go to
 * @param {boolean} [debug=false]
 * @returns {Object}    The shortest route and its cost
 */
function findCheapestRoute(ctx, start, end, debug = true) {
    if(debug) console.info("PATH " + JSON.stringify(start) + " => " + JSON.stringify(end));

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
