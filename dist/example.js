fill(255, 0, 0);

var x = 13;
var y = 21;

var ellipses = [];

ellipses.push({x:55,y:10});

draw = function() {
    background(255, 255, 255);
    ellipses.forEach(function(e) {
        ellipse(x + e.x, y + e.y, 50, 50);
    });
};

mouseClicked = function() {
    ellipses.push({ x: mouseX, y: mouseY });
};
