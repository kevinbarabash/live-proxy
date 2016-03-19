const { handleUpdate } = require('./live-proxy');

fetch('example_2.js')
    .then(res => res.text())
    .then(code => {
        editor.setValue(code);
        editor.on("input", () => {
            handleUpdate(editor.getValue());
        });
        const selection = editor.getSelection();
        selection.moveCursorFileStart();
    });
