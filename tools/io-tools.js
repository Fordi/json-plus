const fs = require('fs');

function readFiles(list) {
    return new Promise((resolve, reject) => {
        
        var results = {};
        if (Array.isArray(list)) {
            var count = list.length;
            list.forEach((file) => {
                fs.readFile(file, { encoding: 'utf-8' }, function (err, result) {
                    if (err) { reject(err); return; }
                    count--;
                    results[file] = result;
                    if (count === 0) {
                        resolve(results);
                    }
                });
            });
        } else if (typeof list === 'object') {
            var count = Object.keys(list).length;
            Object.keys(list).forEach((alias) => {
                var file = list[alias];
                fs.readFile(file, { encoding: 'utf-8' }, function (err, result) {
                    if (err) { reject(err); return; }
                    count--;
                    results[alias] = result;
                    if (count === 0) {
                        resolve(results);
                    }
                });
                
            });
        } else {
            throw new Error("BAD argument!  No file loading!");
        }
    });
}
function Writer() {
    this.count = 0;
    this.written = 0;
    this.next = [];
    this.fail = [];
}
Writer.prototype = {
    write: function (fileName, data) {
        this.count++;
        fs.writeFile(fileName, data, { encoding: 'utf-8' }, (err) => {
            if (err) {
                this.fail.forEach((rejector) => {
                    rejector(err);
                });
            }
            this.written++;
            if (this.written === this.count) {
                this.next.forEach((resolver) => {
                    resolver();
                });
            }
        });
    },
    then: function (resolved, rejected) {
        resolved && this.next.push(resolved);
        rejected && this.fail.push(rejected);
        return new Promise((resolve, reject) => {
            this.next.push(resolve);
            this.fail.push(reject);
        });
    }
}
module.exports = {
    readFiles: readFiles,
    Writer: Writer
};