const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = canvas.height;

    processing.draw = function () {};
});


// expose p as a global for debugging purposes
window.p = p;


const stateModifiers = [
    'colorMode',
    'ellipseMode',
    'fill',
    'frameRate',
    'imageMode',
    'rectMode',
    'stroke',
    'strokeCap',
    'strokeWeight',
    'textAlign',
    'textAscent',
    'textDescent',
    'textFont',
    'textLeading',
    'textSize',
];

const eventHandlers = [
    "draw",
    "mouseClicked",
    "mousePressed",
    "mouseReleased",
    "mouseMoved",
    "mouseDragged",
    "mouseOver",
    "mouseOut",
    "keyPressed",
    "keyReleased",
    "keyTyped",
];



const props = [];
// processing object's have multiple levels in their hierarchy and we want to
// get all of the properties so we use for-in here
for (const prop in p) {
    props.push(prop);
}

const pGlobals = "/*global " +
    props
        .filter(key => !(key[0] === '_' && key[1] === '_'))
        .map(key => eventHandlers.includes(key) ? `${key}:true` : key)
        .join(" ") +
    "*/\n";


const clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

const compare = function(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const state = {
    colorMode: [p.RGB],
    ellipseMode: [p.CENTER],
    fill: [255, 255, 255],
    frameRate: [60],
    imageMode: [p.CORNER],
    rectMode: [p.CORNER],
    stroke: [0, 0, 0],
    strokeCap: [p.ROUND],
    strokeWeight: [1],
    textAlign: [37, 0],
    textAscent: [9],
    textDescent: [12],
    textFont: ["Arial", 12],
    textLeading: [14],
    textSize: [1],
};

// the snapshot is always the value of the state after running main
const snapshot = clone(state);
const defaultState = clone(state);
const beforeState = {};
const afterState = {};


stateModifiers.forEach(name => {
    let func = p[name];

    Object.defineProperty(p, name,  {
        get() {
            return (...args) => {
                // TODO: instead of toggling record... we can just grab the state at a particular point in time
                // we want to be able to take snapshots of state a different times
                // compare those snapshots and update the current state appropriately
                state[name] = args;
                func.apply(p, args);
            };
        },
        set(value) {
            func = value;
        }
    });
});

eventHandlers.forEach(name => {
    let value = undefined;
    Object.defineProperty(p, name, {
        get() {
            return value;
        },
        set(newValue) {
            value = function() {
                try {
                    newValue.apply(p, arguments);
                } catch(e) {
                    displayException(e);
                }
            };
            if (newValue === DUMMY) {
                value.dummy = true;
            }
        }
    });
});


var DUMMY = function() {};

// TODO: provide a hook to reset the seed for manual restarts of the program
p.draw = DUMMY;
p.background(255, 255, 255);

var seed = Math.floor(Math.random() * 4294967296);

const beforeMain = function() {
    p.randomSeed(seed);

    // TODO: figure out a good way to track this state along with the rest
    p.angleMode = 'degrees';

    // If there was no 'draw' defined, clear the background.
    // This needs to be done before clearing all the event handlers b/c 'draw'
    // is included in 'eventHandlers'
    if (p.draw.dummy) {
        p.background(255, 255, 255);
    }

    eventHandlers.forEach(eventName => {
        p[eventName] = DUMMY;
    });

    // capture state before main so that we can restore if after running main
    Object.assign(beforeState, clone(state));

    // reset state to handle deleting of state changing commands
    stateModifiers.forEach(name => {
        p[name](...defaultState[name]);
    });
};

const afterMain = function() {
    Object.assign(afterState, clone(state));

    // maintain invariant: snapshot is always the state after running main
    stateModifiers.forEach(name => {
        if (compare(snapshot[name], afterState[name])) {
            // update the state by calling the state modifying function
            p[name](...beforeState[name]);
        } else {
            // update the snapshot
            snapshot[name] = afterState[name];
        }
    });
};

module.exports = {
    beforeMain: beforeMain,
    afterMain: afterMain,
    pGlobals: pGlobals,
    p: p
};