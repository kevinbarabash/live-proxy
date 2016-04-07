const assert = require('assert');

const { handleUpdate } = require('../src/live-proxy');
const { getCode } = require('./helpers');

describe('Sandboxing', () => {
    describe('.toString()', () => {
        it('should work on functions', () => {
            const context = handleUpdate(getCode(() => {
                function foo() {
                    console.log('hello, world');
                }
            }));

            const src = "function foo() {\n    console.log('hello, world');\n}";
            assert.equal(context.foo.toString(), src);
        });

        it('should work on methods', () => {
            const context = handleUpdate(getCode(() => {
                function Point(x, y) {
                    this.x = x;
                    this.y = y;
                }

                Point.prototype.length = function() {
                    return Math.sqrt(this.x * this.x + this.y * this.y);
                };

                var p = new Point(5, 10);
            }));

            const src = "function () {\n    return Math.sqrt(this.x * this.x + this.y * this.y);\n}";
            assert.equal(context.p.length.toString(), src);
        });
    });

    describe('global objects (window)', () => {
        it(`'window' refers to the custom window object`, () => {
            const context = handleUpdate(getCode(() => {
                var win = window;
            }));

            assert.notEqual(context.win, window);

            assert(context.win.console);
            assert(context.win.JSON);
            assert(context.win.Math);
        });

        it(`unbound 'this' refers to the custom window object`, () => {
            const context = handleUpdate(getCode(() => {
                var win = (function() { return this; })();
            }));

            assert.notEqual(context.win, window);

            assert(context.win.console);
            assert(context.win.JSON);
            assert(context.win.Math);
        });
    });
});
