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

	it('ping timeout', function (cb) {


		client.once('ready', function () {
			cb(null);
		});

		client._pingTimeout();
	});

	after('stop redis', function (cb) {
		redis.stop(cb);
	});
});
