exports.Building = function (engine, comms, cities) {

    this.engine = engine;
    this.comms = comms;
    this.cities = cities;

    this.buildCities = function(data){

        // Players can always choose to not purchase any cities
        if(data == "pass") {
            this.engine.nextPlayer();
        }
        else{

        }
    };
};