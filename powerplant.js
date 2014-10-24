var fs = require("fs");

exports.PowerPlants = function(){

	this.powerPlants = [];

	this.parsePowerPlants = function(filename){
		var data = fs.readFileSync(filename).toString().split('\n');
		for(var line in data){
			var args = data[line].split(' ');
			if(args === undefined || args.length != 4)
				continue;
			var cost = parseInt(args[0]);
			var type = args[1];
			var requires = parseInt(args[2]);
			var powers = parseInt(args[3]);
			this.powerPlants.push({cost:cost, type:type, requires:requires, powers:powers});
		}
	};
};
