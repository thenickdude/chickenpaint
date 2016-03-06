// Polyfill for Object.create (IE etc)
if (typeof Object.create != 'function') {
    Object.create = (function() {
        var Temp = function() {
        };
        return function(prototype) {
            if (arguments.length > 1) {
                throw Error('Second argument not supported');
            }
            if (typeof prototype != 'object') {
                throw TypeError('Argument must be an object');
            }
            Temp.prototype = prototype;
            var result = new Temp();
            Temp.prototype = null;
            return result;
        };
    })();
}