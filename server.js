
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
app.get("/includes/redraw.js", function(req, res) {
	res.sendFile(__dirname + '/includes/redraw.js');
});
app.get("/includes/sockethandlers.js", function(req, res) {
    res.sendFile(__dirname + '/includes/sockethandlers.js');
});
app.get("/includes/scorepanel.js", function(req, res) {
    res.sendFile(__dirname + '/includes/scorepanel.js');
});
app.get("/includes/cardpositions.js", function(req, res) {
	res.sendFile(__dirname + '/includes/cardpositions.js');
});
app.use('/data', express.static(__dirname+'/data'));

comms = new communicationsjs.Communications(io);

var citiesDef = new citiesjs.Cities();
citiesDef.parseCityList();
citiesDef.parseCities("data/germany_connections.txt");
var powerPlants = new powerplantjs.PowerPlants();
powerPlants.parsePowerPlants("data/power_plants.txt");

var engine = new enginejs.Engine(comms);
engine.cities = citiesDef;
engine.plants = powerPlants.powerPlants;

io.sockets.on('connection', function(socket) {

    // a user connected, send the map down
	var uid = 'player' + engine.currentPlayerCount;
	socket.emit('userid', uid);
	engine.addPlayer(uid, socket);
    socket.emit('definecities', citiesDef.cities);
	comms.toAll(uid + " has joined the game.");
	comms.broadcastUpdate({group:'newPlayer', args:{uid:uid}});
	console.info(uid + " has joined the game");

	// When the client emits sendchat, this listens and executes
	// sendchat -> String
	socket.on('sendchat', function(data) {
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
	socket.on('gameaction', function(data){
		engine.resolveAction(data);
	});

	// when the user disconnects
	socket.on('disconnect', function() {
		// TODO handle players leaving.
		comms.toAll(engine.reverseLookUp[socket.id].displayName + " has left the game.");
	});
});

var resolveCommand = function(socket, data){
	console.info(data);
	var command = data.substring(0, data.indexOf(' '));
	if(command == "/name"){
		var name = data.substring(data.indexOf(' ') + 1);
		console.info("Name recevied: " + name);
		var player = engine.reverseLookUp[socket.id];
		var oldName = player.displayName;
		player.displayName = name;
		comms.broadcastUpdate({group:'displayName', args:{uid:player.uid, oldDisplayName:oldName,displayName:name}});
		engine.broadcastScore();
	}
};

// All setup is finished, start listening for connections.
server.listen(3000);
