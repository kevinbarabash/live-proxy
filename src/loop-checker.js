require('visibly.js');

var elapsed = 0;
var start = 0;
var delay = 500;
var total = 0;
var disabled = false;

var reset = function() {
    elapsed = 0;
    delay = 500;
    start = Date.now();
};

var YES = true;

var check = function() {
    if (disabled) return;

    elapsed = Date.now() - start;
    if (elapsed > delay) {
        total += delay;
        const response = window.confirm(
            'Browser feeling laggy?\n\n' +
            `This program has been running for ${total} milliseconds ` +
            'without letting the browser do the stuff it needs to do.\n\n' +
            'Cancel to stop the program.\n' +
            'OK to keep running.'
        );

        if (response === YES) {
            delay = delay * 2;
            start = Date.now();
        } else {
            delay = 500;
            start = Date.now();
            throw new Error('Infinite Loop');
        }
    }
};

visibly.onHidden(() => {
    disabled = true;
});

visibly.onVisible(() => {
    disabled = false;
    reset();
});

module.exports = {
    check: check,
    reset: reset
};
