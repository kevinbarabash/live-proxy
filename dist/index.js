const canvas = document.getElementById("canvas");
const { createProcessingEnvironment, handleUpdate, KAProcessing, customWindow } = LiveProxy;

const delegate = {
    displayLint(messages) {
        const messageContainer = document.querySelector('#messages');

        messageContainer.innerHTML = messages.map(message => {
            return `${message.message} on line ${message.line - 2} column ${message.column}<BR>`;
        }).join('');

        if (messages.length > 0) {
            canvas.style.opacity = 0.5;
        } else {
            canvas.style.opacity = 1.0;
        }
    },

    displayException(e) {
        const messageContainer = document.querySelector('#messages');

        messageContainer.innerHTML = `${e.name}: ${e.message}`;

        canvas.style.opacity = 0.5;

        // TODO: should actually stop the program
    },

    successfulRun() {
        canvas.style.opacity = 1.0;
    }
};


const lintCode = function(code, customLibrary) {
    const globals = customLibrary.globals + customWindow.globals;

    return eslint.verify(globals + code, {
        rules: {
            "semi": 2,
            "no-undef": 2,
        },
        env: {
            "browser": true,
            "es6": true,
        }
    });
};


const editor = ace.edit("editor");
editor.setFontSize(16);
editor.session.setMode("ace/mode/javascript");

const p = new KAProcessing(canvas);
const customLibrary = createProcessingEnvironment(p, delegate.displayException);

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            const code = editor.getValue();
            const messages = lintCode(code, customLibrary);
            delegate.displayLint(messages);
            if (messages.length === 0) {
                handleUpdate(code, delegate, customLibrary);
            }
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
