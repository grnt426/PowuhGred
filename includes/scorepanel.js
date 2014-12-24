function drawScorePanel(dataArg, ctx, ppp) {

    // currently expecting, though will need to change later:
    //  data.currentPlayerIndex
    //  data.playerOrder[1..]
    //  data.players[data.playerOrder[i]]
    //        .money = 50;
    //        .plants = [1,2,3];
    //        .cities = ["Berlin","some other place","Frankfurt-d"];
    //        .resources = {'coal': 5, 'oil': 5, 'garbage': 5, 'uranium': 5};
    //        .displayName = someJerk

    if(!dataArg) return;

	// Extract the embedded data object
	var data = dataArg.args.data;

    if(!data.playerOrder) return;
    if(!data.players)  return;
    if(!ppp) return;

    var s_y1 = 10;
    var s_x1 = 1300;
    var s_x2 = 1680;

    var b_x = s_x2 - s_x1;
    var p_x = b_x/4
    var b_y = b_x/2.61;
    var p_y = b_y - p_x-20;

    var arc = 20;
    var y_pad = 20;
    var h = p_x*.6
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#DDDDDD";
    ctx.lineWidth=6;

    var t_x = s_x1;
    var t_y = s_y1;
    for(var i=0; i < data.playerOrder.length; i++) {
        if(!data.players[data.playerOrder[i]]) return;
		var player = data.players[data.playerOrder[i]];
        var money = player.money;
        var plants = player.plants;
        var cities = player.cities;
        var resources = player.resources;
        var name = player.displayName;

        // draw curved border
		if(currentPlayer == player.uid)
			ctx.strokeStyle = "#3366FF";
		else
        	ctx.strokeStyle = "#111111";
        ctx.fillStyle = "#DDDDDD";
        ctx.lineWidth=6;
        ctx.beginPath();
        ctx.moveTo(t_x+b_x,t_y);
        ctx.lineTo(t_x+arc,t_y);
        ctx.arc(t_x+arc,t_y+arc,arc,1.5*Math.PI,Math.PI,true)
        ctx.lineTo(t_x,t_y+b_y-arc);
        ctx.arc(t_x+arc,t_y+b_y-arc,arc,Math.PI,.5*Math.PI,true)
        ctx.lineTo(t_x+b_x,t_y+b_y);
        ctx.stroke();

        // draw a house
        ctx.strokeStyle = "#BBBBBB";
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
        ctx.fillStyle = GREEN;
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
        for(p in plants){
            cost = plants[p];
            if(!ppp[cost]) return;
            ctx.drawImage(plantImg, ppp[cost].x * pppWidth, ppp[cost].y * pppHeight, pppWidth, pppHeight,
                t_x+(p_x*count), t_y+p_y+16, p_x, p_x);
            count+=1;
        }

        t_y += y_pad + b_y;
    }


}
