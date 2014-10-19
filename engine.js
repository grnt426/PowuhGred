var playerjs = require("./player.js");

exports.Engine = function(){

	this.comms = false;
	this.cities = false;
	this.plants = false;
	this.resources = {'coal': 0, 'oil': 0, 'garbage': 0, 'uranium': 0};
	this.playerOrder = [];
	this.players = {};
	this.reverseLookUp = {};
	this.currentPlayer = false;

	this.currentMarket = {};
	this.futuresMarket = {};

	this.STARTING_MONEY = 50;

	// Action map
	this.actions = {
		start: this.startAuction,
		bid: this.placeBid,
		buy: this.buyResources,
		build: this.buildCities
	};

	this.startGame = function(){
		this.setNumberOfPlayers(this.players.length);
		this.setupStartingResources();
		this.randomizePlayerOrder();
		this.currentPlayer = this.playerOrder[0];
		this.setupMarket();
	};

	this.setupStartingResources = function(){
		this.resources['coal'] = 24;
		this.resources['oil'] = 18;
		this.resources['garbage'] = 6;
		this.resources['uranium'] = 2;
	};

	this.addPlayer = function(uid, socket){
		var player = new playerjs.Player(uid, this.comms, socket);
		this.players[uid] = player;
		this.playerOrder.push(uid);
		this.reverseLookUp[socket] = player;
		player.money = this.STARTING_MONEY;
	};

	this.setNumberOfPlayers = function(count){
		this.playerOrder.splice(count);
	};

	/**
	 * At the start of the game, player order is random.
	 */
	this.randomizePlayerOrder = function(){
		this.shuffle(this.playerOrder);
	};

	/**
	 * Determines player order based on number of cities, with the cost of
	 * power plants as tie-breakers. The first player has the fewest
	 * cities, or the lowest cost power plant.
	 */
	this.resolveTurnOrder = function(){
		this.playerOrder.sort(function(a,b){
			return a.cities.length != b.cities.length
				? a.cities.length - b.cities.length
				: a.getHighestCostPowerPlant() - b.getHighestCostPowerPlant()
		});
	};

	this.setupMarket = function(){

	};

	/**
	 * Fisher-Yates shuffle algorithm, operates on the array in-place.
	 *
	 * Copied from: http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
	 * @param array	Array to shuffle.
	 * @returns {*}
	 */
	this.shuffle = function(array){
		var currentIndex = array.length, temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while(0 !== currentIndex){

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	};

	this.resolveAction = function(data){
		var dataObj = JSON.parse(data);
		var uid = dataObj.uid;
		var action = dataObj.action;
		var args = dataObj.args;
		var player = this.players[uid];

		if(this.currentPlayer !== false && uid !== this.currentPlayer){
			// for now, we only support listening to the current player
			this.comms.toPlayer(player, "Not your turn.");
		}
		else{
			this.actions[action](args);
		}
	};

	this.startAuction = function(data){

	};

	this.placeBid = function(data){

	};

	this.buyResources = function(data){

	};

	this.buildCities = function(data){

	};
};
