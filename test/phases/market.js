var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js'),
    res = require('../../State/Resources.js'),
    marketjs = require('../../phases/market.js');

var market,
    marketData = constructResourcesData(1, 2, 3, 4),
    player;

beforeEach(function () {
    var engine = sinon.spy(),
        comms = sinon.spy();
    player = sinon.spy();
    player.addResources = sinon.spy();

    engine.nextPlayer = sinon.spy();
    engine.getCurrentPlayer = sinon.stub().returns(player);

    market = new marketjs.Market(engine, comms);
    market.setupStartingResources();
});

describe('Phase/market', function() {
    describe('#buyResources()', function () {

        beforeEach(function () {
            market.computeTotalCost = sinon.stub().returns(5);
        });

        it('Player can pass on buying resources.', function () {
            market.buyResources("pass");

            assert(market.engine.nextPlayer.calledOnce);
            assert(market.computeTotalCost.notCalled, "We should have advanced to the next player without doing " +
            "anything.");
        });

        it('Player can\'t purchase more in resources than money owned.', function () {
            player.money = 0;
            market.validatePurchase = sinon.stub().returns(true);

            market.buyResources(marketData);

            assert(market.computeTotalCost.calledOnce, "We should have computed the cost.");
            assert(player.addResources.notCalled, "Should not have added resources to the player for an invalid purchase.");
            assert.equal(player.money, 0, "Player should still have 0 money.");
            assert(market.engine.nextPlayer.notCalled, "Should not have tried to advance to the next player.");
        });

        it('Player can\'t purchase more than available for purchase.', function () {
            player.money = 0;
            market.validatePurchase = sinon.stub().returns(false);

            market.buyResources(marketData);

            assert(market.validatePurchase.calledOnce, "Should have tried to validate the purchase.");
            assert(player.addResources.notCalled, "Should not have added resources to the player for an invalid purchase.");
            assert.equal(player.money, 0, "Player should still have 0 money.");
            assert(market.engine.nextPlayer.notCalled, "Should not have tried to advance to the next player.");
        });

        it('Valid purchase', function () {
            player.money = 10;
            market.validatePurchase = sinon.stub().returns(true);

            market.buyResources(marketData);

            assert(market.validatePurchase.calledOnce, "Should have tried to validate the purchase.");
            assert(market.computeTotalCost.calledOnce, "We should have computed the cost.");
            assert(player.addResources.calledOnce);
            assert.equal(player.money, 5, "Player should have money less the cost of resources.");
            assert(market.engine.nextPlayer.calledOnce, "Should not have tried to advance to the next player.");
        });
    });

    describe('#validatePurchase()', function () {

        var failTests = [
            {args:constructResourcesData(30, 0, 0, 0), type:res.COAL},
            {args:constructResourcesData(0, 30, 0, 0), type:res.OIL},
            {args:constructResourcesData(0, 0, 30, 0), type:res.GARBAGE},
            {args:constructResourcesData(0, 0, 0, 30), type:res.URANIUM}
        ];

        failTests.forEach(function(test){
            it('Player tries to purchase more ' + test.type + ' than available', function () {
                assert(!market.validatePurchase(test.args), "Can't buy more " + test.type + " than available");
            });
        });

        var passTests = [
            {args:constructResourcesData(1, 0, 0, 0), type:res.COAL},
            {args:constructResourcesData(0, 1, 0, 0), type:res.OIL},
            {args:constructResourcesData(0, 0, 1, 0), type:res.GARBAGE},
            {args:constructResourcesData(0, 0, 0, 1), type:res.URANIUM}
        ];

        passTests.forEach(function(test){
            it('Player can purchase ' + test.type, function () {
                assert(market.validatePurchase(test.args), "Should be able to purchase " + test.type);
            });
        });

        it('Player can\'t purchase a resource that doesn\'t exist', function () {
            assert(!market.validatePurchase({'fake':1}), "Shouldn't be able to purchase a non-existent resource type");
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