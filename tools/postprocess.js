/**
 * Save a string as a file
 */
String.prototype.saveAs = function (fileName, type) {
	new Blob([this],{type:type|"octet/stream"}).saveAs(fileName);
};
Blob.prototype.saveAs = function (fileName) {
	var a = document.createElement("a");
	a.href=window.URL.createObjectURL(this);
	a.style.display = "none";	
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(a.href);
	document.body.removeChild(a);
};
var svgNS = 'http://www.w3.org/2000/svg';
var xlinkNS = 'http://www.w3.org/1999/xlink';
[].forEach.call(document.querySelectorAll('svg'), (it) => {
    if (!it.previousElementSibling) { return; }
    try {
        var name = it.previousElementSibling.querySelector('a').textContent.replace(/:$/, '');
    } catch (e) {
        it.parentNode.removeChild(it);
        return;
    }
    var newPart = document.createElement('object');
    newPart.setAttribute('data', name + '.svg');
    newPart.setAttribute('type', 'image/svg+xml');
    var imgFall = document.createElement('img');
    imgFall.setAttribute('src', name + '.svg');
    newPart.appendChild(imgFall);
    
    it.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    [].forEach.call(it.querySelectorAll('path'), (path) => {
        if (path.prefix) {
            var newPath = document.createElementNS(svgNS, 'path');
            [].forEach.call(path.attributes, (att) => {
                if (att.name === 'xmlns:svg') { return; }
                newPath.setAttribute(att.name, att.value);
            });
            path.parentNode.replaceChild(newPath, path);
        }
    });
    [].forEach.call(it.querySelectorAll('a'), (link) => {
        if (link.hasAttribute('xmlns:xlink')) {
            link.removeAttribute('xmlns:xlink');
        }
        if (link.hasAttributeNS(xlinkNS, 'href')) {
            var href = link.getAttributeNS(xlinkNS, 'href');
            link.removeAttribute(xlinkNS, 'href');
            link.removeAttribute('href');
            link.setAttribute('href', href);
            if (href[0] === '#') {
                link.setAttribute('target', '_parent');
            }
        }
    });
    
    var newDefs = document.createElementNS(svgNS, 'defs');
    var style = document.createElementNS(svgNS, 'style');
    style.setAttribute('type', 'text/css');
    style.textContent = '@import url("json-plus-railroads-svg.css");';
    var script = document.createElementNS(svgNS, 'script');
    script.setAttributeNS(xlinkNS, 'href', 'json-plus-railroads-svg.js');
    newDefs.appendChild(style);
    newDefs.appendChild(script);
    var defs = it.querySelector('defs');
    it.parentNode.replaceChild(newPart, it);
    it.replaceChild(newDefs, defs);
    (new XMLSerializer()).serializeToString(it).saveAs(name + ".svg");
});
var style = document.querySelector('style');
var link = document.createElement('link');
link.setAttribute('type', 'text/css');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('href', 'json-plus-railroads-body.css');
style.parentNode.replaceChild(link, style);
function deNamespace (node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return node;
    }
    var newNode = document.createElement(node.localName);
    [].forEach.call(node.attributes, (att) => {
        if (att.name.substr(0, 6) === 'xmlns:') { return; }
        newNode.setAttribute(att.name, att.value);
    });
    [].slice.call(node.childNodes).forEach((child) => {
        newNode.appendChild(deNamespace(child));
    });
    node = newNode;
    return node;
}
var doc = deNamespace(document.documentElement);
[].slice.call(doc.querySelectorAll('p[style]')).forEach((p) => {
    if (p.getAttribute('style') === 'font-size: 14px; font-weight:bold') {
        p.removeAttribute('style');
        p.className = 'rule-title';
    }
});
[].slice.call(doc.querySelectorAll('br')).forEach((br) => br.parentNode.removeChild(br));
[].slice.call(doc.querySelectorAll('p.rule-title')).forEach((title) => {
    var ruleDiv = document.createElement('div');
    ruleDiv.className = "rule";
    var svgRef = title.nextElementSibling;
    var ebnf = svgRef.nextElementSibling;
    ebnf.className = "rule-ebnf";
    var refs = ebnf.nextElementSibling;
    refs.className = "rule-references";
    title.parentNode.replaceChild(ruleDiv, title);
    ruleDiv.appendChild(title);
    ruleDiv.appendChild(svgRef);
    ruleDiv.appendChild(ebnf);
    ruleDiv.appendChild(refs);
});
(new XMLSerializer()).serializeToString(doc).saveAs('json-plus-railroads.xhtml');