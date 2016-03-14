const transform = require('./transform');
const customWindow = require('./custom-window');

const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = canvas.height;

    processing.draw = function () {};
});

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
    'strokeWeight'
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
    "keyTyped"
];

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

p.draw = DUMMY;
p.background(255, 255, 255);


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


const injectProxies = function(context, globals) {
    Object.keys(globals).forEach(name => {
        let value = undefined;

        Object.defineProperty(context, name, {
            enumerable: true,
            get() {
                return value;
            },
            set(newValue) {
                if (typeof newValue === 'function') {
                    if (!proxies.hasOwnProperty(newValue.name)) {
                        proxies[newValue.name] = createProxy(newValue);
                    } else {
                        //     Object.keys(proxy.prototype).forEach(name => {
                        //         delete proxy.prototype[name];
                        //     });
                    }
                    const proxy = proxies[newValue.name];
                    proxy.update(newValue);
                    value = proxy;
                } else {
                    value = newValue;
                }
            }
        });
    });
};


const updateEnvironments = function(persistentContext, newContext, funcList) {
    Object.keys(newContext).forEach(name => {
        const value = newContext[name];

        if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
            const hash = value === customWindow.window
                ? 'customWindow'
                : objectHash(value, { respectType: false, ignoreUnknown: true });

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
            const { transformedCode, globals } = transform(code, p, customWindow.window);
            window.transformedCode = transformedCode;

            // grab the current values before re-running the function
            Object.keys(context).forEach(name => {
                const value = context[name];
                if (typeof value === 'number' || typeof value === 'string' || typeof value === 'object') {
                    persistentContext[name] = value;
                }
            });

            const getSource = function(start, end) {
                return code.substring(start, end);
            };

            const func = new Function('__env__', 'customWindow', '__p__', 'getSource', transformedCode);
            // TODO: expand funcList to include all data types
            const funcList = {};    // functions being defined during this run
            context = {};
            window.context = context;

            injectProxies(context, globals);

            beforeMain();

            func(context, customWindow.window, p, getSource);

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

const proxies = {};

const createProxy = function(constructor) {
    let currentConstructor = constructor;

    const ProxyClass = new Function('getCurrentConstructor',
        `return function ${constructor.name}() { return getCurrentConstructor().apply(this, arguments); }`
    )(() => currentConstructor);

    Object.keys(constructor.prototype).forEach(name => {
        ProxyClass.prototype[name] = constructor.prototype[name];
    });

    ProxyClass.toString = constructor.toString;

    ProxyClass.update = function(newConstructor) {
        currentConstructor = newConstructor;

        // copy over new methods because they reference variables from
        // the new context
        Object.keys(newConstructor.prototype).forEach(name => {
            ProxyClass.prototype[name] = newConstructor.prototype[name];
        });

        ProxyClass.toString = newConstructor.toString;
    };

    return ProxyClass;
};

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", handleUpdate);
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
