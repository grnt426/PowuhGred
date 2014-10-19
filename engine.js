var playerjs = require("./player.js");

exports.Engine = function(){

	// Int
	this.currentPlayerCount = 0;

	// Communications
	this.comms = false;

	// City Name -> City
	this.cities = false;

	// Array of PowerPlant
	this.plants = false;

	// The resources available for purchase.
	this.resources = {'coal': 0, 'oil': 0, 'garbage': 0, 'uranium': 0};

	// Array of UIDs
	this.playerOrder = [];

	// UID -> Player
	this.players = {};

	// Socket -> Player
	this.reverseLookUp = {};

	// UID
	this.currentPlayer = false;
	this.currentPlayerIndex = 0;

	// Current plants for Auction
	// Array of PowerPlant
	this.currentMarket = [];
	this.futuresMarket = [];

	// Array of UIDs
	this.currentBidders = [];

	// No longer can bid
	this.finishedBidding = [];

	// Int
	this.currentBid = 0;

	// UID
	this.currentBidLeader = false;

	this.STARTING_MONEY = 50;

	// The Step Three card
	this.STEP_THREE = "Step3";

	this.gameStarted = false;

	// String
	this.currentAction = this.START_GAME;

	this.firstTurn = true;

	this.START_GAME = "startGame";
	this.START_AUCTION = "startAuction";
	this.BID = "bid";
	this.BUY = "buy";
	this.BUILD = "build";

	// Action map
	this.actions = {
		START_GAME: this.startGame,
		START_AUCTION: this.startAuction,
		BID: this.placeBid,
		BUY: this.buyResources,
		BUILD: this.buildCities
	};

	/**
	 * No args needed to start the game
	 * @param args	Ignored.
	 */
	this.startGame = function(args){
		if(this.gameStarted){
			return;
		}
		this.gameStarted = true;
		this.setupStartingResources();
		this.randomizePlayerOrder();
		this.currentPlayer = this.playerOrder[0];
		this.comms.broadcastUpdate({group:'currentPlayer', args:this.currentPlayer});
		this.setupMarket();
		this.currentAction = this.START_AUCTION;
		this.comms.broadcastUpdate({group:'currentAction', args:this.currentAction})
	};

	this.setupStartingResources = function(){
		this.resources['coal'] = 24;
		this.resources['oil'] = 18;
		this.resources['garbage'] = 6;
		this.resources['uranium'] = 2;
		this.comms.broadcastUpdate({group:'resourcePool', args:this.resources});
	};

	this.addPlayer = function(uid, socket){
		this.currentPlayerCount++;
		var player = new playerjs.Player(uid, this.comms, socket);
		this.players[uid] = player;
		this.playerOrder.push(uid);
		this.reverseLookUp[socket] = player;
		player.money = this.STARTING_MONEY;
		player.updateMoney();
	};

	/**
	 * At the start of the game, player order is random.
	 */
	this.randomizePlayerOrder = function(){
		this.shuffle(this.playerOrder);
		this.comms.broadcastUpdate({group:'playerOrder', args:this.playerOrder});
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
		this.comms.broadcastUpdate({group:'playerOrder', args:this.playerOrder});
	};

	/**
	 * This assumes the plants are in ascending order by cost.
	 */
	this.setupMarket = function(){
		this.currentMarket = this.plants.splice(0, 4);
		this.futuresMarket = this.plants.splice(0, 4);
		var topPlant = this.plants.splice(2, 1);
		this.shuffle(this.plants);
		this.plants.splice(0, 0, topPlant);
		this.plants.push(this.STEP_THREE);
		this.comms.broadcastUpdate({group:'actualMarket', args:this.currentMarket});
		this.comms.broadcastUpdate({group:'futureMarket', args:this.futuresMarket});
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

	/**
	 * Expects a JSON object describing the action a player took.
	 *
	 * Object Format:
	 * {
	 * 		uid: 'playerX',
	 * 		action: 'action',
	 *		args: 'arg1,arg2,...'
	 *	}
	 *
	 * Expected actions are:
	 * 	startGame
	 * 	startAuction
	 * 	bid
	 * 	buy
	 * 	build.
	 *
	 * All arguments are of the form of a CSV.
	 *
	 * @param data
	 */
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
			if(this.currentAction !== action){
				this.comms.toPlayer(player, "Not expecting that action.");
				return;
			}
			this.actions[action](args);
		}
	};

	/**
	 * Progresses to the next player, or starts the next Action.
	 */
	this.nextPlayer = function(){
		var turnOrder = -1;
		if(this.currentAction == this.START_AUCTION)
			turnOrder = 1;

		this.currentPlayerIndex = this.currentPlayerIndex + turnOrder;
		if(this.currentPlayerIndex < this.players.length){
			this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
		}
		else{
			this.currentPlayerIndex = this.players.length;
			if(this.firstTurn){
				this.resolveTurnOrder();
				this.firstTurn = false;
			}
			this.currentPlayer = this.playerOrder[0];
			this.nextAction();
		}
		this.comms.broadcastUpdate({group: 'currentPlayer', args: this.currentPlayer});
	};

	// TODO use a different order
	this.nextBidder = function(){
		this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
		this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
	};

	this.nextAction = function(){
		if(this.currentAction == this.START_AUCTION)
			this.currentAction = this.BUY;
		else if(this.currentAction == this.BUY)
			this.currentAction = this.BUILD;
		else
			this.getMoney();
		this.comms.broadcastUpdate({group: 'currentAction', args: this.currentAction});
	};

	this.getMoney = function(){

		// Give out money

		this.resolveTurnOrder();

		// Handle Step 2

		// Handle Step 3

		// Start the next auction
		this.currentAction = this.START_AUCTION;
		this.currentPlayerIndex = 0;
		this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
	};

	/**
	 * The expected data is either
	 * 	PowerPlantCost,StartingBid
	 * or
	 * 	pass
	 * @param data
	 */
	this.startAuction = function(data){
		var args = data.split(",");
		if(args.length < 1 || args.length > 2){
			// sanity error
			return;
		}

		if(args[0] === "pass"){
			this.finishedBidding.push(this.currentPlayer);
			this.nextPlayer();
		}
		else{
			var plant = args[0];
			var bid = args[1];
			if(bid < plant){
				// Reject bid
				this.comms.toPlayer(this.players[this.currentPlayer], "bid too low.");
				return;
			}

			var player = this.players[this.currentPlayer];
			if(bid > player.money){
				// Reject bid
				this.comms.toPlayer(this.players[this.currentPlayer], "not enough money.");
				return;
			}

			this.currentBid = bid;
			this.currentBidLeader = player.uid;
			this.currentAction = this.BID;
			for(var key in this.players){
				if(this.finishedBidding.indexOf(this.players[key].uid) != -1)
					this.currentBidders.push(this.players[key].uid);
			}
		}
	};

	this.placeBid = function(data){
		var args = data.split(",");
		if(args.length != 1){
			// sanity error
			return;
		}
		if(args[0] === "pass"){
			this.nextBidder();
		}
	};

	this.buyResources = function(data){
		var args = data.split(",");
		if(args.length != 3 && args.length != 1){
			// sanity error
			return;
		}
		if(args[0] === "pass"){
			this.nextPlayer();
		}
	};

	this.buildCities = function(data){
		var args = data.split(",");
		if(args.length != 1){
			// sanity error
			return;
		}
		if(args[0] === "pass"){
			this.nextPlayer();
		}
	};
};
