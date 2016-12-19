var assert = require('assert');
var sinon = require('sinon');
var enginejs = require('../engine.js');

var engine;
var comms = sinon.spy(),
    cities = sinon.spy(),
    plants = sinon.spy();

beforeEach(function(){
    comms.debug = sinon.spy();
    engine = new enginejs.Engine(comms, cities, plants);

    engine.market = sinon.spy();
});

describe('#startGame()', function() {

    // TODO: startGame should fail with one or fewer players in the lobby

    it('Can\'t start if game already started', function() {
        engine.gameStarted = true;

        engine.startGame();

        assert(engine.comms.debug.called, "Expected a debug message to be emitted.");
        assert.equal(0, engine.changes.length, "Expected the changes log to be empty.")
    });

    it('Starts the game with two players', function() {
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
