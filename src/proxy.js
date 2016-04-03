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

        // copy over new or modified methods
        Object.keys(newConstructor.prototype).forEach(name => {
            ProxyClass.prototype[name] = newConstructor.prototype[name];
        });

        // delete methods that have been removed
        Object.keys(ProxyClass.prototype).forEach(name => {
            if (!newConstructor.prototype.hasOwnProperty(name)) {
                delete ProxyClass.prototype[name];
            }
        });

        ProxyClass.toString = newConstructor.toString;
    };

    return ProxyClass;
};

module.exports = {
    createProxy: createProxy
};
