exports.Auction = function(engine, comms){

	this.engine = engine;
	this.comms = comms;

	// Array of UIDs
	this.currentBidders = [];

	// No longer can bid
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

		// award the power plant
		if(this.currentBidders.length == 2 && pass){
			this.currentBidders.slice(this.currentPlayerBidIndex, 1);
			var bidWinner = this.currentBidLeader;
			this.finishedAuctions.push(bidWinner);
			this.finishedBidding.push(bidWinner);
			var player = engine.players[bidWinner];
			player.awardPlant(this.currentBidChoice, this.currentBid);
			engine.updatePlants(this.currentBidChoice);
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

		// TODO: clean up previous auction to ensure no weird bugs

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
			this.currentAction = engine.BID;

			for(var key in engine.players){
				console.info("Eligible? " + this.finishedBidding.indexOf(engine.players[key].uid));
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
};
