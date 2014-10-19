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
		visited[start] = 0;

		// Add all our neighbors
		for(var city in neighbors){
			cheapestRoutes.push({
				path : [neighbors[city].neighbor],
				cost : neighbors[city].conn
			});
			visited[neighbors[city]] = neighbors[city].conn;
		}

		while(cheapestRoutes.length > 0){
			cheapestRoutes.sort(function(a,b){a.cost - b.cost});
			var shortest = cheapestRoutes[0];
			if(shortest.name = end.name)
				break;
			neighbors = shortest.connections;
			var min_cost = -1;
			var min_city = false;

			// Find lowest cost connection from currently shortest path
			for(city in neighbors){
				if(!min_city || neighbors[city].conn < min_cost){
					min_cost = neighbors[city].conn;
					min_city = neighbors[city];
				}
			}

			shortest.path.push(min_city);
			shortest.cost = shortest.cost + min_cost;
		}
		return cheapestRoutes[0];
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

        console.log(this.cities);
    };
};
