/**
 * A simple holder for a city on the map. Will ensure that players can't build more than three times, or twice for
 * one player.
 * @param name {string}
 * @constructor
 * @this {City}
 */
exports.City = function(name) {

    this.connections = {};

    // String
    this.name = name;
    this.x = 0;
    this.y = 0;

    // TODO: Cities belong to a region, of which not all are active during a game.
    this.region = "";

    // String, PlayerID
    this.players = [];

    this.costToBuild = function() {
        return 10 + (5 * this.players.length);
    };

    this.isThereFreeSpace = function(playerId, step) {
        return this.players.length < step;
    };

    this.isPlayerHere = function(playerId) {
        return this.players.indexOf(playerId) != -1;
    }

    this.buildForPlayer = function(player) {
        this.players.push(player);
    };
};
