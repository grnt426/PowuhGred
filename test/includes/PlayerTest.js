var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js'),
    res = require("../../State/Resources.js"),
    playerjs = require('../../includes/Player.js');

var UID = "uid";
var player;

beforeEach(function () {
    var comms = sinon.spy(),
        socket = sinon.spy();
    player = new playerjs.Player(UID, comms, socket);
});

describe('Player', function() {
    describe('#getHighestCostPowerPlant()', function () {

        it('With no power plants, should return 0', function () {
            assert.equal(player.getHighestCostPowerPlant(), 0);
        });

        it('With one power plant of cost 4, should return 4', function () {
            player.plants[4] = sinon.spy();
            assert.equal(player.getHighestCostPowerPlant(), 4);
        });

        it('With three power plants, should return 5', function () {
            player.plants[3] = sinon.spy();
            player.plants[4] = sinon.spy();
            player.plants[5] = sinon.spy();
            assert.equal(player.getHighestCostPowerPlant(), 5);
        });
    });
});

function generateResources(coal, oil, garbage, uranium){
    return {
        'coal':coal,
        'oil':oil,
        'garbage':garbage,
        'uranium':uranium
    };
}