/* global $ */

/**
 * The below comes from scorepanel.js, which is t_x + (p_x * count). For the first iteration (count 1), this will be
 * 1300 + (95 * 1), or 1395.
 * @type {number}
 */
var PLAYER_PLANTS_START_X = 1394;

//Used to transform between external and internal coordinates (must be for map)
var externalX = function(x) {
    return x * 1.1 - 5;
};
var externalY = function(y) {
    return y * 1.1 - 96;
};
var internalX = function(x) {
    return (x + 5) / 1.1;
};
var internalY = function(y) {
    return (y + 96) / 1.1;
};

var sqrDist = function(x1, x2, y1, y2) {
    return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)
};

var dragging = false;
var plantDraggedFrom = undefined;
var resourceDragging = undefined;
var mouseX = 0;
var mouseY = 0;
var redrawLoop = undefined;

canvas.addEventListener('mousemove', function(e) {
    mouseX = e.pageX - 8;
    mouseY = e.pageY - 8;
});

// Drag event detection
canvas.addEventListener('mousedown', function(event) {
    let x = event.pageX - 8;
    let y = event.pageY - 8;

    if(!dragging) {

        if(x > PLAYER_PLANTS_START_X && y > 50) {
            let plant = findPlantClicked(x, y);
            if(plant !== undefined) {

                // Now that we found a plant that matches the click location, only select this plant if we own it
                let ownedPlant = scorePanel.args.data.players[playerData.self.uid].plants[parseInt(plant.cost)];
                if(ownedPlant !== undefined) {
                    console.log("Checking if the player clicked on a draggable owned resource...");

                    // Determine if we clicked on a resource
                    let resource = undefined;
                    for(let resPos in plant.resourcePositions) {
                        let res = plant.resourcePositions[resPos];
                        if(res.x <= x && res.x + res.size >= x && res.y <= y && res.y + res.size >= y) {
                            resource = res;
                            break;
                        }
                    }
                    console.log("Resource found: " + JSON.stringify(resource));
                    if(resource !== undefined) {
                        dragging = true;
                        plantDraggedFrom = plant;
                        resourceDragging = resource;
                        redrawLoop = setInterval(function() {
                            redraw(scorePanel)
                        }, 1000 / 30);
                    }
                }
            }
        }
    }
});

var P_KEY_CODE = 80;

window.addEventListener('keydown', function(event) {
    console.log("Got key: " + event.keyCode);
    switch(event.keyCode) {
        case P_KEY_CODE:
            handleP_KeyButton(event);
            break;
    }
}, true);

function handleP_KeyButton(event) {
    console.log("P key pressed");
    if(event.altKey) {
        console.log("hotkey for pass triggered.");
        passButton();
    }
}


// Listen for clicks, or in the case of dragging, resolve the drop action
canvas.addEventListener('mouseup', function(event) {

    // TODO: why is there an offset of 8?
    let x = event.pageX - 8;
    let y = event.pageY - 8;

    if(DEBUG) {
        log("Click: " + x + ", " + y, CONSOLE_O);
    }

    if(dragging) {
        clearInterval(redrawLoop);

        let plant = findPlantClicked(x, y);
        if(plant !== undefined) {

            if(plant.cost === plantDraggedFrom.cost) {
                console.log("Dragged back to self? Do nothing");
            }
            else {
                let ownedPlant = scorePanel.args.data.players[playerData.self.uid].plants[parseInt(plant.cost)];
                if(ownedPlant !== undefined) {
                    console.log("Dragged to: " + JSON.stringify(plant));
                    let data = {src: plantDraggedFrom.cost, dst: plant.cost, resources: resourceList(0, 0, 0, 0)};
                    data.resources[resourceDragging.type] = 1;
                    socket.emit(SOCKET_GAMEACTION, {uid: playerData.self.uid, cmd: "move", args: data});
                }
                else {
                    console.log("Dragged to un-owned: " + JSON.stringify(plant));
                }
            }
        }

        // reset the dragging state, regardless of outcome of dragged object
        dragging = false;
        plantDraggedFrom = undefined;
        resourceDragging = undefined;
        redraw(scorePanel);
        return;
    }

    // Check if an action button was pressed (buttons.js)
    for(key in buttonArray) {
        let btn = buttonArray[key];
        if(x > btn.x && x < (btn.x + btn.width) && y > btn.y && y < (btn.y + btn.height)) {
            btn.listener();
            redraw(scorePanel);
            return;
        }
    }

    // Check if a plant was selected from the actual market
    // TODO: will need to change to support Step3
    if(x > 800 && x < 1280 && y > 300 && y < 420 && scorePanel.args.data.currentAction === "startAuction") {
        selectedPlant = 3 - (Math.floor((1260 - x) / 114));
        selectedCity = null;
        selectedOwnedPlant = -1;
        redraw(scorePanel);
        return;
    }
    else {
        selectedPlant = -1;
    }

    // Check if the player's own power plant was selected, used for buy resources phase and power phase
    if(x > PLAYER_PLANTS_START_X && y > 50 && (currentActionState === "buy" || currentActionState === "power" 
            || currentActionState === "remove")) {
        console.log("Clicked in player power plant region...");

        let plant = findPlantClicked(x, y);
        if(plant !== undefined) {

            // Now that we found a plant that matches the click location, only select this plant if we own it
            // TODO: this super long line is awful
            let ownedPlant = scorePanel.args.data.players[playerData.self.uid].plants[parseInt(plant.cost)];
            if(ownedPlant !== undefined) {
                console.log("Clicked on an owned power plant.");

                // For power plants which can burn both coal and oil, we want different behavior
                if(ownedPlant.type === "both" && currentActionState === "power") {

                    /*
                     The reason for modulo on N + 1, where N = the required number of resources to activate, is shown as followed:
                     N = 1: 1 coal, or 1 oil
                     N = 2: 2 coal, 2 oil, or 1 coal and 1 oil
                     N = 3: 3 coal, 3 oil, 2 coal and 1 oil, or 2 oil and 1 coal
                     */
                    let selectedIndex = plant.selected ? (plant.selectionIndex + 1) % (ownedPlant.requires + 2) : 1;
                    if(selectedIndex !== 0) {
                        while(selectedIndex !== 0) {
                            if(selectedIndex === 1 && ownedPlant.resources['coal'] >= ownedPlant.requires) {
                                plant.selectedToBurn = {'coal': ownedPlant.requires, 'oil': 0};
                                break;
                            }
                            else if(selectedIndex === 2 && ownedPlant.resources['oil'] >= ownedPlant.requires) {
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
                            else if(selectedIndex === 3 && (
                                (ownedPlant.resources['coal'] > 0 && ownedPlant.resources['oil'] > 0 && ownedPlant.requires === 2) ||
                                (ownedPlant.resources['coal'] > 1 && ownedPlant.resources['oil'] > 0 && ownedPlant.requires === 3))) {
                                plant.selectedToBurn = {'coal': ownedPlant.requires - 1, 'oil': 1};
                                break;
                            }
                            else if(selectedIndex === 4 && ownedPlant.resources['oil'] > 1 && ownedPlant.resources['coal'] > 0
                                && ownedPlant.requires === 3) {
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
                        plant.selected = plant.selectionIndex !== 0;
                        selectedPlants.push(plant.cost);
                    }
                    else {
                        plant.selected = false;
                        selectedPlants.splice(selectedPlants.indexOf(plant.cost), 1);
                        plant.selectedToBurn = {};
                    }
                }
                else {
                    plant.selected = plant.selected === undefined ? true : !plant.selected;
                    if(plant.selected) {
                        if(selectedOwnedPlant !== undefined && currentActionState !== "power")
                            selectedOwnedPlant.selected = false;
                        selectedOwnedPlant = plant;
                    }
                    else {
                        selectedOwnedPlant = undefined;
                    }

                    // We can only select multiple plants if we are in the power phase. While it *might* make sense
                    // in the resource purchase phase, it would be somewhat confusing.
                    if(currentActionState === "power") {
                        if(selectedPlants.indexOf(plant.cost) !== -1) {
                            selectedPlants.splice(selectedPlants.indexOf(plant.cost), 1);
                        }
                        else {
                            selectedPlants.push(plant.cost);
                        }
                    }
                }
            }
        }
    }

    // Deselect if selected
    // TODO: this is *really* bad, but it works for now
    else {
        deselectOwnPowerPlants();
    }

    // Otherwise, check if a city was clicked
    checkCityClick(event);

    redraw(scorePanel);
}, false);

var deselectOwnPowerPlants = function() {
    for(p in ppp) {
        ppp[p].selected = false;
        ppp[p].resources = {'coal':0, 'oil':0, 'garbage':0, 'uranium':0};
    }
    selectedOwnedPlant = undefined;
    selectedPlants = [];
};

var findPlantClicked = function(x, y) {

    let clickedPlant = undefined;

    // Really lazy, but just search all 50 plants to see if any of them are in the spot where the player clicked
    for(let p in ppp) {
        let plant = ppp[p];
        if(plant.curX <= x && plant.curX + plant.length >= x && plant.curY <= y && plant.curY + plant.length >= y) {
            console.log("Clicked on a power plant...");
            clickedPlant = plant;
            break;
        }
    }

    return clickedPlant;
};

var checkCityClick = function(event) {
    let x = internalX(event.pageX - 8);
    let y = internalY(event.pageY - 8);
    $.each(citiesDef, function(key, city) {
        if(sqrDist(x, city.x, y, city.y) < 500) {
            if(scorePanel.args.data.inactiveRegions.indexOf(city.region) === -1) {
                if(selectedCity === city) {
                    selectedCity = undefined;
                }
                else {
                    if(scorePanel.args.data.currentAction === "build") {
                        if(selectedCities.indexOf(key) !== -1) {
                            selectedCities.splice(selectedCities.indexOf(key), 1);
                        }
                        else {
                            selectedCities.push(key);
                        }
                    }
                    else {
                        selectedCity = city;
                    }
                }
            }
        }
    });
};
