var bgImg = new Image();
bgImg.src = "./data/germany.jpg";

// mapCanvas is map image area
var mapCanvas = document.getElementById("mapCanvas");
var ctx = mapCanvas.getContext("2d");           // NOTSURE: what is context?

/**
 * The below comes from scorepanel.js, which is t_x + (p_x * count). For the first iteration (count 1), this will be
 * 1300 + (95 * 1), or 1395.
 * @type {number}
 */
var PLAYER_PLANTS_START_X = 1394;

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

    // Check if an action button was pressed (buttons.js)
    for(key in buttonArray) {
        var btn = buttonArray[key];
        if(x > btn.x && x < (btn.x + btn.width) && y > btn.y && y < (btn.y + btn.height)) {
            btn.listener();
            return;
        }
    }

    // Check if a plant was selected from the actual market
    // TODO: will need to change to support Step3
    if(x > 800 && x < 1280 && y > 300 && y < 420){
        selectedPlant = 3-(Math.floor((1260 - x) / 114));
        selectedCity = null;
        redraw(scorePanel);
        return;
    }
    else{
        selectedPlant = -1;
    }

    // Check if the player's own power plant was selected, used for buy resources phase and power phase
    if(x > PLAYER_PLANTS_START_X && y > 50) {
        console.log("Clicked in player power plant region...");

        // Really lazy, but just search all 50 plants to see if any of them are in the spot where the player clicked
        for(p in ppp){
            var plant = ppp[p];
            if(plant.curX <= x && plant.curX + plant.length >= x && plant.curY <= y && plant.curY + plant.length >= y){
                console.log("Clicked on a power plant...");

                // Now that we found a plant that matches the click location, only select this plant if we own it
                // TODO: this is awful
                if(scorePanel.args.data.players[playerData.self.uid].plants[parseInt(p)] != undefined){
                    console.log("Clicked on an owned power plant.");
                    plant.selected = true;
                    selectedOwnedPlant = plant;
                }
            }
        }
    }

    // Deselect if selected
    // TODO: this is *really* bad, but it works for now
    else{
        for(p in ppp){
            ppp[p].selected = false;
        }
        selectedOwnedPlant = undefined;
    }

    // Otherwise, check if a city was clicked
    x = internalX(event.pageX - 8);
    y = internalY(event.pageY - 8);
    $.each(citiesDef,function(key,city) {
        if(sqrDist(x,city.x,y,city.y)<500) {selectedCity = city;selectedPlant = -1;}
    });
    redraw(scorePanel);
},false);