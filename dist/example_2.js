fill(255, 160, 0);

var win = (function () { return this; })();
console.log(win);

var x = 13;
var y = 50;
var d = 50;

var Dot = function(x, y) {
    this.x = x;
    this.y = y;
    this.color = color(random(255), random(255), random(255));
};

var t = 0;

Dot.prototype.draw = function() {
    var orbitSize = 25;
    fill(this.color);
    ellipse(this.x + orbitSize * cos(t), this.y + orbitSize * sin(t), d, d);
};

var dots = [];

dots.push(new Dot(100, 100));

strokeWeight(1);

draw = function() {
    t += 0.01;

    background(255, 255, 255);
    dots.forEach(function(dot) {
        dot.draw();
    });
};

mouseClicked = function() {
    strokeWeight(random(20));
    dots.push(new Dot(mouseX, mouseY));
};
