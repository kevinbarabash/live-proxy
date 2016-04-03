const { handleUpdate } = require('../src/update-code');
const { getCode } = require('./helpers');

describe('Live Updating', () => {
    describe('updating objects in the main loop', () => {
        it('should reuse an object if the values are the same', () => {
            const context1 = handleUpdate(getCode(() => {
                var p1 = { x: 5, y: 10 };
            }));

            const context2 = handleUpdate(getCode(() => {
                var p1 = {};
                p1.x = 5;
                p1.y = 10;
            }));

            expect(context2.p1).to.be(context1.p1);
        });

        it('should use a new object if the values are the different', () => {
            const context1 = handleUpdate(getCode(() => {
                var p1 = { x: 5, y: 10 };
                var p2 = { x: 5, y: 10 };
            }));

            const context2 = handleUpdate(getCode(() => {
                var p1 = { x: 5, y: 10 };
                var p2 = { x: 50, y: 100 };
            }));

            expect(context2.p1).to.be(context1.p1);
            expect(context2.p2).to.not.be(context1.p2);
        });

        it('should reuse an object if a sub-object is the same', () => {
            const context1 = handleUpdate(getCode(() => {
                var p = { x: 5, y: 10 };
                var obj = {
                    p: p
                };
            }));

            const context2 = handleUpdate(getCode(() => {
                var p = { x: 5, y: 10 };
                var obj = {};
                obj.p = p;
            }));

            expect(context2.obj).to.be(context1.obj);
        });

        it('should use a new object if a sub-object changes', () => {
            const context1 = handleUpdate(getCode(() => {
                var p = { x: 5, y: 10 };
                var obj = {
                    p: p
                };
            }));

            const context2 = handleUpdate(getCode(() => {
                var p = { x: 50, y: 100 };
                var obj = {
                    p: p
                };
            }));

            expect(context2.obj).to.not.be(context1.obj);
        });

        // TODO: consider changing this behavior
        it('should use a new object if a function property changes', () => {
            const context1 = handleUpdate(getCode(() => {
                var obj = {
                    foo: function() { console.log('foo') }
                };
            }));

            const context2 = handleUpdate(getCode(() => {
                var obj = {
                    foo: function() { console.log('bar') }
                };
            }));

            expect(context2.obj).to.not.be(context1.obj);
        });
    });

    describe('user code updating values outside main loop', () => {
         it('should maintain the modified values if the main values are sthe same', () => {
             const context1 = handleUpdate(getCode(() => {
                 var obj = { x: 5, y: 10 };
                 var num = 23;
                 var str = 'hello';
             }));

             context1.p1 = { x: 50, y: 100 };
             context1.num = 42;
             context1.str = 'goodbye';

             const context2 = handleUpdate(getCode(() => {
                 var obj = {};
                 obj.x = 5;
                 obj.y = 10;
                 var num = 23;
                 var str = 'hello';
             }));

             expect(context2.obj).to.be(context1.obj);
             expect(context2.num).to.be(context1.num);
             expect(context2.str).to.be(context1.str);
         });

        it('should reset the modified values if their main values change', () => {
            const context1 = handleUpdate(getCode(() => {
                var obj = { x: 5, y: 10 };
                var num = 23;
                var str = 'hello';
            }));

            context1.p1 = { x: 50, y: 100 };
            context1.num = 42;
            context1.str = 'goodbye';

            const context2 = handleUpdate(getCode(() => {
                var obj = {};
                obj.x = -5;
                obj.y = -10;
                var num = 123;
                var str = 'hello, world';
            }));

            expect(context2.obj).to.not.be(context1.obj);
            expect(context2.num).to.not.be(context1.num);
            expect(context2.str).to.not.be(context1.str);
        });
    });

    describe('updating methods', () => {
        it('should handle adding methods', () => {
            const context1 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                Foo.prototype.getX = function() {
                    return this.x;
                };
                var foo = new Foo(10);
            }));

            expect(context1.foo.getX()).to.be(10);

            const context2 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                Foo.prototype.getX = function() {
                    return this.x;
                };
                Foo.prototype.get2X = function() {
                    return 2 * this.x;
                };
                var foo = new Foo(10);
            }));

            expect(context2.foo).to.be(context1.foo);
            expect(context2.foo.getX()).to.be(10);
            expect(context2.foo.get2X()).to.be(20);
        });

        it('should handle modifying methods', () => {
            const context1 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                Foo.prototype.getX = function() {
                    return this.x;
                };
                var foo = new Foo(10);
            }));

            expect(context1.foo.getX()).to.be(10);

            const context2 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                Foo.prototype.getX = function() {
                    return 'x = ' + this.x;
                };
                var foo = new Foo(10);
            }));

            expect(context2.foo).to.be(context1.foo);
            expect(context2.foo.getX()).to.be('x = 10');
        });

        it('should handle deleting methods', () => {
            const context1 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                Foo.prototype.getX = function() {
                    return this.x;
                };
                var foo = new Foo(10);
            }));

            expect(context1.foo.getX()).to.be(10);

            const context2 = handleUpdate(getCode(() => {
                var Foo = function(x) {
                    this.x = x;
                };
                var foo = new Foo(10);
            }));

            expect(context2.foo).to.be(context1.foo);
            expect(context2.foo.getX).to.be(undefined);
        });
    });

    describe.skip('globals', () => {
        it('globals declared without var should appear on customWindow', () => {

        });

        it('should not remove globals for customWindow if they were added/modified in a callback', () => {

        });

        it('should allow globals declared with var to be deleted from the context', () => {

        });
    });
});
