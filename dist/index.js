const canvas = document.getElementById("canvas");


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


const editor = ace.edit("editor");
editor.setFontSize(16);
editor.session.setMode("ace/mode/javascript");

const { createProcessingEnvironment, handleUpdate, KAProcessing } = LiveProxy;

const p = new KAProcessing(canvas);
const customLibrary = createProcessingEnvironment(p, delegate.displayException);

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            handleUpdate(editor.getValue(), delegate, customLibrary);
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });