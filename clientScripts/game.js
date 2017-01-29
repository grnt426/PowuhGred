// globals representing the current game state
var gamejs = {};

gamejs.DEBUG = true;

gamejs.uid = ""; // will be the user id of player on this client

gamejs.currentAction = "startGame";
gamejs.currentPlayer = false;  // will be a uid for the player whose turn it is

gamejs.players;
gamejs.playersPaid;
gamejs.playerOrder;

gamejs.replenishRate;
gamejs.excessResources;

gamejs.gameOver = false;
gamejs.winner;