const test = require('tape');
const browserify = require('browserify');
const Rogainify = require('../dist');

var b = browserify();
b.transform(Rogainify, { config: require('./config/parser.js') });
b.add('./main.js');

b.bundle().pipe(process.stdout);