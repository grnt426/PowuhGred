var playerjs = require("./player.js"),
	auctionjs = require("./phases/auction.js"),
	util = require("./util.js");

exports.Engine = function(comms){

	// Int
	this.currentPlayerCount = 0;

	// Communications
	this.comms = comms;

	// City Name -> City
	this.cities = false;

	// Array of PowerPlant
	this.plants = false;

	// The resources available for purchase. String -> Int
	this.resources = {'coal': 0, 'oil': 0, 'garbage': 0, 'uranium': 0};

	// Array of UIDs
	this.playerOrder = [];

	// UID -> Player
	this.players = {};

	// Socket -> Player
	this.reverseLookUp = [];

	// UID
	this.currentPlayer = false;

	// Int
	this.currentPlayerIndex = 0;

	// Current plants for Auction
	// Array of PowerPlant
	this.currentMarket = [];
	this.futuresMarket = [];

	this.STARTING_MONEY = 50;

	// The Step Three card constant, for simple comparison.
	this.STEP_THREE = "Step3";

	// Whether the game has actually begun, or if we are still waiting for
	// players.
	this.gameStarted = false;

	// Some game specific rules and setup are performed if this is the first
	// turn. Not relevant after the first turn.
	this.firstTurn = true;

	this.START_GAME = "startGame";
	this.START_AUCTION = "startAuction";
	this.BID = "bid";
	this.BUY = "buy";
	this.BUILD = "build";

	// String
	this.currentAction = this.START_GAME;

	// Phases
	var auction = new auctionjs.Auction(this, this.comms);

	// Array of Strings. Identifiers which declare what set of data changed in
	// the update
	this.changes = [];

	// Incremented with each broadcast of data. Used for debugging and
	// detecting game de-sync issues (if they arise in the future).
	var changeSet = 0;

	/**
	 * No args needed to start the game
	 */
	this.startGame = function(){
		if(this.gameStarted){
			return;
		}
		this.changes.push(this.START_GAME);
		this.gameStarted = true;
		this.setupStartingResources();
		this.randomizePlayerOrder();
		this.currentPlayer = this.playerOrder[0];
		this.setupMarket();
		this.currentAction = this.START_AUCTION;
	};

	this.setupStartingResources = function(){
		this.resources['coal'] = 24;
		this.resources['oil'] = 18;
		this.resources['garbage'] = 6;
		this.resources['uranium'] = 2;
	};

	this.addPlayer = function(uid, socket){
		this.currentPlayerCount++;
		var player = new playerjs.Player(uid, this.comms, socket);
		this.players[uid] = player;
		this.playerOrder.push(uid);
		this.reverseLookUp[socket.id] = player;
		player.money = this.STARTING_MONEY;
	};

	/**
	 * At the start of the game, player order is random.
	 */
	this.randomizePlayerOrder = function(){
		util.shuffle(this.playerOrder);
	};

	/**
	 * Determines player order based on number of cities, with the cost of
	 * power plants as tie-breakers. The first player has the fewest
	 * cities, or the lowest cost power plant.
	 */
	this.resolveTurnOrder = function(){
		this.playerOrder.sort(function(a, b){
			var aCityCount = a.cities !== undefined ? a.cities.length : 0;
			var bCityCount = b.cities !== undefined ? b.cities.length : 0;
			return aCityCount != bCityCount
				? a.cities.length - b.cities.length
				: a.getHighestCostPowerPlant() - b.getHighestCostPowerPlant()
		});
	};

	/**
	 * This assumes the plants are already in ascending order by cost.
	 */
	this.setupMarket = function(){
		this.currentMarket = this.plants.splice(0, 4);
		this.futuresMarket = this.plants.splice(0, 4);
		var topPlant = this.plants.splice(2, 1);
		util.shuffle(this.plants);
		this.plants.splice(0, 0, topPlant);
		this.plants.push(this.STEP_THREE);
	};

	/**
	 * Expects a JSON object describing the action a player took.
	 *
	 * Object Format:
	 * {
	 * 		uid: 'playerX',
	 * 		cmd: 'cmd',
	 *		args: 'arg1,arg2,...'
	 *	}
	 *
	 * Expected actions are:
	 *    startGame
	 *    startAuction
	 *    bid
	 *    buy
	 *    build.
	 *
	 * All arguments are of the form of a CSV.
	 *
	 * @param data	The object which adheres to the above format.
	 */
	this.resolveAction = function(data){
		var uid = data.uid;
		var action = data.cmd;
		var args = data.args;
		var player = this.players[uid];

		console.info(uid + ", action: " + action + ", args: " + JSON.stringify(args));

		// TODO: compress the boolean logic
		if(this.currentPlayer !== false && uid !== this.currentPlayer && this.currentAction != this.BID){
			// for now, we only support listening to the current player
			console.info(uid + " tried taking their turn when not theirs!");
			this.comms.toPlayer(player, "Not your turn.");
		}
		else if(this.currentAction == this.BID && uid != auction.currentBidder){
			// for now, we only support listening to the current player
			console.info(uid + " tried taking their turn when not theirs!");
			this.comms.toPlayer(player, "Not your turn.");
		}
		else{
			if(this.currentAction !== action && data.args !== "pass"){
				console.info(uid + " tried giving an action we were not expecting, " + action);
				console.info("Expecting: : " + this.currentAction);
				this.comms.toPlayer(player, "Not expecting that action.");
				return;
			}

			if(this.START_GAME == action){
				this.startGame();
			}
			else if(this.START_AUCTION == action){
				auction.startAuction(data.args);
			}
			else if(this.BID == action){
				this.placeBid(data.args);
			}
			else if(this.BUY == action){
				this.buyResources(data.args);
			}
			else if(this.BUILD == action){
				this.buildCities(data.args);
			}
		}
        this.broadcastScore();
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
	};

	this.updatePlants = function(removedPlant){
		this.currentMarket.slice(this.currentMarket.indexOf(removedPlant), 1);
		var shownPlants = this.currentMarket;
		shownPlants.concat(this.futuresMarket);
		shownPlants.push(this.plants.slice(0, 1));
		shownPlants.sort();
		this.currentMarket = shownPlants.slice(0, 4);
		this.futuresMarket = shownPlants.slice(0, 4);
	};

	this.nextAction = function(){
		if(this.currentAction == this.START_AUCTION)
			this.currentAction = this.BUY;
		else if(this.currentAction == this.BUY)
			this.currentAction = this.BUILD;
		else
			this.getMoney();
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

    // junk data for testing
    this.junkData = function() {
        for(var i=0; i < this.playerOrder.length; i++) {
            this.players[this.playerOrder[i]].money = Math.floor((Math.random() * 100) + 1);
            this.players[this.playerOrder[i]].plants = [Math.floor((Math.random() * 30) + 1),Math.floor((Math.random() * 30) + 1),Math.floor((Math.random() * 30) + 1)];
            this.players[this.playerOrder[i]].cities = ["Berlin","some other place","Frankfurt-d"];
            var citylen = Math.floor(Math.random()*12);
            for(var k = 0; k < citylen; k++) { this.players[this.playerOrder[i]].cities.push("another city"); }
            this.players[this.playerOrder[i]].resources = {'coal': Math.floor((Math.random() * 10)), 'oil': Math.floor((Math.random() * 10)), 'garbage': Math.floor((Math.random() * 10)), 'uranium': Math.floor((Math.random() * 10))};
            this.players[this.playerOrder[i]].displayName = "some jerk"
        }
    };

    this.broadcastScore = function() {
        var score = {};
		changeSet += 1;

        score.playerOrder = this.playerOrder;
        score.currentPlayerIndex = this.currentPlayerIndex;
		score.futuresMarket = this.futuresMarket;
		score.actualMarket = this.currentMarket;
		score.currentAction = this.currentAction;
		score.resources = this.resources;

        // making a subset of player data, don't want whole object
        score.players = {};
        for(var i=0; i < this.playerOrder.length; i++) {
            var p = {};
			var player = this.players[this.playerOrder[i]];
            p.money       = player.money;
            p.plants      = player.plants;
            p.cities      = player.cities;
            p.resources   = player.resources;
            p.displayName = player.displayName;
			p.uid		  = player.uid;
            score.players[this.playerOrder[i]] = p;
        }

		// Auction Data
		score.auction = {currentBidders:auction.currentBidders,
			finishedBidding:auction.finishedBidding,
			finishedAuctions:auction.finishedAuctions,
			currentBid:auction.currentBid,
			currentPlayerBidIndex:auction.currentPlayerBidIndex,
			currentBidChoice:auction.currentBidChoice,
			currentBidder:auction.currentBidder,
			currentBidLeader:auction.currentBidLeader,
			auctionRunning:auction.auctionRunning};

		// Score is the current data
		// Changes is an array of strings identifying what updated.
		// ChangeSet is an Int representing the number of broadcasts sent
        this.comms.broadcastUpdate({group: 'updateScore',
			args:{data:score, changes:this.changes, changeSet:changeSet}});
		this.changes = [];
    };
};
