/* global $, gamejs, Image, cityjs, plantjs, scorepaneljs, auctionjs */
var redrawjs = {};

redrawjs.canvas = document.getElementById("canvas"); // canvas is the game area we can draw to
var ctx = redrawjs.canvas.getContext("2d");  // ctx allows drawing on the canvas
redrawjs.ctx = ctx;

/**
 * The below is t_x + (p_x * count). For the first iteration (count 1), this will be 1300 + (95 * 1), or 1395.
 * @type {number}
 */
redrawjs.PLAYER_PLANTS_START_X = 1394;

//Used to transform between external and internal coordinates (must be for map)
var externalX = function (x) { return x * 1.1 - 5;  };
var externalY = function (y) { return y * 1.1 - 96; };
redrawjs.internalX = function (x) { return (x + 5) / 1.1;  };
redrawjs.internalY = function (y) { return (y + 96) / 1.1; };

redrawjs.WHITE =     "#FFFFFF";
redrawjs.BLACK =     "#000000";
redrawjs.GRAY =      "#444444";
redrawjs.BROWN =     "#452E17";
redrawjs.BLUE =      "#0000FF";
redrawjs.LTBLUE =    "#00B8E6";
redrawjs.GREEN =     "#009900";
redrawjs.YELLOW =    "#FFFF19";
redrawjs.PINK =      "#FF6699";
redrawjs.ORANGE =    "#DD6622";
redrawjs.RED =		 "#E62E2E";
redrawjs.PURPLE =    "#AF02C3";

redrawjs.colorNameToColorCode = function(name){
    var colorMap = {"red":redrawjs.RED, 
                    "blue":redrawjs.BLUE, 
                    "green":redrawjs.GREEN, 
                    "yellow":redrawjs.YELLOW, 
                    "purple":redrawjs.PURPLE, 
                    "black":redrawjs.BLACK,
                    "coal":redrawjs.BROWN, 
                    "oil":redrawjs.BLACK, 
                    "garbage":redrawjs.YELLOW, 
                    "uranium":redrawjs.RED};
    return colorMap[name];
}


var bgImg = new Image();
bgImg.src = "./data/germany.jpg";

// Initialize images for PowerPlant Cards
// Power Plant cards are located all in one .jpg with specific format labeled below
redrawjs.plantImg = new Image();
redrawjs.plantImg.src = "./data/plants.jpg";

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
        redrawjs.redraw();
    }
};

// about 30 FPS
setInterval(animationTickLoop,1000/30);

redrawjs.animStartGame = function() {
    animationFlags["start_game"] = true;
    animationFlags["start_game_p"] = 0
};


var clearRect = function(x,y,w,h) {

    // Fills background with white
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(x,y,w,h);
    ctx.drawImage(bgImg, 0, 0)
};

redrawjs.redraw = function(){

    clearRect(0,0,1680,1050);

    drawCities();
	drawAvailableResources();
    drawResourceRefillGuide();
    drawExcessResources();
    drawOwnedCities();
    drawCitySelection();
    drawOwnedPlants();
    drawActualMarket();
    drawFutureMarket();
    drawPlantSelection();
    scorepaneljs.drawScorePanel(ctx);
    drawPhaseHeader();
    drawButtons();
	if((ACTIONS_FLAGS[gamejs.currentAction] & (AUCTION_F | BID_F)) > 0) { drawBidding(); }
    else if((ACTIONS_FLAGS[gamejs.currentAction] & BUY_F) > 0){ drawResourcePurchasing(); }
};

var drawCities = function() {
	$.each(cityjs.citiesDef, function(key, city){
		ctx.strokeStyle = redrawjs.GRAY;
		ctx.fillStyle = redrawjs.WHITE;
		ctx.lineWidth = 2;
        var x = externalX(city.x);
        var y = externalY(city.y);
		if(gamejs.DEBUG){
			ctx.beginPath();
			ctx.arc(x, y, 20, 0, 360, false);
			ctx.stroke();
			ctx.font = "10px Arial";
			ctx.fillText(city.name.toUpperCase(), x, y);
		}

        // Gray out a city if it is in an inactive region
        if(!cityjs.isCityActive(city)){
            ctx.fillStyle = redrawjs.GRAY;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
	});
};

var drawAvailableResources = function() {
	var regular = 24;
	var uranium = 12;
	$.each(resourceGrid, function(key, box){
		ctx.strokeStyle = redrawjs.BLUE;
		if(box.type === "coal"){
			ctx.strokeStyle = ctx.fillStyle = redrawjs.BROWN;
		}
		if(box.type === "oil"){
			ctx.strokeStyle = ctx.fillStyle = redrawjs.BLACK;
		}
		if(box.type === "uranium"){
			ctx.strokeStyle = ctx.fillStyle = redrawjs.RED;
		}
		if(box.type === "garbage"){
			ctx.strokeStyle = ctx.fillStyle = redrawjs.YELLOW;
		}
		ctx.lineWidth = 1;

		var x = externalX(box.x);
		var y = externalY(box.y);

		if(gamejs.DEBUG){
			ctx.beginPath();
			ctx.rect(x, y, box.size, box.size);
			ctx.stroke();
		}

		// Draw resource unit
		if(box.type == "coal" && key % regular >= 24 - gamejs.resources.coal){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "oil" && key % regular >= 24 - gamejs.resources.oil){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "garbage" && key % regular >= 24 - gamejs.resources.garbage){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
		if(box.type == "uranium" && key % uranium >= 12 - gamejs.resources.uranium){
			ctx.fillRect(x + box.size / 4, y + box.size / 4,
					box.size * (0.5), box.size * (0.5));
		}
	});
};

var drawResourceRefillGuide = function() {
    // Draw resource replenishment rate box
    var replenishRate = gamejs.replenishRate;
    ctx.fillStyle = redrawjs.WHITE;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(32, 860, 125, 80);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = redrawjs.BLACK;
    ctx.font = "14px monospace";
    var replenishY = 935;
    ctx.fillText("   Coal", 35, replenishY);
    ctx.fillText("    Oil", 35, replenishY - 15);
    ctx.fillText("Garbage", 35, replenishY - 30);
    ctx.fillText("Uranium", 35, replenishY - 45);
    ctx.fillText("   Step", 35, replenishY - 60);
    var repOffSet = ["coal", "oil", "garbage", "uranium"];

    var replenishX = 100;
    ctx.fillText("1", replenishX, 875);
    ctx.fillText("2", replenishX + 20, 875);
    ctx.fillText("3", replenishX + 40, 875);
    replenishX += 20;
    for(var step in replenishRate){
        var perStep = replenishRate[step];
        for(var type in perStep){
            if(step == gamejs.currentStep - 1){
                ctx.fillStyle = redrawjs.ORANGE;
            }
            else{
                ctx.fillStyle = redrawjs.BLACK;
            }
            ctx.fillText(perStep[type], replenishX + (20 * (step - 1)), replenishY - (15 * repOffSet.indexOf(type)));
        }
    }
};

var drawExcessResources = function() {
    // Draw excess supply
    var typeStartX = {'coal':725, 'oil':705, 'garbage':685, 'uranium':665};
    for(var type in gamejs.excessResources){
        var amt = gamejs.excessResources[type];
        var startX = typeStartX[type];
        ctx.fillStyle = redrawjs.colorNameToColorCode(type);
        var amtDrawn = 0;
        while(amt > 0){
            ctx.fillRect(startX, 930 - (15 * amtDrawn), 10, 10);
            amtDrawn += 1;
            amt -= 1;
        }
    }
};

var drawOwnedCities = function() {
    for(var p in gamejs.players){
        var player = gamejs.players[p];
        for(var cityIndex in player.cities){
            var city = player.cities[cityIndex];
            var pos = city.players.indexOf(player.uid);
            ctx.fillStyle = redrawjs.colorNameToColorCode(player.color);
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
};

var drawCitySelection = function() {
    // highlight selected city
    var x, y;
    ctx.strokeStyle = redrawjs.ORANGE;
    ctx.lineWidth = 3;
	if(cityjs.selectedCity && gamejs.currentAction != "build"){
		ctx.beginPath();
		x = externalX(cityjs.selectedCity.x);
		y = externalY(cityjs.selectedCity.y);
		ctx.arc(x, y, 20, 0, 360, false);
		ctx.stroke();
	}
    else{
        for(var key in cityjs.selectedCities){
            ctx.beginPath();
            var city = cityjs.citiesDef[cityjs.selectedCities[key]];
            x = externalX(city.x);
            y = externalY(city.y);
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.stroke();
        }
    }
};

var drawOwnedPlants = function() {
	// Draw the player's power plants
	var count = 0;
	for(var p in plantjs.ownedPlants){
		var plant = plantjs.ownedPlants[p];
		var plantDef = plantjs.ppp[parseInt(plant.cost)];
		ctx.drawImage(redrawjs.plantImg, plantDef.x * plantjs.pppWidth, plantDef.y * plantjs.pppHeight,
			plantjs.pppWidth, plantjs.pppHeight,
				800 + count * 125, 150, plantjs.pppWidth, plantjs.pppHeight);
		count += 1;
	}
};

var drawActualMarket = function() {
	var count = 0;
	ctx.strokeStyle = redrawjs.LTBLUE;
    ctx.fillStyle = redrawjs.LTBLUE;
	ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.fillText("Actual Market", 794, 284);
	ctx.strokeRect(794, 294, (gamejs.currentStep == 3 ? 3 : 4) * 120 + 7, (gamejs.currentStep == 3 ? 250 : 125));
    var wrap = gamejs.currentStep == 3 ? 3 : 4;
	for(var p in auctionjs.actualMarket){
		var plant = auctionjs.actualMarket[p];
		plant.drawnPosition = count;
		var plantDef = plantjs.ppp[parseInt(plant.cost)];
		ctx.drawImage(redrawjs.plantImg, plantDef.x * plantjs.pppWidth, plantDef.y * plantjs.pppHeight, plantjs.pppWidth, plantjs.pppHeight,
				800 + ((count % wrap) * 120), 300 + (125 * (gamejs.currentStep == 3 && count > 2 ? 1 : 0)), plantjs.pppWidth, plantjs.pppHeight);
		count += 1;
	}
};

var drawFutureMarket = function() {
    if(gamejs.currentStep != 3) {
        var count = 0;
        ctx.strokeStyle = redrawjs.PINK;
        ctx.fillStyle = redrawjs.PINK;
        ctx.font = "12px Arial";
        ctx.fillText("Future Market", 794, 434);
        ctx.strokeRect(794, 444, 4 * 120 + 7, 125);
        for (var p in auctionjs.futureMarket) {
            var plant = auctionjs.futureMarket[p];
            var plantDef = plantjs.ppp[parseInt(plant.cost)];
            ctx.drawImage(redrawjs.plantImg, plantDef.x * plantjs.pppWidth, plantDef.y * plantjs.pppHeight,
                plantjs.pppWidth, plantjs.pppHeight,
                800 + count * 120, 450, plantjs.pppWidth, plantjs.pppHeight);
            count += 1;
        }
    }
};

var drawPlantSelection = function() {
	// draws a selection box on a plant if it's selected (not selected = -1)
	if(plantjs.selectedPlant >= 0 || auctionjs.auction.auctionRunning){
		ctx.strokeStyle = redrawjs.ORANGE;
		ctx.lineWidth = 5;
		ctx.beginPath();
		var highlightPlant;
		if(auctionjs.auction.auctionRunning){
			for(var actualP in auctionjs.actualMarket){
				if(auctionjs.actualMarket[actualP].cost == auctionjs.auction.currentBidChoice){
					highlightPlant = auctionjs.actualMarket[actualP].drawnPosition;
				}
			}
		}
		else{
			highlightPlant = plantjs.selectedPlant;
		}
		x = (800 + (highlightPlant * 120)); //Changed 114 => 120 to account for spaces
		y = 300;
		ctx.strokeRect(x, y, 114, 114);
		ctx.stroke();
		ctx.stroke();
	}
};

var drawPhaseHeader = function() {
    ctx.fillStyle = redrawjs.BLACK;
    ctx.font = "20px monospace";
    ctx.fillText(getPhaseName(gamejs.currentAction), 800, 20);
};

var drawButtons = function() {
	ctx.fillStyle = redrawjs.WHITE;
	var currentWidth = 800;
	var bufferSpace = 10;
    var buttonsDrawn = 0;
    var yOffsetForButtons = 35;
    ctx.font = "16px monospace";
	for(var key in buttonArray){
		var btn = buttonArray[key];

		var cur = ACTIONS_FLAGS[gamejs.currentAction];
		var flag = btn.flags;
    	btn.width = btn.disp.length * 10 + 8;
    	btn.height = 24;
    		
		if((cur & flag) > 0){
            buttonsDrawn += 1;
			ctx.fillStyle = redrawjs.GREEN;
			ctx.strokeStyle = redrawjs.GREEN;
			ctx.lineWidth = 1;
            if((currentWidth+btn.width) >= 1280){
                yOffsetForButtons += 30;
                currentWidth = 800;
            }
            
            btn.y = yOffsetForButtons;

            var pos = currentWidth;
            btn.x = pos;
            if(key == "Pass"){
                btn.x = 1200;
                btn.y = 245;
                ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
                ctx.fillText(btn.disp, 1205, 263);
            }
            else {
                ctx.strokeRect(pos, btn.y, btn.width, btn.height);
                ctx.fillText(btn.disp, pos + 5, btn.y + 18);
                currentWidth = pos + btn.width + bufferSpace;
            }
		}
		else{
			btn.x = -1;
			btn.y = -1;
		}
	}
};

var drawBidding = function() {
    var y = 125;
	ctx.strokeStyle = redrawjs.GREEN;
	ctx.font = "14px monospace";
	ctx.fillText("Current Bid: " + auctionjs.selectedBid, 800, y);
	if(auctionjs.auction.currentBid != 0){
		ctx.fillText("Highest Bid: " + auctionjs.auction.currentBid, 925, y);
		ctx.fillText("Highest Bidder: " + gamejs.players[auctionjs.auction.currentBidLeader].displayName, 1050, y);
	}
}

var drawResourcePurchasing = function() {
    var y = 125;
    ctx.strokeStyle = redrawjs.GREEN;
    ctx.font = "14px monospace";
    var offset = 0;

    var playerPlants = [];
    var playerOwnedPlantCosts = plantjs.ownedPlants;

    // TODO: Really should make the below a function....
    for(var i in playerOwnedPlantCosts){
        playerPlants.push(plantjs.ppp[parseInt(i)]);
    }

    // draw the resource count of the currently selected plant, so the player can change the amount to purchase
    if(plantjs.selectedOwnedPlant != undefined) {
        for (var type in plantjs.selectedOwnedPlant.resources) {
            ctx.fillText(plantjs.selectedOwnedPlant.resources[type] + " " + type, 800, y + (offset * 20));
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
    ctx.fillText("Total Requested", 800, y + 85);
    for(type in totalResources){
        ctx.fillText(totalResources[type] + " " + type, 800 + (80 * offset), y + 110);
        offset += 1;
    }
};

var getPhaseName = function(currentAction){
    if(gamejs.gameOver){
        return "Game Over! " + gamejs.winner + " has won!";
    }
    var phaseNames = {"startGame": "Waiting for Players", "startAuction": "Start Auction", "bid": "Bidding", "buy": "Buy Resources",
        "build": "Build On Cities", "power": "Get Money!", "remove": "Remove Power Plant"};
    var name = phaseNames[currentAction];
    if(currentAction != "startGame"){
        name += " - Step " + gamejs.currentStep;
    }
    return name;
};