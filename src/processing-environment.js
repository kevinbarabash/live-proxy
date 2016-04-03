const avatars = require('./avatars');

const getInheritedProps = function(obj) {
    const props = [];

    for (const prop in obj) {
        props.push(prop);
    }

    return props;
};

const getGlobalsString = function(obj) {
    const props = getInheritedProps(obj);

    return "/*global " +
        props
            .filter(key => !(key[0] === '_' && key[1] === '_'))
            .map(key => eventHandlers.includes(key) ? `${key}:true` : key)
            .join(" ") +
        "*/\n";
};

const loadImage = function(imageCache, filename) {
    const img = document.createElement('img');

    const promise = new Promise((resolve, reject) => {
        img.onload = () => {
            console.log(filename);
            imageCache[filename] = img;
            resolve();
        };
        img.onerror = () => {
            resolve(); // always resolve
        };
    });

    img.src = `images/${filename}.png`;

    return promise;
};

const DUMMY = function() {};

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

const clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

const compare = function(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const createProcessingEnvironment = function(canvas, displayException = DUMMY) {
    const p = new Processing(canvas, (processing) => {
        processing.width = canvas.width;
        processing.height = canvas.height;

        processing.draw = function () {};
    });

    const imageCache = {};

    avatars.forEach(avatar => loadImage(imageCache, `avatars/${avatar}`));

    p.getImage = filename => {
        return new p.PImage(imageCache[filename]);
    };

    const defaultState = {
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
        isStroked: true,
    };

    // the snapshot is always the value of the state after running main
    const state = clone(defaultState);
    const snapshot = clone(defaultState);
    const beforeState = {};
    const afterState = {};

    // used by handleUpdate
    const globals = getGlobalsString(p);
    const name = '__p__';
    const object = p;

    let tracking = false;

    stateModifiers.forEach(name => {
        let func = p[name];

        Object.defineProperty(p, name, {
            get() {
                return (...args) => {
                    // we use `that = this` because `this` here is bound to
                    // the processing object b/c we calling defineProperty
                    if (name === 'stroke' && tracking) {
                        state.isStroked = true;
                    }
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

    let noStroke = p.noStroke;

    Object.defineProperty(p, 'noStroke', {
        get() {
            return (...args) => {
                if (tracking) {
                    state.isStroked = false;
                }
                noStroke.apply(p, args);
            }
        },
        set(value) {
            noStroke = value;
        }
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
                value.dummy = newValue === DUMMY;
            }
        });
    });

    // TODO: provide a hook to reset the seed for manual restarts of the program
    p.draw = DUMMY;
    p.background(255, 255, 255);

    const seed = Math.floor(Math.random() * 4294967296);

    // expose p as a global for debugging purposes
    window.p = p;

    const beforeMain = function() {
        tracking = false;

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

        state.isStroked = defaultState.isStroked;

        tracking = true;
    };

    const afterMain = function() {
        tracking = false;

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

        if (compare(snapshot.isStroked, afterState.isStroked)) {
            state.isStroked = beforeState.isStroked;
        } else {
            snapshot.isStroked = afterState.isStroked;
        }

        if (state.isStroked) {
            p.stroke(...state.stroke);
        } else {
            p.noStroke();
        }

        tracking = true;
    };


    return {
        name,
        object,
        globals,

        afterMain,
        beforeMain,
    };
};

module.exports = createProcessingEnvironment;
