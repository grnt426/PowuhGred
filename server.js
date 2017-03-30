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
    db = require('sqlite'),
    sessionFileStore = require('session-file-store')(session);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

let sessionOptions = {
    cookie: {}, resave: false, saveUninitialized: false,
    secret: fs.readFileSync('../session.secret').toString(), autoSave: true,
    store: new sessionFileStore()
};
let sessionObject;

if(process.argv[2] === "debug") {
    console.info("Running as debug");
    sessionOptions.cookie.secure = false;
    httpServer = require('http');
    sessionObject = session(sessionOptions);
    app.use(sessionObject);
    server = httpServer.createServer(app);
}
else {
    console.info("Running as production");

    // Secure cookies can only be used with HTTPS
    sessionOptions.cookie.secure = true;

    // Don't allow non-HTTPS connections
    let unsecureHttpServer = require('http');
    unsecureHttpServer.createServer(function(req, res) {
        res.writeHead(301, {"Location": "https://" + req.headers['host'] + req.url});
        res.end();
    }).listen(8080);

    httpServer = require('https');
    let credentials = {
        key: fs.readFileSync('/etc/letsencrypt/live/granitegames.io/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/granitegames.io/fullchain.pem')
    };
    sessionObject = session(sessionOptions);
    app.use(sessionObject);
    server = httpServer.createServer(credentials, app);
}

app.set('view engine', 'pug');

var io = require('socket.io').listen(server),
    communicationsjs = require('./communications.js'),
    citiesjs = require('./cities.js'),
    powerplantjs = require('./powerplantreader.js'),
    enginejs = require('./engine.js'),
    util = require('./util.js');

// This exposes the session object to Pug (Jade) to all Pug templates
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});

// routing
app.get("/", function(req, res) {
    console.info("Request for home");
    console.info(req.session);
    Promise
        .resolve(db.all('SELECT * FROM Games'))
        .then(function(dbResult) {
            console.info(JSON.stringify(dbResult));
            if(dbResult) {
                res.render('home', {games: dbResult});
            }
            else {
                res.render('home');
            }
        })
        .catch(function(error) {
            console.error(error);
        });
});
app.get("/game/:gameId", function(req, res) {
    console.info("Request for game");
    console.info(req.session);

    let gameId = req.params.gameId;
    console.info("Game requested: " + gameId);

    // TODO: should instead just present a login page rather than this weird redirect
    if(!req.session || !req.session.authenticated) {
        console.info("no session data, going back home");
        let type = process.argv[2] === "debug" ? "http" : "https";
        res.writeHead(303, {"Location": type + "://" + req.headers['host']});
        res.end();
    }
    else {
        req.session.joining = gameId;
        res.sendFile(__dirname + '/gameclient.html');
    }
});
app.post("/creategame", function(req, res) {
    let hostUser = req.session.username;
    let maxPlayers = req.body.maxplayers;
    let started = 0;
    Promise

    // TODO: Should make sure the game name hasn't already been generated before.
        .resolve(db.run('INSERT INTO Games (hostUser, maxPlayers, started) VALUES (?, ?, ?)',
            hostUser, maxPlayers, started))
        .then(function(dbResult){
            console.info("Result: " + JSON.stringify(dbResult));
            let id = dbResult.stmt.lastID;
            console.info("Id: " + id);
            req.session.joining = id;
            const comms = new communicationsjs.Communications(io);
            const engine = new enginejs.Engine(comms, citiesDef, powerPlants.powerPlants);
            comms.setEngine(engine);
            engine.engineId = id;
            activeGames[id] = engine;
            res.redirect('/game/' + id);
        });
});
app.post("/login", function(req, res) {
    let username = req.body.username;
    let password = req.body.password;
    console.info(username + " " + password);
    Promise
        .resolve(db.get('SELECT password FROM Users WHERE username = ?', username))
        .then(function(dbResult) {
            console.info("DB Result: " + JSON.stringify(dbResult));
            if(dbResult) {
                let retrievedPassword = dbResult.password;
                return bcrypt.compare(password, retrievedPassword);
            }
            else {
                return Promise.reject("Invalid username and password.");
            }
        })
        .then(function(matches) {
            if(matches) {
                req.session.authenticated = true;
                req.session.username = username;
                console.info("Session: " + JSON.stringify(req.session));
                res.redirect('/');
            }
            else {
                res.send("INVALID_USER");
            }
        })
        .catch(function(err) {
            console.error(err);
            if(err === "INVALID_USER") {
                res.send("Invalid username and password combination");
            }
            else {
                res.send("Error logging you in. Try again.");
            }
        });
});
app.get("/logout", function(req, res) {
    req.session.authenticated = false;
    delete req.session.username;
    res.render('home');
});
app.post("/registeruser", function(req, res) {
    console.info(req.body.username + " " + req.body.password + " " + req.body.email);
    let username = req.body.username;
    let email = req.body.email;
    bcrypt.hash(req.body.password, 10)
        .then(function(hash) {
            console.info("Hash " + hash);
            return db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?)', username, email, hash);
        })
        .then(function() {
            res.send("Registered!");
        })
        .catch(function(err) {
            console.error(err);
            res.send("Error in registration!");
        });
});
app.get("/register", function(req, res) {
    res.render('register');
});
app.get("/clientScripts/init.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/init.js');
});
app.get("/clientScripts/auction.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/auction.js');
});
app.get("/clientScripts/buttons.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/buttons.js');
});
app.get("/clientScripts/chat.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/chat.js');
});
app.get("/clientScripts/fuel.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/fuel.js');
});
app.get("/clientScripts/clickHandler.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/clickHandler.js');
});
app.get("/clientScripts/redraw.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/redraw.js');
});
app.get("/clientScripts/sockethandlers.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/sockethandlers.js');
});
app.get("/clientScripts/scorepanel.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/scorepanel.js');
});
app.get("/clientScripts/cardpositions.js", function(req, res) {
    res.sendFile(__dirname + '/clientScripts/cardpositions.js');
});
app.use('/data', express.static(__dirname + '/data'));

let citiesDef = new citiesjs.Cities();
citiesDef.parseCityList("data/germany_cities.txt");
citiesDef.parseCities("data/germany_connections.txt");
let powerPlants = new powerplantjs.PowerPlantReader();
powerPlants.parsePowerPlants("data/power_plants.txt");

var activeGames = [];

// This exposes the session object from Express into Socket.IO
io.use(function(socket, next) {
    sessionObject(socket.handshake, {}, next);
});

// connect to a player, listen
// TODO: There seems to be an issue with a player joining, but the tab not gaining focus in FF, and the player not initializing the game correctly.
io.sockets.on('connection', function(socket) {

    let gameId = socket.handshake.session.joining;
    let username = socket.handshake.session.username;
    console.info("Game attempting join: " + gameId);
    let curGame = activeGames[gameId];

    if(curGame && curGame.gameStarted) {
        console.info("A player tried to join after the game started!?");
        return;
    }

    // No longer trying to join. Free up so the player can join another.
    delete socket.handshake.session.joining;

    // For simplicity, bind the Engine object to the Socket
    socket.engine = curGame;
    let comms = curGame.comms;

    let uid = 'player' + util.olen(curGame.players);
    socket.uid = uid;
    socket.emit(comms.SOCKET_USERID, uid);
    curGame.addPlayer(uid, username, socket);
    socket.emit(comms.SOCKET_DEFINECITIES, citiesDef.cities);
    comms.toAll(username + " has joined the game.");
    console.info(username + " [" + socket.uid + "] has joined the game");
    curGame.broadcastGameState();

    // When the client emits sendchat, this listens and executes
    // sendchat -> String
    socket.on(comms.SOCKET_SENDCHAT, function(data) {
        if(data[0] === '/') {
            resolveCommand(socket, data);
        }
        else if(data.trim().length !== 0) {
            console.info("Chat message: " + data);
            comms.toAllFrom(curGame.reverseLookUp[socket.uid], data);
        }
    });

    // When the player does any action
    // gameaction -> JsonObject
    socket.on(comms.SOCKET_GAMEACTION, function(data) {
        data.uid = socket.uid;
        curGame.resolveAction(data);
    });

    // when the user disconnects
    socket.on(comms.SOCKET_DISCONNECT, function() {
        // TODO handle players leaving.
        comms.toAll(curGame.reverseLookUp[socket.uid].displayName + " has left the game.");
    });
});

// handles user chat commands
function resolveCommand(socket, data) {
    console.info(data);
    let command = data.substring(0, data.indexOf(' '));
    if(command === "/name") {
        let name = data.substring(data.indexOf(' ') + 1);
        console.info("Name received: " + name);
        let player = socket.engine.reverseLookUp[socket.uid];
        player.displayName = name;
        socket.engine.broadcastGameState();
    }
}

// All setup is finished, start listening for connections.
Promise.resolve()
    .then(() => db.open('../database.sqlite', {Promise}))

    // TODO: the below should not be done on production (???) but is fine for now
    // TODO comment out the below after first-run if you want data to persist with each run in dev.
    .then(() => db.migrate({force: (process.argv[2] === "debug" ? 'last' : false)c}))
    .then(() => server.listen(process.env.PORT || 3000))
    .catch((err) => console.error("WHAT " + err.stack));
