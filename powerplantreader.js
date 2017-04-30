const fs = require("fs"),
    powerPlant = require("./includes/PowerPlant.js");

/**
 *
 * @constructor
 * @this {PowerPlantReader}
 */
exports.PowerPlantReader = function() {

    // JSONArray => {cost:int, type:type, requires:requires, powers:powers, resources:resources}
    // Cost: The cost of the power plant. Unique
    // Type: How this power plant generates electricity (what fuel is burned, if any).
    // Requires: The amount required to activate this plant.
    // Powers: The number of cities this can power when activated.
    // Resources: The number of resources currently on it. => {Type:Quantity, Type2:Quantity2}
    this.powerPlants = {};

    this.parsePowerPlants = function(filename) {
        let data = fs.readFileSync(filename).toString().split('\n');
        for(let line in data) {
            let args = data[line].split(' ');
            if(args === undefined || args.length !== 4)
                continue;
            let cost = parseInt(args[0]);
            let type = args[1];
            let requires = parseInt(args[2]);
            let powers = parseInt(args[3]);
            this.powerPlants[cost] = new powerPlant.PowerPlant(cost, type, requires, powers);
        }
    };
};
