exports.Player = function(uid, comms, socket){

	this.uid = uid;
	this.comms = comms;
	this.displayName = uid;

	// Used only by comms to talk to that player directly.
	this.socket = socket;

	this.plants = {};
	this.money = 0;
	this.cities = [];
    this.resources = {'coal': 0, 'oil': 0, 'garbage': 0, 'uranium': 0};

	/**
	 * Alerts the player it is their turn.
	 */
	this.takeTurn = function(){
//		this.comms.
	};

	this.buildOnCity = function(city){
		this.cities.push(city.name);
	};

	this.replacePowerPlant = function(newPlant, oldPlant){
		delete this.plants[oldPlant.cost];
		this.plants[newPlant.cost] = newPlant;
	};

	this.getHighestCostPowerPlant = function(){
		var high = 0;
		for(var key in this.plants){
			if(this.plants[key].cost > high)
				high = this.plants[key].cost;
		}
		return high;
	};

	// Deprecated in favor of broadcastScore
	this.updateMoney = function(){
//		this.comms.broadcastUpdate({group:'money', args:{uid:this.uid, money:this.money}});
	};

	// TODO: check for more than allowed plants and allow player to trash plants if so
	this.awardPlant = function(plantCost, bidCost){
		this.plants.push(plantCost);
		this.money -= bidCost;
		this.updateMoney();
		this.comms.broadcastUpdate({group:'playerPlants', args:{uid:this.uid, plants:this.plants}});
	};
};
