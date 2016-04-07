const imageCache = {};

const loadImage = function(filename) {
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

module.exports = {
    imageCache: imageCache,
    loadImage: loadImage,
};
