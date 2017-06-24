// initializations and functions for console input/output
const CONSOLE_O = "console";
const CHAT_O = "chat";
var outputDisplays = {
    chat: {text: "\t= Chat =\n", history: [], header: "\t= Chat =\n"},
    console: {text: "\t- Console -\n", history: [], header: "\t- Console -\n"}
};

// This function used to add to output of chat panel in game
var log = function(str, output) {
    console.log(output + " => " + str);
    str = escapeHtml(str);
    if(output === "chat") {
        let prev = $('#chatOutputBox').html();
        $('#chatOutputBox').html(str + "<br/>" + prev);
    }
    else if(output === "console") {
        let prev = $('#consoleOutputBox').html();
        $('#consoleOutputBox').html(str + "<br/>" + prev);
    }
};

const SOCKET_SENDCHAT = 'sendchat';  // client -> server
var handleChatInput = function(event) {
    let key = event.keyCode || event.which;
    if(key === 13) {
        let input = document.getElementById('chatInputBox').value;
        socket.emit(SOCKET_SENDCHAT, input);
        document.getElementById('chatInputBox').value = "";
    }
};

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * Taken from: http://stackoverflow.com/a/12034334/
 * @param string
 * @returns {string}
 */
function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}