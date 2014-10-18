exports.City = function(name){

	this.connections = [];
	this.name = name;

	this.addConnection = function(cost, city){
		this.connections[city.name] = {neighbor:city, conn:cost};
	};
};
