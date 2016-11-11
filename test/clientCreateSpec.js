const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const redis = require('./lib/redis');
const Client = require('../lib/Client');

describe('client', function () {
	var options = {
		host: '127.0.0.1',
		port: redis.PORT,
	};

	var optionsInvalid = {
		host: '127.0.0.1',
		port: 12355,
		times: 2,
		interval: 100,
	};

	before('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

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

	after('stop redis', function (cb) {
		redis.stop(cb);
	});
});
