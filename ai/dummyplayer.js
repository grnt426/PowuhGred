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
        if(action) {
            self.actionMap[action](self);
        }
    };

    /**
     * Might be interesting to have the AI respond to certain phrases.
     * @param payload
     */
    this.processChatMessages = function(payload){
        console.info("Got chat message: " + payload);
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

    this.processAuction = function(self){
        let currentPlayer = self.gameState["playerOrder"][self.gameState["currentPlayerIndex"]];
        console.info("Current player: " + currentPlayer);
        if(currentPlayer === self.player.uid) {
            let plantCost = self.gameState["actualMarket"][0]["cost"];
            self.socketInterceptor.sendGameAction("startAuction", {cost: plantCost, bid: plantCost});
        }
    };

    this.processBid = function(self){
        let auction = self.gameState['auction'];
        console.info("Current bidder: " + auction['currentBidder']);
        if(auction['currentBidder'] === self.player.uid){
            console.info("Is me!");
            if(self.player.getPlantCount() === 3){
                console.info("I already have enough power plants. Not bidding.");
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

    this.processBuy = function(){

    };

    this.processBuild = function(){

    };

    this.processPower = function(){

    };

    this.shouldDoIt = function(shouldDoThreshold){
        return Math.random() <= shouldDoThreshold;
    };

    this.socketInterceptor.registerListenerForGameUpdates(this.updateGameState);
    this.socketInterceptor.registerListenerForChatMessages(this.processChatMessages);
    this.socketInterceptor.registerListenerForPlayerId(this.getOwnPlayerId);
};