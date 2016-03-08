const md5 = require('blueimp-md5');

const transform = require('./transform');
const customWindow = require('./custom-window');


const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});


// env stores objects between code changes
// TODO: rename this to context
const env = {};

// archive stores hashes of stringified objects
// The key is the object's identifier.  The object is stringified right (and
// hashed) after the main body of the user code is run.  If the hashes match
// then that means that the main body didn't do anything different when creating
// that object from the last time it was run so it's safe to keep the object
// that's inside env.  If not, we replace the object in env with the newly
// initialized object for that identifier.
// TODO: figure out how to save space if multiple identifiers point to the same object
const archive = {};



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


const injectFunctions = function(newEnv, funcList) {
    Object.keys(archive).forEach(name => {
        const value = archive[name];

        if (typeof value === 'function') {
            Object.keys(value.prototype).forEach(key => {
                delete value.prototype[key];
            });

            Object.defineProperty(newEnv, name, {
                enumerable: true,
                get() {
                    return funcList[name] ? value : undefined;
                },
                set(newValue) {
                    if (newValue.toString() !== value.toString()) {
                        // TODO: re-run the whole thing
                        // if there are no objects created by calling the
                        // constructor then we don't have to rerun anything
                        archive[name] = newValue;
                    }
                    funcList[name] = true;
                }
            });
        }
    });
};


const updateEnvironments = function(env, newEnv, funcList) {
    Object.keys(newEnv).forEach(name => {
        const value = newEnv[name];

        if (typeof value === 'object') {
            const hash = md5(JSON.stringify(value));

            // even though we don't do anything with newEnv directly,
            // the objects it stores can be updated via callbacks and
            // event handlers that are running in between updates to the
            // code
            if (archive[name] === hash) {
                newEnv[name] = env[name];
            } else {
                env[name] = newEnv[name];
                archive[name] = hash;
            }
        } else if (typeof value === 'function') {
            if (archive.hasOwnProperty(name)) {
                // if the function is in the archive but we didn't
                // define the last time the code changed delete it
                if (!funcList[name]) {
                    delete archive[name];
                }
            } else {
                // if the function isn't in the archive add it
                archive[name] = value;
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
        console.log(messages);
        canvas.style.opacity = 0.5;
    } else {
        try {
            const transformedCode = transform(code, p, customWindow.window);
            window.transformedCode = transformedCode;

            const func = new Function('__env__', 'customWindow', 'p', transformedCode);
            const newEnv = {};
            const funcList = {};    // functions being defined during this run

            injectFunctions(newEnv, funcList);

            func(newEnv, customWindow.window, p);

            updateEnvironments(env, newEnv, funcList);

            canvas.style.opacity = 1.0;
        } catch(e) {
            canvas.style.opacity = 0.5;
        }
    }
};

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", handleUpdate);
    });
