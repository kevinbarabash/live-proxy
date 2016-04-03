const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const b = require('./builder');


var isReference = function(node, parent) {
    // we're a property key so we aren't referenced
    if (parent.type === "Property" && parent.key === node) {
        return false;
    }

    // we're a variable declarator id so we aren't referenced
    if (parent.type === "VariableDeclarator" && parent.id === node) {
        return false;
    }

    var isMemberExpression = parent.type === "MemberExpression";

    // we're in a member expression and we're the computed property so we're referenced
    var isComputedProperty = isMemberExpression && parent.property === node && parent.computed;

    // we're in a member expression and we're the object so we're referenced
    var isObject = isMemberExpression && parent.object === node;

    // we are referenced
    return !isMemberExpression || isComputedProperty || isObject;
};

var getName = function(node) {
    if (node.type === 'Identifier') {
        return node.name;
    } else if (node.type === 'MemberExpression') {
        return `${getName(node.object)}.${getName(node.property)}`;
    } else {
        throw new Error(`getName doesn't handle ${node.type} yet`);
    }
};

const transform = function(code, customWindow, customLibrary) {
    const ast = esprima.parse(code, { range: true });

    // TODO: grab these from the environment
    // TODO: refer to these as entry points in the future
    const drawLoopMethods = ["draw", "mouseClicked", "mouseDragged", "mouseMoved",
        "mousePressed", "mouseReleased", "mouseScrolled", "mouseOver",
        "mouseOut", "touchStart", "touchEnd", "touchMove", "touchCancel",
        "keyPressed", "keyReleased", "keyTyped"];

    const riskyNodes = ['ForStatement', 'WhileStatement', 'DoWhileStatement'];

    const globals = {};

    let scopes = [globals];
    let currentFunction = null;

    const envName = '__env__';

    estraverse.replace(ast, {
        enter(node, parent) {
            // Create a new scope whenever we encounter a function declaration/expression
            // and add all of its paramters to this new scope.
            if (/^Function/.test(node.type)) {
                let scope = {};
                node.params.forEach(param => {
                    scope[param.name] = true;
                });
                scopes.push(scope);
                currentFunction = node;
            }
            // Add any variables declared to the current scope.  This handles
            // variable declarations with multiple declarators, e.g. var x = 5, y = 10;
            // because we are handling all of the declarators directly (as opposed
            // to iterating over node.declarators when node.type === "VariableDeclaration").
            if (node.type === "VariableDeclarator") {
                let scope = scopes[scopes.length - 1];
                scope[node.id.name] = true;
            }
        },
        leave(node, parent) {
            if (node.type === "Identifier") {
                if (isReference(node, parent)) {
                    let scopeIndex = -1;
                    for (let i = scopes.length - 1; i > -1; i--) {
                        if (scopes[i][node.name]) {
                            scopeIndex = i;
                            break;
                        }
                    }

                    // Don't rewrite function parameters.
                    let isParam = /^Function/.test(parent.type) && parent.params.includes(node);
                    if (isParam) {
                        return;
                    }

                    // Don't rewrite catch clause parameters.
                    if (parent.type === "CatchClause") {
                        return;
                    }

                    if (parent.type === 'MethodDefinition') {
                        node.usesThis = true;
                        return;
                    }

                    // These values show up a Identifiers in the AST.  We don't
                    // want to prefix them so return.
                    // TODO: only allow this inside of functions
                    // we can disallow through a lint rule
                    // currently users can use it access __env__, p, and customLibrary directly
                    if (["arguments"].includes(node.name)) {
                        return;
                    }

                    if (node.name === "window") {
                        return b.Identifier(customWindow.name);
                    }

                    // Prefix identifiers that exist in the library object and
                    // have not been defined in any scope.
                    // Since we're looking in libraryObject first, any functions
                    // in it have precedence over customWindow.
                    if (node.name in customLibrary.object && scopeIndex === -1) {
                        return b.MemberExpression(
                            b.Identifier(customLibrary.name), b.Identifier(node.name));
                    }

                    // TODO: figure out how to track values added to window
                    if (node.name in customWindow.object && scopeIndex === -1) {
                        return b.MemberExpression(
                            b.Identifier(customWindow.name), b.Identifier(node.name));
                    }

                    // Prefix identifiers that have been declared by the user
                    // in the global scope.
                    if (scopeIndex === 0) {
                        return b.MemberExpression(
                            b.Identifier(envName), b.Identifier(node.name));
                    }

                    // TODO: throw an error that the variable hasn't been declared
                }
            } else if (node.type === "VariableDeclaration") {
                if (node.declarations.length === 1) {
                    // Single VariableDeclarators

                    let decl = node.declarations[0];

                    // If the current variable declaration has an "init" value of null
                    //  (IE. no init value given to parser), and the current node type
                    //  doesn't match "ForInStatement" (a for-in loop), exit the
                    //  function.
                    if (decl.init === null && parent.type !== "ForInStatement") {
                        return;
                    }

                    // Rewrite all function declarations, e.g.
                    // var foo = function () {} => __env__.foo = function () {}
                    // that appear in the global scope. Draw loop methods aren't
                    // special, they should be treated in the exact same way.
                    if (scopes.length === 1) {
                        if (["Program", "BlockStatement", "SwitchCase"].includes(parent.type)) {
                            const objectName = decl.id.name in customLibrary.object
                                ? customLibrary.name
                                : envName;

                            return b.ExpressionStatement(
                                b.AssignmentExpression(
                                    b.MemberExpression(
                                        b.Identifier(objectName),
                                        b.Identifier(decl.id.name)),
                                    "=",
                                    decl.init
                                )
                            );
                        } else {
                            if (["ForStatement"].includes(parent.type)) {
                                // Handle variables declared inside a 'for' statement
                                // occurring in the global scope.
                                //
                                // e.g. for (var i = 0; i < 10; i++) { ... } =>
                                //      for (__env__.i = 0; __env__.i < 10; __env__.i++)
                                return b.AssignmentExpression(
                                    b.MemberExpression(b.Identifier(envName), b.Identifier(decl.id.name)),
                                    "=",
                                    decl.init
                                );
                            } else if (["ForInStatement"].includes(parent.type)) {
                                // Handle variables declared inside a 'for in' statement,
                                // occurring in the global scope.
                                // Example:
                                //  for (var i in obj) { ... }
                                //  for (__env__.i in __env__.obj) { ... }
                                return b.MemberExpression(b.Identifier(envName), b.Identifier(decl.id.name));
                            }
                        }
                    }
                } else {
                    // Multiple VariableDeclarators

                    if (scopes.length === 1) {

                        if (["Program", "BlockStatement"].includes(parent.type)) {
                            // Before: var x = 5, y = 10, z;
                            // After: __env__.x = 5; __env__.y = 10;

                            return node.declarations
                                .filter(decl => decl.init !== null)
                                .map(decl => b.ExpressionStatement(
                                    b.AssignmentExpression(
                                        b.MemberExpression(b.Identifier(envName),b.Identifier(decl.id.name)),
                                        "=",
                                        decl.init
                                    )
                                ));
                        } else {
                            // Before: for (var i = 0, j = 0; i * j < 100; i++, j++) { ... }
                            // After: for (__env__.i = 0, __env__.j = 0; __env__.i * __env__.j < 100; ...) { ... }

                            return {
                                type: "SequenceExpression",
                                expressions: node.declarations.map(decl => {
                                    return b.AssignmentExpression(
                                        b.MemberExpression(b.Identifier(envName),b.Identifier(decl.id.name)),
                                        "=",
                                        decl.init
                                    );
                                })
                            };
                        }

                    } else if (node.declarations.some(decl => drawLoopMethods.includes(decl.id.name))) {
                        // this is super edge case, it handles things that look like
                        // var draw = function() {
                        //     var x = 5, mouseClicked = function () { ... }, y = 10;
                        // };
                        // It should convert them to something like this:
                        // __env__.draw = function() {
                        //     var x = 5;
                        //     var mouseClicked = function () { ... };
                        //     var y = 10;
                        // };

                        return node.declarations
                            .filter(decl => decl.init !== null)
                            .map(decl => {
                                return b.VariableDeclaration([decl], node.kind);
                            });
                    }
                }

            } else if (/^Function/.test(node.type)) {
                // Remove all local variables from the scopes stack as we exit
                // the function expression/declaration.
                scopes.pop();
                currentFunction = node;
            } else if (node.type === 'ThisExpression') {
                currentFunction.usesThis = true;
                return b.Identifier('_this');
            } else if (node.type === 'Program') {
                node.body.unshift(
                    b.ExpressionStatement(
                        b.CallExpression(
                            b.MemberExpression(b.Identifier('loopChecker'), b.Identifier('reset')),
                            []
                        )
                    )
                );
            }

            if (riskyNodes.includes(node.type)) {
                node.body.body.unshift(
                    b.ExpressionStatement(
                        b.CallExpression(
                            b.MemberExpression(b.Identifier('loopChecker'), b.Identifier('check')),
                            []
                        )
                    )
                );
            }
        }
    });

    // replaces function expressions with a sequence expression that assigns
    // the function expression to _ and then rewrite _.toString to return the
    // original function
    estraverse.replace(ast, {
        leave(node, parent) {
            if (/^Function/.test(node.type)) {
                const body = node.body;
                let isEntryPoint = false;

                if (parent && parent.type === 'AssignmentExpression') {
                    const name = getName(parent.left);
                    const parts = name.split('.');
                    if (parts[0] === '__env__' || parts[0] === customLibrary.name) {
                        node.id = b.Identifier(parts[parts.length - 1]);
                        if (drawLoopMethods.includes(parts[1])) {
                            isEntryPoint = true;
                        }
                    }
                }

                if (isEntryPoint) {
                    body.body.unshift(
                        b.ExpressionStatement(
                            b.CallExpression(
                                b.MemberExpression(b.Identifier('loopChecker'), b.Identifier('reset')),
                                []
                            )
                        )
                    );
                } else {
                    body.body.unshift(
                        b.ExpressionStatement(
                            b.CallExpression(
                                b.MemberExpression(b.Identifier('loopChecker'), b.Identifier('check')),
                                []
                            )
                        )
                    );
                }


                if (node.usesThis) {
                    body.body.unshift(
                        b.VariableDeclaration(
                            [
                                b.VariableDeclarator(
                                    b.Identifier('_this'),
                                    b.ConditionalExpression(
                                        b.BinaryExpression(
                                            b.ThisExpression(),
                                            '===',
                                            b.Identifier('window')
                                        ),
                                        b.Identifier(customWindow.name),
                                        b.ThisExpression()
                                    )
                                )
                            ],
                            'var'
                        )
                    );
                }

                if (parent.type === 'MethodDefinition') {
                    return;
                }

                return b.SequenceExpression([
                    b.AssignmentExpression(
                        b.Identifier('_'),
                        '=',
                        node
                    ),
                    b.AssignmentExpression(
                        b.MemberExpression(b.Identifier('_'), b.Identifier('toString')),
                        '=',
                        b.FunctionExpression(b.BlockStatement([
                            b.ReturnStatement(
                                b.CallExpression(
                                    b.Identifier('getSource'),
                                    [
                                        b.Literal(node.range[0]),
                                        b.Literal(node.range[1])
                                    ]
                                )
                            )
                        ]))
                    ),
                    b.Identifier('_')
                ]);
            }
        }
    });

    const transformedCode = 'var _;' + escodegen.generate(ast);

    return {
        ast: ast,
        transformedCode: transformedCode,
        globals: globals
    };
};

module.exports = transform;
