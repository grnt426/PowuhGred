// initializations and functions for console input/output
var consoleHeader = "Console:\n";
var CONSOLE_O = "console";
var CHAT_O = "chat";
var outputDisplays = {
    chat: {text: "\t= Chat =\n", history: [], header: "\t= Chat =\n"},
    console: {text: "\t- Console -\n", history: [], header: "\t- Console -\n"}
};

// This function used to add to output of chat panel in game
var log = function(str, output) {
    console.log(output + " => " + str);
    if(output == "chat") {
        var prev = $('#chatOutputBox').html();
        $('#chatOutputBox').html(str + "<br/>" + prev);
    }
    else if(output == "console") {
        var prev = $('#consoleOutputBox').html();
        $('#consoleOutputBox').html(str + "<br/>" + prev);
    }
};

var SOCKET_SENDCHAT = 'sendchat';  // client -> server
var handleChatInput = function(event) {
    var key = event.keyCode || event.which;
    if(key == 13) {
        var input = document.getElementById('chatInputBox').value;
        socket.emit(SOCKET_SENDCHAT, input);
        document.getElementById('chatInputBox').value = "";
    }
};
