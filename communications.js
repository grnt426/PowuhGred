
exports.Communications = function(io){

	// Used to broadcast to channels
	this.io = io;

    // Init sequence
    this.SOCKET_CONNECTION = 'connection';      // client -> server
    this.SOCKET_USERID = 'userid';              // server -> client
    this.SOCKET_DEFINECITIES = 'definecities';  // server -> client

	// Channels
	this.SOCKET_CHAT = 'updatechat';   // server -> client
    this.SOCKET_SENDCHAT = 'sendchat'; // client -> server

	// Game commands
	this.SOCKET_UPDATES = 'updates';       // server -> client
    this.SOCKET_GAMEACTION = 'gameaction';  // client -> server

    // Tear down
    this.SOCKET_DISCONNECT = 'disconnect';  // client -> server

	// Names of "hosts" sending the messages
	this.SERVER = 'SERVER';
	this.DEBUG = '[DEBUG]';

	// Debug control
	this.CONSOLE_ALL_OFF = false;
	this.CHAT_ALL_OFF = false;

	/**
	 * Broadcasts a message on SOCKET_CHAT channel to all players in the game, from
	 * the SERVER.
	 * @param msg    The message to broadcast.
	 */
	this.toAll = function(msg){
		io.sockets.emit(this.SOCKET_CHAT, {sender:this.SERVER, msg:msg});
	};

	/**
	 * Sends a msg on SOCKET_CHAT channel only to the current player taking their turn
	 * (not the player resolving an action or card, but the player whose turn it
	 * is) from SERVER.
	 *
	 * TODO: test this?
	 *
	 * @param msg    The message to send.
	 */
	this.toCurrent = function(msg){
//		this.toPlayer(gamestate.curPlayer, msg);
	};

	/**
	 * Sends a message on SOCKET_CHAT channel from SERVER to the player.
	 *
	 * @param {Player} player	Player username to send message to.
	 * @param {String} msg		The message to send.
	 */
	this.toPlayer = function(player, msg){
		player.socket.emit(this.SOCKET_CHAT, {sender:this.SERVER, msg:msg});
	};

	/**
	 * Broadcasts a msg on SOCKET_CHAT channel from a player.
	 *
	 * @param from    The username of the player sending the message.
	 * @param msg    The message to broadcast.
	 */
	this.toAllFrom = function(from, msg){
		console.info(from.uid + " " + from.displayName);
		io.sockets.emit(this.SOCKET_CHAT, {sender:from.displayName, msg:msg});
	};

	/**
	 * Sends a message only to the player specified (if they exist) from the
	 * player specified with the given message.
	 *
	 * @param to    The player to send to. If this player doesn't exist, the
	 *                from player is messaged indicating that.
	 * @param from    The player that sent the message.
	 * @param msg    The message to send.
	 */
	this.toPrivate = function(to, from, msg){
//		var toPlayer = gamestate.getPlayer(to);
//		if(!toPlayer){
//			from.socket.emit(this.SOCKET_CHAT, this.SERVER,
//					"'" + to + "' player doesn't exist.");
//		}
//		else{
//			toPlayer.socket.emit(this.SOCKET_CHAT, from.username, msg);
//		}
	};

	/**
	 * Prints to the console, so long as the global CONSOLE_ALL_OFF is disabled.
	 *
	 * @param toPrint	The message is suppressed if false, otherwise will
	 * 					print.
	 * @param msg		The debug message to print.
	 */
	this.debug = function(toPrint, msg){
		if(!this.CONSOLE_ALL_OFF && toPrint){
			console.info(this.DEBUG + " " + msg);
		}
	};

	/**
	 * Broadcasts on SOCKET_CHAT channel from DEBUG the message given, only if
	 * CHAT_ALL_OFF is false and toPrint is true.
	 *
	 * This allows the caller to indefinitely leave their debug messages in
	 * place, and simply turn off all messages, or just the ones that don't
	 * want.
	 *
	 * @param toPrint	The message is suppressed if false, otherwise will
	 * 					print.
	 * @param msg		The debug message to print.
	 */
	this.toDebug = function(toPrint, msg){
		this.debug(toPrint, msg);

		if(!this.CHAT_ALL_OFF && toPrint){
			io.sockets.emit(this.SOCKET_CHAT, this.DEBUG, msg);
		}
	};

	/**
	 * Not Used.
	 *
	 * Updates a player's gamestate client side.
	 *
	 * @param player	The player to update.
	 * @param command	The command to send.
	 * @param msg		The message contents for the client.
	 */
	this.updatePlayer = function(player, command, msg){
		if(typeof(player) === "string"){
//			player = gamestate.getPlayer(player);
		}
		player.socket.emit(command, msg);
	};

	/**
	 * Broadcasts an update to all players.
	 *
	 * @param dataObj   the data object to update the client with
	 */
	this.broadcastUpdate = function(dataObj){
		io.sockets.emit(this.SOCKET_UPDATES, dataObj);
	};
};

