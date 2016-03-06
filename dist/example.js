p.fill(255, 0, 0);

var x = 13;
var y = 21;

var ellipses = [];

ellipses.push({x:55,y:10});

p.draw = function() {
    p.background(255, 255, 255);
    ellipses.forEach(function(e) {
        p.ellipse(x + e.x, y + e.y, 50, 50);
    });
};

p.mouseClicked = function() {
    ellipses.push({ x: p.mouseX, y: p.mouseY });
};
