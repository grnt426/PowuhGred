exports.City = function(name){

	this.connections = [];
	this.name = name;
    this.x = 0
    this.y = 0
    this.region = ""

	this.addConnection = function(cost, city){
		this.connections[city.name] = {neighbor:city, conn:cost};
	};
};
