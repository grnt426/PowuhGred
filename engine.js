var playerjs = require("./includes/Player.js"),
	auctionjs = require("./phases/auction.js"),
	util = require("./util.js"),
    marketjs = require("./phases/market.js"),
    buildingjs = require("./phases/building.js"),
    powerjs = require("./phases/power.js");

/**
 * Primary entry point for the game, which manages game creation, phase transition, and action verification.
 * @param {Communications} comms
 * @param {Cities} cities
 * @param {PowerPlant[]} plants
 * @constructor
 * @this {Engine}
 */
exports.Engine = function(comms, cities, plants){

    this.STARTING_MONEY = 50;

    // The Step Three card constant, for simple comparison.
    this.STEP_THREE = "Step3";

    // Action Enums
    this.START_GAME = "startGame";
    this.START_AUCTION = "startAuction";
    this.BID = "bid";
    this.BUY = "buy";
    this.BUILD = "build";
    this.POWER = "power";

    /**
     * @type {Communications}
     */
	this.comms = comms;

    /**
     * @type {Cities}
     */
	this.cities = cities;

    /**
     * @type {PowerPlant[]}
     */
	this.plants = plants;
    this.plantCosts = [];

    /**
     * A list of player UIDs, whose ordering is very strict.
     * @type {string[]}
     */
	this.playerOrder = [];

    /**
     * Simple list of all the players. Ordering irrelevant.
     * @type {Player[]}
     */
	this.players = {};

    /**
     * @type {Object<Socket, Player>}
     */
	this.reverseLookUp = [];

    /**
     * If there is a current player, this is a string of the player's UID. Otherwise, this is false.
     * @type {boolean|string}
     */
	this.currentPlayer = false;

    /**
     * The index of the current player, which is used with this.playerOrder.
     * @type {number}
     */
	this.currentPlayerIndex = 0;

    /**
     * This is the visible list of power plants currently available to start an auction with, whose order is ascending
     * on the power plant cost.
     *
     * TODO: May be better to simply combine the current/future and instead use an index offset.
     * @type {PowerPlant[]}
     */
	this.currentMarket = [];

    /**
     * This is the visible list of power plants available in the future, whose order is ascending on the power plant cost.
     * @type {PowerPlant[]}
     */
	this.futuresMarket = [];

    /**
     * Whether the game has actually begun, or if we are still waiting for players.
     * @type {boolean}
     */
	this.gameStarted = false;

    /**
     * Some game specific rules and setup are performed if this is the first turn. Not relevant after the first turn.
     * @type {boolean}
     */
	this.firstTurn = true;

    /**
     * This determines the current state of the game. Only actions relevant to this state are permitted.
     * @type {string}
     */
	this.currentAction = this.START_GAME;

    /**
     * @type {Auction}
     */
	this.auction = new auctionjs.Auction(this, this.comms);

    /**
     * @type {Market}
     */
    this.market = new marketjs.Market(this, this.comms, this.plants);

    /**
     * @type {Building}
     */
    this.building = new buildingjs.Building(this, this.comms, this.cities);

    /**
     * @type {Power}
     */
    this.power = new powerjs.Power(this, this.comms, this.plants);

    /**
     * Identifiers which declare what set of data changed in the update.
     * @TODO: not updated completely with all states.
     *
     * @type {string[]}
     */
	this.changes = [];

    /**
     * Incremented with each broadcast of data. Used for debugging and detecting game de-sync issues (if they arise in the future).
     * @type {number}
     */
	var changeSet = 0;

    /**
     * @returns {Player}
     */
    this.getCurrentPlayer = function(){
        return this.players[this.currentPlayerIndex];
    };

	this.startGame = function(){
		if(this.gameStarted) {
            comms.debug(true, "Trying to start after already started?");
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
		this.reverseLookUp[socket.uid] = player;
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
        for(p in this.plants){
            this.plantCosts.push(this.plants[p].cost);
        }
		this.currentMarket = [this.plants[3], this.plants[4], this.plants[5], this.plants[6]];
		this.futuresMarket = [this.plants[7], this.plants[8], this.plants[9], this.plants[10]];
		delete this.plantCosts[3]; delete this.plantCosts[4]; delete this.plantCosts[5]; delete this.plantCosts[6];
        delete this.plantCosts[7]; delete this.plantCosts[8]; delete this.plantCosts[9]; delete this.plantCosts[10];
        delete this.plantCosts[13];
        this.plantCosts = this.plantCosts.filter(function(n){return n != undefined});
        util.shuffle(this.plantCosts);

        // The 13 cost (wind turbine) power plant is always on top of the deck
		this.plantCosts.splice(0, 0, 13);
		this.plantCosts.push(this.STEP_THREE);
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
		if(this.currentPlayer !== false && uid !== this.currentPlayer && this.currentAction != this.BID && this.currentAction != this.POWER){
			// for now, we only support listening to the current player
			console.info(uid + " tried taking their turn when not theirs!");
			this.comms.toPlayer(player, "Not your turn.");
		}
		else if(this.currentAction == this.BID && uid != this.auction.currentBidder){
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
				this.building.buildCities(data.args);
			}
            else if(this.POWER == action){
                this.power.powerCities(player, data.args);
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
            this.resolveTurnOrder();
            this.currentAction = this.START_AUCTION;
            this.currentPlayerIndex = 0;
            this.currentPlayer = this.playerOrder[this.currentPlayerIndex];

            // TODO: If someone wins, halt game
            this.currentAction = this.START_AUCTION;
        }

	};

    /**
     * Bundles up all relevant game state to be sent to all players. Each broadcast is numbered with a strictly
     * monotonically increasing value, and loosely notes what values were changed.
     */
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
            p.plants      = player.getPowerPlantCosts();
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
        console.info(JSON.stringify(score));
		this.changes = [];
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
};
