const test = require('tape');
const browserify = require('browserify');
const Rogainify = require('../dist');

var b = browserify();
b.transform(Rogainify);
b.add(__dirname + '/main.js');

b.bundle().pipe(process.stdout);