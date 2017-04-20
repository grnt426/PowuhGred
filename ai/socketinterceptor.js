let Promise = require('bluebird');

/**
 * Clients using this SocketInterceptor should minimally call registerListenerForGameUpdates.
 * @param {Communications} comms
 * @param {Engine} engine
 * @constructor
 */
exports.SocketInterceptor = function(comms, engine){

    /**
     * To perform game actions, and talk back! ;)
     * @type {Communications}
     */
    this.comms = comms;

    /**
     * @type {Engine}
     */
    this.engine = engine;

    /**
     * @type {String}
     */
    this.uid = undefined;

    /**
     * Maps various different kinds of messages from the server to an appropriate listener for a client.
     * @type {Object<String,Function>}
     */
    this.channelMapper = {};

    this.client = undefined;

    /**
     * Simply maps specific types of messages to handlers.
     * @param channel
     * @param payload
     */
    this.emit = function(channel, payload){
        console.info(channel + " " + payload);
        Promise.resolve(this.channelMapper[channel](this.client, payload))
            .catch((err) => console.error("Error in talking to client " + err));
    };

    /**
     * Allows the client to send an action to the server.
     * @param action
     * @param data
     */
    this.sendGameAction = function(action, data){
        let payload = {uid:this.uid, cmd:action, args:data};
        Promise.resolve(this.channelMapper[comms.SOCKET_GAMEACTION](payload))
            .catch((err) => console.error("Error in talking to server " + err));
    };

    /**
     * Allows the client to send chat messages to all players.
     * @param message
     */
    this.sendChatMessage = function(message){
        Promise.resolve(this.channelMapper[this.comms.SOCKET_SENDCHAT](message))
            .catch((err) => console.error("Error in sending chat message to server " + err));
    };

    this.registerListenerForGameUpdates = function(callback){
        this.channelMapper[this.comms.SOCKET_UPDATES] = callback;
    };

    this.registerListenerForChatMessages = function(callback){
        this.channelMapper[this.comms.SOCKET_CHAT] = callback;
    };

    this.registerListenerForPlayerId = function(callback){
        this.channelMapper[this.comms.SOCKET_USERID] = callback;
    };

    this.registerListenerForDefineCities = function(callback){
        this.channelMapper[this.comms.SOCKET_DEFINECITIES] = callback;
    };

    this.on = function(channel, callback){
        this.channelMapper[channel] = callback;
    };

    this.dummyListener = function(payload){
        console.warn("No listener defined...");
        console.info("Payload discarded: " + payload);
    };

    this.registerListenerForGameUpdates(this.dummyListener);
    this.registerListenerForChatMessages(this.dummyListener);
    this.registerListenerForPlayerId(this.dummyListener);
    this.registerListenerForDefineCities(this.dummyListener);
};