const railroads = require('railroad-diagrams');
const ifExists = (node) => !!node;

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

function toEBNFs(ast, ignoreRules, inlineRules, renameRules) {
    ignoreRules = (ignoreRules || []).reduce((o,k) => {
        o[k] = true;
        return o;
    }, {});
    inlineRules = (inlineRules || []).reduce((o, k) => {
        o[k] = true;
        return o;
    }, {});
    var maxRuleNameLength = 0;
    var rules = {};
    var handlers = toEBNFs.handlers;

    function invokeHandler(node) {
        if (!handlers[node.type]) {
            var json = JSON.stringify(node);
            console.warn("Unhandled AST node: " + json);
            return json;
        }
        return handlers[node.type](node, ignoreRules, inlineRules, renameRules, invokeHandler);
    }
    return invokeHandler(ast);
}
const indent = '    ';
const indentSans = '  ';
const nl = '\n';
const altDelim = '| ';
const seqDelim = ' ';
const oneOrMore = '+';
const zeroOrMore = '*';
const groupStart = '(';
const groupEnd = ')';
const classStart = '[';
const classEnd = ']';
const classRangeDelim = '-';
const optional = '?';
const any = '.';

toEBNFs.handlers = {
    'grammar': (node, ignoreRules, inlineRules, renameRules, process) => {
        ignoreRules.__maxRuleNameLength = 0;
        node.rules.forEach((rule) => {
            if (ignoreRules[rule.name]) { return; }
            if (inlineRules[rule.name]) {
                inlineRules[rule.name] = rule;
                ignoreRules[rule.name] = true;
            }
            ignoreRules.__maxRuleNameLength = Math.max(ignoreRules.__maxRuleNameLength, rule.name.length);
        });
        return node.rules.filter((rule) => !ignoreRules[rule.name]).map(process).filter(ifExists);
    },
    'rule': (node, ignoreRules, inlineRules, renameRules, process) => {
        if (!node.expression) {
            console.log(node);
            throw new Error("Node is rule, but no expression");
        }
        var expression = process(node.expression);
        var name = node.name;
        if (renameRules[name]) {
            name = renameRules[name];
        }
        if (!expression) { return; }
        return padString(name, ignoreRules.__maxRuleNameLength) + " ::= " + expression;
    },
    'choice': (node, ignoreRules, inlineRules, renameRules, process) => {
        var alts = node.alternatives.map(process).filter(ifExists);
        if (alts.length === 0) { return; }
        if (alts.length === 1) { return alts[0]; }
        return groupStart + alts.join(altDelim) + groupEnd;
    },
    'sequence': (node, ignoreRules, inlineRules, renameRules, process) => {
        return node.elements.map(process).filter(ifExists).join(seqDelim);
    },
    'one_or_more': (node, ignoreRules, inlineRules, renameRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return exp + oneOrMore;
    },
    'zero_or_more': (node, ignoreRules, inlineRules, renameRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return exp + zeroOrMore;
    },
    'optional': (node, ignoreRules, inlineRules, renameRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return exp + optional;
    },
    'literal': (node, ignoreRules, inlineRules, renameRules, process) => {
        return JSON.stringify(node.value);
    },
    'group': (node, ignoreRules, inlineRules, renameRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }            
        return groupStart + exp + groupEnd;
    },
    'class': (node, ignoreRules, inlineRules, renameRules, process) => {
        return classStart + (node.inverted ? '^' : '') + escapeString(node.parts.map((part) => {
            if (Array.isArray(part) && part.length === 2) {
                return part.join(classRangeDelim);
            }
            return part;
        }).join('')) + classEnd;
    },
    'simple_not': (node, ignoreRules, inlineRules, renameRules, process) => {
        return;
    },
    'action': (node, ignoreRules, inlineRules, renameRules, process) => {
        return process(node.expression);
    },
    'labeled': (node, ignoreRules, inlineRules, renameRules, process) => {
        return process(node.expression);
    },
    'text': (node, ignoreRules, inlineRules, renameRules, process) => {
        return process(node.expression);
    },
    'rule_ref': (node, ignoreRules, inlineRules, renameRules, process) => {
        var name = node.name;
        if (renameRules[name]) {
            name = renameRules[name];
        }
        if (inlineRules[node.name]) { 
            var exp = process(inlineRules[node.name].expression); 
            if (exp.indexOf(nl) !== -1) {
                console.log(exp);
                exp = exp.split(nl).join(nl + indent);
                return groupStart + nl + indent + indentSans + exp + nl + groupEnd;
            }
            return groupStart + exp + groupEnd;
        }
        if (ignoreRules[node.name]) { return; }
        return name;
    },
    'any': (node, ignoreRules, inlineRules, renameRules, process) => { return any; }
};

function toRailroads(peg, ignoreRules, inlineRules, renameRules) {
    
    ignoreRules = (ignoreRules || []).reduce((o,k) => {
        o[k] = true;
        return o;
    }, {});
    inlineRules = (inlineRules || []).reduce((o, k) => {
        o[k] = true;
        return o;
    }, {});
    var handlers = toRailroads.handlers;
    var invokeHandler = (node) => {
        if (!handlers[node.type]) {
            var json = JSON.stringify(node);
            console.warn("Unhandled AST node: " + json);
            return json;
        }
        return handlers[node.type](node, ignoreRules, inlineRules, renameRules, invokeHandler);
    };
    return invokeHandler(peg);
}
toRailroads.handlers = {
    'grammar': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return node.rules.filter((rule) => {
            if (ignoreRules[rule.name]) { return false; }
            if (inlineRules[rule.name]) {
                inlineRules[rule.name] = rule;
                ignoreRules[rule.name] = true;
                return false;
            }
            return true;
        }).map((rule) => {
            return process(rule);
        });
    },
    'rule': (node, ignoreRules, inlineRules, replaceRules, process) => {
        var exp = process(node.expression);
        if (!exp) {
            console.log(JSON.stringify(node, null, 4));
            throw new Error("resulted in empty diagram");
        }
        return {
            name: replaceRules[node.name] || node.name,
            code: railroads.Diagram(exp)
        };
    },
    'action': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return process(node.expression);
    },
    'sequence': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return railroads.Sequence.apply(railroads, node.elements.map(process).filter(ifExists));
    },
    'choice': (node, ignoreRules, inlineRules, replaceRules, process) => {
        var choices = node.alternatives.map(process).filter(ifExists);
        if (!choices.length) { return; }
        if (choices.length === 1) { return '(' + choices[0] + ')'; }
        return railroads.Choice.apply(railroads, [0].concat(choices));
    },
    'optional': (node, ignoreRules, inlineRules, replaceRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return railroads.Optional(exp, 'skip');
    },
    'literal': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return railroads.Terminal(node.value);
    },
    'one_or_more': (node, ignoreRules, inlineRules, replaceRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return railroads.OneOrMore(exp);
    },
    'zero_or_more': (node, ignoreRules, inlineRules, replaceRules, process) => {
        var exp = process(node.expression);
        if (!exp) { return; }
        return railroads.ZeroOrMore(exp);
    },
    'rule_ref': (node, ignoreRules, inlineRules, replaceRules, process) => {
        if (inlineRules[node.name]) { return process(inlineRules[node.name].expression); }
        if (ignoreRules[node.name]) { return; }
        return railroads.NonTerminal(replaceRules[node.name] || node.name, '#' + node.name);
    },
    'group': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return process(node.expression);
    },
    'simple_not': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return;
    },
    'class': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return railroads.Choice.apply(railroads, [0].concat(node.parts.map((part) => {
            var brackets = true;
            if (!Array.isArray(part)) {
                part = [part];
                brackets = false;
            }
            part = part.map((piece) => {
                return JSON.stringify(piece.trim())
                    .replace(/^"|"$/g, '')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\u[0]*([0-9a-fA-F]+)/g, '#x$1')
                    
            }).join('-');
            if (!part) { return; }
            return railroads.Terminal(brackets ? ('[' + part + ']') : part);
        }).filter(ifExists)));
    },
    'any': () => {
        return railroads.Terminal("Any");
    },
    'labeled': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return process(node.expression);
    },
    'text': (node, ignoreRules, inlineRules, replaceRules, process) => {
        return process(node.expression);
    }
};
module.exports = {
    toEBNFs: toEBNFs,
    toRailroads: toRailroads
};