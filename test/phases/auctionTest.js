var assert = require('assert'),
    sinon = require('sinon'),
    util = require('../../util.js'),
    auctionjs = require('../../phases/auction.js');

var auction;
var PASS_DATA = "pass";
var BID_LEADER_ID = "1";
var CURRENT_BIDDER = "2";

beforeEach(function () {
    var comms = sinon.spy(),
        engine = sinon.spy();
    engine.players = {"1":sinon.spy(), "2":sinon.spy()};
    engine.players[CURRENT_BIDDER].uid = CURRENT_BIDDER;
    engine.players[BID_LEADER_ID].uid = BID_LEADER_ID;
    engine.BID = "bid";
    comms.toPlayer = sinon.spy();
    auction = new auctionjs.Auction(engine, comms);
    auction.nextBidder = sinon.stub();
});

describe('Phase/auction', function() {
    describe('#nextBidder()', function () {

        it('With no power plants, should return 0', function () {

        });
    });
    describe('#startAuction()', function () {

        it('Current bidder passes, moves to next player', function () {
            auction.engine.currentPlayer = CURRENT_BIDDER;
            auction.engine.nextPlayer = sinon.spy();
            auction.startAuction("pass");

            assert.equal(auction.finishedBidding.length, 1);
            assert.equal(auction.finishedBidding[0], CURRENT_BIDDER);
            assert.equal(auction.finishedAuctions.length, 1);
            assert.equal(auction.finishedAuctions[0], CURRENT_BIDDER);
            assert(auction.engine.nextPlayer.calledOnce);
        });

        it('Current bidder tries to start bid too low', function () {
            auction.engine.currentPlayer = CURRENT_BIDDER;
            auction.engine.nextPlayer = sinon.spy();
            auction.startAuction(createStartAuctionData(4, 1));
            auction.nextBidder = sinon.spy();

            assert.equal(auction.finishedBidding.length, 0);
            assert.equal(auction.finishedAuctions.length, 0);
            assert(auction.nextBidder.notCalled, "Bidding too low shouldn't advance to the next player.");
            assert(auction.comms.toPlayer.calledOnce, "Expected an error message to the player.");
        });

        it('Current bidder tries to bid more than they have', function () {
            auction.engine.currentPlayer = CURRENT_BIDDER;
            auction.engine.nextPlayer = sinon.spy();
            auction.engine.players[CURRENT_BIDDER].money = 5;
            auction.nextBidder = sinon.spy();

            auction.startAuction(createStartAuctionData(4, 6));

            assert.equal(auction.finishedBidding.length, 0);
            assert.equal(auction.finishedAuctions.length, 0);
            assert(auction.nextBidder.notCalled, "Bidding more than you have shouldn't advance to the next player.");
            assert(auction.comms.toPlayer.calledOnce, "Expected an error message to the player.");
        });

        it('Bidding correctly', function () {
            auction.engine.currentPlayer = CURRENT_BIDDER;
            auction.engine.nextPlayer = sinon.spy();
            auction.engine.players[CURRENT_BIDDER].money = 5;
            auction.nextBidder = sinon.spy();

            auction.startAuction(createStartAuctionData(4, 5));

            assert.equal(auction.finishedBidding.length, 0);
            assert.equal(auction.finishedAuctions.length, 0);
            assert.equal(auction.currentBid, 5, "The current bid should be equal to what the player just placed.");
            assert.equal(auction.currentBidChoice, 4, "Current bid index should be equal to the plant just selected.");
            assert.equal(auction.currentBidLeader, CURRENT_BIDDER, "The player that started the auction should be the leader.");
            assert.equal(auction.engine.currentAction, "bid", "The current action should be BID.");
            assert.equal(auction.currentBidders.length, 2, "Should contain both players");
            assert.notEqual(auction.currentBidders.indexOf(CURRENT_BIDDER), -1, "CURENT_BIDDER should be in the list " +
            "of current bidders.");
            assert.notEqual(auction.currentBidders.indexOf(BID_LEADER_ID), -1, "BID_LEADER_ID should be in the list " +
            "of current bidders.");
            assert.equal(auction.currentPlayerBidIndex, auction.currentBidders.indexOf(CURRENT_BIDDER), "The index " +
            "should be with the CURRENT_BIDDER.");
            assert(auction.auctionRunning, "The auction should have started");
            assert(auction.nextBidder.calledOnce, "After starting the auction, the next bidder should place a bid.");
        });
    });
    describe('#placeBid()', function () {

        it('Player can pass', function() {
            auction.placeBid(PASS_DATA);
            assert(auction.nextBidder.calledOnce);
            assert(auction.nextBidder.calledWith(true), "Expected the pass argument to be true.");
        });

        it('Player tries to bid less than the current bid, and rejects', function() {

            // original state
            auction.currentBid = 10;
            auction.currentBidLeader = BID_LEADER_ID;

            auction.placeBid(createBidData(1));
            assert(auction.nextBidder.notCalled); // Not expecting the current player to advance
            assert(auction.comms.toPlayer.calledOnce); // Some error message should have been sent to the player

            // Ensure the original state was maintained
            assert.equal(auction.currentBidLeader, BID_LEADER_ID, "Bid leader should not have changed");
            assert.equal(auction.currentBid, 10, "Current bid amount should not have changed");
        });

        it('Player doesn\'t have enough money and is rejected', function() {

            // original state
            auction.currentBid = 10;
            auction.currentBidLeader = BID_LEADER_ID;
            auction.currentBidder = CURRENT_BIDDER;
            auction.engine.players[CURRENT_BIDDER].money = 1;

            auction.placeBid(createBidData(11));
            assert(auction.nextBidder.notCalled); // Not expecting the current player to advance
            assert(auction.comms.toPlayer.calledOnce); // Some error message should have been sent to the player

            // Ensure the original state was maintained
            assert.equal(auction.currentBidLeader, BID_LEADER_ID, "Bid leader should not have changed");
            assert.equal(auction.currentBid, 10, "Current bid amount should not have changed");
        });

        it('Player makes a valid bid', function() {

            // original state
            auction.currentBid = 10;
            auction.currentBidLeader = BID_LEADER_ID;
            auction.currentBidder = CURRENT_BIDDER;
            auction.engine.players[CURRENT_BIDDER].money = 11;
            auction.engine.players[CURRENT_BIDDER].uid = CURRENT_BIDDER;

            auction.placeBid(createBidData(11));
            assert.equal(auction.currentBidLeader, CURRENT_BIDDER, "Bid leader should be the player that just placed a bid");
            assert.equal(auction.currentBid, 11, "Current bid amount should have updated to the new bid");

            assert(auction.nextBidder.calledOnce);
            assert(auction.nextBidder.calledWith(false), "Expected the 'pass' argument to be false");
        });
    });

    describe('#updateMarket()', function () {

        it('With no power plants, should return 0', function () {

        });
    });

    describe('#cleanAuctionState()', function () {

        it('With no power plants, should return 0', function () {

        });
    });
});

function createBidData(bidAmount){
    return {bid:bidAmount};
}

function createStartAuctionData(powerPlantCost, bid){
    return {cost:powerPlantCost, bid:bid};
}