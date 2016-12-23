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
var KOLN = cities.cities["koln"];
var MUNSTER = cities.cities["munster"];
var DRESDEN = cities.cities["dresden"];
var TORGELOW = cities.cities["torgelow"];
var TRIER = cities.cities["trier"];

beforeEach(function () {

});

describe('Cities', function () {
    describe('#findCheapestRoute()', function () {

        it('Find cheapest between ESSEN to DORTMUND, which is 4', function () {
            var path = cities.findCheapestRoute(ESSEN, DORTMUND);
            assert.notEqual(path, undefined);
            assert.equal(path.cost, 4);
            assert.equal(path.path.length, 1);
            assert.equal(path.path[0], "dortmund");
        });

        it('Find cheapest between DORTMUND to AACHEN, which is 15', function () {
            var path = cities.findCheapestRoute(DORTMUND, AACHEN);
            assert.notEqual(path, undefined);
            assert.equal(path.cost, 15);
            assert.equal(path.path.length, 3);
            assert.equal(path.path[0], "essen");
            assert.equal(path.path[1], "dusseldorf");
            assert.equal(path.path[2], "aachen");
        });

        it('Find cheapest between KONSTANZ to FLENSBURG, which is 90', function () {
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

    describe('#findArbitraryCheapestToDest()', function () {

        it('Find cheapest between [KOLN,ESSEN,MUNSTER] to DORTMUND, which is 2', function () {
            assert.equal(cities.findArbitraryCheapestToDest([KOLN, ESSEN, MUNSTER], DORTMUND), 2);
        });

        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to DRESDEN, which is 54', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            assert.equal(cities.findArbitraryCheapestToDest([KOLN, FLENSBURG, KONSTANZ], DRESDEN), 54);
        });
    });

    describe('#findOptimalPurchaseCostOrderOfCities()', function () {

        it('Find cheapest between [KOLN,ESSEN,MUNSTER] to [DORTMUND,AACHEN], which is 9', function () {
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities([KOLN.name, ESSEN.name, MUNSTER.name], [DORTMUND,AACHEN]), 9);
        });

        /**
         * This one should find separate paths: one to ESSEN from KOLN, and one to DRESDEN from FLENSBURG
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to [DRESDEN,ESSEN], which is 60', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities([KOLN.name, FLENSBURG.name, KONSTANZ.name], [DRESDEN,ESSEN]), 60);
        });

        /**
         * This one should find the path that relies on first buying DORTMUND from KOLN, and then DRESDEN from DORTMUND.
         * The total savings over this method instead of separate paths from KOLN and FLENSBURG is 2.
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to [DRESDEN,DORTMUND], which is 62', function () {
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities([KOLN.name, FLENSBURG.name, KONSTANZ.name], [DRESDEN,DORTMUND]), 62);
        });

        /**
         * Slight performance test to ensure this runs quickly.
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG,ESSEN,MUNSTER,AACHEN] to [DRESDEN,DORTMUND], which is 54', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN.name, FLENSBURG.name, KONSTANZ.name, ESSEN.name, MUNSTER.name, AACHEN.name],
                [DRESDEN,DORTMUND]), 54);
        });

        /**
         * Larger test.
         */
        it('Find cheapest between 16 cities to [DRESDEN,DORTMUND,AACHEN,FLENSBURG], which is 56', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN.name, FLENSBURG.name, KONSTANZ.name, ESSEN.name, MUNSTER.name, "saarbrucken", "munchen", "passau",
                "frankfurt-m", "osnabruck", "kassel", "fulda", "wurzburg", "hannover", "magdeburg", "bremen"],
                [DRESDEN,DORTMUND,AACHEN,FLENSBURG]), 56);
        });

        /**
         * Intense test, to see where the limits are.
         *
         * TODO: Currently, the limit is about 6 requested cities and 15 owned. At this point, it takes upwards of 8
         * seconds to compute, and sometimes the unit-test times out before. Memoization/precomputation is needed.
         */
        it('Find cheapest between 16 cities to 6 cities, which is 62', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            assert.equal(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN.name, FLENSBURG.name, KONSTANZ.name, ESSEN.name, MUNSTER.name, "saarbrucken", "munchen", "passau",
                    "frankfurt-m", "osnabruck", "kassel", "fulda", "wurzburg", "hannover", "magdeburg"],
                [DRESDEN,DORTMUND,AACHEN,FLENSBURG,TRIER,TORGELOW]), 98);
        });
    });
});