fill(255, 160, 0);

var win = (function () { return this; })();
console.log(win);

var x = 13;
var y = 50;

var Dot = function(x, y) {
    this.x = x;
    this.y = y;
    this.color = color(random(255), random(255), random(255));
};

Dot.prototype.draw = function() {
    var d = 50;
    fill(this.color);
    ellipse(this.x, this.y, d, d);
};

var dots = [];

dots.push(new Dot(100, 100));

draw = function() {
    background(255, 255, 255);
    dots.forEach(function(dot) {
        dot.draw();
    });
};

mouseClicked = function() {
    dots.push(new Dot(mouseX, mouseY));
};
