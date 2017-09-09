const jsonPlus = require('../lib/json-plus');
const fs = require('fs');
fs.readFile('input.json', { encoding: 'utf-8' }, (err, input) => {
	function Type() {
		this.type = "Type";
	}
	
	var handlers = {
		multiValue: jsonPlus.multiValueHandler,
		Type: (data) => new Type(data)
	};
	var output = JSON.stringify(jsonPlus.parse(input, handlers), null, 4).trim();
	fs.readFile('expected.json', { encoding: 'utf-8' }, (err, expected) => {
		if (expected.trim() !== output) {
			console.log(expected.trim().length, output.length);
			fs.writeFile("actual.json", output, { encoding: 'utf-8' }, (err) => {
				throw new Error("Test failed; compare test/expected.json to test/actual.json");
			});
		} else {
			console.log("Passed");
		}
	});
});