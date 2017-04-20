// Main entry point for the server. Init systems, sync client js and data, listen for connections

const USERNAME_RESTRICTIONS = {min:3, max:50};
const PASSWORD_RESTRICTIONS = {min:8, max:50};

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
    sessionFileStore = require('session-file-store')(session),
    validator = require('validator'),
    ExpressBrute = require('express-brute'),
    BruteMemcachedStore = require('express-brute-memcached'),
    SessionMemcachedStore = require('connect-memcached')(session);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

let sessionOptions = {
    cookie: {}, resave: false, saveUninitialized: false,
    secret: fs.readFileSync('../session.secret').toString(), autoSave: true
};
let sessionObject;
let bruteStore = {};

// When running in a dev environment, it is just easier to only use HTTP rather than HTTPS
if(process.argv[2] === "debug") {
    console.info("Running as debug");
    sessionOptions.cookie.secure = false;
    sessionOptions.store = new sessionFileStore();
    httpServer = require('http');
    sessionObject = session(sessionOptions);
    app.use(sessionObject);
    server = httpServer.createServer(app);
    bruteStore = new ExpressBrute.MemoryStore();
}
else {
    console.info("Running as production");

    // Secure cookies can only be used with HTTPS
    sessionOptions.cookie.secure = true;

    sessionOptions.store = new SessionMemcachedStore({hosts:'127.0.0.1:11211'});

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
    bruteStore = new BruteMemcachedStore('127.0.0.1:11211');
}

var bruteforce = new ExpressBrute(bruteStore);

app.set('view engine', 'pug');

var io = require('socket.io').listen(server),
    communicationsjs = require('./communications.js'),
    citiesjs = require('./cities.js'),
    powerplantjs = require('./powerplantreader.js'),
    enginejs = require('./engine.js'),
    util = require('./util.js'),
    socketInterceptor = require('./ai/socketinterceptor.js'),
    dummyPlayer = require('./ai/dummyplayer');

var failCallback = function (req, res, next, nextValidRequestDate) {
    res.redirect('/'); // brute force protection triggered, send them back to the login page
};

var handleStoreError = function (error) {
    console.error(error); // log this error so we can figure out what went wrong
};

// Start slowing requests after 5 failed attempts to do something for the same user
var userBruteforce = new ExpressBrute(bruteStore,
    {
        freeRetries: 10,
        minWait: 5*60*1000, // 5 minutes
        maxWait: 60*60*1000, // 1 hour,
        failCallback: failCallback,
        handleStoreError: handleStoreError
    }
);

// No more than 1000 requests per hour
var globalBruteforce = new ExpressBrute(bruteStore, {
    freeRetries: 1000,
    attachResetToRequest: false,
    refreshTimeoutOnRequest: false,
    minWait: 60*60*1000, // 1 hour
    maxWait: 25*60*60*1000, // 1 day 1 hour
    lifetime: 24*60*60, // 1 day (seconds not milliseconds)
    failCallback: failCallback,
    handleStoreError: handleStoreError
});

// This exposes the session object to Pug (Jade) to all Pug templates
app.use(function(req, res, next) {

    console.info("Before: " + JSON.stringify(req.session));

    // If joining is set, the WebSocket connection likely altered the Session (and so deleted the value). We need to
    // reload from the SessionStore to get the latest data.
    if(req.session && req.session.joining){

        console.info("Reloading session...");

        // After loading, go ahead and proceed
        req.session.reload(function(){
            console.info("After: " + JSON.stringify(req.session));
            res.locals.session = req.session;
            next();
        });
    }
    else{
        res.locals.session = req.session;
        next();
    }
});

// routing
app.get("/", globalBruteforce.prevent, function(req, res) {
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
app.get("/game/:gameId", globalBruteforce.prevent, function(req, res) {
    console.info("Request for game");
    console.info(req.session);

    let gameId = req.params.gameId;
    if(!validator.isInt(gameId, {min:1, allow_leading_zeroes: false})){
        req.session.error = "Game id is not valid.";
        res.redirect("/");
    }
    else {
        console.info("Game requested: " + gameId);

        // TODO: should instead just present a login page rather than this weird redirect
        if(!req.session || !req.session.authenticated) {
            console.info("no session data, going back home");
            req.session.error = "You need to be logged in to play a game.";
            res.redirect("/");
        }
        else {
            req.session.joining = gameId;
            res.sendFile(__dirname + '/gameclient.html');
        }
    }
});
app.post("/creategame", globalBruteforce.prevent, function(req, res) {
    let hostUser = req.session.username;
    let started = 0;
    let maxPlayers = req.body.maxplayers;
    if(!req.session || !req.session.authenticated){
        req.session.error = "Need to be logged in.";
        res.redirect("/");
    }
    else if(!validator.isInt(maxPlayers, {min:1, max:6, allow_leading_zeroes:false})){
        req.session.error = "Valid number!";
        res.redirect("/");
    }
    else {

        Promise

        // TODO: Should make sure the game name hasn't already been generated before.
            .resolve(db.run('INSERT INTO Games (hostUser, maxPlayers, started) VALUES (?, ?, ?)',
                hostUser, maxPlayers, started))
            .then(function(dbResult) {
                console.info("Result: " + JSON.stringify(dbResult));
                let id = dbResult.stmt.lastID;
                console.info("Id: " + id);
                const comms = new communicationsjs.Communications(io);
                const engine = new enginejs.Engine(comms, citiesDef, powerPlants.powerPlants);
                comms.setEngine(engine);
                engine.engineId = id;
                activeGames[id] = engine;
                if(activeGames.keys().length > 25){

                    // Putting a limiter on the number of total games that can be made to protect the server
                    // Really hacky for now, but should prevent Internet trolls scanning for vulnerable sites
                    // from doing too much damage.
                    process.exit();
                }
                res.redirect('/game/' + id);
            });
    }
});

app.post("/login",
    globalBruteforce.prevent,
    userBruteforce.getMiddleware({
        key: function(req, res, next) {
            // prevent too many attempts for the same username
            next(req.body.username);
        }
    }),
    function(req, res) {
        let username = req.body.username;
        let password = req.body.password;
        if(!validator.isLength(username, USERNAME_RESTRICTIONS) || !validator.isLength(password, PASSWORD_RESTRICTIONS)){
            req.session.error = "Invalid username and password.";
            res.redirect('/');
        }
        else {
            console.info("Attempted login by: " + username);
            Promise
                .resolve(db.get('SELECT password FROM Users WHERE username = ?', username))
                .then(function(dbResult) {
                    if(dbResult) {
                        let retrievedPassword = dbResult.password;
                        return bcrypt.compare(password, retrievedPassword);
                    }
                    else {
                        return Promise.reject("INVALID_USER");
                    }
                })
                .then(function(matches) {
                    if(matches) {
                        req.session.authenticated = true;
                        req.session.username = username;
                        console.info("Session: " + JSON.stringify(req.session));
                        req.brute.reset(function(){
                            res.redirect('/');
                        })
                    }
                    else {
                        return Promise.reject("INVALID_USER");
                    }
                })
                .catch(function(err) {
                    console.error(err);
                    if(err === "INVALID_USER") {
                        req.session.error = "Invalid username and password combination";
                        res.redirect("/");
                    }
                    else {
                        req.session.error = "There was an error in logging in. Please try again.";
                        res.redirect("/");
                    }
                });
        }
});
app.get("/logout", function(req, res) {
    req.session.authenticated = false;
    delete req.session.username;
    res.redirect('/');
});
app.post("/registeruser", globalBruteforce.prevent, function(req, res) {
    console.info(req.body.username + " " + req.body.password + " " + req.body.email);
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    // Emails are optional (and even if I did take them, nothing is done with them anyway).
    if(!validator.isLength(username, USERNAME_RESTRICTIONS) || (!validator.isEmpty(email) && !validator.isEmail(email))
            || !validator.isLength(password, PASSWORD_RESTRICTIONS)){
        req.session.error = "Please enter valid information.";
        res.redirect("/register");
    }
    else {
        bcrypt.hash(password, 10)
            .then(function(hash) {
                return db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?)',
                    username, email, hash);
            })
            .then(function() {
                req.session.authenticated = true;
                req.session.username = username;
                res.redirect('/');
            })
            .catch(function(err) {
                console.error("Registration Error: " + err);
                res.session.error = "Error in registration. Try again.";
                res.redirect("/register");
            });
    }
});
app.get("/register", function(req, res) {
    res.render('register', {});
});
app.use('/clientScripts', globalBruteforce.prevent, express.static(__dirname + '/clientScripts'));
app.use('/data', globalBruteforce.prevent, express.static(__dirname + '/data'));

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

    let session = socket.handshake.session;
    let gameId = session.joining;
    let username = session.username;
    console.info("Game attempting join: " + gameId);
    let curGame = activeGames[gameId];

    if(curGame && curGame.gameStarted) {
        console.info("A player tried to join after the game started!?");
        return;
    }

    // No longer trying to join. Free up so the player can join another.
    delete session.joining;
    console.info(JSON.stringify(session));
    session.save(function(err){if(err){console.info("error saving session: : " + err);}});

    processNewPlayer(socket, curGame, username);
});

function processNewPlayer(socket, curGame, username){
    // For simplicity, bind the Engine object to the Socket
    socket.engine = curGame;
    let comms = curGame.comms;

    let uid = 'player' + util.olen(curGame.players);
    socket.uid = uid;
    socket.emit(comms.SOCKET_USERID, uid);
    let player = curGame.addPlayer(uid, username, socket);
    socket.emit(comms.SOCKET_DEFINECITIES, citiesDef.cities);
    comms.toAll(username + " has joined the game.");
    console.info(username + " [" + socket.uid + "] has joined the game");
    curGame.broadcastGameState();

    // When the client emits sendchat, this listens and executes
    // sendchat -> String
    socket.on(comms.SOCKET_SENDCHAT, function(data) {
        if(data[0] === '/') {
            resolveCommand(socket, comms, curGame, data);
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

    return player;
}

// handles user chat commands
function resolveCommand(socket, comms, curGame, data) {
    console.info(data);
    let command = data.substring(0, data.indexOf(' '));
    let args = data.substring(data.indexOf(' ') + 1);
    if(command === "/name") {
        let name = args;
        console.info("Name received: " + name);
        let player = socket.engine.reverseLookUp[socket.uid];
        player.displayName = name;
        socket.engine.broadcastGameState();
    }
    else if(command === "/addai"){
        addNewAi(comms, curGame, args);
    }
}

function addNewAi(comms, curGame, aiLevel){
    if(aiLevel === "dummy"){
        let socket = new socketInterceptor.SocketInterceptor(comms, comms.engine);
        let dummy = new dummyPlayer.DummyPlayer(socket);
        dummy.setup();
        socket.client = dummy;
        let name = "EZ-27";
        dummy.setOwnPlayer(processNewPlayer(socket, curGame, name));
    }
    else{
        comms.toAll("AI level not supported: " + aiLevel);
    }
}

/**
 * Given the current state of the game, which causes constant downtime/crashes, the previous games are still
 * stored in the DB and referenced when the server restarts. Since there is also no game restore feature, or any
 * automatic game pruning, it is easier to just purge all games.
 */
function removeDeadGames(){
    db.run('DELETE FROM Games');
}

// All setup is finished, start listening for connections.
Promise.resolve()
    .then(() => db.open('../database.sqlite', {Promise}))
    .then(() => removeDeadGames())
    // TODO comment out the below after first-run if you want data to persist with each run in dev.
    .then(() => db.migrate({force: (process.argv[2] === "debug" ? 'last' : false)}))
    .then(() => server.listen(process.env.PORT || 3000))
    .catch((err) => console.error("WHAT " + err.stack));
