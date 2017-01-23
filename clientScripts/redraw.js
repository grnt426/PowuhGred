var ctx = canvas.getContext("2d");  // ctx allows drawing on the canvas

var bgImg = new Image();
bgImg.src = "./data/germany.jpg";

var animationFlags = [];
var anim = {};

var animationTickLoop = function(){
    if (animationFlags["start_game"]) {
        animationFlags["start_game_p"] += .03;
        if(animationFlags["start_game_p"] > 1) {
            animationFlags["start_game_p"] = 1;
            animationFlags["start_game"]=false;
        }

        anim.progress = animationFlags["start_game_p"];
        clearRect(1300,0,380,1050);
        drawScorePanel(scorePanel.args.data, ctx, ppp);
        redraw(scorePanel);
    }
};

// about 30 FPS
setInterval(animationTickLoop,1000/30);

var animStartGame = function() {
    animationFlags["start_game"] = true;
    animationFlags["start_game_p"] = 0
};


var clearRect = function(x,y,w,h) {

    // Fills background with white
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(x,y,w,h);
    ctx.drawImage(bgImg, 0, 0)
};

var redraw = function(scorePanel){

    clearRect(0,0,1680,1050);
	scorePanel = scorePanel.args.data;

	// draw internal city map
	$.each(citiesDef, function(key, city){
		ctx.strokeStyle = GRAY;
		ctx.fillStyle = WHITE;
		ctx.lineWidth = 2;
        var x = externalX(city.x);
        var y = externalY(city.y);
		if(DEBUG){
			ctx.beginPath();
			ctx.arc(x, y, 20, 0, 360, false);
			ctx.stroke();

			ctx.font = "10px Arial";
			ctx.fillText(city.name.toUpperCase(), x, y);
		}

        // Gray out a city if it is in an inactive region
        if(scorePanel.inactiveRegions.indexOf(city.region) != -1){
            ctx.fillStyle = GRAY;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
	});

	// draw internal resource grid
	var regular = 24;
	var uranium = 12;
	$.each(resourceGrid, function(key, box){
		ctx.strokeStyle = BLUE;
		if(box.type === "coal"){
			ctx.strokeStyle = ctx.fillStyle = BROWN;
		}
		if(box.type === "oil"){
			ctx.strokeStyle = ctx.fillStyle = BLACK;
		}
		if(box.type === "uranium"){
			ctx.strokeStyle = ctx.fillStyle = RED;
		}
		if(box.type === "garbage"){
			ctx.strokeStyle = ctx.fillStyle = YELLOW;
		}
		ctx.lineWidth = 1;

		var x = externalX(box.x);
		var y = externalY(box.y);

		if(DEBUG){
			ctx.beginPath();
			ctx.rect(x, y, box.size, box.size);
			ctx.stroke();
		}

		// Draw resource unit
		if(box.type == "coal" && key % regular >= 24 - resources.coal){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "oil" && key % regular >= 24 - resources.oil){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "garbage" && key % regular >= 24 - resources.garbage){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "uranium" && key % uranium >= 12 - resources.uranium){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
	});

    // Draw excess supply
    var typeStartX = {'coal':725, 'oil':705, 'garbage':685, 'uranium':665};
    for(type in scorePanel.excessResources){
        var amt = scorePanel.excessResources[type];
        var startX = typeStartX[type];
        ctx.fillStyle = colorNameToColorCode(type);
        var amtDrawn = 0;
        while(amt > 0){
            ctx.fillRect(startX, 930 - (15 * amtDrawn), 10, 10);
            amtDrawn += 1;
            amt -= 1;
        }
    }

    // draw owned cities
    for(var p in scorePanel.players){
        var player = scorePanel.players[p];
        for(var city in player.cities){
            var city = player.cities[city];
            var pos = city.players.indexOf(player.uid);
            ctx.fillStyle = colorNameToColorCode(player.color);
            var posX = city.x;
            var posY = city.y;
            if(pos == 0){
                ctx.fillRect(externalX(posX) - 17, externalY(posY) - 5, 10, 10);
            }
            else if(pos == 1){
                ctx.fillRect(externalX(posX) + 5, externalY(posY), 10, 10);
            }
            else {
                ctx.fillRect(externalX(posX) - 5, externalY(posY) - 25, 10, 10);
            }
        }
    }

	// highlight selected city
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3;
	if(selectedCity && currentActionState != "build"){
		ctx.beginPath();
		var x = externalX(selectedCity.x);
		var y = externalY(selectedCity.y);
		ctx.arc(x, y, 20, 0, 360, false);
		ctx.stroke();
	}
    else{
        for(var key in selectedCities){
            ctx.beginPath();
            var city = citiesDef[selectedCities[key]];
            var x = externalX(city.x);
            var y = externalY(city.y);
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.stroke();
        }
    }

	// console output
	ctx.fillStyle = BLACK;
	ctx.font = "10px Arial";
	var txt = outputDisplays[CHAT_O].text.split("\n");
	$.each(txt, function(index, chunk){
		ctx.fillText(chunk, 800, 650 + 15 * index);
	});

	txt = outputDisplays[CONSOLE_O].text.split("\n");
	$.each(txt, function(index, chunk){
		ctx.fillText(chunk, 1200, 650 + 15 * index);
	});

	// Draw the player's power plants
	var count = 0;
	for(var p in playerData.self.ownedPlants){
		var plant = playerData.self.ownedPlants[p];
		var cost = plant.cost;
		ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
			pppWidth, pppHeight,
				800 + count * 125, 150, pppWidth, pppHeight);
		count += 1;
	}

	// Draw the actual market
	count = 0;
	ctx.strokeStyle = LTBLUE;
    ctx.fillStyle = LTBLUE;
	ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.fillText("Actual Market", 794, 284);
	ctx.strokeRect(794, 294, (currentStep == 3 ? 3 : 4) * 120 + 7, (currentStep == 3 ? 250 : 125));
    var wrap = currentStep == 3 ? 3 : 4;
	for(p in actualMarket){
		plant = actualMarket[p];
		plant.drawnPosition = count;
		cost = plant.cost;
		ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight, pppWidth, pppHeight,
				800 + ((count % wrap) * 120), 300 + (125 * (currentStep == 3 && count > 2 ? 1 : 0)), pppWidth, pppHeight);
		count += 1;
	}

	// Draw the future market
    if(currentStep != 3) {
        count = 0;
        ctx.strokeStyle = PINK;
        ctx.fillStyle = PINK;
        ctx.font = "12px Arial";
        ctx.fillText("Future Market", 794, 434);
        ctx.strokeRect(794, 444, 4 * 120 + 7, 125);
        for (p in futureMarket) {
            plant = futureMarket[p];
            cost = plant.cost;
            ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
                pppWidth, pppHeight,
                800 + count * 120, 450, pppWidth, pppHeight);
            count += 1;
        }
    }

	// draws a selection box on a plant if it's selected (not selected = -1)
	if(selectedPlant >= 0 || scorePanel.auction.auctionRunning){
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 5;
		ctx.beginPath();
		var highlightPlant;
		if(scorePanel.auction.auctionRunning){
			for(var actualP in actualMarket){
				if(actualMarket[actualP].cost == scorePanel.auction.currentBidChoice){
					highlightPlant = actualMarket[actualP].drawnPosition;
				}
			}
		}
		else{
			highlightPlant = selectedPlant;
		}
		x = (800 + (highlightPlant * 120)); //Changed 114 => 120 to account for spaces
		y = 300;
		ctx.strokeRect(x, y, 114, 114);
		ctx.stroke();
		ctx.stroke();
	}

    drawScorePanel(scorePanel, ctx, ppp);

    // Draw Phase header
    var yOffsetForButtons = 20;
    ctx.fillStyle = BLACK;
    ctx.font = "20px monospace";
    ctx.fillText(getPhaseName(currentActionState), 800, yOffsetForButtons);

	// draw buttons
	ctx.fillStyle = WHITE;
	var currentWidth = 800;
	var bufferSpace = 5;
    var buttonsDrawn = 0;
    yOffsetForButtons += 15;
	for(var key in buttonArray){
		var btn = buttonArray[key];

		var cur = ACTIONS_FLAGS[currentActionState];
		var flag = btn.flags;
    	btn.width = btn.disp.length * 10 + 8
    	btn.height = 24;
    		
		if((cur & flag) > 0){
            buttonsDrawn += 1;
			ctx.fillStyle = GREEN;
			ctx.strokeStyle = GREEN;
			ctx.lineWidth = 1;
            if((currentWidth+btn.width) >= 1280){
                yOffsetForButtons += 30;
                currentWidth = 800;
            }
            
            btn.y = yOffsetForButtons;

            var pos = currentWidth;
            btn.x = pos;
			ctx.strokeRect(pos, btn.y, btn.width, btn.height);
			ctx.font = "16px monospace";
			ctx.fillText(btn.disp, pos + 5, btn.y + 18);
			currentWidth = pos + btn.width + bufferSpace;
		}
		else{
			btn.x = -1;
			btn.y = -1;
		}
	}

	// Draw bid amount box
	if((ACTIONS_FLAGS[currentActionState] & (AUCTION_F | BID_F)) > 0){
        yOffsetForButtons += 60;
		ctx.strokeStyle = GREEN;
		ctx.font = "14px monospace";
		ctx.fillText("Current Bid: " + selectedBid, 800, yOffsetForButtons);
		if(scorePanel.auction.currentBid != 0){
			ctx.fillText("Highest Bid: " + scorePanel.auction.currentBid, 925, yOffsetForButtons);
			ctx.fillText("Highest Bidder: " + scorePanel.players[scorePanel.auction.currentBidLeader].displayName, 1050, yOffsetForButtons);
		}
	}

    // Draw resource purchase amounts boxes
    else if((ACTIONS_FLAGS[currentActionState] & BUY_F) > 0){
        yOffsetForButtons += 60;
        ctx.strokeStyle = GREEN;
        ctx.font = "14px monospace";
        var offset = 0;

        var playerPlants = [];
        var playerOwnedPlantCosts = scorePanel.players[playerData.self.uid].plants;

        // TODO: Really should make the below a function....
        for(var i in playerOwnedPlantCosts){
            playerPlants.push(ppp[parseInt(i)]);
        }

        // draw the resource count of the currently selected plant, so the player can change the amount to purchase
        if(selectedOwnedPlant != undefined) {
            for (var type in selectedOwnedPlant.resources) {
                ctx.fillText(selectedOwnedPlant.resources[type] + " " + type, 800, yOffsetForButtons + (offset * 20));
                offset += 1;
            }
        }

        // Then, draw the total number of resources requested across all plants
        var totalResources = {'coal':0,'oil':0,'garbage':0,'uranium':0};
        for(var index in playerPlants){
            var plant = playerPlants[index];
            if(plant.resources == undefined)
                continue;
            for(type in plant.resources){
                totalResources[type] += plant.resources[type];
            }
        }

        offset = 0;
        ctx.fillText("Total Requested", 800, yOffsetForButtons + 85);
        for(type in totalResources){
            ctx.fillText(totalResources[type] + " " + type, 800 + (80 * offset), yOffsetForButtons + 110);
            offset += 1;
        }
    }
};

function colorNameToColorCode(name){
    var colorMap = {"red":RED, "blue":BLUE, "green":GREEN, "yellow":YELLOW, "purple":PURPLE, "black":BLACK,
        "coal":BROWN, "oil":BLACK, "garbage": YELLOW, "uranium":RED};
    return colorMap[name];
};

function getPhaseName(currentAction){
    if(gameOver){
        return "Game Over! " + scorePanel.args.data.winner + " has won!";
    }
    var phaseNames = {"startGame": "Waiting for Players", "startAuction": "Start Auction", "bid": "Bidding", "buy": "Buy Resources",
        "build": "Build On Cities", "power": "Get Money!"};
    var name = phaseNames[currentAction];
    if(currentAction != "startGame"){
        name += " - Step " + currentStep;
    }
    return name;
};