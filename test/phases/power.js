var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js');
    powerjs = require('../../phases/power.js');

var power;
var player,
    PLAYER_ID = "1";

var coalPlant = sinon.spy(),
    oilPlant = sinon.spy();
var powerPlants = [];
powerPlants[1] = coalPlant;
powerPlants[2] = oilPlant;
powerPlants[3] = sinon.spy();

beforeEach(function () {
    var engine = sinon.spy(),
        comms = sinon.spy();
    player = sinon.spy();
    player.uid = PLAYER_ID;
    player.buildOnCity = sinon.spy();

    comms.toAll = sinon.spy();

    engine.nextPlayer = sinon.spy();
    engine.getCurrentPlayer = sinon.stub().returns(player);
    engine.returnUsedResources = sinon.spy();
    engine.getPlayerCount = sinon.stub().returns(1);
    engine.nextAction = sinon.spy();

    power = new powerjs.Power(engine, comms, powerPlants);

    coalPlant.activate = sinon.stub().returns(3);
    oilPlant.activate = sinon.stub().returns(2);
});

describe('Phase/power', function() {
    describe('#powerCities()', function () {

        it('Player can\'t activate power plants twice.', function () {
            power.playersPaid.push(PLAYER_ID);
            player.money = 0;

            power.powerCities(player, undefined);

            assert.equal(player.money, 0, "Player should still have 0 money.");
        });

        it('Player can\'t activate the plants asked for.', function () {
            player.money = 0;
            power.canActivateAll = sinon.stub().returns(false);

            power.powerCities(player, []);

            assert.equal(player.money, 0, "Player should still have 0 money.");
        });

        it('Player can choose to activate nothing, and receive the base pay rate.', function () {
            player.money = 100;
            player.cities = [];

            power.powerCities(player, []);

            assert.equal(player.money, 100 + power.payTable[0], "Player should have received the base pay for powering nothing.");
        });

        it('Player can power 5 cities, but only has 3. Will be paid for only the 3 owned cities powered.', function () {
            player.money = 100;
            player.cities = ["halle", "essen", "dortmund"];
            power.canActivateAll = sinon.stub().returns(true);
            power.ownsAllPlants = sinon.stub().returns(true);
            power.convertDataToPowerPlants = sinon.stub().returns({1:coalPlant, 2:oilPlant});

            power.powerCities(player, [1, 2]);

            assert.equal(player.money, 100 + power.payTable[3]);
        });

        it('Player can power 3 cities, but has 5 owned cities. Will be paid for only the 3 owned cities powered.', function () {
            player.money = 100;
            player.cities = ["halle", "essen", "dortmund", "frankfurt-m", "frankfurt-d"];
            power.canActivateAll = sinon.stub().returns(true);
            power.ownsAllPlants = sinon.stub().returns(true);
            power.convertDataToPowerPlants = sinon.stub().returns({1:coalPlant});

            power.powerCities(player, [1]);

            assert.equal(player.money, 100 + power.payTable[3]);
        });
    });
});