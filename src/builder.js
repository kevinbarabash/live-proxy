module.exports = {
    /**
     * @param {Expression} left
     * @param {string} operator: "=", "+=", "-=", "*=", "/=", etc.
     * @param {Expression} right
     */
    AssignmentExpression(left, operator, right) {
        return {
            type: "AssignmentExpression",
            left: left,
            operator: operator,
            right: right
        };
    },
    /**
     * @param {Expression} left
     * @param {string} operator: "+", "-", "*", "/", "<", ">", "<=", ">=", etc.
     * @param {Expression} right
     */
    BinaryExpression(left, operator, right) {
        return {
            type: "BinaryExpression",
            left: left,
            operator: operator,
            right: right
        };
    },

    UnaryExpression(operator, prefix, argument) {
        return {
            type: "UnaryExpression",
            operator: operator,
            prefix: prefix,
            argument: argument
        };
    },

    /**
     * @param {Array} body: an array of Expressions
     */
    BlockStatement(body) {
        return {
            type: "BlockStatement",
            body: body
        };
    },
    /**
     * @param {Expression} callee
     * @param {Array} args
     */
    CallExpression(callee, args) {
        return {
            type: "CallExpression",
            callee: callee,
            arguments: args
        };
    },

    NewExpression(callee, args) {
        return {
            type: "NewExpression",
            callee: callee,
            arguments: args
        };
    },

    /**
     * @param {Expression} expression
     */
    ExpressionStatement(expression) {
        return {
            type: "ExpressionStatement",
            expression: expression
        };
    },
    /**
     * @param {string} name
     */
    Identifier(name) {
        return {
            type: "Identifier",
            name: name
        };
    },
    /**
     * @param {Expression} test
     * @param {Statement} consequent: usually a BlockStatement
     * @param {Statement?} alternate: usually a BlockStatement when not omitted
     */
    IfStatement(test, consequent, alternate = null) {
        return {
            type: "IfStatement",
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    },
    /**
     * @param {Number|String|null|RegExp} value
     */
    Literal(value) {
        return {
            type: "Literal",
            value: value
        };
    },
    /**
     * @param {Expression} object
     * @param {Expression} property
     * @param {Boolean?} computed - true => obj[prop], false => obj.prop
     */
    MemberExpression(object, property, computed = false) {
        return {
            type: "MemberExpression",
            object: object,
            property: property,
            computed: computed
        };
    },
    /**
     * @param {Expression} argument
     * @param {string} operator: "++" or "--"
     * @param {Boolean} prefix: true => ++argument, false => argument++
     */
    UpdateExpression(argument, operator, prefix) {
        return {
            type: "UpdateExpression",
            argument: argument,
            operator: operator,
            prefix: prefix
        };
    },

    TryStatement(block, handler = null, finalizer = null) {
        return {
            type: "TryStatement",
            block: block,
            handler: handler,
            finalizer: finalizer
        };
    },

    CatchClause(param, body) {
        return {
            type: "CatchClause",
            param: param,
            body: body,
        };
    },

    SequenceExpression(expressions) {
        return {
            type: "SequenceExpression",
            expressions: expressions,
        };
    },

    FunctionExpression(body, params = [], defaults = []) {
        return {
            type: "FunctionExpression",
            id: null,
            params: params,
            defaults: defaults,
            body: body
        };
    },

    ReturnStatement(argument = null) {
        return {
            type: "ReturnStatement",
            argument: argument
        };
    },

    ConditionalExpression(test, consequent, alternate) {
        return {
            type: "ConditionalExpression",
            test: test,
            alternate: alternate,
            consequent: consequent
        };
    },

    ThisExpression() {
        return {
            type: "ThisExpression"
        };
    },

    ArrayExpression(elements) {
        return {
            type: "ArrayExpression",
            elements: elements
        };
    },

    ThrowStatement(argument) {
        return {
            type: "ThrowStatement",
            argument: argument
        };
    },

    /**
     * @param {Array} declarations
     * @param {string} kind: "var", "let", "const"
     */
    VariableDeclaration(declarations, kind) {
        return {
            type: "VariableDeclaration",
            declarations: declarations,
            kind: kind
        };
    },

    VariableDeclarator(id, init) {
        return {
            type: "VariableDeclarator",
            id: id,
            init: init,
        };
    }
};
