const getCode = function(fn) {
    let code = fn.toString();

    const start = code.indexOf('{');
    const end = code.lastIndexOf('}');

    code = code.substring(start + 1, end);

    const lines = code
        .split('\n')
        .filter(line => line.trim() !== '');

    const indent = lines.reduce((indent, line) => {
        const match = line.match(/^[ ]+/);
        return match ? Math.min(indent, match[0].length) : indent;
    }, Infinity);

    return lines.map(line => line.substring(indent)).join('\n');
};

module.exports = {
    getCode: getCode
};
