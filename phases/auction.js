var util = require("../util.js");

/**
 *
 * @param {Engine} engine
 * @param {Communications} comms
 * @constructor
 * @this {Auction}
 */
exports.Auction = function(engine, comms) {

    /**
     * @type {Engine}
     */
    this.engine = engine;

    /**
     * @type {Communications}
     */
    this.comms = comms;

    /**
     * List of UIDs.
     * @type {String[]}
     */
    this.currentBidders = [];

    /**
     * UID of players that can no longer can start auctions. Either because they already purchased a plant, or passed
     * on their turn to start the auction.
     * @type {String[]}
     */
    this.finishedAuctions = [];

    /**
     * The highest bid currently recorded for the plant under auction.
     * @type {number}
     */
    this.currentBid = 0;

    /**
     * The index to the player who must either pass or bid on a plant under auction.
     * @type {number}
     */
    this.currentPlayerBidIndex = -1;

    /**
     * The plant cost of the plant currently under auction.
     * @type {number}
     */
    this.currentBidChoice = -1;

    /**
     * UID of the current bidder.
     * @type {boolean|string}
     */
    this.currentBidder = false;

    /**
     * The UID of the player currently in the lead.
     * @type {boolean|string}
     */
    this.currentBidLeader = false;

    /**
     * Used to track if the auction has started for a power plant, or if we are still awaiting a player to bring a power
     * plant to auction.
     * @type {boolean}
     */
    this.auctionRunning = false;

    /**
     * This is used to indicate if the Step 3 card was drawn during the Auction phase, and already triggered a shuffle
     * of the draw deck (while shuffling each time isn't that big of a deal, it is unnecessary).
     * @type {boolean}
     */
    this.haveNotShuffledAfterStep3 = true;

    /**
     * When a player has more plants than they can store, they must choose a plant to discard. This flag is set
     * when the auction phase is awaiting a player to discard a power plant.
     * @type {boolean}
     */
    this.playerMustRemovePlant = false;

    /**
     * If at least one player has bought a power plant, there is no need to discard the lowest cost power plant.
     * @type {boolean}
     */
    this.powerPlantBoughtInRound = false;

    this.startNewRoundOfAuctions = function() {
        this.powerPlantBoughtInRound = false;
    };

    // TODO Should a different order be used?
    this.nextBidder = function(pass) {

        // award the power plant if the last bidder passed, or if there is only
        // one bidder at the start of the bid.
        if((this.currentBidders.length == 2 && pass) || this.currentBidders.length == 1) {
            var bidWinner = this.currentBidLeader;
            this.finishedAuctions.push(bidWinner);
            var player = this.engine.players[bidWinner];
            this.comms.toAll(player.displayName + " won power plant " + this.engine.plants[this.currentBidChoice].cost
                + " for $" + this.currentBid);
            if(player.getPlantCount() == this.engine.getMaxPowerPlantsPerPlayer()) {
                this.playerMustRemovePlant = true;
                this.comms.toAll(player.displayName + " must first discard a power plant before accepting the new plant.");
                this.engine.broadcastGameState();
            }
            else {
                this.awardPlantToBidWinner();
            }
        }
        else if(pass) {
            this.currentBidders.splice(this.currentPlayerBidIndex, 1);
            this.currentPlayerBidIndex = this.currentPlayerBidIndex % this.currentBidders.length;
            this.currentBidder = this.currentBidders[this.currentPlayerBidIndex];
        }
        else {
            console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
            this.currentPlayerBidIndex = (this.currentPlayerBidIndex + 1) % this.currentBidders.length;
            this.currentBidder = this.currentBidders[this.currentPlayerBidIndex];
            console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
        }
    };

    this.awardPlantToBidWinner = function() {
        var player = this.engine.players[this.currentBidLeader];
        player.awardPlant(this.engine.plants[this.currentBidChoice], this.currentBid);
        this.removeAuctionedPlant();
        this.cleanAuctionState();
    };

    this.removePlantAndResumeAuction = function(removePlantCost) {
        var player = this.engine.players[this.currentBidLeader];
        var plantToRemove = player.plants[removePlantCost];
        if(plantToRemove == undefined) {
            this.comms.toPlayer(player, "You can't remove a plant you don't own.");
        }
        else {

            // Don't let unused resources be lost!
            this.engine.returnUsedResources(plantToRemove.resources);
            player.removePowerPlant(removePlantCost);
            this.playerMustRemovePlant = false;

            // Now we can resume the Auction
            this.awardPlantToBidWinner();
            this.engine.broadcastGameState();
        }
    };

    /**
     * The expected data is either
     *    {cost:PowerPlantCost,bid:StartingBid}
     * or
     *    pass
     * @param data
     */
    this.startAuction = function(data) {

        if(data === "pass") {
            this.finishedAuctions.push(this.engine.currentPlayer);
            this.engine.nextPlayer();
        }
        else {
            this.powerPlantBoughtInRound = true;
            console.info(data);
            var player = this.engine.players[this.engine.currentPlayer];
            var plant = data.cost;

            var plantObject = this.engine.getPowerPlantFromActualAuction(plant);
            if(plantObject === undefined) {
                this.comms.toPlayer(player, "Invalid plant selected");
            }

            var bid = data.bid;
            if(bid < plant) {
                // Reject bid
                console.info("Bid too low.");
                this.comms.toPlayer(player, "bid too low.");
                return;
            }

            if(bid > player.money) {
                // Reject bid
                console.info("Not enough money.");
                this.comms.toPlayer(player, "not enough money.");
                return;
            }

            this.currentBid = bid;
            this.currentBidChoice = plant;
            this.currentBidLeader = player.uid;
            this.engine.currentAction = this.engine.BID;

            this.comms.toAll(player.displayName + " started the auction for plant " + plant + " at $" + bid);

            for(var key in this.engine.players) {
                console.info(this.engine.players[key].uid + " Eligible? "
                    + (this.finishedAuctions.indexOf(this.engine.players[key].uid) == -1 ? "yes" : "no"));
                if(this.finishedAuctions.indexOf(this.engine.players[key].uid) == -1)
                    this.currentBidders.push(this.engine.players[key].uid);
            }
            this.currentPlayerBidIndex = this.currentBidders.indexOf(player.uid);
            this.auctionRunning = true;
            this.nextBidder(false);
        }
    };

    this.placeBid = function(data) {
        if(data === "pass") {
            this.nextBidder(true);
            return;
        }

        var bid = data.bid;
        if(bid <= this.currentBid) {
            // reject bid
            this.comms.toPlayer(this.engine.players[this.currentBidder], "bid too low.");
            return;
        }

        var player = this.engine.players[this.currentBidder];
        if(bid > player.money) {
            // Reject bid
            this.comms.toPlayer(player, "not enough money.");
            return;
        }

        this.currentBid = bid;
        this.currentBidLeader = player.uid;
        this.nextBidder(false);
    };

    /**
     * Removes the power plant currently up for auction, then draws a new power plant, and reorders the market.
     */
    this.removeAuctionedPlant = function() {
        var index = 0;
        for(var plant in this.engine.currentMarket) {
            if(this.engine.currentMarket[plant].cost == this.currentBidChoice) {
                break;
            }
            index += 1;
        }
        this.engine.currentMarket.splice(index, 1);
        this.addNewAndReorder();
    };

    /**
     * Removes the lowest cost power plant from the market, then adds a new plant from the
     * deck and reorders the market.
     * @param {boolean} replaceLowest   If true, after removing the power plant, a new card is draw. Otherwise no new
     *                                  card is drawn.
     */
    this.removeLowestPlant = function(replaceLowest) {
        var lowestIndex = -1;
        for(var p in this.engine.currentMarket) {
            if(lowestIndex == -1 || this.engine.currentMarket[p].cost < this.engine.currentMarket[lowestIndex].cost) {
                lowestIndex = p;
            }
        }
        this.engine.currentMarket.splice(lowestIndex, 1);
        if(replaceLowest) {
            this.addNewAndReorder();
        }
    };

    this.reorderForStep3 = function() {
        this.engine.currentMarket = this.engine.currentMarket.concat(this.engine.futuresMarket);
        this.engine.currentMarket.sort(function(plantA, plantB) {
            return plantA.cost - plantB.cost
        });
        this.engine.futuresMarket = [];
    };

    /**
     * Draws a new power plant from the market, and then reorders the market.
     */
    this.addNewAndReorder = function() {
        var unsortedPlants = this.engine.currentMarket.concat(this.engine.futuresMarket);
        if(this.engine.plantCosts.length != 0) {
            var nextCost = this.engine.plantCosts.splice(0, 1);
            var newPlant = this.engine.plants[nextCost];
            unsortedPlants = unsortedPlants.concat(newPlant);
        }
        unsortedPlants.sort(function(plantA, plantB) {
            if(plantA.cost == "step3") return 100; else return plantA.cost - plantB.cost
        });
        if(unsortedPlants.length <= 6) {
            this.engine.currentMarket = unsortedPlants;
        }
        else {
            this.engine.currentMarket = unsortedPlants.splice(0, 4);
            this.engine.futuresMarket = unsortedPlants.splice(0, 4);
            if(this.engine.futuresMarket[3].cost == this.engine.STEP_THREE && this.haveNotShuffledAfterStep3) {

                // As soon as Step 3 is revealed, we must shuffle the draw deck.
                util.shuffle(this.engine.plantCosts);
                this.haveNotShuffledAfterStep3 = false;
            }
        }
    };

    /**
     * Prepares for another round of auctions within the same phase.
     */
    this.cleanAuctionState = function() {
        this.engine.currentAction = this.engine.START_AUCTION;
        this.currentBid = 0;
        this.currentPlayerBidIndex = -1;
        this.currentBidChoice = -1;
        this.currentBidder = false;
        this.currentBidLeader = false;
        this.auctionRunning = false;
        this.currentBidders = [];

        // If the current player lost the auction, they get to start the auction
        // once more.
        if(this.finishedAuctions.indexOf(this.engine.currentPlayer) == -1) {
            this.comms.toAll(this.engine.getCurrentPlayer().displayName + " gets to start the auction again.");
        }

        else if(this.finishedAuctions.length == this.engine.getPlayerCount()) {
            this.finishedAuctions = [];
            this.engine.nextPlayer();
        }
        else {

            // Otherwise we keep progressing to the next player in this phase
            // until we find one that has not finished their auction phase.
            do {
                this.engine.nextPlayer();
            } while(this.finishedAuctions.indexOf(this.engine.currentPlayer) != -1);
        }
    };
};
