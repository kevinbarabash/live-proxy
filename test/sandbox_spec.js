describe('Sandboxing', () => {
    it('should fail', () => {
        expect(true).to.be(false);
    });

    describe('.toString()', () => {
        it('should work on functions', () => {

        });

        it('should work on methods', () => {

        });
    });

    describe('global objects (window)', () => {
        it(`'window' refers to the custom window object`, () => {

        });

        it(`unbound 'this' refers to the custom window object`, () => {

        });
    });
});
