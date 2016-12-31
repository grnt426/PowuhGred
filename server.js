// Main entry point for the server. Init systems, sync client js and data, listen for connections

var express = require('express'),
	http = require('http'),
	app = express(),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	communicationsjs = require('./communications.js'),
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
app.get("/clientScripts/map.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/map.js'); });
app.get("/clientScripts/redraw.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/redraw.js'); });
app.get("/clientScripts/sockethandlers.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/sockethandlers.js'); });
app.get("/clientScripts/scorepanel.js", function(req, res) { res.sendFile(__dirname + '/clientScripts/scorepanel.js'); });
app.get("/clientScripts/cardpositions.js", function(req, res) {	res.sendFile(__dirname + '/clientScripts/cardpositions.js'); });
app.use('/data', express.static(__dirname+'/data'));

comms = new communicationsjs.Communications(io);

var initGameDefs = function(citiesDef, powerPlants, engine, cityFile, plantsFile) {
    citiesDef.parseCityList();
    citiesDef.parseCities(cityFile);
    powerPlants.parsePowerPlants(plantsFile);
    engine.cities = citiesDef;
    engine.plants = powerPlants.powerPlants;
};

var citiesDef = new citiesjs.Cities();
var powerPlants = new powerplantjs.PowerPlantReader();
var engine = new enginejs.Engine(comms);
initGameDefs(citiesDef, powerPlants, engine, "data/germany_connections.txt", "data/power_plants.txt");

// connect to a player, listen
io.sockets.on(comms.SOCKET_CONNECTION, function(socket) {

	if(engine.gameStarted){
		console.info("A player tried to join after the game started!?");
		return;
	}

    // a user connected, send the map down
    engine.broadcastGameState();
	var uid = 'player' + util.olen(engine.players);
	socket.emit(comms.SOCKET_USERID, uid);
	engine.addPlayer(uid, socket);
    socket.emit(comms.SOCKET_DEFINECITIES, citiesDef.cities);
	comms.toAll(uid + " has joined the game.");
	console.info(uid + " has joined the game");

	// When the client emits sendchat, this listens and executes
	// sendchat -> String
	socket.on(comms.SOCKET_SENDCHAT, function(data) {
		if(data[0] == '/'){
			resolveCommand(socket, data);
		}
		else{
			console.info("Chat message: " + data);
			comms.toAllFrom(engine.reverseLookUp[socket.id], data);
		}
	});

	// When the player does any action
	// gameaction -> JsonObject
	socket.on(comms.SOCKET_GAMEACTION, function(data){
        data.uid = socket.id;
		engine.resolveAction(data);
	});

	// when the user disconnects
	socket.on(comms.SOCKET_DISCONNECT, function() {
		// TODO handle players leaving.
		comms.toAll(engine.reverseLookUp[socket.id].displayName + " has left the game.");
	});
});

// handles user chat commands
var resolveCommand = function(socket, data){
	console.info(data);
	var command = data.substring(0, data.indexOf(' '));
	if(command == "/name"){
		var name = data.substring(data.indexOf(' ') + 1);
		console.info("Name received: " + name);
		var player = engine.reverseLookUp[socket.id];
		player.displayName = name;
		engine.broadcastGameState();
	}
};

// All setup is finished, start listening for connections.
server.listen(process.env.PORT || 3000);
