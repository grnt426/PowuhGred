// initializes buttonArray and function for making buttons
// solely for buttons at top of window (start game, bidding, etc.)
var buttonArray = {};

var SOCKET_GAMEACTION = 'gameaction';  // client -> server

var currentActionState = "startGame";

var UNSTARTED_F =	1;              //bitwise 000001
var AUCTION_F =		2;              //bitwise 000010
var BID_F = 		4;              //bitwise 000100
var BUY_F = 	    8;              //bitwise 001000
var BUILD_F =		16;             //bitwise 010000
var POWER_F =		32;             //bitwise 100000

// Used for enabling/disabling buttons
var ACTIONS_FLAGS = [];
ACTIONS_FLAGS[currentActionState] = UNSTARTED_F;
ACTIONS_FLAGS["startAuction"] = AUCTION_F | BID_F;  //| is bitwise OR command, 000010 OR 000100 = 000110 => 6
ACTIONS_FLAGS["bid"] = BID_F;
ACTIONS_FLAGS["buy"] = BUY_F;
ACTIONS_FLAGS["build"] = BUILD_F;
ACTIONS_FLAGS["power"] = POWER_F;

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
    socket.emit(SOCKET_GAMEACTION, {uid:playerData.self.uid, cmd:"startGame", args:{}});
    animStartGame();
};

var passButton = function(){
    socket.emit(SOCKET_GAMEACTION, {uid:playerData.self.uid, cmd:currentActionState, args:"pass"});
};

var startAuctionButton = function(){
    if(selectedPlant != -1){
        socket.emit(SOCKET_GAMEACTION, {uid: playerData.self.uid, cmd: "startAuction",
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

var resourceMore = function(type){

    // Don't increment if nothing is selected
    if(selectedOwnedPlant == undefined){
        return;
    }

    var newAmt = selectedOwnedPlant.resources[type] + 1;
    if(newAmt > resources[type]){
        log("Not enough " + type + " to buy more", CONSOLE_O);
    }
    else {
        selectedOwnedPlant.resources[type] = newAmt;
        log(newAmt + " " + type, CONSOLE_O);
    }
};

var resourceLess = function(type){

    // Don't decrement if nothing is selected
    if(selectedOwnedPlant == undefined){
        return;
    }

    if(selectedOwnedPlant.resources[type] != undefined && selectedOwnedPlant.resources[type] > 0)
        selectedOwnedPlant.resources[type] -= 1;
    log(selectedOwnedPlant.resources[type] + " " + type, CONSOLE_O);
};

var confirmBidButton = function(){
    socket.emit(SOCKET_GAMEACTION, {uid:playerData.self.uid, cmd:"bid", args:{bid:selectedBid}});
};

var confirmResourcePurchase = function(){
    var playerOwnedPlantCosts = scorePanel.args.data.players[playerData.self.uid].plants;
    var resourceSelection = {};
    for(i in playerOwnedPlantCosts){
        resourceSelection[parseInt(playerOwnedPlantCosts[i])] = ppp[playerOwnedPlantCosts[i]].resources;
    }
    socket.emit(SOCKET_GAMEACTION, {uid:playerData.self.uid, cmd:"buy", args:resourceSelection});
};

// createButton( Display String, listener, buttons flags);
createButton("Start Game!", startGameButton, UNSTARTED_F);
createButton("Pass", passButton, AUCTION_F | BID_F | BUY_F | BUILD_F | POWER_F);
createButton("Start Auction", startAuctionButton, AUCTION_F);
createButton("Bid Up", bidUpButton, AUCTION_F | BID_F);
createButton("Bid Down", bidDownButton, AUCTION_F | BID_F);
createButton("Confirm", confirmBidButton, AUCTION_F | BID_F);

// The below is awful, but a good enough placeholder
createButton("Confirm", confirmResourcePurchase, BUY_F);
createButton("Coal +", function(){resourceMore('coal');}, BUY_F);
createButton("Coal -", function(){resourceLess('coal');}, BUY_F);
createButton("Oil +", function(){resourceMore('oil');}, BUY_F);
createButton("Oil -", function(){resourceLess('oil');}, BUY_F);
createButton("Garbage +", function(){resourceMore('garbage');}, BUY_F);
createButton("Garbage -", function(){resourceLess('garbage');}, BUY_F);
createButton("Uranium +", function(){resourceMore('uranium');}, BUY_F);
createButton("Uranium -", function(){resourceLess('uranium');}, BUY_F);
