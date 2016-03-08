const md5 = require('blueimp-md5');

const transform = require('./transform');
const customWindow = require('./custom-window');


const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});


// Persists objects between code changes and re-runs of the code.
const persistentContext = {};

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

        if (typeof value === 'object') {
            const hash = md5(JSON.stringify(value));

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

            const func = new Function('__env__', 'customWindow', 'p', transformedCode);
            const newContext = {};
            const funcList = {};    // functions being defined during this run

            injectFunctions(newContext, funcList);

            func(newContext, customWindow.window, p);

            updateEnvironments(persistentContext, newContext, funcList);

            canvas.style.opacity = 1.0;
        } catch(e) {
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


fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", handleUpdate);
    });
