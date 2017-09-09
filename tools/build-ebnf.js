const pegjs = require('pegjs');
const fs = require('fs');
function pegToEBNF(peg) {
    if (peg.type === 'grammar') {
        return {
            type: 'grammar',
            rules: peg.rules.map(pegToEBNF).filter((rule) => !!rule)
        };
    }
    if (peg.type === 'rule') {
        return {
            type: 'rule',
            name: peg.name,
            expression: pegToEBNF(peg.expression)
        };
    }
    if (peg.type === 'action') {
        // Swallow Javascript
        return pegToEBNF(peg.expression);
    }
    if (peg.type === 'sequence') {
        return {
            type: 'sequence',
            elements: peg.elements.map(pegToEBNF).filter((rule) => !!rule)
        };
    }
    if (peg.type === 'choice') {
        return {
            type: 'choice',
            alternatives: peg.alternatives.map(pegToEBNF).filter((rule) => !!rule)
        };
    }
    if (peg.type === 'optional') {
        return {
            type: 'optional',
            expression: pegToEBNF(peg.expression)
        }
    }
    if (peg.type === 'labeled') {
        // Swallow labels
        return pegToEBNF(peg.expression);
    }
    if (peg.type === 'rule_ref') {
        return {
            type: 'rule_ref',
            name: peg.name
        }
    }
    if (peg.type === 'literal') {
        return {
            type: 'literal',
            value: peg.value
            //ignoreCase: peg.ignoreCase
            // Figure a way to represent case insensitivity in EBNF...
        };
    }
    if (peg.type === 'zero_or_more') {
        return {
            type: 'zero_or_more',
            expression: pegToEBNF(peg.expression)
        };
    }
    if (peg.type === 'class') {
        return {
            type: 'class',
            parts: peg.parts,
            inverted: peg.inverted,
            ignoreCase: peg.ignoreCase
        };
    }
    if (peg.type === 'text') {
        // Swallow pegjs' '$' operator
        return pegToEBNF(peg.expression);
    }
    if (peg.type === 'group') {
        return {
            type: 'group',
            expression: pegToEBNF(peg.expression)
        };
    }
    if (peg.type === 'one_or_more') {
        return {
            type: 'one_or_more',
            expression: pegToEBNF(peg.expression)
        }
    }
    if (peg.type === 'simple_not') {
        // Skip until I know how these are done.
        return null;
    }
    if (peg.type === 'any') {
        return {
            type: 'any'
        };
    }
    console.log(peg);
}
function ebnfToString(ast, ignoreRules, inlineRules, renameRules) {
    ignoreRules = (ignoreRules || []).reduce((o,k) => {
        o[k] = true;
        return o;
    }, {});
    inlineRules = (inlineRules || []).reduce((o, k) => {
        o[k] = true;
        return o;
    }, {});
    var maxRuleNameLength = 0;
    var indent = '    ';
    var indentSans = '  ';
    var nl = '\n';
    var altDelim = '| ';
    var seqDelim = ' ';
    var oneOrMore = '+';
    var zeroOrMore = '*';
    var groupStart = '(';
    var groupEnd = ')';
    var classStart = '[';
    var classEnd = ']';
    var classRangeDelim = '-';
    var optional = '?';
    var any = '.';
    var rules = {};
    
    function padString(str, len) {
        return str + (new Array(len - str.length + 1).join(' '));
    }
    function escapeString(str) {
        return str.split('').map((char) => {
            if (char === '\r') { return '#xA'; }
            if (char === '\n') { return '#xD'; }
            if (char === '\t') { return '#x9'; }
            var code = char.charCodeAt(0);
            if (code >= 0x20 && code <= 0xD7FF) { return char; }
            if (code >= 0xe000 && code <= 0xFFFD) { return char; }
            if (code >= 0x10000 && code <= 0x10FFFF) { return char; }
            return '#x' + code.toString(16);
        }).join('');
    }
    var handlers = {
        grammar: (node) => {
            node.rules.forEach((rule) => {
                if (ignoreRules[rule.name]) { return; }
                if (inlineRules[rule.name]) {
                    inlineRules[rule.name] = rule;
                    ignoreRules[rule.name] = true;
                }
                maxRuleNameLength = Math.max(maxRuleNameLength, rule.name.length);
            });
            return node.rules.filter((rule) => !ignoreRules[rule.name]).map(invokeHandler).filter((exp) => !!exp).join('\n\n');
        },
        rule: (node) => {
            var expression = invokeHandler(node.expression);
            var name = node.name;
            if (renameRules[name]) {
                name = renameRules[name];
            }
            if (!expression) { return; }
            if (node.expression.type === 'choice') {
                expression = expression.substr(1, expression.length - 2).substr(indent.length);
                return name + nl + indentSans + '::=' + expression;
            }
            if (expression.indexOf(nl) !== -1) {
                return name + nl + indentSans + '::= ' + expression.split(nl).join(nl + indent);
            }
            return padString(name, maxRuleNameLength) + " ::= " + expression;
        },
        choice: (node) => {
            return groupStart + nl + indent + node.alternatives.map(invokeHandler).filter((exp) => !!exp).join(nl + indent + altDelim) + nl + groupEnd;
        },
        sequence: (node) => {
            return groupStart + node.elements.map(invokeHandler).filter((exp) => !!exp).join(seqDelim) + groupEnd;
        },
        one_or_more: (node) => {
            var exp = invokeHandler(node.expression);
            if (!exp) { return; }
            return exp + oneOrMore;
        },
        zero_or_more: (node) => {
            var exp = invokeHandler(node.expression);
            if (!exp) { return; }
            return exp + zeroOrMore;
        },
        optional: (node) => {
            var exp = invokeHandler(node.expression);
            if (!exp) { return; }
            return exp + optional;
        },
        literal: (node) => {
            return JSON.stringify(node.value);
        },
        group: (node) => {
            var exp = invokeHandler(node.expression);
            if (!exp) { return; }            
            return groupStart + exp + groupEnd;
        },
        "class": (node) => {
            return classStart + (node.inverted ? '^' : '') + escapeString(node.parts.map((part) => {
                if (Array.isArray(part) && part.length === 2) {
                    return part.join(classRangeDelim);
                }
                return part;
            }).join('')) + classEnd;
        },
        rule_ref: (node) => {
            var name = node.name;
            if (renameRules[name]) {
                name = renameRules[name];
            }
            if (inlineRules[node.name]) { return groupStart + invokeHandler(inlineRules[node.name].expression) + groupEnd; }
            if (ignoreRules[node.name]) { return; }
            return name;
        },
        any: (node) => { return any; }
    };
    function invokeHandler(ast) {
        if (!handlers[ast.type]) {
            var json = JSON.stringify(ast);
            console.warn("Unhandled AST node: " + json);
            return json;
        }
        return handlers[ast.type](ast);
    }
    return invokeHandler(ast);
}
fs.readFile('lib/json-plus-grammar.pegjs', { encoding: 'utf-8' }, function (err, grammar) {
    var ast = pegjs.parser.parse(grammar);
    var ebnfAst = pegToEBNF(ast);
    var ebnfString = ebnfToString(ebnfAst, [ "S", "_", "String" ], [
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
        'NameValuePairList'
    ], { JSON: "Value", StringValue: "String" });
    fs.writeFile('docs/json-plus.ebnf', ebnfString, { encoding: 'utf-8' }, function (err) {});
});
