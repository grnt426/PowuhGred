var playerjs = require("./includes/Player.js"),
    auctionjs = require("./phases/auction.js"),
    util = require("./util.js"),
    marketjs = require("./phases/market.js"),
    buildingjs = require("./phases/building.js"),
    powerjs = require("./phases/power.js"),
    regionsjs = require("./regions.js");

/**
 * Primary entry point for the game, which manages game creation, phase transition, and action verification.
 * @param {Communications} comms
 * @param {Cities} cities
 * @param {PowerPlant[]} plants
 * @constructor
 * @this {Engine}
 */
exports.Engine = function(comms, cities, plants) {

    this.engineId = 0;

    this.STARTING_MONEY = 500;

    // The Step Three card constant, for simple comparison.
    this.STEP_THREE = "step3";
    this.STEP_THREE_CARD = {cost: this.STEP_THREE};

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
     * list of names of active regions for this game
     * @type {String[]}
     */
    this.activeRegions = [];

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
     * Player colors available for use.
     * @type {string[]}
     */
    this.colorsAvailable = ['red', 'blue', 'green', 'yellow', 'purple', 'black'];
    util.shuffle(this.colorsAvailable);

    /**
     * The current Step the game is in. Will always be either: 1, 2, or 3.
     * @type {number}
     */
    this.currentStep = 1;

    /**
     * This is used to indicate the Step 3 card has been drawn and triggered. However, not all of Step 3's conditions
     * are immediately in play. Some phases operate differently depending on when Step 3 was drawn.
     * @type {boolean}
     */
    this.step3Triggered = false;

    /**
     * Zero-indexed by player count (index 0 for 1 player, 1 for 2 players, etc). The value is the minimum number of cities
     * any one player must own for the game to end.
     * @type {number[]}
     */
    this.gameEndCityCounts = [3, 21, 17, 17, 15, 14];

    /**
     * Zero-indexed by player count (index 0 for 1 player, 1 for 2 players, etc). The value is the minimum number of
     * cities for Step 2 to be triggered.
     * @type {number[]}
     */
    this.step2CityCounts = [3, 10, 7, 7, 7, 6];

    /**
     * Zero-indexed by player count (index 0 for 1 player, 1 for 2 players, etc). The value is the number of power plant
     * cards to remove from the draw deck permanently from the game after setup.
     * @type {number[]}
     */
    this.removeFaceDownPlants = [8, 8, 8, 4, 0, 0];

    /**
     * This is set to true once the game is over. Otherwise, will remain false.
     * @type {boolean}
     */
    this.gameOver = false;

    /**
     * If players are tied by number of cities powered, and by money, and by number of cities owned, the game is officially
     * ended in a tie.
     * @type {boolean}
     */
    this.gameEndedInTie = false;

    /**
     * If players tied by number of cities powered, and by money, this is true if someone won because they had more cities.
     * @type {boolean}
     */
    this.gameEndedByMostCities = false;

    /**
     * If players tied in number of cities powered, this is true if someone had more money.
     * @type {boolean}
     */
    this.gameWinnerByMoney = false;

    /**
     * If a player can power more cities than anyone else, they win.
     * @type {boolean}
     */
    this.gameWinnerByMostPowered = false;

    /**
     * The player that won the game.
     * @type {undefined|Player}
     */
    this.winner = undefined;

    /**
     * Regions not used.
     * @type {Array}
     */
    this.inactiveRegions = [];

    /**
     * @returns {Player}
     */
    this.getCurrentPlayer = function() {
        return this.players[this.currentPlayer];
    };

    /**
     * Returns the maximum number of power plants a player can have. If there are 2 or fewer players, the maximum is
     * 4, otherwise the maximum is 3.
     * @returns {number} The maximum number of power plants a player can have.
     */
    this.getMaxPowerPlantsPerPlayer = function() {
        return this.getPlayerCount() <= 2 ? 4 : 3;
    };

    /**
     * The current Step the game is in.
     * 1 - The Step the game starts in, where players may not build on a city another player has already built in.
     * 2 - The step the game proceeds to once at least one player has 7 cities.
     * @param {string} phase    The current phase the game is in. Used for special Step 3 logic.
     * @returns {number}
     */
    this.getCurrentStep = function(phase) {
        if(this.step3Triggered) {
            if(phase == "power" || phase == "build") {
                return this.currentStep;
            }
            else {
                return 3;
            }
        }
        else {
            return this.currentStep;
        }
    };

    /**
     * @returns {number}
     */
    this.getPlayerCount = function() {
        return util.olen(this.players);
    };

    /**
     * Gets the Player object by UID.
     * @param {string} uid  The UID of the player to get.
     * @returns {Player}    The Player object represented by that UID.
     */
    this.getPlayerByUID = function(uid) {
        for(var p in this.players) {
            if(this.players[p].uid == uid) {
                return this.players[p];
            }
        }
    };

    this.startGame = function() {
        if(this.gameStarted) {
            comms.debug(true, "Trying to start after already started?");
            return;
        }

        this.initRegions();
        this.changes.push(this.START_GAME);
        this.gameStarted = true;
        this.market.setupStartingResources();
        this.randomizePlayerOrder();
        this.currentPlayer = this.playerOrder[0];
        this.setupAuction();
        this.currentAction = this.START_AUCTION;
    };

    /**
     * Creates a new player that will participate in the given game.
     * @param uid   Used to uniquely distinguish this player from others.
     * @param name  The name this player wants to be called, and used for chat messages.
     * @param socket    The protocol for communicating with the player's client, and with the player.
     * @returns {Player}    The Player object constructed by this function.
     */
    this.addPlayer = function(uid, name, socket) {
        var player = new playerjs.Player(uid, name, this.comms, socket);
        this.players[uid] = player;
        this.playerOrder.push(uid);
        this.reverseLookUp[socket.uid] = player;
        player.money = this.STARTING_MONEY;
        player.color = this.colorsAvailable.pop();
        return player;
    };

    /**
     * At the start of the game, randomly pick a valid set regions to use
     */
    this.initRegions = function() {
        var givenRegions = regionsjs.selectRegions(this.getPlayerCount());
        this.activeRegions = givenRegions[0];
        this.inactiveRegions = givenRegions[1];
        this.comms.toAll("Using regions " + this.activeRegions.join(", ") + " for this game.");
        this.cities.onlyUseTheseRegions(this.activeRegions);
    };

    /**
     * At the start of the game, player order is random.
     */
    this.randomizePlayerOrder = function() {
        util.shuffle(this.playerOrder);
    };

    /**
     * Determines player order based on number of cities, with the cost of
     * power plants as tie-breakers. The first player (index zero) has the most
     * cities, or the highest cost power plant.
     */
    this.resolveTurnOrder = function() {
        var sortablePlayers = [];
        for(var p in this.players) {
            sortablePlayers.push(this.players[p]);
        }
        sortablePlayers.sort(function(playerA, playerB) {
            var aCityCount = playerA.cities !== undefined ? playerA.cities.length : 0;
            var bCityCount = playerB.cities !== undefined ? playerB.cities.length : 0;
            return aCityCount != bCityCount
                ? playerB.cities.length - playerA.cities.length
                : playerB.getHighestCostPowerPlant() - playerA.getHighestCostPowerPlant();
        });
        this.playerOrder = [];
        for(p in sortablePlayers) {
            this.playerOrder.push(sortablePlayers[p].uid);
        }
    };

    /**
     * This assumes the plants are already in ascending order by cost.
     *
     * TODO: move this to the auction phase class.
     */
    this.setupAuction = function() {
        for(var p in this.plants) {
            this.plantCosts.push(this.plants[p].cost);
        }
        this.currentMarket = [this.plants[3], this.plants[4], this.plants[5], this.plants[6]];
        this.futuresMarket = [this.plants[7], this.plants[8], this.plants[9], this.plants[10]];
        delete this.plantCosts[3];
        delete this.plantCosts[4];
        delete this.plantCosts[5];
        delete this.plantCosts[6];
        delete this.plantCosts[7];
        delete this.plantCosts[8];
        delete this.plantCosts[9];
        delete this.plantCosts[10];
        delete this.plantCosts[13];
        this.plantCosts = this.plantCosts.filter(function(n) {
            return n != undefined
        });
        util.shuffle(this.plantCosts);

        // We need to randomly remove power plants based on player count after setup.
        this.plantCosts.splice(0, this.removeFaceDownPlants[this.getPlayerCount() - 1]);

        // The 13 cost (wind turbine) power plant is always on top of the deck
        this.plantCosts.splice(0, 0, 13);
        this.plantCosts.push(this.STEP_THREE);
        this.plants[this.STEP_THREE] = this.STEP_THREE_CARD;
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
     * @param data    The object which adheres to the above format.
     */
    this.resolveAction = function(data) {
        var uid = data.uid;
        var action = data.cmd;
        var args = data.args;
        var player = this.players[uid];

        console.info(uid + ", action: " + action + ", args: " + JSON.stringify(args));

        if(this.gameOver) {
            this.comms.toPlayer(player, "The game has ended! Why not play another game? :)");
            return;
        }

        // Any player may move their resources around at any time.
        else if(action == "move") {
            this.moveResourcesBetweenPlants(args, player);
            this.broadcastGameState();
            return;
        }

        // If a player needs to remove a plant from mat, that is also a short-circuiting action
        else if(action == "remove" && this.auction.playerMustRemovePlant && uid == this.auction.currentBidLeader) {
            this.auction.removePlantAndResumeAuction(args);
            return;
        }

        else if(action == "checkbuild") {
            var totalCost = this.building.checkCost(args, player);
            this.comms.toPlayer(player, "Cost of: " + JSON.stringify(args) + " is $" + totalCost);
            return;
        }

        // TODO: compress the boolean logic
        else if(this.currentPlayer !== false && uid !== this.currentPlayer && this.currentAction != this.BID && this.currentAction != this.POWER) {
            // for now, we only support listening to the current player
            console.info(uid + " tried taking their turn when not theirs! Currently, it is " + this.getCurrentPlayer().uid + "'s turn.");
            this.comms.toPlayer(player, "Not your turn.");
        }
        else if(this.currentAction == this.BID && uid != this.auction.currentBidder) {
            // for now, we only support listening to the current player
            console.info(uid + " tried taking their turn when not theirs!");
            this.comms.toPlayer(player, "Not your turn.");
        }
        else {
            if(this.currentAction !== action && data.args !== "pass") {
                console.info(uid + " tried giving an action we were not expecting, " + action);
                console.info("Expecting: : " + this.currentAction);
                this.comms.toPlayer(player, "Not expecting that action.");
                return;
            }

            if(this.START_GAME == action) {
                this.startGame();
            }
            else if(this.START_AUCTION == action) {
                this.auction.startAuction(data.args);
            }
            else if(this.BID == action) {
                this.auction.placeBid(data.args);
            }
            else if(this.BUY == action) {
                this.market.buyResources(data.args);
            }
            else if(this.BUILD == action) {
                this.building.buildCities(data.args);
            }
            else if(this.POWER == action) {
                this.power.powerCities(player, data.args);
            }

        }
        this.broadcastGameState();
    };

    /**
     * Moves resources from one plant to another.
     * @param {Object} data
     * @param {Player} player
     */
    this.moveResourcesBetweenPlants = function(data, player) {
        var sourcePlantCost = data['src'];
        var destinationPlantCost = data['dst'];
        var resources = data['resources'];

        if(player.plants[sourcePlantCost] == undefined || player.plants[destinationPlantCost] == undefined) {
            comms.toPlayer(player, "Source or Destination plant not owned.");
        }
        else {
            var sourcePlant = player.plants[sourcePlantCost];

            // If the player has chosen the new plant as the destination, we need to select it, instead.
            var destinationPlant = player.plants[destinationPlantCost] != undefined ? player.plants[destinationPlantCost]
                : this.plants[destinationPlantCost];
            if(sourcePlant.canRemoveResources(resources) && destinationPlant.canAddResources(resources)) {
                sourcePlant.removeResources(resources);
                destinationPlant.addResources(resources);
            }
            else {
                comms.toPlayer(player, "Can not move all resources. Source not enough or destination can't accept.");
            }
        }
    };

    this.getPowerPlantFromActualAuction = function(plantCost) {
        var index = 0;
        for(var plant in this.currentMarket) {
            if(this.currentMarket[plant].cost == plantCost) {
                return this.currentMarket[plant];
            }
            index += 1;
        }
        return undefined;
    };

    /**
     * A Mediator for the Market and Power phase.
     * @param resources
     */
    this.returnUsedResources = function(resources) {
        this.market.returnUsedResources(resources);
    };

    /**
     * Progresses to the next player, or starts the next Action.
     */
    this.nextPlayer = function() {

        // Controls the direction of player turn order. Negative means we are advancing to the first player, starting
        // with the last. Positive means we are advancing to the last player starting from the first.
        var turnOrder = -1;
        if(this.currentAction == this.START_AUCTION)
            turnOrder = 1;

        this.currentPlayerIndex = this.currentPlayerIndex + turnOrder;
        if(this.currentPlayerIndex >= 0 && this.currentPlayerIndex < util.olen(this.players)) {
            this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
        }

        // Once we have iterated through all players, we reset the index
        else {

            // All other phases start with the last player in the turn order track, and advance to to the front,
            // so we want to start with the last player
            this.currentPlayerIndex = util.olen(this.players) - 1;

            // The first turn is special, as player order is initially chosen at random. Once all players have
            // purchased power plants, the turn order must be correct.
            if(this.firstTurn) {
                this.resolveTurnOrder();
                this.firstTurn = false;
            }

            this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
            this.nextAction();

            // Once we advance past to the "START_AUCTION" phase again, we must recompute turn order and point to
            // player position 1, as the first player must now start the auction first.
            if(this.currentAction == this.START_AUCTION) {
                this.resolveTurnOrder();
                this.currentPlayer = this.playerOrder[0];
            }
        }
    };

    this.nextAction = function() {
        if(this.currentAction == this.START_AUCTION) {
            this.auction.removeLowestPlant(true);
            this.checkForStep3();
            this.currentAction = this.BUY;
        }
        else if(this.currentAction == this.BUY)
            this.currentAction = this.BUILD;
        else if(this.currentAction == this.BUILD) {

            // TODO: Check if game is over
            // YES, this is performed AFTER the build phase BEFORE the power phase.
            // See pg. 7, line 1
            if(this.checkIfGameOver()) {

                // No need to trigger potentially weird side-effects, so don't bother finishing the transition to the
                // next phase.
                return;
            }

            // Check if Step2 should happen
            var triggerStep2 = false;
            for(var p in this.players) {
                if(this.players[p].cities.length >= this.step2CityCounts[this.getPlayerCount() - 1]) {
                    triggerStep2 = true;
                    break;
                }
            }

            if(triggerStep2) {
                this.auction.removeLowestPlant(true);

                // While very rare/bizarre, it is possible for players to progress to Step 3 before progressing to
                // Step 2. If so, we don't want to permanently revert, so we check here just to make sure.
                if(this.currentStep == 3) {
                    this.comms.toAll("Step 2 triggered, but the game is already in Step 3.");
                    this.comms.toAll("Only the lowest cost power plant is removed, and the game stays in Step 3");
                }
                else {
                    this.comms.toAll("The game is now in Step 2!");
                    this.comms.toAll("Two players can build in a city, and the game restocks at Step 2 rates.");
                    this.currentStep = 2;
                }
            }

            // This, it is OK this is not guarded by an else. Step 3 can immediately trigger after Step 2 happens (though,
            // this is very unlikely to happen).
            this.checkForStep3();

            this.currentAction = this.POWER;
        }
        else if(this.currentAction == this.POWER) {

            this.market.replenishResources();


            // Yes, we want to check for Step 3 **after** replenishing resources at the previous Step's amount. This
            // is an explicit rule.
            this.checkForStep3();

            // And move on to the Auction phase once more
            this.resolveTurnOrder();
            this.currentAction = this.START_AUCTION;
            this.currentPlayerIndex = 0;
            this.currentPlayer = this.playerOrder[this.currentPlayerIndex];
            this.auction.startNewRoundOfAuctions();
        }

    };

    /**
     * Determines if the game is over. Using this criteria: https://github.com/grnt426/PowuhGred/issues/34
     * @returns {boolean}   True if the game ended, otherwise false.
     */
    this.checkIfGameOver = function() {
        for(var p in this.players) {
            var player = this.players[p];
            if(player.cities.length >= this.gameEndCityCounts[this.getPlayerCount() - 1]) {
                this.gameOver = true;
                break;
            }
        }
        if(this.gameOver) {
            this.comms.toAll("The game has ended! And the winner is...");
            var mostPoweredPlayers = this.power.whoCanPowerTheMost();
            if(mostPoweredPlayers.length == 1) {
                this.winner = mostPoweredPlayers[0];
                this.gameWinnerByMostPowered = true;
                this.comms.toAll(this.winner.displayName + " has won because they can power the most cities!");
            }
            else {
                this.comms.toAll("Multiple players are tied for most powered! Who has more money...");
                var mostMoney = -1;
                var mostMoneyPlayers = [];
                for(var p in mostPoweredPlayers) {
                    var player = mostPoweredPlayers[p];
                    if(player.money > mostMoney) {
                        mostMoneyPlayers = [player];
                        mostMoney = player.money;
                    }
                    else if(player.money == mostMoney) {
                        mostMoneyPlayers.push(player);
                    }
                }
                if(mostMoneyPlayers.length == 1) {
                    this.winner = mostMoneyPlayers[0];
                    this.gameWinnerByMoney = true;
                    this.comms.toAll(this.winner.displayName + " has won the tie-breaker with the most money!");
                }
                else {
                    this.comms.toAll("Multiple players are tied for most money! Who has more cities in total...");
                    var mostCities = -1;
                    var mostCitiesPlayers = [];
                    for(var p in mostMoneyPlayers) {
                        var player = mostMoneyPlayers[p];
                        if(player.cities.length > mostCities) {
                            mostCitiesPlayers = [player];
                            mostCities = player.cities.length;
                        }
                        else if(player.cities.length == mostCities) {
                            mostCitiesPlayers.push(player);
                        }
                    }
                    if(mostCitiesPlayers.length == 1) {
                        this.winner = mostCitiesPlayers[0];
                        this.gameEndedByMostCities = true;
                        this.comms.toAll(this.winner.displayName + " has won the tie-breaker-breaker with the most cities!");
                    }
                    else {
                        this.winner = undefined;
                        this.gameEndedInTie = true;
                        this.comms.toAll("Against all possible odds, the game has ended in a complete tie!");
                        var tiedPlayerNames = [];
                        for(var p in mostCitiesPlayers) {
                            tiedPlayerNames.push(mostCitiesPlayers[p].displayName);
                        }
                        this.comms.toAll("The winners are: " + ", ".join(tiedPlayerNames));
                    }
                }
            }
        }
        return this.gameOver;
    };

    /**
     * Step 3 has various conditions for what should happen depending on which phase the card was drawn on.
     *
     * For a breakdown of what will be implemented in greater detail, see: https://github.com/grnt426/PowuhGred/issues/25
     */
    this.checkForStep3 = function() {
        if(this.futuresMarket[3] == this.STEP_THREE_CARD) {
            this.futuresMarket.splice(3, 1);
            util.shuffle(this.plantCosts);
            this.auction.removeLowestPlant(false);
            this.auction.reorderForStep3();
            this.step3Triggered = true;
        }

        // Once triggered, Step 3 can be fully transitioned to the next time we check (which always happens on phase transitions).
        else if(this.step3Triggered) {
            this.step3Triggered = false;
            this.currentStep = 3;
        }
    };

    /**
     * Checks if the number of cities owned is greater than the lowest cost power plant. If so, removes the lowest cost
     * power plant and redraws.
     * @param cities
     */
    this.checkCityCounts = function(cities) {
        while(cities >= this.getLowestCostPlant()) {
            this.auction.removeLowestPlant(true);
            this.checkForStep3();
        }
    };

    this.getLowestCostPlant = function() {
        var lowest = 999;
        for(var p in this.currentMarket) {
            if(this.currentMarket[p].cost < lowest) {
                lowest = this.currentMarket[p].cost;
            }
        }
        return lowest;
    };

    this.removePowerPlantFromRoundEnd = function() {
        if(this.currentStep != 3 && !this.step3Triggered) {
            var plant = this.futuresMarket.splice(3, 1)[0];
            this.plantCosts.push(plant.cost);
            this.auction.addNewAndReorder();
        }
        else {
            this.auction.removeLowestPlant(true);
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
        score.playersPaid = this.power.playersPaid;
        score.excessResources = this.market.excessResources;
        score.currentStep = this.getCurrentStep(this.currentAction);
        score.inactiveRegions = this.inactiveRegions;
        score.replenishRate = this.market.replenishRate[this.getPlayerCount()];

        // making a subset of player data, don't want whole object
        score.players = {};
        for(var i = 0; i < this.playerOrder.length; i++) {
            var p = {};
            var player = this.players[this.playerOrder[i]];
            p.money = player.money;
            p.plants = player.plants;
            p.cities = player.cities;
            p.resources = player.resources;
            p.displayName = player.displayName;
            p.uid = player.uid;
            p.color = player.color;
            score.players[this.playerOrder[i]] = p;
        }

        // Auction Data
        score.auction = {
            currentBidders: this.auction.currentBidders,
            finishedAuctions: this.auction.finishedAuctions,
            currentBid: this.auction.currentBid,
            currentPlayerBidIndex: this.auction.currentPlayerBidIndex,
            currentBidChoice: this.auction.currentBidChoice,
            currentBidder: this.auction.currentBidder,
            currentBidLeader: this.auction.currentBidLeader,
            auctionRunning: this.auction.auctionRunning
        };

        score.gameOver = this.gameOver;
        score.winner = this.winner != undefined ? this.winner.displayName : undefined;
        score.gameWinnerByMostPowered = this.gameWinnerByMostPowered;
        score.gameWinnerByMoney = this.gameWinnerByMoney;
        score.gameEndedByMostCities = this.gameEndedByMostCities;
        score.gameEndedInTie = this.gameEndedInTie;

        score.playerMustRemovePlant = this.auction.playerMustRemovePlant;


        // Score is the current data
        // Changes is an array of strings identifying what updated.
        // ChangeSet is an Int representing the number of broadcasts sent
        this.comms.broadcastUpdate({
            group: 'updateGameState',
            args: {data: score, changes: this.changes, changeSet: changeSet}
        });
        console.info(JSON.stringify(score));
        this.changes = [];
    };

    // junk data for testing
    this.junkData = function() {
        for(var i = 0; i < this.playerOrder.length; i++) {
            this.players[this.playerOrder[i]].money = Math.floor((Math.random() * 100) + 1);
            this.players[this.playerOrder[i]].plants = [Math.floor((Math.random() * 30) + 1), Math.floor((Math.random() * 30) + 1), Math.floor((Math.random() * 30) + 1)];
            this.players[this.playerOrder[i]].cities = ["Berlin", "some other place", "Frankfurt-d"];
            var citylen = Math.floor(Math.random() * 12);
            for(var k = 0; k < citylen; k++) {
                this.players[this.playerOrder[i]].cities.push("another city");
            }
            this.players[this.playerOrder[i]].resources = {
                'coal': Math.floor((Math.random() * 10)),
                'oil': Math.floor((Math.random() * 10)),
                'garbage': Math.floor((Math.random() * 10)),
                'uranium': Math.floor((Math.random() * 10))
            };
            this.players[this.playerOrder[i]].displayName = "some jerk"
        }
    };
};
