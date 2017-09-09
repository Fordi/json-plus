const pegjs = require('pegjs');
const fs = require('fs');
function pegToEBNF(peg) {
    if (peg.type === 'grammar') {
        return {
            type: 'grammar',
            rules: peg.rules.map(pegToEBNF)
        };
    }
    if (peg.type === 'rule') {
        return {
            type: 'rule',
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
            elements: peg.elements.map(pegToEBNF)
        };
    }
    if (peg.type === 'choice') {
        return {
            type: 'choice',
            alternatives: peg.alternatives.map(pegToEBNF)
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
            value: peg.value,
            ignoreCase: peg.ignoreCase
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
    console.log(peg);
}
fs.readFile('lib/json-plus-grammar.pegjs', { encoding: 'utf-8' }, function (err, grammar) {
    var ast = pegjs.parser.parse(grammar);
    console.log(JSON.stringify(pegToEBNF(ast), null, 4));
});
