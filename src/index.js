const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});


fetch('example.js')
    .then(res => res.text())
    .then(text => {
        editor.setValue(text);

        const messages = eslint.verify(text, {
            rules: {
                semi: 2
            }
        });

        if (messages.length > 0) {
            console.log(messages);
        } else {
            eval(text);
        }
    });

editor.on("input", function() {
    var code = editor.getValue();

    const messages = eslint.verify(code, {
        rules: {
            semi: 2
        }
    });

    if (messages.length > 0) {
        console.log(messages);
    } else {
        eval(code);
    }
});

console.log('hello, world!');
