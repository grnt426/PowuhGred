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

    describe('#addResources()', function(){

        it('With no resources, adds 1 of each type.', function(){
            var resources = generateResources(1, 1, 1, 1);
            player.addResources(resources);
            assert.notDeepEqual(player.resources, {});
            assert.equal(player.resources[res.COAL], 1);
            assert.equal(player.resources[res.OIL], 1);
            assert.equal(player.resources[res.GARBAGE], 1);
            assert.equal(player.resources[res.URANIUM], 1);
        });

        it('With a mix of resources, adds 2 oil and 2 coal.', function(){
            player.resources = generateResources(3, 2, 4, 1);
            player.addResources(generateResources(2, 2, 0, 0));
            assert.notDeepEqual(player.resources, {});
            assert.equal(player.resources[res.COAL], 5);
            assert.equal(player.resources[res.OIL], 4);
            assert.equal(player.resources[res.GARBAGE], 4);
            assert.equal(player.resources[res.URANIUM], 1);
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