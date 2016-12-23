var fs = require("fs"),
	cityjs = require("./city.js");

exports.Cities = function(){

	/**
	 * String -> City
	 * @type {Array}
	 */
	this.cities = {};

	this.addCity = function(city){
		this.cities[city.name.toLowerCase()] = city;
	};

	this.findCheapestRoute = function(start, end){
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
			cheapestRoutes.sort(function(a,b){return a.cost - b.cost});
			shortest = cheapestRoutes.shift();
            var lastCity = shortest.path[shortest.path.length-1];
            var endName = end.name.toLowerCase();
            if(lastCity == endName)
                break;
			neighbors = this.cities[lastCity].connections;

			// Find lowest cost connection from currently shortest path
			for(city in neighbors){

                var cost = neighbors[city].connection + shortest.cost;

                // If we already visited this city, and we got to it cheaper, then we want to terminate searching on
                // this path; and kill cycles.
                if(visited[city] <= cost) {
                    continue;
                }

                // Make a copy of the previous path that got us here
                var newPath = JSON.parse(JSON.stringify(shortest.path));
                newPath.push(city);

                cheapestRoutes.push({path:newPath, cost:cost});
                visited[city] = cost;
			}
		}
		return shortest;
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
        var fs = require('fs');
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
};
