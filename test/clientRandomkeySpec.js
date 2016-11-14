const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const redis = require('./lib/redis');
const Client = require('../lib/Client');
const index = require('../index');

describe('client', function () {
	var options = {
		host: '127.0.0.1',
		port: redis.PORT,
	};

	var client;

	before('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

	beforeEach('create new', function (cb) {
		Client.retryCreate(options, function (err, _client) {
			assert(_client);
			client = _client;
			cb(err);
		});
	});

	it('run randomkey, emit took before cb', function (cb) {
		var ontook = false;

		index.tracker.once('took', function () {
			ontook = true;
		});

		client.randomkey(function (err) {
			assert(ontook);
			cb(err);
		});
	});

	it('run randomkey, must emit took without cb', function (cb) {
		index.tracker.once('took', function () {
			cb(null);
		});

		client.randomkey();
	});

	after('stop redis', function (cb) {
		redis.stop(cb);
	});
});
