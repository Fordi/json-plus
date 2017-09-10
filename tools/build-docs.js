const pegjs = require('pegjs');
const pegTools = require(__dirname + '/peg-tools.js');
const showdown = new (require('showdown').Converter)();
const mustache = require('mustache');
const io = require(__dirname + '/io-tools.js');

var writer = new io.Writer();
writer.then(() => {
    console.log("Build finished");
}, (err) => {
    console.error(err);
});
io.readFiles({
    grammar: 'lib/json-plus-grammar.pegjs', 
    svgCss: 'tools/railroad.css', 
    docTemplate: 'tools/doc-template.html', 
    ruleTemplate: 'tools/rule-template.html', 
    sampleCode: 'test/input.jp',
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
        'False',
        'SingleQuoteString',
        'DoubleQuoteString',
        'SQStringChar',
        'DQStringChar',
        'LiteralNumber',
        'Infinitive',
        'NaN',
        'StringSplit',
        'HexNumber'
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
}, function (err) {
    console.error(err);
});
