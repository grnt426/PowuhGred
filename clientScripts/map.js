var bgImg = new Image();
bgImg.src = "./data/germany.jpg";

// mapCanvas is map image area
var mapCanvas = document.getElementById("mapCanvas");
var ctx = mapCanvas.getContext("2d");           // NOTSURE: what is context?

//Used to transform between external and internal coordinates (must be for map)
var externalX = function (x) { return x * 1.1 - 5;  };
var externalY = function (y) { return y * 1.1 - 96; };
var internalX = function (x) { return (x + 5) / 1.1;  };
var internalY = function (y) { return (y + 96) / 1.1; };

var sqrDist = function(x1,x2,y1,y2) { return Math.pow(x1-x2,2)+Math.pow(y1-y2,2) };

// Listen for clicks
mapCanvas.addEventListener('click', function(event) {
    var x = event.pageX - 8;
    var y = event.pageY - 8;

    if(DEBUG){
        log("Click: " + x + ", " + y, CONSOLE_O);
    }

    for(key in buttonArray) {
        var btn = buttonArray[key];
        if(x > btn.x && x < (btn.x + btn.width) && y > btn.y && y < (btn.y + btn.height)) {
            btn.listener();
            return;
        }
    }

    if(x > 800 && x < 1280 && y > 300 && y < 420){
        selectedPlant = 3-(Math.floor((1260 - x) / 114));
        selectedCity = null;
        redraw(scorePanel);
        return;
    }

    x = internalX(event.pageX - 8);
    y = internalY(event.pageY - 8);
    $.each(citiesDef,function(key,city) {
        if(sqrDist(x,city.x,y,city.y)<500) {selectedCity = city;selectedPlant = -1;}
    });
    redraw(scorePanel);
},false);