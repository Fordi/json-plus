### How to create railroad diagrams for JSON+

The stuff in this directory is for generating railroad diagrams from the PEG.js
grammar.  I don't have CLI generation of the railroad diagrams for this yet, so 
if you want to hack on the syntax and get clear railroad diagrams as feedback, 
you're stuck with this for now.

Incidentally, this tool is a damn miracle for writing a parser.


* From the project root, run `npm install`
* From the same location, run `node tools/build-ebnf.js`
    
    This will parse the PEG.js grammar for JSON+, and translate it into a 
    simplified EBNF syntax that the next step will use.

* Browse to: http://www.bottlecaps.de/rr/ui
* Upload docs/json-plus.ebnf
* Click "View Diagram"
* Click "Download"
* Open the downloaded "json-plus.xhtml"

    The output from this is nice, but I like having things split apart and much 
    simpler, so...

* Copy and paste tools/postprocess.js into your browser's dev console
* Move the downloaded files to docs/
* Run tools/format.sh

### TODO

* See if there's a node library for railroad diagram generation
* Encapsulate the ripping appart of json-plus.xhtml using node.  Should be doable,
    I just needed the browser for feedback while I was developing the postprocessor, 
    so I couldn't include filesystem stuff to throw the files where they should be.
* The stylesheets are a pain, and splitting them out from the SVG was a mistake
    made in the spirit of best practices. The SVG files would be more reusable if
    standalone.
