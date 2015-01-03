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
    var diff = end-start
    return norm(min(max(x -start,0),diff),diff)
}

function drawScorePanel(data, ctx, ppp) {

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

    if(!data) return;
    if(!data.playerOrder) return;
    if(!data.players)  return;
    if(!ppp) return;

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

    var t_x = s_x1;
    var t_y = s_y1;
    for(var i=0; i < data.playerOrder.length; i++) {

        t_x = s_x1;

        if(!data.players[data.playerOrder[i]]) return;
        var player = data.players[data.playerOrder[i]];
        var money = player.money;
        var plants = player.plants;
        var cities = player.cities;
        var resources = player.resources;
        var name = player.displayName;

        var p=anim.progress;
        var p1,p2,p3,p4,p5;
        p1=tween(p,0,.35);
        p2=tween(p,.35,.4);
        p3=tween(p,.4,.6);
        p4=tween(p,.6,.65);
        p5=tween(p,.65,1);

        // debug anim progress output
        // name = p1.toFixed(2) + " " + p2.toFixed(2) + " " + p3.toFixed(2) + " " + p4.toFixed(2) + " " + p5.toFixed(2)

        // draw curved border
        if(currentPlayer == player.uid)
            ctx.strokeStyle = "#3366FF";
        else if(currentPlayer != player.uid && data.auction.currentBidder == player.uid)
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
