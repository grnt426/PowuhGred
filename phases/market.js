exports.Market = function(engine, comms) {

    this.engine = engine;
    this.comms = comms;

    this.takeTurn = function(data){

        // It is ALWAYS valid for players to not purchase any resources
        if(data == "pass") {
            engine.nextPlayer()
        }

        // Otherwise, the player must buy at least one available resource
        else{

        }
    };

};