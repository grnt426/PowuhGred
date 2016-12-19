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

describe('#startGame()', function () {

    // TODO: startGame should fail with one or fewer players in the lobby

    it('Can\'t start if game already started', function () {
        engine.gameStarted = true;

        engine.startGame();

        assert(engine.comms.debug.called, "Expected a debug message to be emitted.");
        assert.equal(0, engine.changes.length, "Expected the changes log to be empty.")
    });

    it('Starts the game with two players', function () {
        engine.playerOrder = [1, 2];
        engine.market.setupStartingResources = sinon.spy();
        engine.randomizePlayerOrder = sinon.spy();
        engine.setupMarket = sinon.spy();

        engine.startGame();

        assert.equal(1, engine.changes.length);
        assert.equal(engine.START_GAME, engine.changes[0]);
        assert(engine.gameStarted);

        assert(engine.market.setupStartingResources.calledOnce);
        assert(engine.randomizePlayerOrder.calledOnce);
        assert(engine.setupMarket.calledOnce);

        assert.equal(1, engine.currentPlayer, "Expected Player1 to be first.");
        assert.equal(engine.START_AUCTION, engine.currentAction);
    });
});

describe('#addPlayer()', function () {

    it('Should add one player', function () {
        engine.addPlayer(1, mockSocket(1));

        assert.equal(1, util.olen(engine.players));
        assert.notEqual(null, engine.players[1]);
        assert.notEqual(null, engine.reverseLookUp[1]);
        assert.equal(engine.STARTING_MONEY, engine.players[1].money);
    });

    it('Should add three players', function () {
        engine.addPlayer(1, mockSocket(1));
        engine.addPlayer(2, mockSocket(2));
        engine.addPlayer(3, mockSocket(3));

        assert.equal(3, util.olen(engine.players));
        for (i = 1; i < 4; i++) {
            assert.notEqual(null, engine.players[i]);
            assert.notEqual(null, engine.reverseLookUp[i]);
            assert.equal(engine.STARTING_MONEY, engine.players[i].money);
        }
    });

    // TODO Don't allow more than max players to be added?
});

describe ('#resolveTurnOrder()', function() {
    it('Should sort two players. P1 has 1 city, P2 has 0 cities. P1 is first and P2 second', function(){
        mockPlayer("1", 1);
        mockPlayer("2", 0);

        engine.resolveTurnOrder();

        assert.notEqual(undefined, engine.playerOrder, "playerOrder should not be undefined.");
        assert.equal(2, engine.playerOrder.length, "Should be two players in this array.");
        assert.equal("1", engine.playerOrder[0]);
        assert.equal("2", engine.playerOrder[1]);
    });

    it('Should sort two players. P1 has 1 city and 5 cost plant, P2 has 1 city and 4 cost plant. P1 is first and P2 second', function(){
        var player1 = mockPlayer("1", 1);
        stubGetHighestCostPowerPlant(player1, 5);
        var player2 = mockPlayer("2", 1);
        stubGetHighestCostPowerPlant(player2, 4);

        engine.resolveTurnOrder();

        assert.notEqual(undefined, engine.playerOrder, "playerOrder should not be undefined.");
        assert.equal(2, engine.playerOrder.length, "Should be two players in this array.");
        assert.equal("1", engine.playerOrder[0]);
        assert.equal("2", engine.playerOrder[1]);
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
    socket.id = id;
    return socket;
}