const jsonPlus = require('../lib/json-plus');
const fs = require('fs');
fs.readFile('input.json', { encoding: 'utf-8' }, (err, input) => {
	function Type() {
		this.type = "Type";
	}
	Type.prototype.toJsonPlus = function (indent) {
		return "Type " + JSON.stringify(this, indent);
	};
	var handlers = {
		multiValue: jsonPlus.multiValueHandler,
		Type: (data) => new Type(data)
	};
	var parsed = jsonPlus.parse(input, handlers);
	if (parsed.reference !== parsed.label) {
		throw new Error("Test failed; referenced object not same as labeled");
	}
	if (!(parsed.repeatedNames.name instanceof jsonPlus.MultiValue)) {
		throw new Error("Test failed; repeated names failed to result in a MultiValue");
	}
	if (parsed.repeatedNames.name.valueOf() !== "Fordiman") {
		throw new Error("Test failed; repeated names does not result in last name for valueOf()");
	}
	if (parsed.repeatedNames.name.length !== 2) {
		throw new Error("Test failed; MultiValue failed to enumerate all listed values");
	}
	var output = JSON.stringify(parsed, null, 4).trim();
	//console.log(output);
	fs.readFile('expected.json', { encoding: 'utf-8' }, (err, expected) => {
		if (expected.trim() !== output) {
			console.log(expected.trim().length, output.length);
			fs.writeFile("actual.json", output, { encoding: 'utf-8' }, (err) => {
				throw new Error("Test failed; compare test/expected.json to test/actual.json");
			});
		} else {
			console.log("Parse passed");
		}
		var restrung = jsonPlus.stringify(parsed);
		var reparsed = jsonPlus.parse(restrung, handlers);
		var rerestrung = jsonPlus.stringify(reparsed);
		if (restrung !== rerestrung) {
			console.error("Stringify failed: ", "\n", restrung, "\n", rerestrung);
		} else {
			console.log("Stringify passed");
		}
		
	});
});