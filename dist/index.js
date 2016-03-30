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


var editor = ace.edit("editor");
editor.setFontSize(16);
editor.session.setMode("ace/mode/javascript");

fetch('example_2a.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            LiveProxy.handleUpdate(editor.getValue(), delegate);
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
