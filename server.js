// Main entry point for the server. Init systems, sync client js and data, listen for connections

var httpServer,
    fs = require('fs'),
    express = require('express'),
	app = express();

if(process.argv[1] == "debug"){
    httpServer = require('http');
}
else{
    httpServer = require('https');
    app['key'] = fs.readFileSync('/etc/letsencrypt/keys/0000_key-certbot.pem');
    app['cert'] = fs.readFileSync('/etc/letsencrypt/csr/0000_csr-certbot.pem');
}

var	server = httpServer.createServer(app),
	io = require('socket.io').listen(server),
	communicationsjs = require('./communications.js'),
	comms = new communicationsjs.Communications(io),
    citiesjs = require('./cities.js'),
	powerplantjs = require('./powerplantreader.js'),
	enginejs = require('./engine.js'),
    util = require('./util.js');

// routing
app.get("/", function(req, res) { res.sendFile(__dirname + '/index.html'); });
app.get("/clientScripts/init.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/init.js'); });
app.get("/clientScripts/auction.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/auction.js'); });
app.get("/clientScripts/buttons.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/buttons.js'); });
app.get("/clientScripts/chat.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/chat.js'); });
app.get("/clientScripts/fuel.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/fuel.js'); });
app.get("/clientScripts/clickHandler.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/clickHandler.js'); });
app.get("/clientScripts/redraw.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/redraw.js'); });
app.get("/clientScripts/sockethandlers.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/sockethandlers.js'); });
app.get("/clientScripts/scorepanel.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/scorepanel.js'); });
app.get("/clientScripts/cardpositions.js", function(req, res) {	res.sendFile(__dirname + '/clientScripts/cardpositions.js'); });
app.use('/data', express.static(__dirname+'/data'));

var citiesDef = new citiesjs.Cities();
citiesDef.parseCityList("data/germany_cities.txt");
citiesDef.parseCities("data/germany_connections.txt");
var powerPlants = new powerplantjs.PowerPlantReader();
powerPlants.parsePowerPlants("data/power_plants.txt");

var engine = new enginejs.Engine(comms, citiesDef, powerPlants.powerPlants);
comms.engine = engine;

// connect to a player, listen
// TODO: There seems to be an issue with a player joining, but the tab not gaining focus in FF, and the player not initializing the game correctly.
io.sockets.on(comms.SOCKET_CONNECTION, function(socket) {

	if(engine.gameStarted){
		console.info("A player tried to join after the game started!?");
		return;
	}

    // a user connected, send the map down
    engine.broadcastGameState();
	var uid = 'player' + util.olen(engine.players);
    socket.uid = uid;
	socket.emit(comms.SOCKET_USERID, uid);
	engine.addPlayer(uid, socket);
    socket.emit(comms.SOCKET_DEFINECITIES, citiesDef.cities);
	comms.toAll(uid + " has joined the game.");
	console.info(uid + " [" + socket.uid + "] has joined the game");

	// When the client emits sendchat, this listens and executes
	// sendchat -> String
	socket.on(comms.SOCKET_SENDCHAT, function(data) {
		if(data[0] == '/'){
			resolveCommand(socket, data);
		}
		else if(data.trim().length != 0){
			console.info("Chat message: " + data);
			comms.toAllFrom(engine.reverseLookUp[socket.uid], data);
		}
	});

	// When the player does any action
	// gameaction -> JsonObject
	socket.on(comms.SOCKET_GAMEACTION, function(data){
        data.uid = socket.uid;
		engine.resolveAction(data);
	});

	// when the user disconnects
	socket.on(comms.SOCKET_DISCONNECT, function() {
		// TODO handle players leaving.
		comms.toAll(engine.reverseLookUp[socket.uid].displayName + " has left the game.");
	});
});

// handles user chat commands
var resolveCommand = function(socket, data){
	console.info(data);
	var command = data.substring(0, data.indexOf(' '));
	if(command == "/name"){
		var name = data.substring(data.indexOf(' ') + 1);
		console.info("Name received: " + name);
		var player = engine.reverseLookUp[socket.uid];
		player.displayName = name;
		engine.broadcastGameState();
	}
};

// All setup is finished, start listening for connections.
server.listen(process.env.PORT || 3000);
