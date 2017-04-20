/**
 *
 * @param {SocketInterceptor} socketInterceptor
 * @constructor
 */
exports.DummyPlayer = function(socketInterceptor){

    /**
     * @type {String}
     */
    this.player;

    /**
     * @type {SocketInterceptor}
     */
    this.socketInterceptor = socketInterceptor;

    /**
     * The last snapshot received from the server that represents the game state.
     * @type {undefined}
     */
    this.gameState = undefined;

    this.updateGameState = function(payload){
        this.gameState = payload;
        console.info("Got a new game state.");
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
     * @param {Player} player
     */
    this.setOwnPlayer = function(player){
        this.player = player;
    };

    this.socketInterceptor.registerListenerForGameUpdates(this.updateGameState);
    this.socketInterceptor.registerListenerForChatMessages(this.processChatMessages);
    this.socketInterceptor.registerListenerForPlayerId(this.getOwnPlayerId);
};