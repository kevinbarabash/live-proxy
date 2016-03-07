const md5 = require('blueimp-md5');
const transform = require('./transform');

const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});

const env = {};
const archive = {};

// TODO: make pre-defined items unconfigurable but allow globals to be created
// TODO: add more stuff this this list
const customWindow = {
    // global methods
    parseInt: parseInt,
    parseFloat: parseFloat,

    setTimeout: setTimeout,     // wrap this so we can cleanup timeouts
    clearTimeout: clearTimeout,
    setInterval: setInterval,   // wrap this so we can cleanup interval
    clearInterval: clearInterval,

    // global objects
    Number: Number,
    RegExp: RegExp,
    Object: Object,
    String: String,
    Array: Array,
    JSON: JSON,
    Date: Date,
};

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);

        const messages = eslint.verify(code, {
            rules: {
                semi: 2
            }
        });

        if (messages.length > 0) {
            // console.log(messages);
            canvas.style.opacity = 0.5;
        } else {
            try {
                const transformedCode = transform(code, p, customWindow);
                const func = new Function('__env__', 'customWindow', 'p', transformedCode);
                func(env, customWindow, p);

                Object.keys(env).forEach(key => {
                    const value = env[key];
                    if (typeof value === 'object') {
                        const hash = md5(JSON.stringify(value));
                        archive[key] = hash;
                    } else if (typeof value === 'function') {
                        archive[key] = value;
                    }
                });

                canvas.style.opacity = 1.0;
            } catch(e) {
                canvas.style.opacity = 0.5;
            }
        }
    }).then(() => {
        editor.on("input", function() {
            var code = editor.getValue();

            const messages = eslint.verify(code, {
                rules: {
                    semi: 2
                }
            });

            if (messages.length > 0) {
                canvas.style.opacity = 0.5;
            } else {
                try {
                    const transformedCode = transform(code, p, customWindow);
                    const func = new Function('__env__', 'customWindow', 'p', transformedCode);
                    const newEnv = {};
                    const funcList = {};    // keeps track of functions being defined during this run

                    window.transformedCode = transformedCode;

                    // TODO: create separate archives for functions
                    // that we we don't have to go through all objects just to
                    // find the functions
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
                                        // TODO: rewrite NewExpressions so we can track which constructors have been called
                                        archive[name] = newValue;
                                    }
                                    funcList[name] = true;
                                }
                            });
                        }
                    });

                    func(newEnv, customWindow, p);

                    Object.keys(newEnv).forEach(name => {
                        const value = newEnv[name];
                        if (typeof value === 'object') {
                            const hash = md5(JSON.stringify(value));
                            if (archive[name] === hash) {
                                newEnv[name] = env[name];
                            } else {
                                archive[name] = hash;
                                env[name] = newEnv[name];
                            }
                        } else if (typeof value === 'function') {
                            // remove the function if it wasn't defined during
                            // the most recent run
                            if (!funcList[name]) {
                                delete archive[name];
                            }
                        }
                    });

                    canvas.style.opacity = 1.0;
                } catch(e) {
                    canvas.style.opacity = 0.5;
                }
            }
        });
    });
