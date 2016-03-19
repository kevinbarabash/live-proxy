require('babel-polyfill');
require('whatwg-fetch');

const { handleUpdate } = require('./live-proxy');

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

// TODO: make this less hacky (processing-environment.js uses this)
window.displayException = displayException;

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            handleUpdate(editor.getValue(), displayLint, displayException);
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
