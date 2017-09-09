var parentUrl = 'json-plus-railroads.xhtml';
try {
    parentUrl = parent.location.toString();
} catch (e) {}
console.log(parentUrl);
var links = document.getElementsByTagName('a');
document.addEventListener('readystatechange', function (e) {
    if (document.readyState === 'interactive') {
        [].forEach.call(document.querySelectorAll('a'), function (link) {
            console.log(window.location);
            var tgt = link.getAttribute('target');
            var href = link.getAttribute('href');
            if (tgt === '_parent' && href[0] === '#') {
                link.setAttribute('href', parentUrl + href);
            }
        });
    }
});
