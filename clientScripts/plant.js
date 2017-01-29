var plantjs = {};

// Card positions
plantjs.pppWidth = 114;
plantjs.pppHeight = 114;
var ppp = {};
ppp[3] = {x: 0, y: 1};
ppp[4] = {x: 0, y: 0};
ppp[5] = {x: 0, y: 2};
ppp[6] = {x: 0, y: 3};
ppp[7] = {x: 1, y: 1};
ppp[8] = {x: 1, y: 0};
ppp[9] = {x: 2, y: 1};
ppp[10] = {x: 2, y: 0};
ppp[11] = {x: 0, y: 4};
ppp[12] = {x: 1, y: 2};
ppp[13] = {x: 0, y: 5};
ppp[14] = {x: 1, y: 3};
ppp[15] = {x: 3, y: 0};
ppp[16] = {x: 3, y: 1};
ppp[17] = {x: 1, y: 4};
ppp[18] = {x: 1, y: 5};
ppp[19] = {x: 2, y: 3};
ppp[20] = {x: 4, y: 0};
ppp[21] = {x: 2, y: 2};
ppp[22] = {x: 2, y: 5};
ppp[23] = {x: 2, y: 4};
ppp[24] = {x: 3, y: 3};
ppp[25] = {x: 5, y: 0};
ppp[26] = {x: 4, y: 1};
ppp[27] = {x: 3, y: 5};
ppp[28] = {x: 3, y: 4};
ppp[29] = {x: 3, y: 2};
ppp[30] = {x: 4, y: 3};
ppp[31] = {x: 6, y: 0};
ppp[32] = {x: 5, y: 1};
ppp[33] = {x: 4, y: 5};
ppp[34] = {x: 4, y: 4};
ppp[35] = {x: 6, y: 1};
ppp[36] = {x: 7, y: 0};
ppp[37] = {x: 5, y: 5};
ppp[38] = {x: 5, y: 3};
ppp[39] = {x: 5, y: 4};
ppp[40] = {x: 7, y: 1};
ppp[42] = {x: 8, y: 0};
ppp[44] = {x: 6, y: 5};
ppp[46] = {x: 4, y: 2};
ppp[50] = {x: 7, y: 5};
ppp["step3"] = {x: 8, y: 2};

for(var i = 3; i < 51; i++){
    var plant = ppp[i];
    if(plant != undefined) {
        ppp[i].resources = {'coal':0,'oil':0,'garbage':0,'uranium':0};
        ppp[i].cost = i;
        ppp[i].index = i;
    }
}

plantjs.ppp = ppp;
plantjs.ownedPlants = [];
plantjs.selectedPlant = -1;
plantjs.selectedPlants = [];
plantjs.selectedOwnedPlant = undefined;

// returns a server plant object, the plant param is a client plant object
plantjs.ownedPlantAt = function(x, y, plant) {
    for(var p in plantjs.ppp){
        plant = plantjs.ppp[p];
        if(plant.curX <= x && plant.curX + plant.length >= x && plant.curY <= y && plant.curY + plant.length >= y){
            return plantjs.ownedPlants[parseInt(p)];
        }
    }
};

plantjs.attemptResourceMove = function(startingPlant, endingPlant, resourceType) {
    //TODO  
    log("Attempted to move a resource [" + "] from plant [" + startingPlant + "] to [" + endingPlant + "]");
};

plantjs.deselectOwnPowerPlants = function(){
    for(var p in plantjs.ppp){
        plantjs.ppp[p].selected = false;
    }
    plantjs.selectedOwnedPlant = undefined;
    plantjs.selectedPlants = [];
};