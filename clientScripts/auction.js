// Initialize images for PowerPlant Cards
// Power Plant cards are located all in one .jpg with specific format labeled below
var plantImg = new Image();
plantImg.src = "../data/plants.jpg";

var actualMarket = [];
var futureMarket = [];

// Outputs Log, and changes actual market, data looks like power plant data
var updateActualMarket = function(data) {
    log("Actual Market =>", CONSOLE_O);
    actualMarket = [];
    for(var m in data) {
        log("Cost: " + data[m].cost + " Type: " + data[m].type
            + " Requires: " + data[m].requires + " Powers: " + data[m].powers, CONSOLE_O);
        actualMarket.push(data[m]);
    }
};

// Outputs Log, changes future market, data looks like power plant data
var updateFutureMarket = function(data) {
    log("Future Market =>", CONSOLE_O);
    futureMarket = [];
    for(let m in data) {
        log("Cost: " + data[m].cost + " Type: " + data[m].type
            + " Requires: " + data[m].requires + " Powers: " + data[m].powers, CONSOLE_O);
        futureMarket.push(data[m].cost);
    }
};

// Currently only Outputs a Log
var updateStartAuction = function(data) {
    log(data.uid + " has started an auction on power plant: "
        + data.cost + " with bid " + data.bid, CONSOLE_O);
};

// Currently only Outputs a Log
var updateNewBid = function(data) {
    log(data.uid + " placed a new bid of " + data.bid, CONSOLE_O);
};

// Currently only Outputs a Log
var updateCurrentBidder = function(data) {
    log(data.uid + " must now place a bid or pass", CONSOLE_O);
};

var updateBidWin = function(data) {
    log(data.displayName + " has won the bid for the power plant", CHAT_O);
};