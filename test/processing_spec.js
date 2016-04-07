const { handleUpdate } = require('../src/update-code');
const createProcessingEnvironment = require('../src/processing-environment');
const KAProcessing = require('../src/ka-processing');
const { getCode } = require('./helpers');
const assert = require('assert');

describe('ProcessingJS', () => {
    let customLibrary = null;
    let canvas = null;
    let customUpdate = null;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        document.body.appendChild(canvas);

        const p = new KAProcessing(canvas);
        customLibrary = createProcessingEnvironment(p, e => console.log(e));

        const emptyDelegate = {
            displayLint() {},
            displayException() {},
            successfulRun() {},
        };
        customUpdate = code => handleUpdate(code, emptyDelegate, customLibrary);
    });

    afterEach(() => {
        document.body.removeChild(canvas);
    });

    describe('draw', () => {
        it('should stop calling draw on an exception', () => {
        });

        it('should start calling draw after clearing the exception', () => {

        });
    });

    describe('style globals', () => {
        describe('fill', () => {
            it('should update the state globals', () => {
                customUpdate(getCode(() => {
                    fill(0, 0, 255);
                }));

                assert.deepEqual(customLibrary.state.fill, [0, 0, 255]);
            });

            it('should change state global to modified state if value in main is the same', () => {
                customUpdate(getCode(() => {
                    fill(0, 0, 255);
                    rect(100, 100, 100, 100);
                }));

                customLibrary.object.fill(0, 255, 0);

                customUpdate(getCode(() => {
                    fill(0, 0, 255);
                    rect(200, 200, 100, 100);
                }));

                assert.deepEqual(customLibrary.state.fill, [0, 255, 0]);
            });

            it('should set the state global to the value at the end of main if different at the end of main', () => {
                customUpdate(getCode(() => {
                    fill(0, 0, 255);
                    rect(100, 100, 100, 100);
                }));

                customLibrary.object.fill(0, 255, 0);

                customUpdate(getCode(() => {
                    fill(0, 255, 255);
                    rect(200, 200, 100, 100);
                }));

                assert.deepEqual(customLibrary.state.fill, [0, 255, 255]);
            });

            it('should reset the state if state change calls are removed', () => {
                customUpdate(getCode(() => {
                    fill(0, 0, 255);
                    rect(100, 100, 100, 100);
                }));

                customUpdate(getCode(() => {
                    rect(200, 200, 100, 100);
                }));

                // white is the default fill color
                assert.deepEqual(customLibrary.state.fill, [255, 255, 255]);
            });
        });

        describe('stroke/noStroke', () => {
            it('update isStroked', () => {
                customUpdate(getCode(() => {
                    stroke(0, 0, 255);
                    noStroke();
                }));

                assert.deepEqual(customLibrary.state.stroke, [0, 0, 255]);
                assert.equal(customLibrary.state.isStroked, false);

                customUpdate(getCode(() => {
                    noStroke();
                    stroke(0, 0, 255);
                }));

                assert.equal(customLibrary.state.isStroked, true);
            });

            it("should use the updated value of isStroked if main doesn't change the value between runs", () => {
                customUpdate(getCode(() => {
                    stroke(0, 0, 255);
                    noStroke();
                }));

                customLibrary.object.stroke(255, 0, 0);

                customUpdate(getCode(() => {
                    stroke(0, 0, 255);
                    noStroke();
                }));

                assert.deepEqual(customLibrary.state.stroke, [255, 0, 0]);
                assert.equal(customLibrary.state.isStroked, true);
                // it's true because isStroked was the same after both runs
                // so we set the state it was in between
            });

            it("should use state from the end of the second run", () => {
                customUpdate(getCode(() => {
                    stroke(0, 0, 255);
                    noStroke();
                }));

                customLibrary.object.stroke(255, 0, 0);
                customLibrary.object.noStroke();

                customUpdate(getCode(() => {
                    stroke(0, 255, 0);
                }));

                assert.deepEqual(customLibrary.state.stroke, [0, 255, 0]);
                assert.equal(customLibrary.state.isStroked, true);
            });
        });
    });
});
