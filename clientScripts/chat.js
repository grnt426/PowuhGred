// initializations and functions for console input/output
var consoleHeader = "Console:\n";
var CONSOLE_O = "console";
var CHAT_O = "chat";
var outputDisplays = {
    chat:{text:"\t= Chat =\n",history:[],header:"\t= Chat =\n"},
    console:{text:"\t- Console -\n",history:[],header:"\t- Console -\n"}
};

// This function used to add to output of chat panel in game
var log = function(str, output) {
    console.log(output + " => " + str);
    var output = outputDisplays[output];
    output.history.push(str);
    if(output.history.length > 15)
        output.history.splice(0, 1);
    output.text = output.header;
    for(var line in output.history){
        output.text += output.history[line] + "\n";
    }
    redraw(scorePanel);
};

var handleChatInput = function(event){
    var key= event.keyCode || event.which;
    if(key == 13) {
        var input = document.getElementById('chatInputBox').value;
        socket.emit('sendchat', input);
        document.getElementById('chatInputBox').value = "";
    }
};
