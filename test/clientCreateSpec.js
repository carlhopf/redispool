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

	before('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

	it('create new', function (cb) {
		Client.create(options, function (err, client) {
			console.log(err);
			assert(client);
			cb(err);
		});
	});

	it('create new', function (cb) {
		Client.retryCreate(options, function (err, client) {
			assert(client);
			cb(err);
		});
	});

	after('stop redis', function (cb) {
		redis.stop(cb);
	});
});
