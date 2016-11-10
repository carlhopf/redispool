const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const Client = require('../lib/Client');

describe('client', function () {
	var options = {
		host: config.redisHost,
		port: config.redisPort,
	};

	var optionsInvalid = {
		host: config.redisHost,
		port: 12355,
		times: 2,
		interval: 100,
	};

	it('create new', function (cb) {
		Client.retryCreate(options, function (err, client) {
			assert(client);
			cb(err);
		});
	});

	it('create invalid', function (cb) {
		Client.retryCreate(optionsInvalid, function (err, client) {
			assert(err);
			assert(!client);
			assert.equal(0, err.indexOf('connection end/lost'));
			cb(null);
		});
	});
});
