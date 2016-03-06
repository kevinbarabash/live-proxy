Math.seed = 6;

// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
Math.seededRandom = function(max, min) {
    max = max || 1;
    min = min || 0;

    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280;

    return min + rnd * (max - min);
};

const canvas = document.getElementById('canvas');
canvas.width = 512;
canvas.height = window.innerHeight;

const context = canvas.getContext('2d');

const width = 512;
const height = 512;

function random(max) {
    return Math.seededRandom(0, max) | 0;
}

let currentClass = null;

function createProxy(ctor) {
    currentClass = ctor;

    const ProxyClass = new Function('getCurrentClass',
        `return function() { return getCurrentClass().apply(this, arguments); }`
    )(() => currentClass);

    ProxyClass.toString = function toString() {
        return currentClass.toString();
    };

    ProxyClass.prototype = {};

    for (const prop of Object.keys(currentClass.prototype)) {
        const method = currentClass.prototype[prop];

        ProxyClass.prototype[prop] = function () {
            currentClass.prototype[prop].apply(this, arguments);
        };

        ProxyClass.prototype[prop].toString = function() {
            return currentClass.prototype[prop].toString();
        };

        for (const key of Object.keys(method)) {
            console.log(key);
            ProxyClass.prototype[prop][key] = method[key];
        }
    }

    ProxyClass.update = function(ctor) {
        const oldClass = currentClass;
        const currentKeys = Object.keys(currentClass.prototype);
        const futureKeys = Object.keys(ctor.prototype);

        currentClass = ctor;

        for (const cKey of currentKeys) {
            if (futureKeys.includes(cKey)) {
                console.log(`copy over props from "${cKey}"`);
            } else {
                delete ProxyClass.prototype[cKey];
            }
        }

        for (const fKey of futureKeys) {
            const oldMethod = oldClass.prototype[fKey];

            ProxyClass.prototype[fKey] = function() {
                currentClass.prototype[fKey].apply(this, arguments);
            };

            ProxyClass.prototype[fKey].toString = function() {
                return currentClass.prototype[fKey].toString();
            };

            if (oldMethod) {
                // copy props of old method
                console.log(Object.keys(oldMethod));
                for (const key of Object.keys(oldMethod)) {
                    console.log(key);
                    ProxyClass.prototype[fKey][key] = oldMethod[key];
                }
            }
        }

        console.log(currentKeys);
        console.log(futureKeys);

        //for (const prop of Object.keys(ctor.prototype)) {
        //    ProxyClass.prototype[prop] = function () {
        //        currentClass.prototype[prop].apply(this, arguments);
        //    }
        //}
    };

    return ProxyClass;
}

var Dot;

Dot = function Dot() {
    this.x = random(width);
    this.y = random(height);
    this.radius = 25;
};

Dot.prototype.draw = function() {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    context.fill();
};

Dot.prototype.draw.foo = "bar";

Dot.prototype.setColor = function(color) {
    this.color = color;
};

const Proxy = createProxy(Dot);
console.log(Proxy.toString());

const proxy = new Proxy();
console.log(proxy.draw.foo);

proxy.draw();

const dot = new Dot();

dot.draw();


Dot = function Dot() {
    this.x = random(width);
    this.y = random(height);
    this.radius = 15;
};

Dot.prototype.draw = function() {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = `rgb(${random(255)}, ${random(255)}, ${random(255)})`;
    context.fill();
};

Dot.prototype.setRadius = function(radius) {
    this.radius = radius;
};

Proxy.update(Dot);

dot.draw();


proxy.setRadius(50);
proxy.draw();
console.log(proxy.draw);
console.log(proxy.draw.foo);

Math.seed = 6;


for (var i = 0; i < 10; i++) {
    const proxy = new Proxy();
    proxy.draw();
}

Math.seed = 6;

Dot = function Dot() {
    this.x = random(width);
    this.y = random(height);
    this.radius = 20;
};

Dot.prototype.draw = function() {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = `rgb(${random(255)}, ${random(255)}, ${random(255)})`;
    context.fill();
};

Proxy.update(Dot);


for (var i = 0; i < 10; i++) {
    const proxy = new Proxy();
    proxy.draw();
}
