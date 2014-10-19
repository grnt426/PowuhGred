
var express = require('express'),
	http = require('http'),
	app = express(),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	communicationsjs = require('./communications.js');
    citiesjs = require('./cities.js'),
	powerplantjs = require('./powerplant.js'),
	enginejs = require('./engine.js');

// routing
app.get("/", function(req, res) {
	res.sendFile(__dirname + '/index.html');
});
app.use('/data', express.static(__dirname+'/data'));

var citiesDef = new citiesjs.Cities();
citiesDef.parseCityList();
citiesDef.parseCities("data/germany_connections.txt");
var powerPlants = new powerplantjs.PowerPlants();
powerPlants.parsePowerPlants("data/power_plants.txt");

var engine = new enginejs.Engine();
engine.cities = citiesDef;
engine.plants = powerPlants;

comms = new communicationsjs.Communications(io);
engine.comms = comms;

io.sockets.on('connection', function(socket) {

    // a user connected, send the map down
	var uid = 'player' + engine.currentPlayerCount;
	engine.addPlayer(uid, socket);
	socket.emit('userid', uid);
    socket.emit('definecities', citiesDef.cities);
	comms.toAll(uid + " has joined the game.");
	comms.broadcastUpdate({group:'newPlayer', args:uid});


	// When the client emits sendchat, this listens and executes
	// sendchat -> String
	socket.on('sendchat', function(data) {
		console.info(this.DEBUG + " " + data);
		comms.toAllFrom(engine.reverseLookUp[socket], data);
	});

	// When the player does any action
	// gameaction -> JsonObject
	socket.on('gameaction', function(data){
		console.info(data.uid + " " + data.cmd);
		engine.resolveAction(data);
	});

	/**
	 * Handles changing a player's name.
	 * name -> String
	 *
	 * updates ->
	 * {
	 * 	group: 'displayName',
	 * 	args: 'UID,name'
	 * }
 	 */
	socket.on('name', function(name) {
		console.info(this.DEBUG + " " + name);
		var player = engine.reverseLookUp[socket];
		player.displayName = name;
		comms.broadcastUpdate({group:'displayName', args:player.uid + "," + name});
	});

	// when the user disconnects
	socket.on('disconnect', function() {
		// TODO handle players leaving.
		comms.toAll(engine.reverseLookUp[socket].displayName + " has left the game.");
	});
});

// All setup is finished, start listening for connections.
server.listen(3000);
