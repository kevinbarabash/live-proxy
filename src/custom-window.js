// TODO: make pre-defined items unconfigurable but allow globals to be created
// TODO: add more stuff this this list
const win = {
    // global methods
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    setTimeout: setTimeout,     // wrap this so we can cleanup timeouts
    clearTimeout: clearTimeout,
    setInterval: setInterval,   // wrap this so we can cleanup interval
    clearInterval: clearInterval,

    // global objects
    Object: Object,
    Array: Array,
    // Function: Function,      // disallow access because it's a form of eval
    Boolean: Boolean,
    Number: Number,
    String: String,
    RegExp: RegExp,
    Date: Date,
    JSON: JSON,
    Math: Math,
    console: console,

    // special values
    "undefined": undefined,
    "Infinity": Infinity,
    "NaN": NaN,
};

const globals = "/*global " + Object.keys(win).join(" ") + "*/\n";

module.exports = {
    name: '__window__',
    object: win,
    globals: globals,
};
