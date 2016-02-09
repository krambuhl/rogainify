const Config = require('rogain-config');

var config = new Config()
config.helpers.register(require('rogain-core-helpers'));

module.exports = config;