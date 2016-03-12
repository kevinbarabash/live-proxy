const md5 = require('blueimp-md5');

const transform = require('./transform');
const customWindow = require('./custom-window');


const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});

const stateModifiers = [
    'colorMode',
    'ellipseMode',
    'fill',
    'frameRate',
    'imageMode',
    'rectMode',
    'stroke',
    'strokeCap',
    'strokeWeight'
];

const clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

const compare = function(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const state = {
    background: [255, 255, 255],
    colorMode: [p.RGB],
    ellipseMode: [p.CENTER],
    fill: [255, 255, 255],
    frameRate: [60],
    imageMode: [p.CORNER],
    rectMode: [p.CORNER],
    stroke: [0, 0, 0],
    strokeCap: [p.ROUND],
    strokeWeight: [1],
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


// Persists objects between code changes and re-runs of the code.
const persistentContext = {};

let context = {};

// The key is the object's identifier.  The object is stringified right (and
// hashed) after the main body of the user code is run.  If the hashes match
// then that means that the main body didn't do anything different when creating
// that object from the last time it was run so it's safe to keep the object
// that's inside env.  If not, we replace the object in env with the newly
// initialized object for that identifier.
// TODO: figure out how to save space if multiple identifiers point to the same object
const objectHashes = {};



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
    "keyTyped"
];

const pGlobals = "/*global " +
    Object.keys(p)
        .filter(key => !(key[0] === '_' && key[1] === '_'))
        .map(key => eventHandlers.includes(key) ? `${key}:true` : key)
        .join(" ") +
    "*/\n";


const injectFunctions = function(newContext, funcList) {
    Object.keys(persistentContext).forEach(name => {
        const value = persistentContext[name];

        if (typeof value === 'function') {
            // delete methods on the function so that they can be redefined
            Object.keys(value.prototype).forEach(key => {
                delete value.prototype[key];
            });

            Object.defineProperty(newContext, name, {
                enumerable: true,
                get() {
                    return funcList[name] ? value : undefined;
                },
                set(newValue) {
                    if (newValue.toString() !== value.toString()) {
                        // TODO: re-run the whole thing
                        // if there are no objects created by calling the
                        // constructor then we don't have to rerun anything
                        persistentContext[name] = newValue;
                    }
                    funcList[name] = true;
                }
            });
        }
    });
};


const updateEnvironments = function(persistentContext, newContext, funcList) {
    Object.keys(newContext).forEach(name => {
        const value = newContext[name];

        if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
            const hash = value === customWindow.window
                ? 'customWindow'
                : md5(JSON.stringify(value));

            // Even though we don't do modify newContext directly, the objects
            // it stores can be updated via callbacks and event handlers that
            // are running in between updates to the code.  The objects in
            // persistentContext will contain any changes to those objects.  As
            // long as the hashes match it's safe to replace the object in the
            // new context with the one that's been accumulating changes from
            // the persisten context.
            if (objectHashes[name] === hash) {
                newContext[name] = persistentContext[name];
            } else {
                persistentContext[name] = newContext[name];
                objectHashes[name] = hash;
            }
        } else if (typeof value === 'function') {
            if (persistentContext.hasOwnProperty(name)) {
                // if the function is in the persistent context but we didn't
                // define the last time the code changed delete it
                if (!funcList[name]) {
                    delete persistentContext[name];
                }
            } else {
                // if the function isn't in the persitent context add it
                persistentContext[name] = value;
            }
        }
    });
};


// TODO: provide a hook to reset the seed for manual restarts of the program
var seed = Math.floor(Math.random() * 4294967296);
var DUMMY = function() {};

const beforeMain = function() {
    p.randomSeed(seed);

    eventHandlers.forEach(eventName => {
        p[eventName] = DUMMY;
    });

    // capture state before main so that we can restore if after running main
    Object.assign(beforeState, clone(state));

    // reset state to handle deleting of state changing commands
    stateModifiers.forEach(name => {
        p[name](...defaultState[name]);
    });

    // p.textAlign(37, 0);
    // p.textAscent(9);
    // p.textDescent(12);
    // p.textFont("Arial", 12);
    // p.textLeading(14);
    // p.textSize(1);
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

const handleUpdate = function() {
    var code = editor.getValue();

    const messages = eslint.verify(pGlobals + customWindow.globals + code, {
        rules: {
            "semi": 2,
            "no-undef": 2
        }
    });

    if (messages.length > 0) {
        displayLint(messages);
        canvas.style.opacity = 0.5;
    } else {
        displayLint(messages);
        try {
            const transformedCode = transform(code, p, customWindow.window);
            window.transformedCode = transformedCode;

            // grab the current values before re-running the function
            Object.keys(context).forEach(name => {
                const value = context[name];
                if (typeof value === 'number' || typeof value === 'string' || typeof value === 'object') {
                    persistentContext[name] = value;
                }
            });

            const func = new Function('__env__', 'customWindow', 'p', 'displayException', transformedCode);
            // TODO: expand funcList to include all data types
            const funcList = {};    // functions being defined during this run
            context = {};

            injectFunctions(context, funcList);

            beforeMain();

            func(context, customWindow.window, p, displayException);

            afterMain();

            updateEnvironments(persistentContext, context, funcList);

            canvas.style.opacity = 1.0;
        } catch(e) {
            displayException(e);
            canvas.style.opacity = 0.5;
        }
    }
};


const displayLint = function(messages) {
    const messageContainer = document.querySelector('#messages');

    messageContainer.innerHTML = messages.map(message => {
        return `${message.message} on line ${message.line - 2} column ${message.column}<BR>`;
    }).join('');
};


const displayException = function(e) {
    const messageContainer = document.querySelector('#messages');

    messageContainer.innerHTML = `${e.name}: ${e.message}`;
};


fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", handleUpdate);
    });
