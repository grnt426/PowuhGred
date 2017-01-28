var auctionjs = {};

auctionjs.actualMarket = [];
auctionjs.futureMarket = [];
auctionjs.selectedBid = 0;
auctionjs.auction;

// Outputs Log, and changes actual market, data looks like power plant data
auctionjs.updateActualMarket = function(data){
    log("Actual Market =>", CONSOLE_O);
    auctionjs.actualMarket = [];
    for(var m in data){
        log("Cost: " + data[m].cost + " Type: " + data[m].type
            + " Requires: " + data[m].requires + " Powers: " + data[m].powers, CONSOLE_O);
        auctionjs.actualMarket.push(data[m]);
    }
};

// Outputs Log, changes future market, data looks like power plant data
auctionjs.updateFutureMarket = function(data){
    log("Future Market =>", CONSOLE_O);
    auctionjs.futureMarket = [];
    for(var m in data){
        log("Cost: " + data[m].cost + " Type: " + data[m].type
            + " Requires: " + data[m].requires + " Powers: " + data[m].powers, CONSOLE_O);
        auctionjs.futureMarket.push(data[m].cost);
    }
};

// Currently only Outputs a Log
auctionjs.updateStartAuction = function(data){
    log(data.uid + " has started an auction on power plant: "
        + data.cost + " with bid " + data.bid, CONSOLE_O);
};

// Currently only Outputs a Log
auctionjs.updateNewBid = function(data){
    log(data.uid + " placed a new bid of " + data.bid, CONSOLE_O);
};

// Currently only Outputs a Log
auctionjs.updateCurrentBidder = function(data){
    log(data.uid + " must now place a bid or pass", CONSOLE_O);
};

auctionjs.updateBidWin = function(data){
    log(data.displayName + " has won the bid for the power plant", CHAT_O);
};