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

    engine.nextPlayer = sinon.spy();
    engine.getCurrentPlayer = sinon.stub().returns(player);

    cities.purchaseCity = sinon.spy();

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

            building.buildCities(data);

            assert(building.engine.nextPlayer.notCalled, "Can't advance to next player until valid selection made.");
            assert(building.computeCost.calledOnce);
            assert(building.isValid.calledOnce);
        });

        it('Player can\'t build if the cost is greater than money held', function(){
            building.isValid = sinon.stub().returns(true);
            player.money = 0;

            building.buildCities(data);

            assert(building.engine.nextPlayer.notCalled, "Can't advance to next player until valid selection made.");
            assert(building.computeCost.calledOnce);
            assert(building.isValid.calledOnce);
        });

        it('Player makes a valid selection of three cities.', function(){
            building.isValid = sinon.stub().returns(true);
            player.money = 50;

            building.buildCities(data);

            assert(building.engine.nextPlayer.calledOnce);
            assert(building.computeCost.calledOnce);
            assert(building.isValid.calledOnce);
            assert(building.cities.purchaseCity.calledThrice);
            assert(player.buildOnCity.calledThrice);
            assert(player.money, 30);
        });
    });
});