exports.Cities = function(){

	this.cities = [];

	this.addCity = function(city){
		this.cities.push(city);
	};

	this.findCheapestRoute = function(start, end){
		var cheapestRoutes = [];
		var neighbors = start.connections;

		// Add all our neighbors
		for(var city in neighbors){
			cheapestRoutes.push({
				path : [neighbors[city].neighbor],
				cost : neighbors[city].conn
			});
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
};
