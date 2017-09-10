### How to create railroad diagrams for JSON+

The stuff in this directory is for generating railroad diagrams from the PEG.js
grammar.

* From the project root, run `npm install`
* From the same location, run `node tools/build-docs.js`

`build-docs.js` does a couple of things.  First, it parses the PEG.js grammar 
using `pegjs` itself.  It then transpiles it to EBNF (I used to use the tool at
http://www.bottlecaps.de/rr/ui before I found something I could call from node),
and uses [railroad-diagrams](https://github.com/tabatkins/railroad-diagrams) to
translate the PEG.js grammar to a stack of SVG files.

It uses `showdown` to convert this project's README.md into HTML, then combines 
all that stuff into data objects that are passed into `mustache` along with the
html templates in this directory.  If you want more detail than that, please,
look at the sources here.