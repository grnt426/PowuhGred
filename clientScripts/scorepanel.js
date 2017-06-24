var scorePanel = {};

function min(a, b) {
    if(a > b) return b;
    return a
}

function max(a, b) {
    if(a < b) return b;
    return a
}

// given a prior bound/range, normalize the variable to a range 0-1
function norm(x, preBound) {
    return x / preBound
}

// given a a master timeline input from 0-1 and a range within that input,
// gets the sub-progress within that range
//   ex: getting the sub-progress of the second forth of the timeline
//     tween(.1,.25,.5) -> 0
//     tween(.2,.25,.5) -> 0
//     tween(.3,.25,.5) -> .2
//     tween(.4,.25,.5) -> .6
//     tween(.5,.25,.5) -> 1
//     tween(.6,.25,.5) -> 1
function tween(x, start, end) {
    var diff = end - start;
    return norm(min(max(x - start, 0), diff), diff)
}

function drawScorePanel(data, ctx, ppp) {

    if(!data) return;
    if(!data.playerOrder) return;
    if(!data.players)  return;
    if(!ppp) return;

    var s_y1 = 10;
    var s_x1 = 1300;
    var s_x2 = 1680;

    var b_x = s_x2 - s_x1;
    var p_x = b_x / 4;
    var b_y = b_x / 2.61;
    var p_y = b_y - p_x - 20;

    var arc = 20;
    var y_pad = 20;
    var h = p_x * .6;
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#DDDDDD";
    ctx.lineWidth = 6;

    // tracks the number of players already drawn in a spot on the city track
    var playersDrawnOnCityTrack = {};

    // the number of total players that must share a given spot on the city track
    var playersToFitOnCityTrackSpot = {};
    for(var i = 0; i < data.playerOrder.length; i++) {

        // This if-statement is useful in the beginning before everything has loaded
        if(!data.players[data.playerOrder[i]]) return;
        var player = data.players[data.playerOrder[i]];
        playersToFitOnCityTrackSpot[player.cities.length] = playersToFitOnCityTrackSpot[player.cities.length] ?
            playersToFitOnCityTrackSpot[player.cities.length] + 1 : 1;
    }

    var t_x = s_x1;
    var t_y = s_y1;
    var playersPaid = data.playersPaid;
    for(var i = 0; i < data.playerOrder.length; i++) {

        t_x = s_x1;


        if(!data.players[data.playerOrder[i]]) return;
        var player = data.players[data.playerOrder[i]];
        var money = player.money;
        var plants = player.plants;
        var cities = player.cities;
        var resources = player.resources;
        var name = player.displayName;

        var playerColorCode = colorNameToColorCode(player.color);

        // Animation for the bounding box of the player's summary area
        var p = anim.progress;
        var p1, p2, p3, p4, p5;
        p1 = tween(p, 0, .35);
        p2 = tween(p, .35, .4);
        p3 = tween(p, .4, .6);
        p4 = tween(p, .6, .65);
        p5 = tween(p, .65, 1);

        // debug anim progress output
        // name = p1.toFixed(2) + " " + p2.toFixed(2) + " " + p3.toFixed(2) + " " + p4.toFixed(2) + " " + p5.toFixed(2)

        // Draw player position on turn track
        ctx.fillStyle = playerColorCode;
        ctx.fillRect(74 + (27 * data.playerOrder.indexOf(player.uid) * 1.01), 25, 13, 13);

        // Draw position on city track
        var cityCount = cities.length;
        var currentCount = playersDrawnOnCityTrack[cityCount] ? playersDrawnOnCityTrack[cityCount] : 0;
        var mustFit = playersToFitOnCityTrackSpot[cityCount];
        if(cityCount > 0 && cityCount < 7) {
            var x = 415;
            var y = 22;

            ctx.fillStyle = playerColorCode;
            x = x + (50 * (cityCount - 1)) * 1.04 + (15 * (currentCount % 3));
            y = y + (13 * Math.floor(currentCount / 3));
            ctx.fillRect(x, y, 10, 10);
        }

        // The physical spaces for the counts 7-21 are much smaller. To keep the UI as clean as possible, we compact
        // the position of the houses only as much as needed.
        else if(cityCount >= 7) {

            // position for the house within a cell
            var x = 387;
            var y = 55;

            // Space around houses in same cell
            var xBuffer;
            var yBuffer;

            // Space between adjacent cells
            var xOffset = 25;

            // padding from house to cell wall
            var xPadding;

            var size = 8;

            if(mustFit <= 2) {
                xPadding = 6;
                xBuffer = 0;
                yBuffer = 12;
            }
            else if(mustFit <= 4) {
                xPadding = 2;
                xBuffer = 8;
                yBuffer = 8;
                size = 8;
            }
            else {
                xPadding = 2;
                xBuffer = 7;
                yBuffer = 7;
                size = 7;
            }

            ctx.fillStyle = playerColorCode;
            if(cityCount === 7) {
                x = 720 + xPadding;
                y = 20 + (mustFit <= 2 ? 5 : mustFit <= 4 ? 5 : 3);
                x = x + (xBuffer * (currentCount % 2));
                y = y + (yBuffer * Math.floor((currentCount / (mustFit <= 2 ? 1 : 2))));
            }
            else {
                x = x + (xOffset * (cityCount - 8)) * 1.04 + (xBuffer * (currentCount % 2)) + xPadding;
                y = y + (yBuffer * Math.floor((currentCount / (mustFit <= 2 ? 1 : 2))));
            }
            ctx.fillRect(x, y, size, size);
        }
        playersDrawnOnCityTrack[cityCount] = playersDrawnOnCityTrack[cityCount] ? playersDrawnOnCityTrack[cityCount] + 1 : 1;

        // draw curved border
        if(currentPlayer === player.uid && currentActionState !== "power")
            ctx.strokeStyle = "#3366FF";
        else if(currentPlayer !== player.uid && data.auction.currentBidder === player.uid)
            ctx.strokeStyle = "#336633";
        else if(currentActionState === "power" && playersPaid.indexOf(player.uid) === -1)
            ctx.strokeStyle = "#336633";
        else
            ctx.strokeStyle = "#111111";
        ctx.fillStyle = "#DDDDDD";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(t_x + b_x, t_y);
        if(p1 > 0) ctx.lineTo(t_x + arc + b_x - (b_x * p1), t_y);
        if(p2 > 0) ctx.arc(t_x + arc, t_y + arc, arc, 1.5 * Math.PI, (1.5 - (.5 * p2)) * Math.PI, true);
        if(p3 > 0) ctx.lineTo(t_x, t_y + arc + (b_y - arc - arc) * p3);
        if(p4 > 0) ctx.arc(t_x + arc, t_y + b_y - arc, arc, Math.PI, (1 - (.5 * p4)) * Math.PI, true);
        if(p5 > 0) ctx.lineTo(t_x + arc + ((b_x - arc) * p5), t_y + b_y);

        ctx.stroke();

        t_x = s_x2 - ((s_x2 - s_x1) * tween(p, .2, .8));


        // draw a house for the number of owned cities
        ctx.strokeStyle = playerColorCode;
        ctx.lineWidth = 3;
        var h1 = t_x + p_x / 2 - arc / 2 + 8;
        var h2 = t_y + p_x / 2 - arc / 2 + 8;
        ctx.beginPath();
        ctx.moveTo(h1, h2 - h / 2);
        ctx.lineTo(h1 - h / 2, h2);
        ctx.lineTo(h1 - h / 2, h2 + h / 2);
        ctx.lineTo(h1 + h / 2, h2 + h / 2);
        ctx.lineTo(h1 + h / 2, h2);
        ctx.lineTo(h1, h2 - h / 2);
        ctx.lineTo(h1 - h / 2, h2);
        ctx.stroke();

        //draw city count
        ctx.fillStyle = "#000000";
        ctx.font = "48px monospace";
        ctx.textAlign = "center";
        ctx.fillText(cities.length, h1, h2 + h / 2 - 8);

        //draw money
        ctx.fillStyle = GREEN;
        ctx.font = "34px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$" + money, h1, h2 + p_x * .8);

        //draw user name
        ctx.fillStyle = "#000000";
        ctx.font = "30px monospace";
        ctx.textAlign = "left";
        ctx.fillText(name, t_x + p_x, t_y + p_y + 4);

        //draw power plants
        var count = 1;
        for(var p in plants) {
            var plant = plants[p];
            var cost = parseInt(plant.cost);
            console.log(JSON.stringify(plant));
            if(!ppp[cost]) {
                console.log("ERROR: Can't find plant '" + cost + "'!?");
                return;
            }

            // Draw the power plant card
            ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight, pppWidth, pppHeight,
                t_x + (p_x * count), t_y + p_y + 16, p_x, p_x);
            if(ppp[cost].selected) {
                ctx.strokeStyle = GREEN;
                ctx.lineWidth = 6;
                ctx.strokeRect(t_x + (p_x * count), t_y + p_y + 16, p_x, p_x);
            }

            // This is for setting up the click region for the card
            ppp[cost].curX = t_x + (p_x * count);
            ppp[cost].curY = t_y + p_y + 16;
            ppp[cost].length = p_x;
            ppp[cost].resourcePositions = [];

            // Draw the resources on the card
            var availableResources = plant.resources;
            var drawn = 0;
            var highlightSelected = getSelectedResourceAmounts(ppp[cost].selectionIndex, plant.requires, plant.type);
            for(var type in availableResources) {
                for(var j = 0; j < availableResources[type]; j++) {
                    ctx.fillStyle = colorNameToColorCode(type);
                    var resourceX = ppp[cost].curX + 15 + (20 * (drawn % 3));
                    var resourceY = ppp[cost].curY + 55 - (20 * Math.floor(drawn / 3));
                    var resourceSize = 10;
                    ctx.fillRect(resourceX, resourceY, resourceSize, resourceSize);

                    // setup click region for resource
                    ppp[cost].resourcePositions.push({type: type, x: resourceX, y: resourceY, size: resourceSize});

                    if(ppp[cost].selected && highlightSelected[type] > 0 && currentActionState === "power") {
                        ctx.strokeStyle = GREEN;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(ppp[cost].curX + 13 + (20 * (drawn % 3)),
                            ppp[cost].curY + 53 - (20 * Math.floor(drawn / 3)),
                            14, 14);
                        highlightSelected[type] -= 1;
                    }
                    drawn += 1;
                }
            }
            count += 1;
        }
        t_y += y_pad + b_y;

        // Draw the dragged resource, if any
        if(resourceDragging) {
            ctx.fillStyle = colorNameToColorCode(resourceDragging.type);
            ctx.fillRect(mouseX - (resourceDragging.size / 2), mouseY - (resourceDragging.size / 2),
                resourceDragging.size, resourceDragging.size);
        }
    }
}

function getSelectedResourceAmounts(selectionIndex, required, type) {
    if(type === "both") {
        if(selectionIndex === 1) {
            return resourceList(required, 0, 0, 0);
        }
        else if(selectionIndex === 2) {
            return resourceList(0, required, 0, 0);
        }
        else if(selectionIndex === 3) {
            return resourceList(required === 3 ? 2 : 1, 1, 0, 0);
        }
        else if(selectionIndex === 4) {
            return resourceList(1, required === 3 ? 2 : 1, 0, 0);
        }
    }
    else {
        let resources = resourceList(0, 0, 0, 0);
        resources[type] = required;
        return resources;
    }
}

/**
 * My JS greenhorn is showing: how to leverage the "server" version of util.js for client side?
 * TODO: don't copy/paste this from util.js
 * @param coal
 * @param oil
 * @param garbage
 * @param uranium
 * @returns {{}}
 */
resourceList = function(coal, oil, garbage, uranium) {
    let data = {};
    data['coal'] = coal;
    data['oil'] = oil;
    data['garbage'] = garbage;
    data['uranium'] = uranium;
    return data;
};