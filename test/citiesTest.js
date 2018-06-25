const assert = require('assert'),
    sinon = require('sinon'),
    util = require('../engine/util.js'),
    citiesjs = require('../engine/cities.js');

const cities = new citiesjs.Cities();
cities.parseCityList("data/germany_cities.txt");
cities.parseCities("data/germany_connections.txt");

const ESSEN = cities.cities["essen"];
const DORTMUND = cities.cities["dortmund"];
const AACHEN = cities.cities["aachen"];
const KONSTANZ = cities.cities["konstanz"];
const FLENSBURG = cities.cities["flensburg"];
const KOLN = cities.cities["koln"];
const MUNSTER = cities.cities["munster"];
const DRESDEN = cities.cities["dresden"];
const TORGELOW = cities.cities["torgelow"];
const TRIER = cities.cities["trier"];
const SAARBRUCKEN = cities.cities["saarbrucken"];
const MUNCHEN = cities.cities["munchen"];
const PASSAU = cities.cities["passau"];
const FRANKFURTM = cities.cities["frankfurt-m"];
const FRANKFURTD = cities.cities["frankfurt-d"];
const OSNABRUCK = cities.cities["osnabruck"];
const KASSEL = cities.cities["kassel"];
const FULDA = cities.cities["fulda"];
const WURZBURG = cities.cities["wurzburg"];
const HANNOVER = cities.cities["hannover"];
const MAGDEBURG = cities.cities["magdeburg"];
const BREMEN = cities.cities["bremen"];
const WIESBADEN = cities.cities["wiesbaden"];
const MANNHEIM = cities.cities["mannheim"];

beforeEach(function () {

});

describe('Cities', function () {
    describe('#findCheapestRoute()', function (done) {

        it('Find cheapest between ESSEN to DORTMUND, which is 4', function () {
            return cities.findCheapestRoute(ESSEN, DORTMUND)
                .then(function(res) {
                    assert.notEqual(res, undefined);
                    assert.equal(res.cost, 4);
                    assert.equal(res.path.length, 1);
                    assert.equal(res.path[0], "dortmund");
                });
        });

        it('Find cheapest between DORTMUND to AACHEN, which is 15', function () {
            return cities.findCheapestRoute(DORTMUND, AACHEN)
                .then(function(res) {
                    assert.notEqual(res, undefined);
                    assert.equal(res.cost, 15);
                    assert.equal(res.path.length, 3);
                    assert.equal(res.path[0], "essen");
                    assert.equal(res.path[1], "dusseldorf");
                    assert.equal(res.path[2], "aachen");
                });
        });

        it('Find cheapest between KONSTANZ to FLENSBURG, which is 90', function () {
            return cities.findCheapestRoute(KONSTANZ, FLENSBURG)
                .then(function(res) {
                    assert.notEqual(res, undefined);
                    assert.equal(res.cost, 90);
                    assert.equal(res.path.length, 9);
                    assert.equal(res.path[0], "stuttgart");
                    assert.equal(res.path[1], "mannheim");
                    assert.equal(res.path[2], "wiesbaden");
                    assert.equal(res.path[3], "frankfurt-m");
                    assert.equal(res.path[4], "kassel");
                    assert.equal(res.path[5], "hannover");
                    assert.equal(res.path[6], "hamburg");
                    assert.equal(res.path[7], "kiel");
                    assert.equal(res.path[8], "flensburg");
                });
        });
    });

    describe('#findArbitraryCheapestToDest()', function () {

        it('Find cheapest between [KOLN,ESSEN,MUNSTER] to DORTMUND, which is 2', function () {
            return assertCost(cities.findArbitraryCheapestToDest([KOLN, ESSEN, MUNSTER], DORTMUND), 2);
        });

        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to DRESDEN, which is 54', function () {

            // There are actually two valid ways to get there at 54, and both start from Flensburg,
            // and either go through Berlin or Magdeburg
            return assertCost(cities.findArbitraryCheapestToDest([KOLN, FLENSBURG, KONSTANZ], DRESDEN), 54);
        });
    });

    describe('#findOptimalPurchaseCostOrderOfCities()', function () {

        it('Find cheapest between [KOLN,ESSEN,MUNSTER] to [DORTMUND,AACHEN], which is 9', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN, ESSEN, MUNSTER], [DORTMUND.name, AACHEN.name]), 9);
        });

        /**
         * This one should find separate paths: one to ESSEN from KOLN, and one to DRESDEN from FLENSBURG
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to [DRESDEN,ESSEN], which is 60', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN, FLENSBURG, KONSTANZ], [DRESDEN.name, ESSEN.name]), 60);
        });

        /**
         * This one should find the path that relies on first buying DORTMUND from KOLN, and then DRESDEN from DORTMUND.
         * The total savings over this method instead of separate paths from KOLN and FLENSBURG is 2.
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG] to [DRESDEN,DORTMUND], which is 62', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN, FLENSBURG, KONSTANZ], [DRESDEN.name, DORTMUND.name]), 62);
        });

        /**
         * Slight performance test to ensure this runs quickly.
         */
        it('Find cheapest between [KOLN,KONSTANZ,FLENSBURG,ESSEN,MUNSTER,AACHEN] to [DRESDEN,DORTMUND], which is 54', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                    [KOLN, FLENSBURG, KONSTANZ, ESSEN, MUNSTER, AACHEN],
                    [DRESDEN.name,DORTMUND.name]), 54);
        });

        /**
         * Larger test.
         */
        it('Find cheapest between 16 cities to [DRESDEN,DORTMUND,AACHEN,TRIER], which is 44', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                    [KOLN, FLENSBURG, KONSTANZ, ESSEN, MUNSTER, SAARBRUCKEN, MUNCHEN, PASSAU,
                        FRANKFURTM, OSNABRUCK, KASSEL, FULDA, WURZBURG, HANNOVER, MAGDEBURG, BREMEN],
                    [DRESDEN.name,DORTMUND.name,AACHEN.name,TRIER.name]), 44);
        });

        /**
         * Intense test, to see where the limits are. On my machine, this test took 7.5 seconds
         */
        it('Find cheapest between 12 cities to 9 cities, which is 109', function () {
            return assertCost(cities.findOptimalPurchaseCostOrderOfCities(
                [KOLN, FLENSBURG, KONSTANZ, ESSEN, MUNSTER, SAARBRUCKEN, MUNCHEN, PASSAU,
                    FRANKFURTM, OSNABRUCK, KASSEL, FULDA],
                [DRESDEN.name,DORTMUND.name,AACHEN.name,TRIER.name,FRANKFURTD.name,TORGELOW.name, BREMEN.name,
                    HANNOVER.name, MAGDEBURG.name]),
                109);
        });
    });
});

function assertCost(func, cost){
    return func.then(function(res){assert.equal(res, cost);console.log(cost)});
}