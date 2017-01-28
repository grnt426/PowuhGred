/* global $, gamejs, redrawjs, plantjs, cityjs */

var drag = {};
drag.currentlyDragging = false;
drag.startingPlant = null;
drag.resourceType = null;
drag.x = null;
drag.y = null;

var sqrDist = function(x1,x2,y1,y2) { return Math.pow(x1-x2,2)+Math.pow(y1-y2,2) };

// mouse down to initiate drags
redrawjs.canvas.addEventListener('mousedown', function(event) {
    
});

// mouse move to animate drags
redrawjs.canvas.addEventListener('mousemove', function(event) {
    if(drag.currentlyDragging) {
        drag.x = event.pageX - 8;
        drag.y = event.pageY - 8;
    }
});

// mouse up to actually handle the logic of clicking
redrawjs.canvas.addEventListener('mouseup', function(event) {
    var x = event.pageX - 8;
    var y = event.pageY - 8;

    if(gamejs.DEBUG){
        log("Click: " + x + ", " + y, CONSOLE_O);
    }
    
    if(drag.currentlyDragging) {
        drag.currentlyDragging = false;
        var plant = plantjs.ownedPlantAt(x,y);
        if(plant != undefined) {
            plantjs.attemptResourceMove(drag.startingPlant, plant, drag.resourceType)
            drag.startingPlant = null;
            drag.resourceType = null;
        }
    }

    // Check if an action button was pressed (buttons.js)
    for(var key in buttonArray) {
        var btn = buttonArray[key];
        if(x > btn.x && x < (btn.x + btn.width) && y > btn.y && y < (btn.y + btn.height)) {
            btn.listener();
            redraw(scorePanel);
            return;
        }
    }

    // Check if a plant was selected from the actual market
    // TODO: will need to change to support Step3
    if(x > 800 && x < 1280 && y > 300 && y < 420 && scorePanel.args.data.currentAction == "startAuction"){
        selectedPlant = 3-(Math.floor((1260 - x) / 114));
        cityjs.selectedCity = undefined;
        selectedOwnedPlant = -1;
        redraw(scorePanel);
        return;
    }
    else{
        selectedPlant = -1;
    }

    // Check if the player's own power plant was selected, used for buy resources phase and power phase
    if(x > redrawjs.PLAYER_PLANTS_START_X && y > 50 && (gamejs.currentAction == "buy" || gamejs.currentAction == "power" || gamejs.currentAction == "remove")) {
        console.log("Clicked in player power plant region...");

        var ownedPlant = plantjs.ownedPlantAt(x,y);
        if(ownedPlant != undefined){
            console.log("Clicked on an owned power plant.");

            // For power plants which can burn both coal and oil, we want different behavior
            if(ownedPlant.type == "both" && gamejs.currentAction == "power"){

                /*
                  The reason for modulo on N + 1, where N = the required number of resources to activate, is shown as followed:
                  N = 1: 1 coal, or 1 oil
                  N = 2: 2 coal, 2 oil, or 1 coal and 1 oil
                  N = 3: 3 coal, 3 oil, 2 coal and 1 oil, or 2 oil and 1 coal
                 */
                var selectedIndex = plant.selected ? (plant.selectionIndex + 1) % (ownedPlant.requires + 2) : 1;
                if(selectedIndex != 0) {
                    while(selectedIndex != 0){
                        if(selectedIndex == 1 && ownedPlant.resources['coal'] >= ownedPlant.requires){
                            plant.selectedToBurn = {'coal': ownedPlant.requires, 'oil':0};
                            break;
                        }
                        else if(selectedIndex == 2 && ownedPlant.resources['oil'] >= ownedPlant.requires){
                            plant.selectedToBurn = {'coal': 0, 'oil': ownedPlant.requires};
                            break;
                        }

                         /*
                          I am overloading this one to compress the logic. If the plant needs a combination of 2 coal/oil,
                          Then the player needs at least 1 of each for a "mixed" selection. However, that would incorrectly
                          highlight the case for when the plant requires a combination of 3 coal/oil unless the explicit
                          check is made for the requires. By overloading, I avoid adding another state and complexity
                          with regards to how to loop properly over the selection possibilities. So the two are awkwardly
                          combined (mixed for 2, or 2 coal/1 oil for 3).
                          */
                        else if(selectedIndex == 3 && (
                                (ownedPlant.resources['coal'] > 0 && ownedPlant.resources['oil'] > 0 && ownedPlant.requires == 2) ||
                                (ownedPlant.resources['coal'] > 1 && ownedPlant.resources['oil'] > 0 && ownedPlant.requires == 3))){
                            plant.selectedToBurn = {'coal': ownedPlant.requires - 1, 'oil': 1};
                            break;
                        }
                        else if(selectedIndex == 4 && ownedPlant.resources['oil'] > 1 && ownedPlant.resources['coal'] > 0
                                && ownedPlant.requires == 3){
                            plant.selectedToBurn = {'coal': 1, 'oil': 2};
                            break;
                        }
                        selectedIndex = (selectedIndex + 1) % (ownedPlant.requires + 2);
                    }
                    plant.selectionIndex = selectedIndex;

                    // If we loop back around to a selection index of 0 (nothing), the plant is then not
                    // selected, which can happen if we exhausted other possible options which weren't valid
                    // or the player has no valid selectable options (completely insufficient resources).
                    // TODO: We can detect the later case if we checked all three states and got back to 0, and then alert the user their selection was invalid.
                    plant.selected = plant.selectionIndex != 0;
                    selectedPlants.push(p);
                }
                else{
                    plant.selected = false;
                    selectedPlants.splice(selectedPlants.indexOf(p), 1);
                    plant.selectedToBurn = {};
                }
            }
            else {
                plant.selected = plant.selected === undefined ? true : !plant.selected;
                if (plant.selected) {
                    if(selectedOwnedPlant !== undefined && gamejs.currentAction != "power")
                        selectedOwnedPlant.selected = false;
                    selectedOwnedPlant = plant;
                }
                else {
                    selectedOwnedPlant = undefined;
                }

                // We can only select multiple plants if we are in the power phase. While it *might* make sense
                // in the resource purchase phase, it would be somewhat confusing.
                if(gamejs.currentAction == "power") {
                    if (selectedPlants.indexOf(plant.cost) != -1) {
                        selectedPlants.splice(selectedPlants.indexOf(p), 1);
                    }
                    else {
                        selectedPlants.push(p);
                    }
                }
            }
        }
            
        
    }

    // Deselect if selected
    // TODO: this is *really* bad, but it works for now
    else{
        deselectOwnPowerPlants();
    }

    // Otherwise, check if a city was clicked
    checkCityClick(event);
    
    redraw(scorePanel);
},false);

var deselectOwnPowerPlants = function(){
    for(p in ppp){
        ppp[p].selected = false;
    }
    selectedOwnedPlant = undefined;
    selectedPlants = [];
};

var checkCityClick = function(event) {
    var x = redrawjs.internalX(event.pageX - 8);
    var y = redrawjs.internalY(event.pageY - 8);
    $.each(cityjs.citiesDef,function(key,city) {
        if(sqrDist(x,city.x,y,city.y)<500) {
            if(scorePanel.args.data.inactiveRegions.indexOf(city.region) == -1) {
                if(cityjs.selectedCity == city){
                    cityjs.selectedCity = undefined;
                }
                else {
                    if (gamejs.currentAction == "build") {
                        if (cityjs.selectedCities.indexOf(key) != -1) {
                            cityjs.selectedCities.splice(cityjs.selectedCities.indexOf(key), 1);
                        }
                        else {
                            cityjs.selectedCities.push(key);
                        }
                    }
                    else{
                        cityjs.selectedCity = city;
                    }
                }
            }
        }
    });
};
