exports.City = function(name){

	this.connections = [];

    // String
	this.name = name;
    this.x = 0;
    this.y = 0;

    // TODO: Cities belong to a region, of which not all are active during a game.
    this.region = "";

    // String, PlayerID
    this.players = [];

    this.costToBuild = function(){
        return 10 + (5 * this.players.length);
    };

    this.canBuild = function(){
        return this.players.length != 3;
    };

    this.buildForPlayer = function(player){
        this.players.push(player);
    };
};
