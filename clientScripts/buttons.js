// initializes buttonArray and function for making buttons
// solely for buttons at top of window (start game, bidding, etc.)
var buttonArray = {};


var currentActionState = "startGame";

var UNSTARTED_F =	1;              //bitwise 000001
var AUCTION_F =		2;              //bitwise 000010
var BID_F = 		4;              //bitwise 000100
var RESOURCE_F = 	8;              //bitwise 001000
var CITY_F =		16;             //bitwise 010000
var MONEY_F =		32;             //bitwise 100000

// Used for enabling/disabling buttons
var ACTIONS_FLAGS = [];
ACTIONS_FLAGS[currentActionState] = UNSTARTED_F;
ACTIONS_FLAGS["startAuction"] = AUCTION_F | BID_F;  //| is bitwise OR command, 000010 OR 000100 = 000110 => 6
ACTIONS_FLAGS["bid"] = BID_F;
ACTIONS_FLAGS["buyResources"] = RESOURCE_F;
ACTIONS_FLAGS["buyCities"] = CITY_F;
ACTIONS_FLAGS["moneyPhase"] = MONEY_F;

var createButton = function(disp,listener,flags) {
    var button = {};
    button.disp = disp;

    // function to call when clicked
    button.listener = listener;

    // when this button should appear
    button.flags = flags;

    // The width of even monospace font isn't very even :(
    // so I hacked up something that kinda seems to work
    button.width = disp.length > 5 ?
        (disp.length > 8 ? disp.length * 8 : disp.length * 9)
        : disp.length * 10;
    button.height = 12;
    buttonArray[disp] = button;
};


var startGameButton = function(){
    socket.emit('gameaction', {uid:playerData.self.uid, cmd:"startGame", args:{}});
    animStartGame();
};

var passButton = function(){
    socket.emit('gameaction', {uid:playerData.self.uid, cmd:currentActionState, args:"pass"});
};

var startAuctionButton = function(){
    if(selectedPlant != -1){
        socket.emit('gameaction', {uid: playerData.self.uid, cmd: "startAuction",
            args: {cost: actualMarket[selectedPlant].cost, bid: selectedBid}});
    }
    else{
        log("Select a power plant first.", CONSOLE_O);
    }
};

var bidUpButton = function(){
    selectedBid += 1;
    log("Bid amount: $" + selectedBid, CONSOLE_O);
};

var bidDownButton = function(){
    if(selectedBid <= 0)
        selectedBid = 0;
    else
        selectedBid -= 1;
    log("Bid amount: $" + selectedBid, CONSOLE_O);
};

var confirmBidButton = function(){
    socket.emit('gameaction', {uid:playerData.self.uid, cmd:"bid", args:{bid:selectedBid}});
};

// createButton( Display String, listener, buttons flags);
createButton("Start Game!", startGameButton, UNSTARTED_F);
createButton("Pass", passButton, AUCTION_F | BID_F | RESOURCE_F | CITY_F | MONEY_F);
createButton("Start Auction", startAuctionButton, AUCTION_F);
createButton("Bid Up", bidUpButton, AUCTION_F | BID_F);
createButton("Bid Down", bidDownButton, AUCTION_F | BID_F);
createButton("Confirm Bid", confirmBidButton, AUCTION_F | BID_F);
