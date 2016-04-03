const { handleUpdate } = require('../src/update-code');

describe('Live Updating', () => {
    it('should succeed', () => {
        expect(true).to.be(true);
    });

    describe('updating objects', () => {
        it.only('should only reset state for objects that have been updated', () => {
            handleUpdate('console.log("hello, world!");');
        });
    });

    describe('updating methods', () => {
        it('calling a deleted method should fail', () => {

        });
    });

    describe('globals', () => {
        it('globals declared without var should appear on customWindow', () => {

        });

        it('should not remove globals for customWindow if they were added/modified in a callback', () => {

        });

        it('should allow globals declared with var to be deleted from the context', () => {

        });
    });
});
