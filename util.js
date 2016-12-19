/**
 * Fisher-Yates shuffle algorithm, operates on the array in-place.
 *
 * Copied from: http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 * @param array    Array to shuffle.
 * @returns {*}
 */
exports.shuffle = function(array){
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while(0 !== currentIndex){

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

exports.olen = function(obj) {
    if(typeof obj == "object"){
        return Object.keys(obj).length;
    }
    else{
        return 0;
    }
};
