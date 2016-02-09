const renderToString = require('rogain-render-string');
const html = require('html').prettyPrint;

var config = require('./config/parser.js');
var data = require('./fixtures/data.json');

config.components.register({
  Heading: require('./components/Heading.rogain'),
  Link: require('./components/Link.rogain'),
  Template: require('./components/Template.rogain')
});

var output = renderToString(config.components.get('Template'), data, config);

console.log( html(output, { unformatted: [] }) );