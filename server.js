
var express = require('express'),
	http = require('http'),
	app = express(),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	communicationsjs = require('./communications.js');
    citiesjs = require('./cities.js');

// routing
app.get("/", function(req, res) {
	res.sendFile(__dirname + '/index.html');
});
app.get("/city.js", function(req, res) {
    console.log("city.js requested by client");
    res.sendFile(__dirname + '/city.js');
});
app.get("/cities.js", function(req, res) {
    console.log("cities.js requested by client");
    res.sendFile(__dirname + '/cities.js');
});
app.use('/resources', express.static(__dirname+'/resources'));

var citiesDef = new citiesjs.Cities();
citiesDef.parseCityList();
citiesDef.parseCities("data/germany_connections.txt");

comms = new communicationsjs.Communications(io);

io.sockets.on('connection', function(socket) {

    //a user connected, send the map down
    console.log(citiesDef.cities)
    socket.emit('definecities', "TEST");

	// when the client emits sendchat, this listens and executes
	socket.on('sendchat', function(data) {
	});

	// when the client emits adduser this listen and executes
	socket.on('adduser', function(username) {
	});

	// when the user disconnects
	socket.on('disconnect', function() {

	});
});

server.listen(3000);
