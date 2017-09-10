/*
 * JSON+ grammar
 * see http://json.org/ and ECMA-262 Ed.5
 * see docs/json-plus.ebnf for simplified description without whitespace or handling.
 */
{
    function unpackString(charList) {
        return charList.map((char) => {
            if (typeof char === 'string') { return char; }
            if (char.type === 'CodeEscape') {
                switch (char.char) {
                    case 'b': return '\b';
                    case 'f': return '\f';
                    case 'n': return '\n';
                    case 'r': return '\r';
                    case 't': return '\t';
                    default: return char.char;
                }
            }
            if (char.type === 'UnicodeEscape') {
                return String.fromCodePoint(char.codePoint);
            }
        }).join('')
    }
}
JSON = S? label:PropertyLabel? v:( Object / Array / String / Boolean / Null / Number / Reference ) S? { 
    if (!label) {
        return v; 
    }
    return {
        type: "LabeledValue",
        label: label,
        value: v
    };
}

PropertyLabel
    = v:Identifier S? ":" S? { return v; }

PropertyName
    = v:Identifier S? ":" S? { return v; }
    / v:StringValue S? ":" S? { return v; }

NameValuePair
    = key:PropertyName value:JSON 
    {
        return { type: "NameValuePair", key: key, value: value };
    }

Reference
    = "@" id:Identifier {
        return {
            type: "Reference",
            id: id
        };
    }

NameValuePairList
    = head:NameValuePair tail:( S? "," S? v:NameValuePair { return v; })* { 
        return [head].concat(tail);
    }

Object = type:(v:Identifier S? { return v; })? "{" S? nvpList:NameValuePairList? S? ("," S?)? "}" {
        return {
            type: type || 'Object',
            properties: nvpList
        };
    }

ElementList
    = head:JSON tail:ElementListTail* {
        return [head].concat(tail);
    }

ElementListTail
    = S? "," S? v:JSON {
        return v;
    }

Array = "[" S? elements:ElementList? S? ("," S?)? "]" { 
            return {
                type: 'Array',
                elements: elements
            };
        }



String 
    = SingleQuoteString
    / DoubleQuoteString


UnicodeEscape 
    = "\\u" codePoint:$(HexDigit HexDigit HexDigit HexDigit) {
        return { 
            type: "UnicodeEscape",
            codePoint: parseInt(codePoint, 16)
        }
    }

CodeEscape = "\\" char:["'/\\bfnrt] {
    return {
        type: "CodeEscape",
        char: char
    };
}

Escape
    = UnicodeEscape
    / CodeEscape
    / StringSplit

StringSplit = ("\\" "\r\n" / "\\" "\r" / "\\" "\n")

SQStringChar = [^ ' \\ \u0000-\u001f ]

DQStringChar = [^ " \\ \u0000-\u001f ]

HexDigit = [0-9A-Fa-f]

SingleQuoteString =
      S? ['] chars:( Escape / SQStringChar )* ['] S? { 
    return {
        type: "String",
        chars: chars,
        value: unpackString(chars)
    }; 
}

DoubleQuoteString =
      S? ["] chars:( Escape / DQStringChar )* ["] S? { 
    return {
        type: "String",
        chars: chars,
        value: unpackString(chars)
    }; 
}

StringValue = v:String {
    return v.value;
}

True = "true" { return { type: "Boolean", value: true }; }

False = "false" { return { type: "Boolean", value: false }; }

Boolean = True / False

Null = "null" { return { type: "null" }; }

Number 
    = LiteralNumber
    / Infinitive
    / NaN

Infinitive = s:[+-]? S? ("Infinity" / "Inf") {
    return {
        type: "Number",
        value: s === '-' ? -Infinity : Infinity
    };
}

NaN = "NaN" {
    return {
        type: "Number",
        value: NaN
    };
}

LiteralNumber = s:$Sign? i:$NumberList f:$FractionalPart? e:$ExponentPart? { 
        return {
            type: "Number",
            value: parseFloat((s||'') + (i||'') + (f||'') + (e||''))
        };
    }


Sign = [+-]

NumberList = v:Digit+ { return v.join(''); }

Digit = [0-9]

FractionalPart = "." NumberList

ExponentPart = [eE] Sign? NumberList

Identifier = head:IdentifierStart tail:IdentifierChar* { return head + tail.join(''); }

IdentifierStart = [A-Za-z_]

IdentifierChar = [A-Za-z0-9_]


S = _+

_ = " " / [\t\r\n] / Comment

Comment
  = "/*" (!"*/" .)* "*/"
  / "//" (![\r\n] .)*
