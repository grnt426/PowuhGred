var playerjs = require("./includes/Player.js"),
	auctionjs = require("./phases/auction.js"),
	util = require("./util.js"),
    res = require("./State/Resources.js"),
    marketjs = require("./phases/market.js"),
    buildingjs = require("./phases/building.js");

/**
 * Primary entry point for the game, which manages game creation, phase transition, and action verification.
 * @param comms {Communications}
 * @param cities
 * @param plants
 * @constructor
 * @this {Engine}
 */
exports.Engine = function(comms, cities, plants){

	// Communications
	this.comms = comms;

	// {Object} of type Cities
	this.cities = cities;

	// Array of PowerPlant
	this.plants = plants;

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

    // Action Enums
	this.START_GAME = "startGame";
	this.START_AUCTION = "startAuction";
	this.BID = "bid";
	this.BUY = "buy";
	this.BUILD = "build";

	// String
	this.currentAction = this.START_GAME;

	// Phases
	this.auction = new auctionjs.Auction(this, this.comms);
    this.market = new marketjs.Market(this, this.comms);
    this.building = new buildingjs.Building(this, this.comms);

	// Array of Strings. Identifiers which declare what set of data changed in
	// the update
	this.changes = [];

	// Incremented with each broadcast of data. Used for debugging and
	// detecting game de-sync issues (if they arise in the future).
	var changeSet = 0;

    this.getCurrentPlayer = function(){
        return this.players[this.currentPlayerIndex];
    };

	/**
	 * No args needed to start the game
	 */
	this.startGame = function(){
		if(this.gameStarted) {
            comms.debug("Trying to start after already started?");
			return;
		}

		this.changes.push(this.START_GAME);
		this.gameStarted = true;
		this.market.setupStartingResources();
		this.randomizePlayerOrder();
		this.currentPlayer = this.playerOrder[0];
		this.setupAuction();
		this.currentAction = this.START_AUCTION;
	};

	this.addPlayer = function(uid, socket){
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
	 * power plants as tie-breakers. The first player (index zero) has the most
	 * cities, or the highest cost power plant.
	 */
	this.resolveTurnOrder = function(){
		var sortablePlayers = [];
		for(p in this.players){
			sortablePlayers.push(this.players[p]);
		}
		sortablePlayers.sort(function(playerA, playerB){
			var aCityCount = playerA.cities !== undefined ? playerA.cities.length : 0;
			var bCityCount = playerB.cities !== undefined ? playerB.cities.length : 0;
			return aCityCount != bCityCount
				? playerB.cities.length - playerA.cities.length
				: playerB.getHighestCostPowerPlant() - playerA.getHighestCostPowerPlant();
		});
		this.playerOrder = [];
		for(p in sortablePlayers){
			this.playerOrder.push(sortablePlayers[p].uid);
		}
	};

	/**
	 * This assumes the plants are already in ascending order by cost.
     *
     * TODO: move this to the auction phase class.
	 */
	this.setupAuction = function(){
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
				this.auction.startAuction(data.args);
			}
			else if(this.BID == action){
                this.auction.placeBid(data.args);
			}
			else if(this.BUY == action){
                this.market.buyResources(data.args);
			}
			else if(this.BUILD == action){
				this.buildCities(data.args);
			}
		}
        this.broadcastGameState();
	};

	/**
	 * Progresses to the next player, or starts the next Action.
	 */
	this.nextPlayer = function(){

        // Controls the direction of player turn order. Negative means we are advancing to the first player, starting
        // with the last. Positive means we are advancing to the last player starting from the first.
		var turnOrder = -1;
		if(this.currentAction == this.START_AUCTION)
			turnOrder = 1;

		this.currentPlayerIndex = this.currentPlayerIndex + turnOrder;
		if(this.currentPlayerIndex >= 0 && this.currentPlayerIndex < util.olen(this.players)){
			this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
		}

        // Once we have iterated through all players, we reset the index
		else{
			this.currentPlayerIndex = util.olen(this.players); // Why do this?

            // The first turn is special, as player order is initially chosen at random. Once all players have
            // purchased power plants, the turn order must be correct.
			if(this.firstTurn){
				this.resolveTurnOrder();
				this.firstTurn = false;
			}

            this.currentPlayer = this.playerOrder[util.olen(this.players)];
			this.nextAction();

            // Once we advance past to the "START_AUCTION" phase again, we must recompute turn order and point to
            // player position 1, as the first player must now start the auction first.
            if(this.currentAction == this.START_AUCTION){
                this.resolveTurnOrder();
                this.currentPlayer = this.playerOrder[0];
            }
		}
	};

	this.nextAction = function(){
		if(this.currentAction == this.START_AUCTION)
			this.currentAction = this.BUY;
		else if(this.currentAction == this.BUY)
			this.currentAction = this.BUILD;
		else if(this.currentAction == this.BUILD){

            // The Bureaucracy phase requires no player input, so we can just move through it without advancing the
            // action phase to it. Likewise, computing the winner can be done without advancing the state.
			this.getMoney();

            // TODO: If someone wins, halt game
            this.currentAction = this.START_AUCTION;
        }

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

    this.broadcastGameState = function() {
        var score = {};
		changeSet += 1;

        score.playerOrder = this.playerOrder;
        score.currentPlayerIndex = this.currentPlayerIndex;
		score.actualMarket = this.currentMarket;
		score.futuresMarket = this.futuresMarket;
		score.currentAction = this.currentAction;
		score.resources = this.market.resources;

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
		score.auction = {currentBidders:this.auction.currentBidders,
			finishedBidding:this.auction.finishedBidding,
			finishedAuctions:this.auction.finishedAuctions,
			currentBid:this.auction.currentBid,
			currentPlayerBidIndex:this.auction.currentPlayerBidIndex,
			currentBidChoice:this.auction.currentBidChoice,
			currentBidder:this.auction.currentBidder,
			currentBidLeader:this.auction.currentBidLeader,
			auctionRunning:this.auction.auctionRunning};

		// Score is the current data
		// Changes is an array of strings identifying what updated.
		// ChangeSet is an Int representing the number of broadcasts sent
        this.comms.broadcastUpdate({group: 'updateGameState',
			args:{data:score, changes:this.changes, changeSet:changeSet}});
		this.changes = [];
    };
};
