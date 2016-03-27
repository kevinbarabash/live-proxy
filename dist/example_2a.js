fill(255, 160, 0);

var win = (function () { return this; })();
console.log(win);

var x = 13;
var y = 50;
var d = 50;

// TODO: fix transform to handle declaring t after Dot
var t = 0;

class Dot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = color(random(255), random(255), random(255));
    }

    draw() {
        var orbitSize = 25;
        fill(this.color);
        ellipse(this.x + orbitSize * cos(t), this.y + orbitSize * sin(t), d, d);
    }
}

var Scene = function() {
    this.dots = [];
};

Scene.prototype.add = function(dot) {
    this.dots.push(dot);
};

Scene.prototype.draw = function() {
    this.dots.forEach(function(dot) {
        dot.draw();
    });
};

var scene = new Scene();

scene.add(new Dot(100, 100));

strokeWeight(1);

draw = function() {
    t += 1;

    background(255, 255, 255);
    scene.draw();
};

mouseClicked = function() {
    strokeWeight(random(20));
    scene.add(new Dot(mouseX, mouseY));
    console.log(scene);
};
