var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js'),
    buildingjs = require('../../phases/building.js');

var building,
    player,
    PLAYER_ID = "1",
    data = ["halle", "dortmund", "essen"];

beforeEach(function () {
    var engine = sinon.spy(),
        comms = sinon.spy(),
        cities = sinon.spy();
    player = sinon.spy();
    player.uid = PLAYER_ID;
    player.buildOnCity = sinon.spy();
    player.cities = [];

    engine.nextPlayer = sinon.spy();
    engine.getCurrentPlayer = sinon.stub().returns(player);
    engine.checkCityCounts = sinon.spy();
    engine.broadcastGameState = sinon.spy();

    cities.purchaseCity = sinon.spy();
    cities.convertToCityObjects = sinon.spy();
    cities.getTotalCostToBuild = sinon.stub().returns(20);

    comms.toAll = sinon.spy();
    comms.toCurrent = sinon.spy();

    building = new buildingjs.Building(engine, comms, cities);
    building.computeCost = sinon.stub().returns(20);
});

describe('Phase/building', function() {
    describe('#buildCities()', function () {

        it('Player can pass on building cities.', function(){
            building.buildCities("pass");

            assert(building.engine.nextPlayer.calledOnce);
            assert(building.computeCost.notCalled, "Should not have tried to do anything other than go to next player.");
        });

        it('Player can\'t build with an invalid selection.', function(){
            building.isValid = sinon.stub().returns(false);
            building.engine.getCurrentPlayer = sinon.spy();

            building.buildCities(data);

            assert(building.engine.nextPlayer.notCalled, "Can't advance to next player until valid selection made.");
            assert(building.isValid.calledOnce, "We should have validated the player's selection.");
            assert(building.comms.toCurrent.calledOnce, "Expected an error message to be sent to the player.");

            assert(building.engine.getCurrentPlayer.notCalled, "Execution should not have reached this point.");
        });

        it('Player can\'t build if the cost is greater than money owned', function(){
            building.isValid = sinon.stub().returns(true);
            player.money = 0;
            building.cities.findOptimalPurchaseCostOrderOfCities = sinon.stub().returns(1);

            building.buildCities(data);

            assert(building.engine.nextPlayer.notCalled, "Should not have tried to advance to the next player," +
                "no valid selection was made.");
            assert(building.cities.findOptimalPurchaseCostOrderOfCities.calledOnce, "Should have tried to compute the cost.");
            assert(building.isValid.calledOnce, "We should have validated the player's selection.");
        });

        // TODO: The below test always fails because it executes before the Promise completes.
        it('Player makes a valid selection of three cities.', function(){
            building.isValid = sinon.stub().returns(true);
            player.money = 50;
            building.cities.findOptimalPurchaseCostOrderOfCities = sinon.stub().returns(1);

            building.buildCities(data);

            assert(building.isValid.calledOnce, "We should have validated the player's selection.");
            assert(building.comms.toCurrent.notCalled, "We shouldn't have had any reason to only message the current player.");
            assert(building.comms.toAll.calledOnce);
            assert(building.cities.purchaseCity.getCalls(), 3);
            assert(building.engine.checkCityCounts.calledOnce);
            assert(player.buildOnCity.calledThrice);
            assert(player.money, 30);
            assert(building.engine.nextPlayer.calledOnce);
            assert(!self.comms.calledWith("Something went wrong in processing your build request!"),
                "We should not have emitted an error to users,");
        });
    });
});