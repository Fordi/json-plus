function collectLabels(doc) {
    var labels = {};
    function collectLabel(element) {
        if (element == null || typeof element !== 'object') return element;
        if (element.type === 'LabeledValue') {
            if (labels[element.label]) {
                throw new Error("Label " + element.label + " is declared twice!");
            }
            labels[element.label] = element.value;
            return element.value;
        }
        if (element.type === "NameValuePair") {
            element.value = collectLabel(element.value);
        }
        if (element.properties) {
            element.properties = element.properties.map(collectLabel);
        }
        if (element.elements) {
            element.elements = element.elements.map(collectLabel);
        }
        
        return element;
    }
    return { root: collectLabel(doc), labels: labels };
}
var guidKey = Math.random().toString(36).substr(2, 10);
var guidTable = {};
var nextGuid = 1;
function guid(obj) {
    var t = typeof obj;
    if (obj === null || obj === undefined || t === 'string' || t === 'number' || t === 'boolean') {
        return;
    }
    if (!obj[guidKey]) {
        var g = '_' + nextGuid.toString(36);
        nextGuid++;
        Object.defineProperty(obj, guidKey, { enumerable: false, configurable: true, writable: false, value: g });
        guidTable[g] = obj;
    }
    return obj[guidKey];
}
function scrubGuids() {
    Object.keys(guidTable).forEach((guid) => {
        Object.defineProperty(guidTable[guid], guidKey, { enumerable: false, configurable: true, writeable: true, value: null});
        delete guidTable[guid][guidKey];
        delete guidTable[guid];
    });
    nextGuid = 1;
}
function applyLabels(doc, labels) {
    function applyLabel(element) {
        if (element == null || typeof element !== 'object') return element;
        if (element.type === 'Reference') {
            if (!labels[element.id]) {
                throw new Error("Reference to undeclared label: " + element.id + "\n\tDefined: " + Object.keys(labels).join(', '));
            }
            return labels[element.id];
        }
        if (element.type === "NameValuePair") {
            element.value = applyLabel(element.value);
        }
        if (element.properties) {
            element.properties = element.properties.map(applyLabel);
        }
        if (element.elements) {
            element.elements = element.elements.map(applyLabel);
        }
        return element;
    }
    return applyLabel(doc);
}
function normalize(doc) {
    var labelled = collectLabels(doc);
    return applyLabels(labelled.root, labelled.labels);
}
var parser = require('./json-plus-parser');
function MultiValue(value) {
    Array.call(this);
    if (arguments.length === 1) {
        this.push(value);
    }
}
MultiValue.prototype = [];
MultiValue.prototype.valueOf = function () {
    return this[this.length - 1];
};
MultiValue.prototype.toString = function () {
    var value = this.valueOf();
    if (value === undefined || value === null) { return String(value); }
    return value.toString();
};
function postprocess(jpData, handlers) {
    handlers = handlers || {};
    var cache = {};
    var tmp = {};
    function cachedToJS(obj) {
        var g = guid(obj);
        if (!cache[g]) {
            var tmp = null;
            if (obj.type === 'Array') {
                tmp = [];
            } else if (!(obj.type === 'String' || obj.type === 'Number' || obj.type === 'Boolean' || obj.type === 'null')) {
                tmp = {};
            }
            cache[g] = tmp;
            cache[g] = toJS(obj, tmp);
        }
        
        return cache[g];
    }
    function toJS(obj, newObj) {
        if (obj.type === "Array") {
            obj.elements.forEach((item) => {
                newObj.push(cachedToJS(item));
            });
            return newObj;
        }
        if (obj.type === "String") {
            return obj.value;
        }
        if (obj.type === "Number") {
            return obj.value
        }
        if (obj.type === "Boolean") {
            return obj.value;
        }
        if (obj.type === "null") {
            return null;
        }
        // From this point, obj is assumed to be some flavor of Object
        if (!newObj) {
            newObj = {};
        }
        if (obj.properties) {
            obj.properties.forEach((prop) => {
                if (prop.type !== "NameValuePair") {
                    throw new Error("Unsuppored item in Object#properties");
                }
                if (newObj[prop.key]) {
                    if (handlers.multiValue) {
                        newObj[prop.key] = handlers.multiValue(newObj, newObj[prop.key], prop.key, cachedToJS(prop.value));
                    } else {
                        console.warn("Multiple keys of the same name on the same object, and no multiValue handler defined!");
                    }
                } else {
                    newObj[prop.key] = cachedToJS(prop.value);
                }
            });
        }
        if (obj.type !== 'Object') {
            if (!handlers[obj.type]) {
                console.warn("No support for type: " + obj.type + "; returning raw object");
            } else {
                newObj = handlers[obj.type](newObj);
            }
        }
        return newObj;
    }
    var ret = cachedToJS(jpData);
    scrubGuids();
    return ret;
}

function stringify(jsObj, indent) {
    var push = '';
    var spc = '';
    if (indent) {
        indent = new Array(indent + 1).join(' ');
        push = '\n';
        spc = ' ';
    } else {
        indent = '';
    }
    
    function visit(root, fn, recursionFn) {
        var visited = {};
        function visit_internal(obj) {
            var t = typeof obj;
            if (obj === null || obj === undefined || t === 'string' || t === 'number' || t === 'boolean') {
                return { type: "Immediate", value: obj };
            }
            // Recursion prevention.
            var g = guid(obj);
            if (visited[g]) {
                objTable[g] = true;
                return {
                    type: "Reference",
                    to: g
                }; 
            }
            visited[g] = true;
            if (obj.toJsonPlus instanceof Function) {
                return {
                    type: "toJsonPlus",
                    value: obj.toJsonPlus(indent),
                    guid: g
                };
            }
            if (obj.toJSON instanceof Function) {
                return {
                    type: "toJSON",
                    value: visit_internal(obj.toJSON()),
                    guid: g
                };
            }
            if (Array.isArray(obj)) {
                return { 
                    type: "Array", 
                    elements: [].map.call(obj, (item) => visit_internal(item)),
                    guid: g
                };
            }
            return { 
                type: "Object",
                properties: Object.keys(obj).map((key) => ({
                    key: key,
                    value: visit_internal(obj[key]),
                    
                })),
                guid: g
            };
        }
        return visit_internal(root);
    }

    var objTable = {};
    function refVisitor(obj) {}
    function refCollector(obj) {
        var g = guid(obj);
        if (g && !objTable[g]) {
            objTable[g] = true;
        }
        return ;
    }

    function ref(obj) {
        return '@' + guid(obj);
    }
    function stringify(node) {
        if (node.type === 'Immediate') {
            if (typeof node.value === 'number' && (node.value === Infinity || node.value === -Infinity || isNaN(node.value))) {
                return String(node.value);
            } 
            return JSON.stringify(node.value);
        }
        var label = '';
        var g = node.guid;
        if (g && objTable[g]) {
            label = g + ":" + spc;
        }
        var value = null;
        if (node.type === 'Array') {
            value = '[' + push + indent + node.elements.map( (e) => stringify(e).split('\n').join('\n' + indent) ).join(',' + push + indent) + push + ']';
        } else if (node.type === 'Reference') {
            value = '@' + node.to;
        } else if (node.type === 'toJSON') {
            value = stringify(node.value);
        } else if (node.type === 'toJsonPlus') {
            value = node.value;
        } else {
            value = '';
            if (node.type !== 'Object') {
                value = node.type; 
            }
            value += '{' + push + indent + node.properties.map((prop) => {
                var key = prop.key;
                if (!(/^[A-Za-z_][A-Za-z0-9_]$/).test(key)) {
                    key = JSON.stringify(key);
                }
                return key + ":" + spc + stringify(prop.value).split('\n').join('\n' + indent);
            }).join(',' + push + indent) + push + "}";
        }
        return label + value;
    }
    var unwrapped = visit(jsObj, refVisitor, refCollector);
    var strung = stringify(unwrapped);
    scrubGuids();
    return strung;
}
module.exports = {
    parser:parser,
    normalize: normalize,
    parse: function (input, handlers) {
        return postprocess(normalize(parser.parse(input)), handlers);
    },
    postprocess: postprocess,
    MultiValue: MultiValue,
    multiValueHandler: function (obj, oldValue, key, newValue) {
        if (!(oldValue instanceof MultiValue)) {
            oldValue = new MultiValue(oldValue);
        }
        oldValue.push(newValue);
        return oldValue;
    },
    stringify: stringify
};