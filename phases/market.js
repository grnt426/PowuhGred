var res = require("../State/Resources.js");

exports.Market = function (engine, comms) {

    this.engine = engine;
    this.comms = comms;

    // The resources available for purchase.
    this.resources = {};

    /**
     * For now, the starting resources are assumed for the Germany map.
     *
     * TODO: Should take in a mapping of starting resources from a data file, as starting resources can vary per map played.
     */
    this.setupStartingResources = function () {
        this.resources[res.COAL] = 24;
        this.resources[res.OIL] = 18;
        this.resources[res.GARBAGE] = 6;
        this.resources[res.URANIUM] = 2;
    };

    /**
     * The expected data is either
     *    {coal:W, oil:X, garbage:Y, uranium:Z}
     * or
     *    pass
     * @param data  The request from the user.
     */
    this.buyResources = function (data) {

        // It is ALWAYS valid for players to not purchase any resources
        if (data == "pass") {
            engine.nextPlayer();
        }

        // Otherwise, the player has requested resources
        else {
            var cost = this.computeTotalCost(data);
            var currentPlayer = this.engine.currentPlayer;

            // This first condition should never happen, as the client wouldn't let someone chose more resources
            // than they have. It is a stop-gap in case something weird happens (or someone is spoofing messages...)
            if (!this.validatePurchase(data) || currentPlayer.money < cost) {
                console.info("Invalid purchase. Money: " + this.engine.currentPlayer.money + ". Request: " + data);
            }
            else {
                currentPlayer.money -= cost;
                currentPlayer.addResources(data);
                engine.nextPlayer();
            }
        }
    };

    /**
     * Validates there are enough resources available to make the purchase.
     *
     * @param data {Object} of type {coal:W, oil:X, garbage:Y, uranium:Z}
     * @returns {boolean} True if those resources are available.
     */
    this.validatePurchase = function (data) {
        var valid = false;
        data.foreach(function (amt, type) {
            valid &= resources[type] >= amt;
            if (type != res.COAL || type != res.GARBAGE || type != res.OIL || type != res.URANIUM) {
                valid = false;
            }
        });
        return valid;
    };

    /**
     * A convenience function which computes the total cost of all resources requested.
     * @param data {Object} of type {coal:W, oil:X, garbage:Y, uranium:Z}
     * @returns {number} The total cost
     */
    this.computeTotalCost = function (data) {
        var cost = 0;
        data.foreach(function (amt, type) {
            cost += this.computeCost(amt, type);
        });
        return cost;
    };

    /**
     * Returns the total cost to purchase a particular type of resource.
     * @param amt   The amount to buy.
     * @param type  The kind of resource to buy.
     * @returns {number}    The cost to purchase.
     */
    this.computeCost = function (amt, type) {
        var cost = 0;
        var available = resources[type];
        for (i = amt; i > 0; i--) {
            if (type == res.URANIUM) {
                if (available < 5) {
                    cost += 10 + 2 * (4 - available);
                }
                else {
                    cost += 8 - (available - 5);
                }
            }
            else {
                cost += 9 - Math.ceil(available / 3);
            }

            resources[type] -= 1;
        }
        return cost;
    };
};