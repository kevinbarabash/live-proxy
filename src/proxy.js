const createProxy = function(constructor) {
    let currentConstructor = constructor;

    const ProxyClass = new Function('getCurrentConstructor',
        `return function ${constructor.name}() { return getCurrentConstructor().apply(this, arguments); }`
    )(() => currentConstructor);

    Object.keys(constructor.prototype).forEach(name => {
        ProxyClass.prototype[name] = constructor.prototype[name];
    });

    ProxyClass.toString = constructor.toString;

    ProxyClass.update = function(newConstructor) {
        currentConstructor = newConstructor;

        // copy over new methods because they reference variables from
        // the new context
        Object.keys(newConstructor.prototype).forEach(name => {
            ProxyClass.prototype[name] = newConstructor.prototype[name];
        });

        ProxyClass.toString = newConstructor.toString;
    };

    return ProxyClass;
};

module.exports = {
    createProxy: createProxy
};
