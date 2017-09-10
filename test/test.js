const jsonPlus = require(__dirname + '/../lib/json-plus');
const io = require(__dirname + '/../tools/io-tools');

const fs = require('fs');

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

function compareObjects(left, right) {
	if (typeof left !== typeof right) { throw new Error("Objects not of same type: " + typeof left + " !== " + typeof right); }
	if (Array.isArray(left) !== Array.isArray(right)) { throw new Error("One's an array, the other is not"); }
	var mismatch;
	if (Array.isArray(left)) {
		if (left.length !== right.length) { throw new Error("Arrays are of differing length"); }
		mismatch = left.findIndex((li, i) => {
			try {
				return !compareObjects(li, right[i])
			} catch (e) {
				throw new Error("At index " + i + "\n" + e.message);
			}
		});
		if (-1 !== mismatch) {
			throw new Error("left[" + mismatch + "] !== right[" + mismatch + "]");
		}
		return true;
	}
	if (left === right) { return true; }
	var leftKeys = Object.keys(left);
	var rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) {
		throw new Error("Objects have different number of keys");
	}
	mismatch = Object.keys(left).findIndex((key) => {
		try {
			return !compareObjects(left[key], right[key]);
		} catch (e) {
			throw new Error("At key " + key + "\n" + e.message);
		}
	});
	if (-1 !== mismatch) {
		throw new Error("Object values do not match for [" + leftKeys[mismatch] + "]");
	}
	mismatch = Object.keys(right).findIndex((key) => {
		try {
			return !compareObjects(left[key], right[key]);
		} catch (e) {
			throw new Error("At key " + key + "\n" + e.message);
		}
	});
	if (-1 !== mismatch) {
		throw new Error("Object values do not match for [" + rightKeys[mismatch] + "]");
	}
	return true;
}

io.readFiles({
	input: __dirname + '/input.jp',
	expected: __dirname + '/expected.json'
}).then(function (res) {
	try {
		var parsed = jsonPlus.parse(res.input, handlers);
		var expected = JSON.parse(res.expected);
		// Ad-hoc tests
		if (parsed.reference !== parsed.label) {
			throw new Error("Test failed; referenced object not same as labeled");
		}
		if (parsed.recursion !== parsed.recursion.recursion) {
			throw new Error("Test failed; recursion doesn't work");
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
		if (parsed.json5Keywords[0] !== Infinity || parsed.json5Keywords[1] !== -Infinity || !(typeof parsed.json5Keywords[2] !== 'number' || isNaN(parsed.json5Keywords[3]))) {
			throw new Error("Parsing of JSON5 special numbers failed!");
		}
		// Compare with expected values
		var rootKeys = Object.keys(expected);
		var mismatch = rootKeys.findIndex((key) => {
			try {
				return !compareObjects(expected[key], parsed[key])
			} catch (e) {
				throw new Error("At key: " + key);
			}
		});
		if (-1 !== mismatch) {
			throw new Error("Mismatch with expected values");
		}
		// Verify consistent stringification
		var restrung = jsonPlus.stringify(parsed);
		var reparsed = jsonPlus.parse(restrung, handlers);
		var rerestrung = jsonPlus.stringify(reparsed);
		if (restrung !== rerestrung) {
			throw new Error("Stringify failed: ", "\n", restrung, "\n", rerestrung);
		} else {
			console.log("Stringify passed");
		}
	} catch (e) {
		console.error(e);
	}
}, function (err) {
	console.error(err);
});