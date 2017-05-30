var assert = require('assert'),
    sinon = require('sinon'),
    enginejs = require('../engine.js'),
    util = require('../util.js');

var engine;
var comms = sinon.spy(),
    cities = sinon.spy(),
    plants = sinon.spy();

beforeEach(function () {
    comms.debug = sinon.spy();
    engine = new enginejs.Engine(comms, cities, plants);

    engine.market = sinon.spy();
});

describe('Engine', function () {
    describe('#startGame()', function () {

        // TODO: startGame should fail with one or fewer players in the lobby

        it('Can\'t start if game already started', function () {
            engine.gameStarted = true;

            engine.startGame();

            assert(engine.comms.debug.called, "Expected a debug message to be emitted.");
            assert.equal(engine.changes.length, 0, "Expected the changes log to be empty.")
        });

        it('Starts the game with two players', function () {
            engine.playerOrder = [1, 2];
            engine.market.setupStartingResources = sinon.spy();
            engine.randomizePlayerOrder = sinon.spy();
            engine.setupAuction = sinon.spy();
            engine.initRegions = sinon.spy();

            engine.startGame();

            assert.equal(engine.changes.length, 1);
            assert.equal(engine.changes[0], engine.START_GAME);
            assert(engine.gameStarted);

            assert(engine.market.setupStartingResources.calledOnce);
            assert(engine.randomizePlayerOrder.calledOnce);
            assert(engine.setupAuction.calledOnce);

            assert.equal(engine.currentPlayer, 1, "Expected Player1 to be first.");
            assert.equal(engine.currentAction, engine.START_AUCTION);
        });
    });

    describe('#addPlayer()', function () {

        it('Should add one player', function () {
            engine.addPlayer(1, "name1", mockSocket(1));

            assert.equal(util.olen(engine.players), 1);
            assert.notEqual(engine.players[1], undefined);
            assert.notEqual(engine.reverseLookUp[1], undefined);
            assert.equal(engine.players[1].money, engine.STARTING_MONEY);
        });

        it('Should add three players', function () {
            engine.addPlayer(1, "name1", mockSocket(1));
            engine.addPlayer(2, "name1", mockSocket(2));
            engine.addPlayer(3, "name1", mockSocket(3));

            assert.equal(3, util.olen(engine.players));
            for (i = 1; i < 4; i++) {
                assert.notEqual(null, engine.players[i]);
                assert.notEqual(null, engine.reverseLookUp[i]);
                assert.equal(engine.players[i].money, engine.STARTING_MONEY);
            }
        });

        // TODO Don't allow more than max players to be added?
    });

    describe('#resolveTurnOrder()', function () {
        it('Should sort two players. P1 has 1 city, P2 has 0 cities. P1 is first and P2 second', function () {
            mockPlayer("1", 1);
            mockPlayer("2", 0);

            engine.resolveTurnOrder();

            assert.notEqual(undefined, engine.playerOrder, "playerOrder should not be undefined.");
            assert.equal(engine.playerOrder.length, 2, "Should be two players in this array.");
            assert.equal(engine.playerOrder[0], "1");
            assert.equal(engine.playerOrder[1], "2");
        });

        it('Should sort two players. P1 has 1 city and 5 cost plant, P2 has 1 city and 4 cost plant. P1 is first and P2 second', function () {
            var player1 = mockPlayer("1", 1);
            stubGetHighestCostPowerPlant(player1, 5);
            var player2 = mockPlayer("2", 1);
            stubGetHighestCostPowerPlant(player2, 4);

            engine.resolveTurnOrder();

            assert.notEqual(engine.playerOrder, undefined, "playerOrder should not be undefined.");
            assert.equal(engine.playerOrder.length, 2, "Should be two players in this array.");
            assert.equal(engine.playerOrder[0], "1");
            assert.equal(engine.playerOrder[1], "2");
        });
    });
});

function mockPlayer(id, cities) {
    var player = sinon.spy();
    player.uid = id;
    player.cities = [];
    for(i = 0; i < cities; i++){
        player.cities.push("City" + i);
    }
    engine.players[id] = player;
    return player;
}

function stubGetHighestCostPowerPlant(player, val) {
    player.getHighestCostPowerPlant = sinon.stub.returns(val);
}

function mockSocket(id) {
    var socket = sinon.spy();
    socket.uid = id;
    return socket;
}