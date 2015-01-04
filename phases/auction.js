exports.Auction = function(engine, comms){

	this.engine = engine;
	this.comms = comms;

	// Array of UIDs
	this.currentBidders = [];

	// No longer can bid (does this need to be separate from finishedAuctions?)
	this.finishedBidding = [];

	// No longer can start auctions
	this.finishedAuctions = [];

	// Int
	this.currentBid = 0;

	// Int
	this.currentPlayerBidIndex = -1;

	// Int
	this.currentBidChoice = -1;

	// UID
	this.currentBidder = false;

	// UID
	this.currentBidLeader = false;

	// Boolean
	this.auctionRunning = false;

	// TODO use a different order
	this.nextBidder = function(pass){

		// award the power plant if the last bidder passed, or if there is only
		// one bidder at the start of the bid.
		if((this.currentBidders.length == 2 && pass) || this.currentBidders.length == 1){
			this.currentBidders.slice(this.currentPlayerBidIndex, 1);
			var bidWinner = this.currentBidLeader;
			this.finishedAuctions.push(bidWinner);
			this.finishedBidding.push(bidWinner);
			var player = engine.players[bidWinner];
			player.awardPlant(this.currentBidChoice, this.currentBid);
			this.updateMarket();
			this.cleanAuctionState();
		}
		else{
			console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
			this.currentPlayerBidIndex = (this.currentPlayerBidIndex + 1) % this.currentBidders.length;
			this.currentBidder = this.currentBidders[this.currentPlayerBidIndex];
			console.info(this.currentBidder + " index: " + this.currentPlayerBidIndex);
		}
	};

	/**
	 * The expected data is either
	 *    {cost:PowerPlantCost,bid:StartingBid}
	 * or
	 *    pass
	 * @param data
	 */
	this.startAuction = function(data){

		if(data === "pass"){
			this.finishedBidding.push(engine.currentPlayer);
			this.finishedAuctions.push(engine.currentPlayer);
			engine.nextPlayer();
		}
		else{
			console.info(data);
			var player = engine.players[engine.currentPlayer];
			var plant = data.cost;
			var bid = data.bid;
			if(bid < plant){
				// Reject bid
				console.info("Bid too low.");
				this.comms.toPlayer(player, "bid too low.");
				return;
			}

			if(bid > player.money){
				// Reject bid
				console.info("Not enough money.");
				this.comms.toPlayer(player, "not enough money.");
				return;
			}

			this.currentBid = bid;
			this.currentBidChoice = plant;
			this.currentBidLeader = player.uid;
			engine.currentAction = engine.BID;

			for(var key in engine.players){
				console.info(engine.players[key].uid + " Eligible? "
					+ (this.finishedBidding.indexOf(engine.players[key].uid) == -1 ? "yes" : "no"));
				if(this.finishedBidding.indexOf(engine.players[key].uid) == -1)
					this.currentBidders.push(engine.players[key].uid);
			}
			this.currentPlayerBidIndex = this.currentBidders.indexOf(player.uid);
			this.auctionRunning = true;
			this.nextBidder(false);
		}
	};

	this.placeBid = function(data){
		if(data === "pass"){
			this.nextBidder(true);
			return;
		}

		var bid = data.bid;
		if(bid <= this.currentBid){
			// reject bid
			this.comms.toPlayer(engine.players[this.currentBidder], "bid too low.");
			return;
		}

		var player = engine.players[this.currentBidder];
		if(bid > player.money){
			// Reject bid
			this.comms.toPlayer(player, "not enough money.");
			return;
		}

		this.currentBid = bid;
		this.currentBidLeader = player.uid;
		this.nextBidder(false);
	};

	// TODO: Check for Step 3 card (and handle step 2 and 3 specifics).
	this.updateMarket = function(){
		var index = 0;
		for(plant in engine.currentMarket){
			if(engine.currentMarket[plant].cost == this.currentBidChoice){
				break;
			}
			index += 1;
		}
		engine.currentMarket.splice(index, 1);
		var newPlant = engine.plants.splice(0, 1);
		var unsortedPlants = engine.currentMarket.concat(engine.futuresMarket);
		unsortedPlants = unsortedPlants.concat(newPlant[0]);
		unsortedPlants.sort();
		engine.currentMarket = unsortedPlants.splice(0, 4);
		engine.futuresMarket = unsortedPlants.splice(0, 4);
	};

	this.cleanAuctionState = function(){
		engine.currentAction = engine.START_AUCTION;
		this.currentBid = 0;
		this.currentPlayerBidIndex = -1;
		this.currentBidChoice = -1;
		this.currentBidder = false;
		this.currentBidLeader = false;
		this.auctionRunning = false;
		this.currentBidders = [];

		// If the current player lost the auction, they get to start the auction
		// once more.
		if(this.finishedAuctions.indexOf(engine.currentPlayer) == -1){
			return;
		}

		// Otherwise we keep progressing to the next player in this phase
		// until we find one that has not finished their auction phase.
		do{
			engine.nextPlayer();
		}while(this.finishedAuctions.indexOf(engine.currentPlayer) != -1 && this.currentBidders.length != 0)
	};
};
