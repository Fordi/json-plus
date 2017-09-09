# JSON+

JSON parser for node with a few extensions.  See http://fordi.org/json-plus for syntactical details.

## Install for your project

    npm install https://github.com/Fordi/json-plus --save

## API

    const jsonPlus = require('./json-plus');
    
### Parsing

    var parsed = jsonPlus.parse(inputString, handlers);

* inputString - a valid JSON+ string
* handlers - an object whose keys are factories for named types, e.g., if you 
    wanted to use a type named `Person`, you'd pass:
    
        handlers = {
            Person: (def) => {
                return new Person(def);
            }
        };
    
    You can also define a special handler called `multiValue(obj, oldValue, key, newValue)`,
    which will be called each time there's a duplicate name on an object definition.
    it should return the new value, for example, the default behavior is:
    
        handlers = {
            multiValue: (obj, oldValue, key, newValue) => newValue
        };
        
    ... but you may want to make multiple definitions result in an array, e.g.,
    
        handlers = {
            multiValue: (obj, oldValue, key, newValue) => {
                if (!Array.isArray(oldValue)) {
                    oldValue = [ oldValue ];
                }
                oldValue.push(newValue);
                return oldValue;
            }
        };
        
    There's already a handler for that sort of behavior, which uses `jsonPlus.MultiValue`
    to encapsulate things.  jsonPlus.MultiValue has the added benefit that it won't
    get confused with properties that are already Arrays, and that its valueOf() 
    and toString() functions behaves like the normal behavior (e.g., it returns
    the value of or the string value of the last object that was defined).
    
### Stringifying

    var strung = jsonPlus.stringify(jsObj, indentLength);
    
* jsObj - the object to be stringified
* indentLength - the number of spaces to indent with

For specialized stringification, you can define `toJsonPlus(indentString)` on your objects, 
which should return a your object's string representation in JSON+.