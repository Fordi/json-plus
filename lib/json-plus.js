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
    function toJS(obj) {
        if (obj.type === "Array") {
            return obj.elements.map(toJS);
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
        var newObj = {};
        if (obj.properties) {
            obj.properties.forEach((prop) => {
                if (prop.type !== "NameValuePair") {
                    throw new Error("Unsuppored item in Object#properties");
                }
                if (newObj[prop.key]) {
                    if (handlers.multiValue) {
                        newObj[prop.key] = handlers.multiValue(newObj, newObj[prop.key], prop.key, toJS(prop.value));
                    } else {
                        console.warn("Multiple keys of the same name on the same object, and no multiValue handler defined!");
                    }
                } else {
                    newObj[prop.key] = toJS(prop.value);
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
    return toJS(jpData);
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
    }
};