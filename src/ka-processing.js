const avatars = require('./avatars');

// it should be safe to load the images only once
const imageCache = {};

const loadImage = function(imageCache, filename) {
    const img = document.createElement('img');

    const promise = new Promise((resolve, reject) => {
        img.onload = () => {
            console.log(filename);
            imageCache[filename] = img;
            resolve();
        };
        img.onerror = () => {
            resolve(); // always resolve
        };
    });

    img.src = `images/${filename}.png`;

    return promise;
};

avatars.forEach(avatar => loadImage(imageCache, `avatars/${avatar}`));

module.exports = canvas => {
    return new Processing(canvas, (p) => {
        p.width = canvas.width;
        p.height = canvas.height;

        // Add custom methods
        p.getImage = filename => {
            return new p.PImage(imageCache[filename]);
        };
    });
};
