### How to create railroad diagrams for JSON+

The stuff in this directory is for generating railroad diagrams from my 
simplified EBNF description of JSON+.  I don't have CLI generation of the 
railroad diagrams for this yet, so if you want to hack on the EBNF, you're 
stuck with this for now.

Incidentally, this tool is a damn miracle for writing a parser.

* Browse to: http://www.bottlecaps.de/rr/ui
* Upload docs/json-plus.ebnf
* Click "View Diagram"
* Click "Download"
* Open the downloaded "json-plus.xhtml"
* Copy and paste tools/postprocess.js into your browser's dev console
* Move the downloaded files to docs/
* Run tools/format.sh

### TODO

* See if the railroad diagram generator has a node lib
* Write something to translate the PEG grammar to EBNF, 
    with some kind of filtering mechanism so I can simplify out whitespace

