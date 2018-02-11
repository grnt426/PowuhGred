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

    this.PLOG = "[AUCTION]: ";

    this.startNewRoundOfAuctions = function() {
        this.powerPlantBoughtInRound = false;
    };

    // TODO Should a different order be used?
    this.nextBidder = function(pass) {
        console.info(this.PLOG + "nextBidder entered.");

        // award the power plant if the last bidder passed, or if there is only
        // one bidder at the start of the bid.
        if((this.currentBidders.length === 2 && pass) || this.currentBidders.length === 1) {
            console.info(this.PLOG + "automatically awarded.");
            var bidWinner = this.currentBidLeader;
            this.finishedAuctions.push(bidWinner);
            var player = this.engine.players[bidWinner];
            this.comms.toAll(player.displayName + " won power plant " + this.engine.plants[this.currentBidChoice].cost
                + " for $" + this.currentBid);
            if(player.getPlantCount() === this.engine.getMaxPowerPlantsPerPlayer()) {
                console.info(this.PLOG + "player needs to discard a plant before receiving the new one.");
                this.playerMustRemovePlant = true;
                this.comms.toAll(player.displayName + " must first discard a power plant before accepting the new plant.");
                this.engine.broadcastGameState();
            }
            else {
                this.awardPlantToBidWinner();
            }
        }
        else if(pass) {
            console.info(this.PLOG + "current player chose to pass on bidding.");
            this.currentBidders.splice(this.currentPlayerBidIndex, 1);
            this.currentPlayerBidIndex = this.currentPlayerBidIndex % this.currentBidders.length;
            this.currentBidder = this.currentBidders[this.currentPlayerBidIndex];
        }
        else {
            console.info(this.PLOG + "moving on to next bidder");
            console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
            this.currentPlayerBidIndex = (this.currentPlayerBidIndex + 1) % this.currentBidders.length;
            this.currentBidder = this.currentBidders[this.currentPlayerBidIndex];
            console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
        }
    };

    this.awardPlantToBidWinner = function() {
        var player = this.engine.players[this.currentBidLeader];
        console.info(this.PLOG + JSON.stringify(this.engine.plants[this.currentBidChoice]) + " awarded to " + player.displayName +
            " for $" + this.currentBid);
        player.awardPlant(this.engine.plants[this.currentBidChoice], this.currentBid);
        this.removeAuctionedPlant();
        this.cleanAuctionState();
    };

    this.removePlantAndResumeAuction = function(removePlantCost) {
        console.info(this.PLOG + "removePlantAndResumeAuction entered.");
        var player = this.engine.players[this.currentBidLeader];
        var plantToRemove = player.plants[removePlantCost];
        if(plantToRemove === undefined) {
            console.info(this.PLOG + "trying to remove a plant that isn't owned???");
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

        console.info(this.PLOG + "start Auction entered.");
        if(data === "pass") {
            console.info(this.PLOG + "player passed.");
            this.finishedAuctions.push(this.engine.currentPlayer);
            this.engine.nextPlayer();
        }
        else {
            console.info(this.PLOG + "data received = " + JSON.stringify(data));
            var player = this.engine.getCurrentPlayer();
            var plant = data.cost;

            var plantObject = this.engine.getPowerPlantFromActualAuction(plant);
            if(plantObject === undefined) {
                this.comms.toPlayer(player, "Invalid plant selected");
                return;
            }

            var bid = data.bid;
            if(bid < plant || bid < 3) {
                // Reject bid
                console.info(this.PLOG + "Bid too low.");
                this.comms.toPlayer(player, "bid too low.");
                return;
            }

            if(bid > player.money) {
                // Reject bid
                console.info(this.PLOG + "Not enough money.");
                this.comms.toPlayer(player, "not enough money.");
                return;
            }

            this.powerPlantBoughtInRound = true;
            this.currentBid = bid;
            this.currentBidChoice = plant;
            this.currentBidLeader = player.uid;
            this.engine.currentAction = this.engine.BID;

            console.info(this.PLOG + player.displayName + " started the auction for plant " + plant + " at $" + bid);
            this.comms.toAll(player.displayName + " started the auction for plant " + plant + " at $" + bid);

            for(let key in this.engine.players) {
                console.info(this.PLOG + this.engine.players[key].uid + " Eligible? "
                    + (this.finishedAuctions.indexOf(this.engine.players[key].uid) === -1 ? "yes" : "no"));
                if(this.finishedAuctions.indexOf(this.engine.players[key].uid) === -1)
                    this.currentBidders.push(this.engine.players[key].uid);
            }
            this.currentPlayerBidIndex = this.currentBidders.indexOf(player.uid);
            this.auctionRunning = true;
            this.nextBidder(false);
        }
    };

    this.placeBid = function(data) {
        console.info(this.PLOG + "placeBid entered.");
        if(data === "pass") {
            console.info(this.PLOG + "player passing on bidding.");
            this.nextBidder(true);
            return;
        }

        var bid = data.bid;
        if(bid <= this.currentBid) {
            // reject bid
            console.info(this.PLOG + "too low of a bid received.");
            this.comms.toPlayer(this.engine.players[this.currentBidder], "bid too low.");
            return;
        }

        var player = this.engine.players[this.currentBidder];
        if(bid > player.money) {
            // Reject bid
            console.info(this.PLOG + "not enough money for bid.");
            this.comms.toPlayer(player, "not enough money.");
            return;
        }

        console.info(this.PLOG + "bid accepted");
        this.currentBid = bid;
        this.currentBidLeader = player.uid;
        this.nextBidder(false);
    };

    /**
     * Removes the power plant currently up for auction, then draws a new power plant, and reorders the market.
     */
    this.removeAuctionedPlant = function() {
        console.info(this.PLOG + "removeAuctionedPlant entered.");
        var index = 0;
        for(var plant in this.engine.currentMarket) {
            if(this.engine.currentMarket[plant].cost === this.currentBidChoice) {
                break;
            }
            index += 1;
        }
        console.info(this.PLOG + "removing " + this.currentBidChoice + " at index " + index);
        this.engine.currentMarket.splice(index, 1);
        this.addNewAndReorder();
    };

    /**
     * Removes the lowest cost power plant from the market, then adds a new plant from the
     * deck and reorders the market.
     * @param {boolean} replaceLowest   If true, after removing the power plant, a new card is draw. Otherwise no new
     *                                  card is drawn.
     */
    this.removeLowestPlant = function(replaceLowest, addCardBack) {
        console.info(this.PLOG + "removing lowest cost plant.");
        let removed = this.engine.currentMarket.splice(0, 1);
        if(addCardBack) {
            // Need to add plants back to the draw pile
        }

        console.info(this.PLOG + "removed plant " + removed + " from current market.");
        if(replaceLowest) {
            console.info(this.PLOG + "and replacing the removed card with a new power plant.");
            this.addNewAndReorder();
        }
    };

    this.reorderForStep3 = function() {
        console.info(this.PLOG + "merging current and futures market for Step 3.");
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
        console.info(this.PLOG + "addNewAndReorder entered");
        var unsortedPlants = this.engine.currentMarket.concat(this.engine.futuresMarket);
        if(this.engine.plantCosts.length !== 0) {
            console.info(this.PLOG + "drawing a card from the power plant deck.");
            var nextCost = this.engine.plantCosts.splice(0, 1)[0];
            var newPlant = this.engine.plants[nextCost];
            unsortedPlants = unsortedPlants.concat(newPlant);
            console.info(this.PLOG + "added " + nextCost + " power plant");
        }
        unsortedPlants.sort(function(plantA, plantB) {
            if(plantA.cost == "step3") return 100; else return plantA.cost - plantB.cost
        });
        if(unsortedPlants.length <= 6) {
            console.info(this.PLOG + "6 or less plants total. Making all 6 the current market.");
            this.engine.currentMarket = unsortedPlants;
        }
        else {
            this.engine.currentMarket = unsortedPlants.splice(0, 4);
            this.engine.futuresMarket = unsortedPlants.splice(0, 4);
            console.info(this.PLOG + "current market = " + JSON.stringify(this.engine.currentMarket)
                + " | futures market = " + JSON.stringify(this.engine.futuresMarket));
            if(this.engine.futuresMarket[3].cost === this.engine.STEP_THREE && this.haveNotShuffledAfterStep3) {

                // As soon as Step 3 is revealed, we must shuffle the draw deck.
                console.info(this.PLOG + "shuffling draw deck");
                util.shuffle(this.engine.plantCosts);
                this.haveNotShuffledAfterStep3 = false;
            }
        }
    };

    /**
     * Prepares for another round of auctions within the same phase.
     */
    this.cleanAuctionState = function() {
        console.info(this.PLOG + "cleanAuctionState entered");
        this.engine.currentAction = this.engine.START_AUCTION;
        this.currentBid = 0;
        this.currentPlayerBidIndex = -1;
        this.currentBidChoice = -1;
        this.currentBidder = false;
        this.currentBidLeader = false;
        this.auctionRunning = false;
        this.currentBidders = [];

        if(this.finishedAuctions.length === this.engine.getPlayerCount()) {
            console.info(this.PLOG + "Auction done, move to next phase.");
            this.engine.currentPlayerIndex = -2;
            this.finishedAuctions = [];
            this.engine.nextPlayer();
        }

        // If the current player lost the auction, they get to start the auction
        // once more.
        else if(this.finishedAuctions.indexOf(this.engine.currentPlayer) === -1) {
            console.info(this.PLOG + this.engine.getCurrentPlayer().displayName + " starts auction again.");
            this.comms.toAll(this.engine.getCurrentPlayer().displayName + " gets to start the auction again.");
        }
        else {

            // Otherwise we keep progressing to the next player in this phase
            // until we find one that has not finished their auction phase.
            console.info(this.PLOG + "finding next player to start the auction.");
            do {
                this.engine.nextPlayer();
            } while(this.finishedAuctions.indexOf(this.engine.currentPlayer) !== -1);
            console.info(this.PLOG + this.engine.getCurrentPlayer().displayName + " will now start the auction.");
        }
    };
};
