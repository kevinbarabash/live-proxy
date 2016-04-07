const customWindow = require('./custom-window');
const { handleUpdate } = require('./update-code');

// TODO: create a separate build for the demo move these files there
const createProcessingEnvironment = require('./processing-environment');
const KAProcessing = require('./ka-processing');
const { loadImage } = require('./resource-cache');
const avatars = require('./avatars');

module.exports = {
    customWindow,
    handleUpdate,

    createProcessingEnvironment,
    KAProcessing,
    loadImage,
    avatars,
};
