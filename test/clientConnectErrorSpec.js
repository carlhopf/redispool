const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const redis = require('./lib/redis');
const Client = require('../lib/Client');

describe('client connect error', function () {
	var options = {
		host: '127.0.0.1',
		port: redis.PORT + 133,
	};

	// doesnt work as expected yet, clients will try to reconnect
	// even if just created
	it.skip('create', function (cb) {
		Client.create(function (err) {
			assert(err);
			cb(null);
		});
	});
});
