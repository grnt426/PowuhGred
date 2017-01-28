/* global gamejs, redrawjs, plantjs, auctionjs */
var scorepaneljs = {};

function min(a,b) {
    if (a>b) return b;
    return a
}

function max(a,b) {
    if (a<b) return b;
    return a
}

// given a prior bound/range, normalize the variable to a range 0-1
function norm(x,preBound) {
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
function tween(x,start,end) {
    var diff = end-start;
    return norm(min(max(x -start,0),diff),diff)
}

scorepaneljs.drawScorePanel = function() {

    // currently expecting, though will need to change later:
    //  data.currentPlayerIndex
    //  data.playerOrder[1..]
    //  data.players[data.playerOrder[i]]
    //        .money = 50;
    //        .plants = [1,2,3];
    //        .cities = ["Berlin","some other place","Frankfurt-d"];
    //        .resources = {'coal': 5, 'oil': 5, 'garbage': 5, 'uranium': 5};
    //        .displayName = someJerk
    //  data.anim.progress = 0-1
    //           .activePlayer = i
    //           .activeWidth = #

    var ctx = redrawjs.ctx;

    var s_y1 = 10;
    var s_x1 = 1300;
    var s_x2 = 1680;

    var b_x = s_x2 - s_x1;
    var p_x = b_x/4;
    var b_y = b_x/2.61;
    var p_y = b_y - p_x-20;

    var arc = 20;
    var y_pad = 20;
    var h = p_x*.6;
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#DDDDDD";
    ctx.lineWidth=6;

    var playerCityCount = {};

    var t_x = s_x1;
    var t_y = s_y1;
    var playersPaid = gamejs.playersPaid;
    for(var i=0; i < gamejs.playerOrder.length; i++) {

        t_x = s_x1;

        if(!gamejs.players[gamejs.playerOrder[i]]) return;
        var player = gamejs.players[gamejs.playerOrder[i]];
        var money = player.money;
        var plants = player.plants;
        var cities = player.cities;
        var name = player.displayName;

        var playerColorCode = redrawjs.colorNameToColorCode(player.color);

        var p=anim.progress;
        var p1,p2,p3,p4,p5;
        p1=tween(p,0,.35);
        p2=tween(p,.35,.4);
        p3=tween(p,.4,.6);
        p4=tween(p,.6,.65);
        p5=tween(p,.65,1);

        // debug anim progress output
        // name = p1.toFixed(2) + " " + p2.toFixed(2) + " " + p3.toFixed(2) + " " + p4.toFixed(2) + " " + p5.toFixed(2)

        // Draw player position on turn track
        ctx.fillStyle = playerColorCode;
        ctx.fillRect(74 + (27 * gamejs.playerOrder.indexOf(player.uid) * 1.01), 25, 13, 13);

        // Draw position on city track
        var cityCount = cities.length;
        if(cityCount > 0 && cityCount < 7){
            var x = 415;
            var y = 22;
            var currentCount = playerCityCount[cityCount] == undefined ? 0 : playerCityCount[cityCount];
            ctx.fillStyle = playerColorCode;
            x = x + (50 * (cityCount - 1)) * 1.04 + (15 * (currentCount % 3));
            y = y + (13 * Math.floor(currentCount / 3));
            ctx.fillRect(x, y, 10, 10);
            playerCityCount[cityCount] = playerCityCount[cityCount] == undefined ? 1 : playerCityCount[cityCount] + 1;
        }
        else if(cityCount > 6){

        }

        // draw curved border
        if(gamejs.currentPlayer == player.uid && gamejs.currentAction != "power")
            ctx.strokeStyle = "#3366FF";
        else if(gamejs.currentPlayer != player.uid && auctionjs.auction.currentBidder == player.uid)
            ctx.strokeStyle = "#336633";
        else if(gamejs.currentAction == "power" && playersPaid.indexOf(player.uid) == -1)
            ctx.strokeStyle = "#336633";
        else
            ctx.strokeStyle = "#111111";
        ctx.fillStyle = "#DDDDDD";
        ctx.lineWidth=6;
        ctx.beginPath();
        ctx.moveTo(t_x+b_x,t_y);
        if (p1>0) ctx.lineTo(t_x+arc+b_x-(b_x*p1),t_y);
        if (p2>0) ctx.arc(t_x+arc,t_y+arc,arc,1.5*Math.PI,(1.5 - (.5*p2))*Math.PI,true);
        if (p3>0) ctx.lineTo(t_x,t_y+arc+(b_y-arc-arc)*p3);
        if (p4>0) ctx.arc(t_x+arc,t_y+b_y-arc,arc,Math.PI,(1 - (.5*p4))*Math.PI,true);
        if (p5>0) ctx.lineTo(t_x+arc+((b_x-arc)*p5),t_y+b_y);

        ctx.stroke();

        t_x = s_x2 - ((s_x2 - s_x1)*tween(p,.2,.8));


        // draw a house
        ctx.strokeStyle = playerColorCode;
        ctx.lineWidth=3;
        var h1 = t_x+p_x/2-arc/2+8;
        var h2 = t_y+p_x/2-arc/2+8;
        ctx.beginPath();
        ctx.moveTo(h1,h2-h/2);
        ctx.lineTo(h1-h/2,h2);
        ctx.lineTo(h1-h/2,h2+h/2);
        ctx.lineTo(h1+h/2,h2+h/2);
        ctx.lineTo(h1+h/2,h2);
        ctx.lineTo(h1,h2-h/2);
        ctx.lineTo(h1-h/2,h2);
        ctx.stroke();

        //draw city count
        ctx.fillStyle = "#000000";
        ctx.font = "48px monospace";
        ctx.textAlign = "center";
        ctx.fillText(cities.length, h1,h2+h/2-8);

        //draw money
        ctx.fillStyle = redrawjs.GREEN;
        ctx.font = "34px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$" + money, h1,h2+p_x *.8);

        //draw user name
        ctx.fillStyle = "#000000";
        ctx.font = "30px monospace";
        ctx.textAlign = "left";
        ctx.fillText(name, t_x+p_x,t_y+p_y+4);

        //draw power plants
        var count = 1;
        for(var pIndex in plants){
            var plant = plants[pIndex];
            var plantDef = plantjs.ppp[parseInt(plant.cost)];
            if(plantDef == undefined) {
                console.log("ERROR: Can't find plant def for '" + plant.cost + "'!?");
                return;
            }

            // Draw the power plant card
            ctx.drawImage(redrawjs.plantImg, plantDef.x * plantjs.pppWidth, plantDef.y * plantjs.pppHeight, plantjs.pppWidth, plantjs.pppHeight,
                t_x+(p_x*count), t_y+p_y+16, p_x, p_x);
            if(plantDef.selected){
                ctx.strokeStyle = redrawjs.GREEN;
                ctx.lineWidth = 6;
                ctx.strokeRect(t_x+(p_x*count), t_y+p_y+16, p_x, p_x);
            }

            // This is for setting up the click region for the card
            plantDef.curX = t_x+(p_x*count);
            plantDef.curY = t_y+p_y+16;
            plantDef.length = p_x;

            // Draw the resources on the card
            var availableResources = plant.resources;
            var drawn = 0;
            var highlightSelected = getSelectedResourceAmounts(plantDef.selectionIndex, plant.requires, plant.type);
            for(var type in availableResources){
                for(var j = 0; j < availableResources[type]; j++){
                    ctx.fillStyle = redrawjs.colorNameToColorCode(type);
                    ctx.fillRect(plantDef.curX + 15 + (20 * (drawn % 3)),
                        plantDef.curY + 55 - (20 * Math.floor(drawn / 3)),
                        10, 10);

                    if(plantDef.selected && highlightSelected[type] > 0 && gamejs.currentAction == "power"){
                        ctx.strokeStyle = redrawjs.GREEN;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(plantDef.curX + 13 + (20 * (drawn % 3)),
                            plantDef.curY + 53 - (20 * Math.floor(drawn / 3)),
                            14, 14);
                        highlightSelected[type] -= 1;
                    }
                    drawn += 1;
                }
            }
            count+=1;
        }
        t_y += y_pad + b_y;
    }
};

var getSelectedResourceAmounts = function(selectionIndex, required, type) {
    if (type == "both") {
        if (selectionIndex == 1) {
            return resourceList(required, 0, 0, 0);
        }
        else if (selectionIndex == 2) {
            return resourceList(0, required, 0, 0);
        }
        else if (selectionIndex == 3) {
            return resourceList(required == 3 ? 2 : 1, 1, 0, 0);
        }
        else if (selectionIndex == 4) {
            return resourceList(1, required == 3 ? 2 : 1, 0, 0);
        }
    }
    else{
        var resources = resourceList(0, 0, 0, 0);
        resources[type] = required;
        return resources;
    }
};

/**
 * My JS greenhorn is showing: how to leverage the "server" version of util.js for client side?
 * TODO: don't copy/paste this from util.js
 * @param coal
 * @param oil
 * @param garbage
 * @param uranium
 * @returns {{}}
 */
var resourceList = function(coal, oil, garbage, uranium){
    var data = {};
    data['coal'] = coal;
    data['oil'] = oil;
    data['garbage'] = garbage;
    data['uranium'] = uranium;
    return data;
};