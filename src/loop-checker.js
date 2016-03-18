let elapsed = 0;
let start = 0;
let delay = 500;
let total = 0;

var reset = function() {
    elapsed = 0;
    delay = 500;
    start = Date.now();
};

var YES = true;

var check = function() {
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
            elapsed = 0;
            delay = delay * 2;
            start = Date.now();
        } else {
            delay = 500;
            throw new Error('Infinite Loop');
        }
    }
};

module.exports = {
    check: check,
    reset: reset
};
