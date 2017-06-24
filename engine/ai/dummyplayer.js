var sleep = require('sleep-promise'),
    util = require('../util.js');

/**
 *
 * @param {SocketInterceptor} socketInterceptor
 * @constructor
 */
exports.DummyPlayer = function(socketInterceptor){

    /**
     * @type {String}
     */
    this.player = undefined;

    /**
     * @type {SocketInterceptor}
     */
    this.socketInterceptor = socketInterceptor;

    /**
     * The last snapshot received from the server that represents the game state.
     * @type {undefined}
     */
    this.gameState = undefined;

    /**
     * The game engine.
     * TODO: This is done for convenience, but should really be some immutable version of the instance to prevent accidental tampering.
     * @type {Engine}
     */
    this.engine = undefined;

    this.actionMap = {};

    this.setup = function(){
        this.actionMap = {
            'startGame': this.processStartGame,
            'startAuction': this.processAuction,
            'bid': this.processBid,
            'buy': this.processBuy,
            'build': this.processBuild,
            'power': this.processPower
        };
    };

    this.updateGameState = function(self, payload){
        self.gameState = payload['args']['data'];
        let action = self.gameState['currentAction'];
        console.info("Got a new game state. " + action);

        // If we don't sleep, the AI progresses really fast, which isn't very enjoyable for a human.
        sleep(1750 + (Math.random() * 750)).then(function(){
            if(action) {
                self.actionMap[action](self);
            }
        })
    };

    /**
     * Might be interesting to have the AI respond to certain phrases.
     * @param payload
     */
    this.processChatMessages = function(payload){
        console.info("Got chat message");
        // Do nothing for now...
    };

    this.getOwnPlayerId = function(payload){
        console.info("Got my own player ID: " + payload);
        // Do nothing....
    };

    /**
     * May want to instead provide a "PlayerView" immutable instance of the underlying Player
     * object instead, which would help prevent simple mistakes of accidentally modifying the real Player
     * instance tracked by the Engine.
     * @param {Player} player
     */
    this.setOwnPlayer = function(player){
        this.player = player;
    };

    this.processStartGame = function(){

    };

    /**
     * When it is our turn to start the auction, on the first turn we will always start the auction on the lowest cost
     * power plant. All other turns, there is a 75% chance of starting an auction with the lowest cost power plant.
     * Once three power plants are purchased, we will never start an auction.
     * @param self
     */
    this.processAuction = function(self){
        if(self.isOurTurn(self)) {
            if(self.player.getPlantCount() === 0 || (self.shouldDoIt(0.75) && self.player.getPlantCount() <= 3)) {
                let plantCost = self.gameState["actualMarket"][0]["cost"];
                self.socketInterceptor.sendGameAction("startAuction", {cost: plantCost, bid: plantCost});
            }
            else{
                self.socketInterceptor.sendGameAction("startAuction", "pass");
            }
        }
    };

    /**
     * The basic idea of the bidding AI is to never bid when they have 3 power plants. They will bid 50% of the
     * time whenever less than 3 power plants are owned.
     * @param self
     */
    this.processBid = function(self){
        let auction = self.gameState['auction'];
        console.info("Current bidder: " + auction['currentBidder']);
        if(auction['currentBidder'] === self.player.uid){
            console.info("Is me!");
            if(self.player.getPlantCount() === 3){
                console.info("I already have enough power plants. Not bidding.");
                self.socketInterceptor.sendGameAction("bid", "pass");
            }
            else{
                let newBid = auction['currentBid'] + 1;
                if(newBid < self.player.getMoney() && self.shouldDoIt(0.5)){
                    console.info("Bid!");
                    self.socketInterceptor.sendGameAction("bid", {bid:newBid});
                }
                else{
                    console.info("Nope, I'm out!");
                    self.socketInterceptor.sendGameAction("bid", "pass");
                }
            }
        }
    };

    /**
     * We always want exactly as many resources on our plants as we need to activate all of them. If we can't afford
     * everything we want, buy nothing.
     */
    this.processBuy = function(self){
        if(self.isOurTurn(self)){
            let resourceRequest = {};
            let powerPlants = self.player.getPowerPlants();
            for(let p in powerPlants){
                let plant = powerPlants[p];
                if(!plant.canActivate()){
                    let resources = {'coal':0, 'oil':0, 'garbage':0, 'uranium':0};
                    if(plant.type === "both"){
                        resources['coal'] = plant.requires - plant.resources['coal'];
                    }
                    else{
                        resources[plant.type] = plant.requires - plant.resources[plant.type];
                    }
                    resourceRequest[plant.cost] = resources;
                }
            }
            if(self.engine.market.validatePurchase(resourceRequest)) {
                self.socketInterceptor.sendGameAction("buy", resourceRequest);
            }
            else{
                console.info("Aurgh! Can't afford what we need!");
                self.socketInterceptor.sendGameAction("buy", "pass");
            }
        }
    };

    this.processBuild = function(self){
        if(self.isOurTurn(self)){
            let purchaseRequest = [];
            if(self.player.cities.length === 0){
                let cities = self.engine.cities.cities;
                let names = util.shuffle(Object.keys(cities));
                for(let i = 0; i < names.length; i++){
                    let name = names[i];
                    if(cities[name].players.length === 0){
                        purchaseRequest.push(name);
                        break;
                    }
                }
            }
            else{

                let cityOptions = {};
                let cheapestPathToCity = {};
                let cities = self.player.cities;
                for(let i = 0; i < cities.length; i++){
                    let city = cities[i];
                    let neighbors = city.connections;
                    for(let cityName in neighbors){
                        let cityObject = self.engine.cities.convertToCityObjects(cityName);

                        // we can't buy a city if there are no open slots for this Step, or we own it.
                        if(cityObject.players.length === self.engine.getCurrentStep(self.engine.currentAction)
                            || cityObject.players.indexOf(self.player.uid) !== -1) {
                            continue;
                        }

                        // Make sure we know the "right" price for a city
                        let cost = neighbors[cityName];
                        let buildCost = self.engine.cities.costToBuildOnCity(cityName) + cost;
                        if(cheapestPathToCity[cityName] && cheapestPathToCity[cityName] > buildCost){
                            cityOptions[cheapestPathToCity[cityName]].splice(
                                cityOptions[cheapestPathToCity[cityName]].indexOf(cityName), 1);
                        }

                        cheapestPathToCity[cityName] = buildCost;
                        if(cityOptions[buildCost]){
                            cityOptions[buildCost].push(cityName);
                        }
                        else{
                            cityOptions[buildCost] = [cityName];
                        }
                    }
                }

                let sortedOptions = Object.keys(cityOptions).sort();
                let totalCost = 0;
                for(let i = 0; i < sortedOptions.length; i++){
                    let cost = sortedOptions[i];
                    let option = cityOptions[sortedOptions[i]];
                    for(let index in option) {
                        let city = option[index];
                        if(cost + totalCost < self.player.getMoney()) {
                            purchaseRequest.push(city);
                        }
                        else{
                            break;
                        }
                    }
                }
            }

            if(purchaseRequest.length === 0){
                self.socketInterceptor.sendGameAction("build", "pass");
            }
            else {
                self.socketInterceptor.sendGameAction("build", purchaseRequest);
            }
        }
    };

    this.processPower = function(self){
        if(self.gameState['playersPaid'].indexOf(self.player.uid) === -1){
            let totalCanPower = 0;
            let activateRequest = {};
            let plants = self.player.plants;
            for(let cost in plants){
                let plant = plants[cost];
                if(plant.canActivate()) {
                    let powers = plant.powers;
                    totalCanPower += powers;
                    activateRequest[cost] = plant.resources;
                    if(totalCanPower >= self.player.cities.length) {
                        break;
                    }
                }
            }
            if(util.olen(activateRequest) === 0){
                self.socketInterceptor.sendGameAction("power", "pass");
            }
            else {
                self.socketInterceptor.sendGameAction("power", activateRequest);
            }
        }
    };

    this.shouldDoIt = function(shouldDoThreshold){
        return Math.random() <= shouldDoThreshold;
    };

    /**
     * Returns True if it is this player's turn, otherwise False. However, this will only work for StartAuction,
     * Buy, Build, and Power phases, as the bid phase has a different mechanism for tracking whose turn it is
     * versus whose turn it is to place a bid.
     * @param self  This player's instance.
     * @returns {boolean}   Whether it is our turn.
     */
    this.isOurTurn = function(self){
        return self.gameState["playerOrder"][self.gameState["currentPlayerIndex"]] === self.player.uid;
    };

    this.socketInterceptor.registerListenerForGameUpdates(this.updateGameState);
    this.socketInterceptor.registerListenerForChatMessages(this.processChatMessages);
    this.socketInterceptor.registerListenerForPlayerId(this.getOwnPlayerId);
};