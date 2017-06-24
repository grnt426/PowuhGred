var ctx = canvas.getContext("2d");  // ctx allows drawing on the canvas

var bgImg = new Image();
bgImg.src = "../data/germany.jpg";

var animationFlags = [];
var anim = {};

var animationTickLoop = function() {
    if(animationFlags["start_game"]) {
        animationFlags["start_game_p"] += .03;
        if(animationFlags["start_game_p"] > 1) {
            animationFlags["start_game_p"] = 1;
            animationFlags["start_game"] = false;
            clearInterval(animation);
        }

        anim.progress = animationFlags["start_game_p"];
        clearRect(1300, 0, 380, 1050);
        drawScorePanel(scorePanel.args.data, ctx, ppp);
        redraw(scorePanel);
    }
};

// about 30 FPS
var animation = setInterval(animationTickLoop, 1000 / 30);

var animStartGame = function() {
    animationFlags["start_game"] = true;
    animationFlags["start_game_p"] = 0
};


var clearRect = function(x, y, w, h) {

    // Fills background with white
    ctx.fillStyle = "#EEEEEE";
    ctx.fillRect(x, y, w, h);
    ctx.drawImage(bgImg, 0, 0)
};

var redraw = function(scorePanel) {

    clearRect(0, 0, 1680, 1050);
    scorePanel = scorePanel.args.data;

    // draw internal city map
    $.each(citiesDef, function(key, city) {
        ctx.strokeStyle = GRAY;
        ctx.fillStyle = WHITE;
        ctx.lineWidth = 2;
        let x = externalX(city.x);
        let y = externalY(city.y);
        if(DEBUG) {
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.stroke();

            ctx.font = "10px Arial";
            ctx.fillText(city.name.toUpperCase(), x, y);
        }

        // Gray out a city if it is in an inactive region
        if(scorePanel.inactiveRegions.indexOf(city.region) !== -1) {
            ctx.fillStyle = GRAY;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    });

    // draw internal resource grid
    let regular = 24;
    let uranium = 12;
    $.each(resourceGrid, function(key, box) {
        ctx.strokeStyle = BLUE;
        if(box.type === "coal") {
            ctx.strokeStyle = ctx.fillStyle = BROWN;
        }
        if(box.type === "oil") {
            ctx.strokeStyle = ctx.fillStyle = BLACK;
        }
        if(box.type === "uranium") {
            ctx.strokeStyle = ctx.fillStyle = RED;
        }
        if(box.type === "garbage") {
            ctx.strokeStyle = ctx.fillStyle = YELLOW;
        }
        ctx.lineWidth = 1;

        let x = externalX(box.x);
        let y = externalY(box.y);

        if(DEBUG) {
            ctx.beginPath();
            ctx.rect(x, y, box.size, box.size);
            ctx.stroke();
        }

        // Draw resource unit
        if(box.type === "coal" && key % regular >= 24 - resources.coal) {
            ctx.fillRect(x + box.size / 4, y + box.size / 4,
                box.size * (0.5), box.size * (0.5));
        }
        if(box.type === "oil" && key % regular >= 24 - resources.oil) {
            ctx.fillRect(x + box.size / 4, y + box.size / 4,
                box.size * (0.5), box.size * (0.5));
        }
        if(box.type === "garbage" && key % regular >= 24 - resources.garbage) {
            ctx.fillRect(x + box.size / 4, y + box.size / 4,
                box.size * (0.5), box.size * (0.5));
        }
        if(box.type === "uranium" && key % uranium >= 12 - resources.uranium) {
            ctx.fillRect(x + box.size / 4, y + box.size / 4,
                box.size * (0.5), box.size * (0.5));
        }
    });

    // Draw resource replenishment rate box
    let replenishRate = scorePanel.replenishRate;
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(32, 860, 125, 80);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = BLACK;
    ctx.font = "14px monospace";
    let replenishY = 935;
    ctx.fillText("   Coal", 35, replenishY);
    ctx.fillText("    Oil", 35, replenishY - 15);
    ctx.fillText("Garbage", 35, replenishY - 30);
    ctx.fillText("Uranium", 35, replenishY - 45);
    ctx.fillText("   Step", 35, replenishY - 60);
    let repOffSet = ["coal", "oil", "garbage", "uranium"];

    let replenishX = 100;
    ctx.fillText("1", replenishX, 875);
    ctx.fillText("2", replenishX + 20, 875);
    ctx.fillText("3", replenishX + 40, 875);
    replenishX += 20;
    for(let step in replenishRate) {
        let perStep = replenishRate[step];
        for(let type in perStep) {
            if(step === currentStep - 1) {
                ctx.fillStyle = ORANGE;
            }
            else {
                ctx.fillStyle = BLACK;
            }
            ctx.fillText(perStep[type], replenishX + (20 * (step - 1)), replenishY - (15 * repOffSet.indexOf(type)));
        }
    }

    // Draw excess supply
    let typeStartX = {'coal': 725, 'oil': 705, 'garbage': 685, 'uranium': 665};
    for(let type in scorePanel.excessResources) {
        let amt = scorePanel.excessResources[type];
        let startX = typeStartX[type];
        ctx.fillStyle = colorNameToColorCode(type);
        let amtDrawn = 0;
        while(amt > 0) {
            ctx.fillRect(startX, 930 - (15 * amtDrawn), 10, 10);
            amtDrawn += 1;
            amt -= 1;
        }
    }

    // draw owned cities
    for(let p in scorePanel.players) {
        let player = scorePanel.players[p];
        for(let city in player.cities) {
            city = player.cities[city];
            let pos = city.players.indexOf(player.uid);
            ctx.fillStyle = colorNameToColorCode(player.color);
            let posX = city.x;
            let posY = city.y;
            if(pos === 0) {
                ctx.fillRect(externalX(posX) - 17, externalY(posY) - 5, 10, 10);
            }
            else if(pos === 1) {
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
    if(selectedCity && currentActionState !== "build") {
        ctx.beginPath();
        let x = externalX(selectedCity.x);
        let y = externalY(selectedCity.y);
        ctx.arc(x, y, 20, 0, 360, false);
        ctx.stroke();
    }
    else {
        for(let key in selectedCities) {
            ctx.beginPath();
            let city = citiesDef[selectedCities[key]];
            let x = externalX(city.x);
            let y = externalY(city.y);
            ctx.arc(x, y, 20, 0, 360, false);
            ctx.stroke();
        }
    }

    // Draw the actual market
    count = 0;
    ctx.strokeStyle = LTBLUE;
    ctx.fillStyle = LTBLUE;
    ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.fillText("Actual Market", 794, 284);
    ctx.strokeRect(794, 294, (currentStep === 3 ? 3 : 4) * 120 + 7, (currentStep === 3 ? 250 : 125));
    let wrap = currentStep === 3 ? 3 : 4;
    for(let p in actualMarket) {
        let plant = actualMarket[p];
        plant.drawnPosition = count;
        let cost = plant.cost;
        ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight, pppWidth, pppHeight,
            800 + ((count % wrap) * 120), 300 + (125 * (currentStep === 3 && count > 2 ? 1 : 0)), pppWidth, pppHeight);
        count += 1;
    }

    // Draw the future market
    if(currentStep !== 3) {
        count = 0;
        ctx.strokeStyle = PINK;
        ctx.fillStyle = PINK;
        ctx.font = "12px Arial";
        ctx.fillText("Future Market", 794, 434);
        ctx.strokeRect(794, 444, 4 * 120 + 7, 125);
        for(let p in futureMarket) {
            let plant = futureMarket[p];
            let cost = plant.cost;
            ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
                pppWidth, pppHeight,
                800 + count * 120, 450, pppWidth, pppHeight);
            count += 1;
        }
    }

    // draws a selection box on a plant if it's selected (not selected = -1)
    if(selectedPlant >= 0 || scorePanel.auction.auctionRunning) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 5;
        ctx.beginPath();
        let highlightPlant;
        if(scorePanel.auction.auctionRunning) {
            for(let actualP in actualMarket) {
                if(actualMarket[actualP].cost === scorePanel.auction.currentBidChoice) {
                    highlightPlant = actualMarket[actualP].drawnPosition;
                }
            }
        }
        else {
            highlightPlant = selectedPlant;
        }
        let x = (800 + (highlightPlant * 120)); //Changed 114 => 120 to account for spaces
        let y = 300;
        ctx.strokeRect(x, y, 114, 114);
        ctx.stroke();
        ctx.stroke();
    }

    drawScorePanel(scorePanel, ctx, ppp);

    // Draw Phase header
    let yOffsetForButtons = 20;
    ctx.fillStyle = BLACK;
    ctx.font = "20px monospace";
    ctx.fillText(getPhaseName(currentActionState), 800, yOffsetForButtons);

    // draw buttons
    ctx.fillStyle = WHITE;
    let currentWidth = 800;
    let bufferSpace = 10;
    let buttonsDrawn = 0;
    yOffsetForButtons += 15;
    ctx.font = "16px monospace";
    for(let key in buttonArray) {
        let btn = buttonArray[key];

        let cur = ACTIONS_FLAGS[currentActionState];
        let flag = btn.flags;
        btn.width = btn.disp.length * 10 + 8;
        btn.height = 24;

        btn.x = -1;
        btn.y = -1;

        if((cur & flag) > 0) {
            if(shouldSkipBuyResourceFlag(btn, selectedOwnedPlant)){
                continue;
            }

            buttonsDrawn += 1;
            ctx.fillStyle = GREEN;
            ctx.strokeStyle = GREEN;
            ctx.lineWidth = 1;
            if((currentWidth + btn.width) >= 1280) {
                yOffsetForButtons += 30;
                currentWidth = 800;
            }

            btn.y = yOffsetForButtons;

            let pos = currentWidth;
            btn.x = pos;
            if(key === "Pass") {
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
    }

    // Draw bid amount box
    if((ACTIONS_FLAGS[currentActionState] & (AUCTION_F | BID_F)) > 0) {
        yOffsetForButtons += 60;
        ctx.strokeStyle = GREEN;
        ctx.font = "14px monospace";
        ctx.fillText("Current Bid: " + selectedBid, 800, yOffsetForButtons);
        if(scorePanel.auction.currentBid !== 0) {
            ctx.fillText("Highest Bid: " + scorePanel.auction.currentBid, 925, yOffsetForButtons);
            ctx.fillText("Highest Bidder: " + scorePanel.players[scorePanel.auction.currentBidLeader].displayName, 1050, yOffsetForButtons);
        }
    }

    // Draw resource purchase amounts boxes
    else if((ACTIONS_FLAGS[currentActionState] & BUY_F) > 0) {
        yOffsetForButtons += 60;
        ctx.strokeStyle = GREEN;
        ctx.font = "14px monospace";
        let offset = 0;

        let playerPlants = [];
        let playerOwnedPlantCosts = scorePanel.players[playerData.self.uid].plants;

        // TODO: Really should make the below a function....
        for(let i in playerOwnedPlantCosts) {
            playerPlants.push(ppp[parseInt(i)]);
        }

        // draw the resource count of the currently selected plant, so the player can change the amount to purchase
        if(selectedOwnedPlant !== undefined) {
            for(let type in selectedOwnedPlant.resources) {
                ctx.fillText(selectedOwnedPlant.resources[type] + " " + type, 800, yOffsetForButtons + (offset * 20));
                offset += 1;
            }
        }

        // Then, draw the total number of resources requested across all plants
        let totalResources = {'coal': 0, 'oil': 0, 'garbage': 0, 'uranium': 0};
        for(let index in playerPlants) {
            let plant = playerPlants[index];
            if(plant.resources === undefined)
                continue;
            for(let type in plant.resources) {
                totalResources[type] += plant.resources[type];
            }
        }

        offset = 0;
        ctx.fillText("Total Requested", 800, yOffsetForButtons + 85);
        for(let type in totalResources) {
            ctx.fillText(totalResources[type] + " " + type, 800 + (80 * offset), yOffsetForButtons + 110);
            offset += 1;
        }
    }
};

function colorNameToColorCode(name) {
    let colorMap = {
        "red": RED, "blue": BLUE, "green": GREEN, "yellow": YELLOW, "purple": PURPLE, "black": BLACK,
        "coal": BROWN, "oil": BLACK, "garbage": YELLOW, "uranium": RED
    };
    return colorMap[name];
}

function getPhaseName(currentAction) {
    if(gameOver) {
        return "Game Over! " + scorePanel.args.data.winner + " has won!";
    }
    let phaseNames = {
        "startGame": "Waiting for Players", "startAuction": "Start Auction", "bid": "Bidding", "buy": "Buy Resources",
        "build": "Build On Cities", "power": "Get Money!", "remove": "Remove Power Plant"
    };
    let name = phaseNames[currentAction];
    if(currentAction !== "startGame") {
        name += " - Step " + currentStep;
    }
    return name;
}

function shouldSkipBuyResourceFlag(btn, selectedPlant){
    if(selectedPlant === undefined) {
        return false;
    }
    else if(btn.disp.indexOf("+") === -1 && btn.disp.indexOf("-") === -1){
        return false;
    }
    let plant = playerData.self.ownedPlants[selectedPlant.cost];
    if(plant.type !== "both" && btn.disp.toLowerCase().indexOf(plant.type) !== -1){
        return false;
    }
    else if(plant.type === "both" && (btn.disp.toLowerCase().indexOf("coal") !== -1 || btn.disp.toLowerCase().indexOf("coal") !== -1)){
        return false;
    }
    return true;
}
