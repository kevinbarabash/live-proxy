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

const specialStateModifiers = {
    noStroke: state => state.isStroked = false,
    stroke: state => state.isStroked = true,
};

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

const createProcessingEnvironment = function(p, displayException = DUMMY) {
    const defaultState = {
        colorMode: [p.RGB],
        ellipseMode: [p.CENTER],
        fill: [255, 255, 255],
        frameRate: [60],
        imageMode: [p.CORNER],
        noStroke: [],
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

    const dontTrack = function(fn) {
        return (...args) => {
            tracking = false;
            fn(...args);
            tracking = true;
        }
    };

    stateModifiers.forEach(name => {
        let func = p[name];

        Object.defineProperty(p, name, {
            get() {
                return (...args) => {
                    if (specialStateModifiers[name] && tracking) {
                        specialStateModifiers[name](state);
                    }
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
            }
        });
    });

    let seed = Math.floor(Math.random() * 4294967296);

    const reset = () => {
        p.draw = DUMMY;
        p.background(255, 255, 255);

        seed = Math.floor(Math.random() * 4294967296);
    };

    const beforeMain = dontTrack(() => {
        p.randomSeed(seed);

        // TODO: make angleMode a function in processing-js like rectMode, etc.
        p.angleMode = 'degrees';

        if (p.draw === DUMMY) {
            p.background(255, 255, 255);
        }

        eventHandlers.forEach(eventName => p[eventName] = DUMMY);

        // capture state before main so that we can restore if after running main
        Object.assign(beforeState, clone(state));

        // reset state to handle deleting of state changing commands
        stateModifiers.forEach(name => p[name](...defaultState[name]));

        state.isStroked = defaultState.isStroked;
    });

    const afterMain = dontTrack(() => {
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
    });

    // expose p as a global for debugging purposes
    window.p = p;

    reset();

    return {
        name,
        object,
        globals,

        reset,
        afterMain,
        beforeMain,
    };
};

module.exports = createProcessingEnvironment;
