const displayLint = function(messages) {
    const messageContainer = document.querySelector('#messages');

    messageContainer.innerHTML = messages.map(message => {
        return `${message.message} on line ${message.line - 2} column ${message.column}<BR>`;
    }).join('');
};


const displayException = function(e) {
    const messageContainer = document.querySelector('#messages');

    messageContainer.innerHTML = `${e.name}: ${e.message}`;

    // TODO: should actually stop the program
};

var editor = ace.edit("editor");
editor.setFontSize(16);
editor.session.setMode("ace/mode/javascript");

fetch('example_2a.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            LiveProxy.handleUpdate(editor.getValue(), displayLint, displayException);
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
