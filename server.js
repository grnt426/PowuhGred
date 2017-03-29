// Main entry point for the server. Init systems, sync client js and data, listen for connections

let httpServer,
    fs = require('fs'),
    express = require('express'),
    app = express(),
    server,
    session = require('express-session'),
    pug = require('pug'),
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt'),
    Promise = require('bluebird'),
    db = require('sqlite');

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

let sessionOptions = {cookie:{}, resave:false, saveUninitialized:false,
    secret: fs.readFileSync('../session.secret').toString()};

if (process.argv[2] === "debug") {
    console.info("Running as debug");
    sessionOptions.cookie.secure = false;
    httpServer = require('http');
    app.use(session(sessionOptions));
    server = httpServer.createServer(app);
}
else {
    console.info("Running as production");

    // Secure cookies can only be used with HTTPS
    sessionOptions.cookie.secure = true;

    // Don't allow non-HTTPS connections
    let unsecureHttpServer = require('http');
    unsecureHttpServer.createServer(function (req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(8080);

    httpServer = require('https');
    let credentials = {
        key: fs.readFileSync('/etc/letsencrypt/live/granitegames.io/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/granitegames.io/fullchain.pem')
    };
    app.use(session(sessionOptions));
    server = httpServer.createServer(credentials, app);
}

app.set('view engine', 'pug');

var io = require('socket.io').listen(server),
    communicationsjs = require('./communications.js'),
    comms = new communicationsjs.Communications(io),
    citiesjs = require('./cities.js'),
    powerplantjs = require('./powerplantreader.js'),
    enginejs = require('./engine.js'),
    util = require('./util.js');

// This exposes the session object to Pug (Jade) to all Pug templates
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

// routing
app.get("/", function (req, res) {
    console.info("Request for home");
    console.info(req.session);
    res.render('home');
});
app.get("/game", function (req, res) {
    console.info("Request for game");
    console.info(req.session);

    // TODO: should instead just present a login page rather than this weird redirect
    if(!req.session || !req.session.authenticated){
        console.info("no session data, going back home");
        let type = process.argv[2] === "debug" ? "http" : "https";
        res.writeHead(303, { "Location": type + "://" + req.headers['host']});
        res.end();
    }
    else{
        res.sendFile(__dirname + '/gameclient.html');
    }
});
app.post("/login", function(req, res){
    let username = req.body.username;
    let password = req.body.password;
    console.info(username + " " + password);
    Promise
        .resolve(db.get('SELECT password FROM Users WHERE username = ?', username))
        .then(function(dbResult){
            console.info("DB Result: " + JSON.stringify(dbResult));
            if(dbResult){
                let retrievedPassword = dbResult.password;
                return bcrypt.compare(password, retrievedPassword);
            }
            else{
                return Promise.reject("Invalid username and password.");
            }
        })
        .then(function(matches){
            if(matches){
                req.session.authenticated = true;
                req.session.username = username;
                console.info("Session: " + JSON.stringify(req.session));
                res.render('home');
            }
            else{
                res.send("INVALID_USER");
            }
        })
        .catch(function(err){
            console.error(err);
            if(err === "INVALID_USER"){
                res.send("Invalid username and password combination");
            }
            else{
                res.send("Error in logging you in. Try again.");
            }
        });
});
app.get("/logout", function(req, res){
    req.session.authenticated = false;
    res.render('home');
});
app.post("/registeruser", function(req, res) {
    console.info(req.body.username + " " + req.body.password + " " + req.body.email);
    let username = req.body.username;
    let email = req.body.email;
    bcrypt.hash(req.body.password, 10)
        .then(function(hash){
            console.info("Hash " + hash);
            return db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?)', username, email, hash);
        })
        .then(function(){
            res.send("Registered!");
        })
        .catch(function(err){
            console.error(err);
            res.send("Error in registration!");
        });
});
app.get("/register", function(req, res){
    res.render('register');
});
app.get("/clientScripts/init.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/init.js');
});
app.get("/clientScripts/auction.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/auction.js');
});
app.get("/clientScripts/buttons.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/buttons.js');
});
app.get("/clientScripts/chat.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/chat.js');
});
app.get("/clientScripts/fuel.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/fuel.js');
});
app.get("/clientScripts/clickHandler.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/clickHandler.js');
});
app.get("/clientScripts/redraw.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/redraw.js');
});
app.get("/clientScripts/sockethandlers.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/sockethandlers.js');
});
app.get("/clientScripts/scorepanel.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/scorepanel.js');
});
app.get("/clientScripts/cardpositions.js", function (req, res) {
    res.sendFile(__dirname + '/clientScripts/cardpositions.js');
});
app.use('/data', express.static(__dirname + '/data'));

let citiesDef = new citiesjs.Cities();
citiesDef.parseCityList("data/germany_cities.txt");
citiesDef.parseCities("data/germany_connections.txt");
let powerPlants = new powerplantjs.PowerPlantReader();
powerPlants.parsePowerPlants("data/power_plants.txt");

let engine = new enginejs.Engine(comms, citiesDef, powerPlants.powerPlants);
comms.engine = engine;

// connect to a player, listen
// TODO: There seems to be an issue with a player joining, but the tab not gaining focus in FF, and the player not initializing the game correctly.
io.sockets.on(comms.SOCKET_CONNECTION, function (socket) {

    if (engine.gameStarted) {
        console.info("A player tried to join after the game started!?");
        return;
    }

    // a user connected, send the map down
    engine.broadcastGameState();
    let uid = 'player' + util.olen(engine.players);
    socket.uid = uid;
    socket.emit(comms.SOCKET_USERID, uid);
    engine.addPlayer(uid, socket);
    socket.emit(comms.SOCKET_DEFINECITIES, citiesDef.cities);
    comms.toAll(uid + " has joined the game.");
    console.info(uid + " [" + socket.uid + "] has joined the game");

    // When the client emits sendchat, this listens and executes
    // sendchat -> String
    socket.on(comms.SOCKET_SENDCHAT, function (data) {
        if (data[0] === '/') {
            resolveCommand(socket, data);
        }
        else if (data.trim().length !== 0) {
            console.info("Chat message: " + data);
            comms.toAllFrom(engine.reverseLookUp[socket.uid], data);
        }
    });

    // When the player does any action
    // gameaction -> JsonObject
    socket.on(comms.SOCKET_GAMEACTION, function (data) {
        data.uid = socket.uid;
        engine.resolveAction(data);
    });

    // when the user disconnects
    socket.on(comms.SOCKET_DISCONNECT, function () {
        // TODO handle players leaving.
        comms.toAll(engine.reverseLookUp[socket.uid].displayName + " has left the game.");
    });
});

// handles user chat commands
function resolveCommand(socket, data) {
    console.info(data);
    let command = data.substring(0, data.indexOf(' '));
    if (command === "/name") {
        let name = data.substring(data.indexOf(' ') + 1);
        console.info("Name received: " + name);
        let player = engine.reverseLookUp[socket.uid];
        player.displayName = name;
        engine.broadcastGameState();
    }
}

// All setup is finished, start listening for connections.
Promise.resolve()
    .then(() => db.open('../database.sqlite', {Promise}))

    // TODO: the below should not be done on production (???) but is fine for now
    // TODO comment out the below after first-run if you want data to persist with each run in dev.
    .then(() => db.migrate({force: 'last'}))
    .then(() => server.listen(process.env.PORT || 3000))
    .catch((err) => console.error(err.stack));
