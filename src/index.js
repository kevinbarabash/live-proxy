const md5 = require('blueimp-md5');
const transform = require('./transform');

const canvas = document.getElementById("canvas");

const p = new Processing(canvas, (processing) => {
    processing.width = canvas.width;
    processing.height = window.innerHeight;

    processing.draw = function () {};
});

const env = {};
const archive = {};

fetch('example.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);

        const messages = eslint.verify(code, {
            rules: {
                semi: 2
            }
        });

        if (messages.length > 0) {
            console.log(messages);
        } else {
            try {
                const transformedCode = transform(code, p);
                const func = new Function('__env__', 'p', transformedCode);
                func(env, p);

                Object.keys(env).forEach(key => {
                    const value = env[key];
                    if (typeof value === 'object') {
                        const hash = md5(JSON.stringify(value));
                        console.log(`${key} = ${hash}`);
                        archive[key] = hash;
                    }
                });
                canvas.style.opacity = 1.0;
            } catch(e) {
                console.log(e);
                canvas.style.opacity = 0.5;
            }
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
        try {
            const transformedCode = transform(code, p);
            window.transformedCode = transformedCode;
            const func = new Function('__env__', 'p', transformedCode);
            const newEnv = {};
            func(newEnv, p);

            Object.keys(newEnv).forEach(name => {
                const value = newEnv[name];
                if (typeof value === 'object') {
                    const hash = md5(JSON.stringify(value));
                    if (archive[name] === hash) {
                        newEnv[name] = env[name];
                    } else {
                        archive[name] = hash;
                        env[name] = newEnv[name];
                    }
                }
            });
            canvas.style.opacity = 1.0;
        } catch(e) {
            console.log(e);
            canvas.style.opacity = 0.5;
        }
    }
});

console.log('hello, world!');
