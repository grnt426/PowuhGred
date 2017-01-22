/**
 * randomizes contiguous regions based on number of players
 * @param {number} numPlayers number of people playing
 * @param {string} filename, defaults to "data/germany_regions.txt"
 * @returns {string[]} region names
 */
exports.selectRegions = function(numPlayers, filename){
    if (!filename) filename = "data/germany_regions.txt";
    var regions = {}, howMany;
    this.importRegions(filename, regions);
    return this.randomSelection(this.howManyRegions(numPlayers), regions);
};

/**
 * reads region connections from a file
 * @param {string} filename, defaults to "data/germany_regions.txt"
 * @param {Object<Object>} regions region[regionName].connections = [list of region names]
 */
exports.importRegions = function(filename, regions) {
    var fs = require("fs");
    var args, startName, endName;
    var data = fs.readFileSync(filename).toString().split('\n');
	for(var i in data){
		args = data[i].split(' ');
		startName = args[0];
		endName = args[1];
		
		this.addConnection(startName, endName, regions);
	}
};

/**
 * connects two region objects, creating if new
 * @param {string} startName region starting the connection
 * @param {string} endName region ending the connection
 * @param {Object<Object>} regions region[regionName].connections = [list of region names]
 */
exports.addConnection = function(startName, endName, regions) {
    if(regions[startName] === undefined) { 
        regions[startName] = {}; 
        regions[startName].connections = [];
    }
    if(regions[endName] === undefined) { 
        regions[endName] = {}; 
        regions[endName].connections = [];
    }
    regions[startName].connections.push(endName);
    regions[endName].connections.push(startName);
};

/**
 * returns how many regions should be used for the number of players
 * @param {number} numPlayers
 * @returns {number} number of regions
 */
exports.howManyRegions = function(numPlayers) {
    if(numPlayers == 2) { return 3; }
    if(numPlayers == 3) { return 3; }
    if(numPlayers == 4) { return 4; }
    if(numPlayers == 5) { return 5; }
    if(numPlayers == 6) { return 5; }
    return 3; //just for solo debugging
}

/**
 * reads region connections from a file
 * @param {string} num number of regions to select
 * @param {Object<Object>} regions region[regionName].connections = [list of region names]
 * @returns {string[]} list of region names
 */
exports.randomSelection = function(num, regions) {
    var numLeft, regionCount = 0, fullRegionArray = [], valid, regionIx, selectedRegions;
    
    for(var regionName in regions) {
        fullRegionArray.push(regionName);
        regionCount += 1;
    }
    
    valid = false;
    while(valid == false) {
        numLeft = num;
        selectedRegions = [];
        while(numLeft > 0) {
            regionIx = Math.floor((Math.random() * regionCount));
            regionName = fullRegionArray[regionIx];
            if(!selectedRegions.includes(regionName)) { 
                selectedRegions.push(regionName);
                numLeft-=1;
            }
        }
        
        valid = this.isSelectionValid(selectedRegions, regions);
    }
    
    return selectedRegions;
}

/**
 * check if a selection of regions is connected
 * @param {string[]} selectedRegions object
 * @param {Object<Object>} regions region[regionName].connections = [list of region names]
 * @returns {boolean} true if valid
 */
exports.isSelectionValid = function(selectedRegions, regions) {
    var start = selectedRegions[0];
    var visited = [];
    
    this.explore(start, visited, selectedRegions, regions);
    
    for(var regionName of selectedRegions) {
        if(!visited.includes(regionName)) { return false; }
    }
    return true;
}

/**
 * depth first search marking visited nodes to check for connectedness
 * @param {string} node current region to explore from
 * @param {string[]} visited regions that have been explored
 * @param {string[]} selectedRegions regions that have been selected
 * @param {Object<Object>} regions region[regionName].connections = [list of region names]
 */
exports.explore = function(node, visited, allowedConnections, regions) {
    var connections = regions[node].connections;
    for(var other of connections) {
        if(!visited.includes(other) && allowedConnections.includes(other)) {
            visited.push(other);
            this.explore(other, visited, allowedConnections, regions)
        }
    }
}