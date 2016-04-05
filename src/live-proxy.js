const createProcessingEnvironment = require('./processing-environment');
const customWindow = require('./custom-window');
const { handleUpdate } = require('./update-code');
const KAProcessing = require('./ka-processing');

module.exports = {
    createProcessingEnvironment,
    customWindow,
    handleUpdate,
    KAProcessing,
};
