const transform = require('./transform');
const { createProxy } = require('./proxy');

// TODO: allow users to specify these or not
const loopChecker = require('./loop-checker');
const customWindow = require('./custom-window');

// cpature objects and values for a single run of the code
let context = {};

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

        // TODO: expand this to simply be !function
        if (['object', 'string', 'number'].includes(typeof value)) {
            const hash = value === customWindow.window
                ? 'customWindow'
                : objectHash(value, { respectType: false, ignoreUnknown: true });

            // Even though we don't do modify newContext directly, the objects
            // it stores can be updated via callbacks and event handlers that
            // are running in between updates to the code.  The objects in
            // persistentContext will contain any changes to those objects.  As
            // long as the hashes match it's safe to replace the object in the
            // new context with the one that's been accumulating changes from
            // the persistent context.
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


const updateCode = function(code, customLibrary) {
    const { transformedCode, globals, libraryGlobals } = transform(code, customWindow, customLibrary);

    const params = ['__env__', customWindow.name, customLibrary.name, 'getSource', 'loopChecker'];
    const main = Function(...params, transformedCode);

    // grab the current values before re-running the function
    Object.keys(context).forEach(name => {
        const value = context[name];
        // TODO: expand to this to be simply !function
        if (['number', 'string', 'object'].includes(typeof value)) {
            persistentContext[name] = value;
        }
    });

    const getSource = (start, end) => code.substring(start, end);

    context = {};   // reset before capturing values

    injectProxies(context, globals);

    customLibrary.beforeMain(libraryGlobals);

    main(context, customWindow.object, customLibrary.object, getSource, loopChecker);

    customLibrary.afterMain();

    // TODO: expand funcList to include all data types
    const funcList = {};    // functions being defined during this run
    updateEnvironments(persistentContext, context, funcList);

    return context; // used for testing
};

const emptyLibrary = {
    object: {},
    name: '__library__',
    globals: '',
    beforeMain() {},
    afterMain() {},
};

const emptyDelegate = {
    displayLint() {},
    displayException() {},
    successfulRun() {},
};

// Assumes that the code has already been linted
const handleUpdate = function(code, delegate = emptyDelegate, customLibrary = emptyLibrary) {
    try {
        const context = updateCode(code, customLibrary);
        delegate.successfulRun();
        return context;
    } catch(e) {
        delegate.displayException(e);
    }
};

module.exports = {
    handleUpdate: handleUpdate
};
