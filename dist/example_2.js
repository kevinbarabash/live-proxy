p.fill(255, 160, 0);

var win = (function () { return this; })();
console.log(win);

var x = 13;
var y = 50;

var Dot = function(x, y) {
    this.x = x;
    this.y = y;
};

Dot.prototype.draw = function() {
    var d = 50;
    p.ellipse(this.x, this.y, d, d);
};

var dots = [];

dots.push(new Dot(100, 100));

p.draw = function() {
    p.background(255, 255, 255);
    dots.forEach(function(dot) {
        dot.draw();
    });
};

p.mouseClicked = function() {
    dots.push(new Dot(p.mouseX, p.mouseY));
};
