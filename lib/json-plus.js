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

module.exports = {
	parser:parser,
	normalize: normalize,
	parse: function (input) {
		return normalize(parser.parse(input));
	}
};