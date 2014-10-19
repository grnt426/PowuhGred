
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
	var uid = 'player' + engine.players.length;
	engine.addPlayer(uid, socket);
	socket.emit('userid', uid);
    socket.emit('definecities', citiesDef.cities);
	comms.toAll(uid + " has joined the game.");

	// When the client emits sendchat, this listens and executes
	// sendchat -> String
	socket.on('sendchat', function(data) {
		comms.toAllFrom(engine.reverseLookUp[socket].username, data);
	});

	// When the player does any action
	// gameaction -> {username: 'playerX', action: 'start|bid|buy|build', args: 'arg1,arg2,...'}
	socket.on('gameaction', function(data){
		engine.resolveAction(data);
	});

	// Handles changing a player's name.
	// name -> String
	socket.on('name', function(name) {
		var player = engine.reverseLookUp[socket];
		player.displayName = name;
	});

	// when the user disconnects
	socket.on('disconnect', function() {
		// TODO handle players leaving.
		comms.toAll(engine.reverseLookUp[socket].displayName + " has left the game.");
	});
});

server.listen(3000);
