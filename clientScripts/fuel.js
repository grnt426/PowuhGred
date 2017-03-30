var resourceGrid = {};
var resources = {};

// TODO: right now these vars are hard coded to germany
for(var i = 0; i < 24; i++) {
    var box = {};
    box.type = "coal";
    box.size = 22;
    box.x = internalX((i * (box.size + 3)) + (~~(i / 3) * 5) + 37);
    box.y = internalY(949);
    resourceGrid[i] = box;
}
for(i = 0; i < 24; i++) {
    box = {};
    box.type = "oil";
    box.size = 17;
    box.x = internalX((i * (box.size)) + (~~(i / 3) * 29) + 37);
    box.y = internalY(971);
    resourceGrid[i + 24] = box;
}
for(i = 0; i < 24; i++) {
    box = {};
    box.type = "garbage";
    box.size = 22;
    box.x = internalX((i * (box.size + 3)) + (~~(i / 3) * 5) + 37);
    box.y = internalY(990);
    resourceGrid[i + 48] = box;
}
for(i = 0; i < 8; i++) {
    box = {};
    box.type = "uranium";
    if(i <= 9) {
        box.size = 17;
        box.x = internalX(((i * 3 + 2) * (box.size)) + (~~((i * 3 + 2) / 3) * 29) + 37 + 20);
        box.y = internalY(971);
    }
    resourceGrid[i + 72] = box;
}
for(i = 0; i < 4; i++) {
    box = {};
    box.type = "uranium";
    box.size = 25;
    box.x = internalX(((i % 2) * (box.size + 6)) + 678);
    box.y = internalY(951 + (~~(i / 2) * (box.size + 11)));
    resourceGrid[i + 80] = box;
}

var updateResources = function(data) {
    log("Oil: " + data.oil + " - Coal: " + data.coal
        + " - Garbage: " + data.garbage + " - Uranium: " + data.uranium, CONSOLE_O);
    resources = data;
};