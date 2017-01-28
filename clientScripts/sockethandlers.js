// handles server -> client communications: initialization, game updates, chat
/* global io, gamejs, cityjs, plantjs, redrawjs, auctionjs $ */

var socket = io();

var SOCKET_USERID = 'userid';              // server -> client
var SOCKET_DEFINECITIES = 'definecities';  // server -> client
var SOCKET_UPDATES = 'updates';            // server -> client
var SOCKET_CHAT = 'updatechat';            // server -> client

// store user id
socket.on(SOCKET_USERID, function(data){
	gamejs.uid = data
});

// load up the city map right after connecting
socket.on(SOCKET_DEFINECITIES, function(data){

	// get the dictionary of city.js objects (taken from cities.js)
	$.each(data, function(key, value){
		cityjs.citiesDef[key] = value;
	});
});


socket.on(SOCKET_UPDATES, function(data){
    if(data.group == "updateGameState"){

        // extract globals
        var newData = data.args.data;
        gamejs.currentAction = newData.currentAction;
        gamejs.players = newData.players;
        gamejs.playersPaid = newData.playersPaid;
        gamejs.playerOrder = newData.playerOrder;
        gamejs.currentPlayer = newData.playerOrder[newData.currentPlayerIndex];
        var playerSelf = newData.players[gamejs.uid];
        if(playerSelf != undefined) {
            plantjs.ownedPlants = playerSelf.plants
        }
        else {
            plantjs.ownedPlants = [];
        }
        cityjs.inactiveRegions = newData.inactiveRegions;
        gamejs.resources = newData.resources;
        auctionjs.actualMarket = newData.actualMarket;
        auctionjs.futureMarket = newData.futuresMarket;
        auctionjs.auction = newData.auction;
        gamejs.currentStep = newData.currentStep;
        gamejs.replenishRate = newData.replenishRate;
        gamejs.excessResources = newData.excessResources;
        gamejs.gameOver = newData.gameOver;
        gamejs.winner = newData.winner;

        // If we are the player the game is waiting on to choose a plant to remove, override the action state
        // to "remove" so the correct buttons appear
        gamejs.currentAction = newData.playerMustRemovePlant && newData.auction.currentBidLeader == gamejs.uid ? "remove"
            : gamejs.currentAction;


        // Change the title of the browser window so the player knows it is their turn
        if(gamejs.currentAction != "startGame" && !gamejs.gameOver
            && ((gamejs.currentAction == "bid" && gamejs.uid == newData.auction.currentBidders[newData.auction.currentPlayerBidIndex])
            || (gamejs.currentAction != "bid" && gamejs.currentAction != "power" && gamejs.uid == gamejs.currentPlayer)
            || (gamejs.currentAction == "power" && newData.playersPaid.indexOf(gamejs.uid) == -1))){
            document.title = "* PowuhGred - Your Turn!";
        }
        else{
            document.title = "PowuhGred";
        }

        for(var change in data.args.changes){
            if(data.args.changes[change] == "startGame"){
                redrawjs.animStartGame();
            }
        }
    }
    else{
        updateHandler(data);
    }
    
    redrawjs.redraw();
});

var updateHandler = function(data){
	if(data.group == "resourcePool"){
		updateResources(data.args);
	}
	else if(data.group == "playerOrder"){
		updatePlayerOrder(data.args);
	}
	else if(data.group == "currentPlayer"){
		updateCurrentPlayer(data.args);
	}
	else if(data.group == "actualMarket"){
		auctionjs.updateActualMarket(data.args);
	}
	else if(data.group == "futureMarket"){
		auctionjs.updateFutureMarket(data.args);
	}
	else if(data.group == "currentAction"){
		updateCurrentAction(data.args);
	}
	else if(data.group == "money"){
		updateMoney(data.args);
	}
	else if(data.group == "newPlayer"){
		updateNewPlayer(data.args);
	}
	else if(data.group == "name"){
		updatePlayerName(data.args);
	}
	else if(data.group == "auctionStart"){
		auctionjs.updateStartAuction(data.args);
	}
	else if(data.group == "bid"){
		auctionjs.updateNewBid(data.args);
	}
	else if(data.group == "currentBidder"){
		auctionjs.updateCurrentBidder(data.args);
	}
	else if(data.group == "bidWinner"){
		auctionjs.updateBidWin(data.args);
	}
	else{
		log("'" + data.group + "' has no handler!", CONSOLE_O);
	}
};

socket.on(SOCKET_CHAT, function(data){
	log(data.sender + ": " + data.msg, CHAT_O);
});


// Currently only outputs log
var updatePlayerOrder = function(data){
    log("Player Order: " + data, CONSOLE_O);
};

// Currently only outputs log
var updateCurrentPlayer = function(data){
    log("Current Player: " + data.uid, CONSOLE_O);
    gamejs.currentPlayer = data.uid;
};

var updateCurrentAction = function(data){
    log("Current Action: " + data, CONSOLE_O);
    gamejs.currentAction = data;
};

// Currently only Outputs a Log
var updateMoney = function(data){
    log(data.uid + " now has " + data.money + " money", CONSOLE_O);
};

// Currently only Outputs a Log
var updateNewPlayer = function(data){
    log(data.uid + " has joined the game", CONSOLE_O);
};

// Currently only Outputs a Log
var updatePlayerName = function(data){
    log(data.uid + " has changed their name to " + data.displayName, CONSOLE_O);
};


