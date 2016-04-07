const { imageCache } = require('./resource-cache');

module.exports = canvas => {
    return new Processing(canvas, p => {
        p.width = canvas.width;
        p.height = canvas.height;

        // Add custom methods
        p.getImage = filename => {
            return new p.PImage(imageCache[filename]);
        };
    });
};
