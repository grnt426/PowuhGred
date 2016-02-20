var socket = io();

// store user id
socket.on('userid', function(data){
	playerData.self.uid = data
});

// load up the city map right after connecting
socket.on('definecities', function(data){

	// get the dictionary of city.js objects (taken from cities.js)
	$.each(data, function(key, value){
		citiesDef[key] = value;
	});

	// load the background image
	bgImg.onload = function(){
		redraw(scorePanel);
	};
});

// NOTSURE: what the data format for input is
socket.on('updates', function(data){
    if(data.group == "updateScore"){
        scorePanel = data;

        // extract globals
        var newData = scorePanel.args.data;
        currentActionState = newData.currentAction;
        currentPlayer = newData.playerOrder[newData.currentPlayerIndex];
        resources = newData.resources;
        actualMarket = newData.actualMarket;
        futureMarket = newData.futuresMarket;

        for(var change in scorePanel.args.changes){
            if(scorePanel.args.changes[change] == "startGame"){
                animStartGame();
            }
        }
    }
    else{
        updateHandler(data);
    }
    redraw(scorePanel);
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
		updateActualMarket(data.args);
	}
	else if(data.group == "futureMarket"){
		updateFutureMarket(data.args);
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
		updateStartAuction(data.args);
	}
	else if(data.group == "bid"){
		updateNewBid(data.args);
	}
	else if(data.group == "currentBidder"){
		updateCurrentBidder(data.args);
	}
	else if(data.group == "displayName"){
		updateDisplayName(data.args);
	}
	else if(data.group == "bidWinner"){
		updateBidWin(data.args);
	}
    else if(data.group == "playerPlants"){
        updatePlayerPlants(data.args);
    }
	else{
		log("'" + data.group + "' has no handler!", CONSOLE_O);
	}
};

socket.on('updatechat', function(data){
	log(data.sender + ": " + data.msg, CHAT_O);
});
