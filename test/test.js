const jsonPlus = require('../lib/json-plus');
const fs = require('fs');
fs.readFile('input.json', { encoding: 'utf-8' }, (err, input) => {
	var output = JSON.stringify(jsonPlus.parse(input), null, 4).trim();
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