const transform = require('./transform');
const customWindow = require('./custom-window');
const loopChecker = require('./loop-checker');
const { createProxy } = require('./proxy');
const { beforeMain, afterMain, p, pGlobals } = require('./processing-environment');

const canvas = document.getElementById("canvas");


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

const proxies = {};

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


const handleUpdate = function(code, displayLint, displayException) {
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

            const func = new Function('__env__', 'customWindow', '__p__', 'getSource', 'loopChecker', transformedCode);

            // TODO: expand funcList to include all data types
            const funcList = {};    // functions being defined during this run
            context = {};
            window.context = context;

            injectProxies(context, globals);

            beforeMain();

            func(context, customWindow.window, p, getSource, loopChecker);

            afterMain();

            updateEnvironments(persistentContext, context, funcList);

            canvas.style.opacity = 1.0;
        } catch(e) {
            displayException(e);
            canvas.style.opacity = 0.5;
        }
    }
};

module.exports = {
    handleUpdate: handleUpdate
};
