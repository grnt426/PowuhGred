var DEBUG = true;

//initiates Color Vars
var WHITE =     "#FFFFFF";
var BLACK =     "#000000";
var GRAY =      "#444444";
var BROWN =     "#452E17";
var BLUE =      "#0000FF";
var LTBLUE =    "#00B8E6";
var GREEN =     "#009900";
var LTGREEN =   "#00CC00";
var YELLOW =    "#FFFF19";
var PINK =      "#FF6699";
var ORANGE =    "#DD6622";
var RED =		"#E62E2E";

var citiesDef = {};
var selectedCity;

var selectedBid = 0;
var selectedPlant = -1;

var selectedResources = [];
selectedResources['coal'] = 0;
selectedResources['oil'] = 0;
selectedResources['garbage'] = 0;
selectedResources['uranium'] = 0;

var currentPlayer = false;

var playerData = {
    self:{
        ownedPlants:[]
    },
    others:{}
};

var updatePlayerPlants = function(data){

};

var updateDisplayName = function(data){
    log("* " + data.oldDisplayName + " changed their name to " + data.displayName + " *", CHAT_O);
};

// Currently only outputs log
var updatePlayerOrder = function(data){
    log("Player Order: " + data, CONSOLE_O);
};

// Currently only outputs log
var updateCurrentPlayer = function(data){
    log("Current Player: " + data.uid, CONSOLE_O);
    currentPlayer = data.uid;
};

var updateCurrentAction = function(data){
    log("Current Action: " + data, CONSOLE_O);
    currentActionState = data;
};

// Currently only Outputs a Log
var updateMoney = function(data){
    log(data.uid + " now has " + data.money + " money", CONSOLE_O);
};

// Currently only Outputs a Log
var updateNewPlayer = function(data){
    log(data.uid + " has joined the game", CONSOLE_O);
};

// Currently only Outputs a Log
var updatePlayerName = function(data){
    log(data.uid + " has changed their name to " + data.displayName, CONSOLE_O);
};


