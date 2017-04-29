Powuh Gred
===========

Yes, this is remake of the board game Power Grid. Written in NodeJS for the pure
benefit of making us better game developers and working together to produce a
viable playable game. A boardgame was chosen for its simplicity of design and
implementation.

Power Grid is a game of market superiority. Your goal is to power more cities
than your opponents. Power plants are brought to auction for all players to bid
on, powered by coal, oil, garbage or uranium or wind, they are the workhorses of
your utility.  Resources are purchased in a market where prices are dominated by
supply and demand.  Players build out their connections to more cities in a
network like fashion and earn money for the number of cities powered.

Setup
-----

Download germany.jpg, plants.jpg, and plants_t.jpg from someone who has them
and place them, exactly as they were named, into the data/ folder.

NodeJS https://nodejs.org/en/ (Node 6+ for ES2015 support)
Mocha https://mochajs.org/#installation

	npm install

Create a UUID for a secret session and place in `session.secret` one directory above where server.js was executed.

Starting the Game
-----------------

Start the server

	nodejs server.js debug
	
Connect to the server

	http://localhost:3000/
	
And start playing!	


Development
============

If in IntelliJ, define a run configuration (top bar, left of the Green Arrow).
Choose to create a new NodeJS run profile, and just select server.js as the target.

To run tests, repeat, but instead create a new Mocha profile and then point at the test/ directory. You will need to
pass --recursive to the "Extra mocha options" field.

	mocha