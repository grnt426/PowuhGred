var redraw = function(scorePanel){

	// Fills background with white
	ctx.fillStyle = "#EEEEEE";
	ctx.fillRect(0, 0, 1680, 1050);
	ctx.drawImage(bgImg, 0, 0);

	// draw internal city map
	$.each(citiesDef, function(key, city){
		ctx.strokeStyle = GRAY;
		ctx.fillStyle = WHITE;
		ctx.lineWidth = 2;
		if(DEBUG){
			ctx.beginPath();
			var x = externalX(city.x);
			var y = externalY(city.y);
			ctx.arc(x, y, 20, 0, 360, false);
			ctx.stroke();

			ctx.font = "10px Arial";
			ctx.fillText(city.name.toUpperCase(), x, y);
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
			ctx.fillRect(x + box.size / 8, y + box.size / 8,
					box.size * (3 / 4), box.size * (3 / 4));
		}
		if(box.type == "oil" && key % regular >= 24 - resources.oil){
			ctx.fillRect(x + box.size / 8, y + box.size / 8,
					box.size * (3 / 4), box.size * (3 / 4));
		}
		if(box.type == "garbage" && key % regular >= 24 - resources.garbage){
			ctx.fillRect(x + box.size / 8, y + box.size / 8,
					box.size * (3 / 4), box.size * (3 / 4));
		}
		if(box.type == "uranium" && key % uranium >= 12 - resources.uranium){
			ctx.fillRect(x + box.size / 8, y + box.size / 8,
					box.size * (3 / 4), box.size * (3 / 4));
		}
	});

	// highlight selected city
	if(selectedCity){
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 3;
		ctx.beginPath();
		var x = externalX(selectedCity.x);
		var y = externalY(selectedCity.y);
		ctx.arc(x, y, 20, 0, 360, false);
		ctx.stroke();
	}

	// draws a selection box on a plant if it's selected (not selected = -1)
	if(selectedPlant >= 0){
		ctx.strokeStyle = ORANGE;
		ctx.lineWidth = 5;
		ctx.beginPath();
		x = (800 + (selectedPlant * 120)); //Changed 114 => 120 to account for spaces
		y = 300;
		ctx.strokeRect(x, y, 114, 114);
		ctx.stroke();
		ctx.stroke();
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
		var cost = playerData.self.ownedPlants[p];
		ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
			pppWidth, pppHeight,
				800 + count * 125, 150, pppWidth, pppHeight);
		count += 1;
	}

	// Draw the actual market
	count = 0;
	ctx.strokeStyle = LTBLUE;
	ctx.lineWidth = 1;
	ctx.strokeRect(794, 294, 4 * 120 + 7, 125);
	for(p in actualMarket){
		cost = actualMarket[p];
		ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
			pppWidth, pppHeight,
				800 + count * 120, 300, pppWidth, pppHeight);
		count += 1;
	}

	// Draw the future market
	count = 0;
	ctx.strokeStyle = PINK;
	ctx.strokeRect(794, 444, 4 * 120 + 7, 125);
	for(p in futureMarket){
		cost = futureMarket[p];
		ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight,
			pppWidth, pppHeight,
				800 + count * 120, 450, pppWidth, pppHeight);
		count += 1;
	}

	// draw buttons
	ctx.fillStyle = WHITE;
	var currentWidth = 800;
	var bufferSpace = 5;
	for(var key in buttonArray){
		var btn = buttonArray[key];

		var cur = ACTIONS_FLAGS[currentActionState];
		var flag = btn.flags;
		if((cur & flag) > 0){
			ctx.fillStyle = GREEN;
			ctx.strokeStyle = GREEN;
			ctx.lineWidth = 1;
			var pos = currentWidth;
			btn.x = pos;
			btn.y = 5;
			ctx.strokeRect(pos, 5, btn.width, btn.height);
			ctx.font = "12px monospace";
			ctx.fillText(btn.disp, pos + 5, 15);
			currentWidth = pos + btn.width + bufferSpace;
		}
		else{
			btn.x = -1;
			btn.y = -1;
		}
	}

    drawScorePanel(scorePanel, ctx, ppp);

	// Draw bid amount box
	if((ACTIONS_FLAGS[currentActionState] & (AUCTION_F | BID_F)) > 0){
		ctx.strokeStyle = GREEN;
		ctx.font = "14px monospace";
		ctx.fillText("Current Bid: " + selectedBid, 800, 30);
		ctx.fillText("Highest Bid: N/A", 925, 30);
	}
};
