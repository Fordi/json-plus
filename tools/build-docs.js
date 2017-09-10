const pegjs = require('pegjs');
const pegTools = require(__dirname + '/peg-tools.js');
const fs = require('fs');
const showdown = new (require('showdown').Converter)();
const mustache = require('mustache');

function readFiles(list) {
    return new Promise((resolve, reject) => {
        
        var results = {};
        if (Array.isArray(list)) {
            var count = list.length;
            list.forEach((file) => {
                fs.readFile(file, { encoding: 'utf-8' }, function (err, result) {
                    if (err) { reject(err); return; }
                    count--;
                    results[file] = result;
                    if (count === 0) {
                        resolve(results);
                    }
                });
            });
        } else if (typeof list === 'object') {
            var count = Object.keys(list).length;
            Object.keys(list).forEach((alias) => {
                var file = list[alias];
                fs.readFile(file, { encoding: 'utf-8' }, function (err, result) {
                    if (err) { reject(err); return; }
                    count--;
                    results[alias] = result;
                    if (count === 0) {
                        resolve(results);
                    }
                });
                
            });
        } else {
            throw new Error("BAD argument!  No file loading!");
        }
    });
}
function Writer() {
    this.count = 0;
    this.written = 0;
    this.next = [];
    this.fail = [];
}
Writer.prototype = {
    write: function (fileName, data) {
        this.count++;
        fs.writeFile(fileName, data, { encoding: 'utf-8' }, (err) => {
            if (err) {
                this.fail.forEach((rejector) => {
                    rejector(err);
                });
            }
            this.written++;
            if (this.written === this.count) {
                this.next.forEach((resolver) => {
                    resolver();
                });
            }
        });
    },
    then: function (resolved, rejected) {
        resolved && this.next.push(resolved);
        rejected && this.fail.push(rejected);
        return new Promise((resolve, reject) => {
            this.next.push(resolve);
            this.fail.push(reject);
        });
    }
}
var writer = new Writer();
writer.then(() => {
    console.log("Build finished");
}, (err) => {
    throw err;
});
readFiles({
    grammar: 'lib/json-plus-grammar.pegjs', 
    svgCss: 'tools/railroad.css', 
    docTemplate: 'tools/doc-template.html', 
    ruleTemplate: 'tools/rule-template.html', 
    sampleCode: 'test/input.json',
    readme: 'README.md'
}).then(function (res) {
    // Make the HTML for the README file; this'll go at the top of our document
    var apiDoc = showdown.makeHtml(res.readme);
    // Parse the grammar's AST
    var ast = pegjs.parser.parse(res.grammar);
    // Rules we ignore.  For JSON+, this is whitespace
    var ignoreRuleNames = [ 
        "S", 
        "_"
    ];
    var inlineRuleNames = [
        'IdentifierStart', 
        'IdentifierChar',
        'Sign',
        'NumberList',
        'FractionalPart',
        'ExponentPart',
        'NumberList',
        'Boolean',
        'Null',
        'CodeEscape',
        'UnicodeEscape',
        'ElementList',
        'ElementListTail',
        'PropertyName',
        'PropertyLabel',
        'NameValuePair',
        'NameValuePairList',
        'StringValue',
        'True',
        'False'
    ];
    var renameRules = { 
        JSON: "Value"
    };
    var grammars = pegTools.toEBNFs(ast, ignoreRuleNames, inlineRuleNames, renameRules);
    

    
    var diagrams = pegTools.toRailroads(ast, ignoreRuleNames, inlineRuleNames, renameRules);
    var rules = [];

    // Save the EBNF data to a file.
    writer.write('docs/json-plus.ebnf', grammars.join('\n'));

    diagrams.forEach((d, index) => {
        var data = {
            name: d.name,
            svgFileName: d.name + '.svg',
            grammar: grammars[index]
        };
        rules.push(mustache.render(res.ruleTemplate, data));
        try {
            var svg = d.code.format(20).toString()
                .replace(/^<svg /, '<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" ')
                .replace(/<svg([^>]*)>/, '<svg$1><defs><style type="text/css">' + res.svgCss + '</style></defs>');
        } catch (e) {
            console.log(JSON.stringify(d.code, null, 4));
            throw e;
        }
        writer.write('docs/' + d.name + '.svg', svg);
    });
    
    var indexHtml = mustache.render(res.docTemplate, {
        apiDoc: apiDoc,
        rules: rules.join(''),
        grammar: grammars.join('\n'),
        example: res.sampleCode
    });
    writer.write('docs/index.html', indexHtml);
});
