var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js'),
    res = require('../../State/Resources.js'),
    marketjs = require('../../phases/market.js');

var market,
    marketData = constructRequestData(1, 1, 1, 1, 1),
    player;
var powerPlants = [];
powerPlants[1] = sinon.spy();
powerPlants[2] = sinon.spy();
powerPlants[3] = sinon.spy();

beforeEach(function () {
    var engine = sinon.spy(),
        comms = sinon.spy();
    player = sinon.spy();
    player.addResources = sinon.spy();
    player.plants = [];

    engine.nextPlayer = sinon.spy();
    engine.getCurrentPlayer = sinon.stub().returns(player);

    powerPlants[1].addResources = sinon.spy();
    powerPlants[2].addResources = sinon.spy();
    powerPlants[3].addResources = sinon.spy();

    comms.toAll = sinon.spy();
    comms.toCurrent = sinon.spy();

    market = new marketjs.Market(engine, comms, powerPlants);
    market.setupStartingResources();
});

describe('Phase/market', function() {
    describe('#buyResources()', function () {

        beforeEach(function () {
            market.computeTotalCost = sinon.stub().returns(5);
            powerPlants[1].canAddResources = sinon.spy();
        });

        it('Player can pass on buying resources.', function () {
            market.buyResources("pass");

            assert(market.engine.nextPlayer.calledOnce);
            assert(market.computeTotalCost.notCalled, "We should have advanced to the next player without doing " +
            "anything.");
        });

        it('Player can\'t purchase more in resources than money owned.', function () {
            player.money = 0;
            market.validateRequest = sinon.stub().returns(true);

            market.buyResources(marketData);

            assert(market.computeTotalCost.calledOnce, "We should have computed the cost.");
            assert(player.addResources.notCalled, "Should not have added resources to the player for an invalid purchase.");
            assert.equal(player.money, 0, "Player should still have 0 money.");
            assert(market.engine.nextPlayer.notCalled, "Should not have tried to advance to the next player.");
        });

        it('Player can\'t purchase more than available for purchase.', function () {
            player.money = 0;
            market.validateRequest = sinon.stub().returns(false);

            market.buyResources(marketData);

            assert(market.validateRequest.calledOnce, "Should have tried to validate the purchase.");
            assert(player.addResources.notCalled, "Should not have added resources to the player for an invalid purchase.");
            assert.equal(player.money, 0, "Player should still have 0 money.");
            assert(market.engine.nextPlayer.notCalled, "Should not have tried to advance to the next player.");
        });

        it('Valid purchase', function () {
            player.money = 10;
            market.validateRequest = sinon.stub().returns(true);

            market.buyResources(constructRequestData(1, 1, 1, 1, 1));

            assert(market.validateRequest.calledOnce, "Should have tried to validate the purchase.");
            assert(market.computeTotalCost.calledOnce, "We should have computed the cost.");
            assert.equal(player.money, 5, "Player should have money less the cost of resources.");
            assert(powerPlants[1].addResources.calledOnce);
            assert(market.engine.nextPlayer.calledOnce, "Should not have tried to advance to the next player.");
        });
    });

    describe('#validatePurchase()', function () {

        beforeEach(function () {
            player.plants[1] = powerPlants[1];
        });

        var failTests = [
            {args:constructRequestData(1, 30, 0, 0, 0), type:res.COAL},
            {args:constructRequestData(1, 0, 30, 0, 0), type:res.OIL},
            {args:constructRequestData(1, 0, 0, 30, 0), type:res.GARBAGE},
            {args:constructRequestData(1, 0, 0, 0, 30), type:res.URANIUM}
        ];

        failTests.forEach(function(test){
            it('Player tries to purchase more ' + test.type + ' than available', function () {
                assert(!market.validatePurchase(test.args), "Can't buy more " + test.type + " than available");
            });
        });

        var passTests = [
            {args:constructRequestData(1, 1, 0, 0, 0), type:res.COAL},
            {args:constructRequestData(1, 0, 1, 0, 0), type:res.OIL},
            {args:constructRequestData(1, 0, 0, 1, 0), type:res.GARBAGE},
            {args:constructRequestData(1, 0, 0, 0, 1), type:res.URANIUM}
        ];

        passTests.forEach(function(test){
            it('Player can purchase ' + test.type, function () {
                assert(market.validatePurchase(test.args), "Should be able to purchase " + test.type);
            });
        });

        it('Player can\'t purchase a resource that doesn\'t exist', function () {
            assert(!market.validatePurchase({1:{'fake':1}}), "Shouldn't be able to purchase a non-existent resource type");
        });
    });

    describe('#computeCost()', function () {

        var tests = [

            // Test cost for start of game
            {amt:1, type:res.COAL, available:constructResourcesData(24, 0, 0, 0), expected:1},
            {amt:1, type:res.OIL, available:constructResourcesData(0, 18, 0, 0), expected:3},
            {amt:1, type:res.GARBAGE, available:constructResourcesData(0, 0, 6, 0), expected:7},
            {amt:1, type:res.URANIUM, available:constructResourcesData(0, 0, 0, 2), expected:14},

            // Test costs at boundaries
            {amt:1, type:res.COAL, available:constructResourcesData(22, 0, 0, 0), expected:1},
            {amt:1, type:res.OIL, available:constructResourcesData(0, 16, 0, 0), expected:3},
            {amt:1, type:res.GARBAGE, available:constructResourcesData(0, 0, 4, 0), expected:7},

            // Test purchasing multiple within a cost group
            {amt:3, type:res.COAL, available:constructResourcesData(24, 0, 0, 0), expected:3},
            {amt:3, type:res.OIL, available:constructResourcesData(0, 18, 0, 0), expected:9},
            {amt:3, type:res.GARBAGE, available:constructResourcesData(0, 0, 6, 0), expected:21},

            // Test purchasing multiple across cost groups
            {amt:4, type:res.COAL, available:constructResourcesData(24, 0, 0, 0), expected:5},
            {amt:4, type:res.OIL, available:constructResourcesData(0, 18, 0, 0), expected:13},
            {amt:4, type:res.GARBAGE, available:constructResourcesData(0, 0, 6, 0), expected:29},
            {amt:3, type:res.URANIUM, available:constructResourcesData(0, 0, 0, 12), expected:6},

            // Test the uranium special case boundary, where we go from 1 each to 2 each
            {amt:3, type:res.URANIUM, available:constructResourcesData(0, 0, 0, 5), expected:30}
        ];

        tests.forEach(function(test){
            it('Test purchase of ' + test.amt + ' ' + test.type + ' with ' + JSON.stringify(test.available) + ' available.', function () {
                market.resources = test.available;
                assert.equal(market.computeCost(test.amt, test.type), test.expected);
            });
        });
    });
});

function constructResourcesData(coal, oil, garbage, uranium){
    return {coal:coal, oil:oil, garbage:garbage, uranium:uranium};
}

function constructRequestData(cost, coal, oil, garbage, uranium){
    var request = {};
    request[cost] = constructResourcesData(coal, oil, garbage, uranium);
    return request;
}