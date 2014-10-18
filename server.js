
var express = require('express'),
	http = require('http'),
	app = express(),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	communicationsjs = require('./communications.js');
    citiesjs = require('./cities.js');

// routing
app.get("/", function(req, res) {
	res.sendfile(__dirname + '/index.html');
});

server.listen(3000);

var citiesDef = new citiesjs.Cities();
citiesDef.parseCityList();
citiesDef.parseCities("data/germany_connections.txt");

comms = new communicationsjs.Communications(io);

io.sockets.on('connection', function(socket) {

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
