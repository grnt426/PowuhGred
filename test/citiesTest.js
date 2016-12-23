var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../util.js'),
    citiesjs = require('../cities.js');

var cities = new citiesjs.Cities();
cities.parseCityList("data/germany_cities.txt");
cities.parseCities("data/germany_connections.txt");

var ESSEN = cities.cities["essen"];
var DORTMUND = cities.cities["dortmund"];
var AACHEN = cities.cities["aachen"];
var KONSTANZ = cities.cities["konstanz"];
var FLENSBURG = cities.cities["flensburg"];

beforeEach(function () {

});

describe('#findCheapestRoute()', function () {

    it('Find cheapest between ESSEN to DORTMUND, which is 4', function () {
        var path = cities.findCheapestRoute(ESSEN, DORTMUND);
        assert.notEqual(path, undefined);
        assert.equal(path.cost, 4);
        assert.equal(path.path.length, 1);
        assert.equal(path.path[0], "dortmund");
    });

    it('Find cheapest between DORTMUND to AACHEN, which is 4', function () {
        var path = cities.findCheapestRoute(DORTMUND, AACHEN);
        assert.notEqual(path, undefined);
        assert.equal(path.cost, 15);
        assert.equal(path.path.length, 3);
        assert.equal(path.path[0], "essen");
        assert.equal(path.path[1], "dusseldorf");
        assert.equal(path.path[2], "aachen");
    });

    it('Find cheapest between KONSTANZ to FLENSBURG, which is 4', function () {
        var path = cities.findCheapestRoute(KONSTANZ, FLENSBURG);
        assert.notEqual(path, undefined);
        assert.equal(path.cost, 90);
        assert.equal(path.path.length, 9);
        assert.equal(path.path[0], "stuttgart");
        assert.equal(path.path[1], "mannheim");
        assert.equal(path.path[2], "wiesbaden");
        assert.equal(path.path[3], "frankfurt-m");
        assert.equal(path.path[4], "kassel");
        assert.equal(path.path[5], "hannover");
        assert.equal(path.path[6], "hamburg");
        assert.equal(path.path[7], "kiel");
        assert.equal(path.path[8], "flensburg");
    });
});