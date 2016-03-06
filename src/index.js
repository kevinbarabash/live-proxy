var canvas = document.getElementById("canvas");

var p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});


fetch('example.js')
    .then(res => res.text())
    .then(text => {
        editor.setValue(text);
        eval(text);
    });
