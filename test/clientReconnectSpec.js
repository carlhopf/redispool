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

	beforeEach('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

	beforeEach('connect client', function (cb) {
		Client.retryCreate(options, function (err, _client) {
			assert(_client);
			client = _client;
			cb(err);
		});
	});

	beforeEach('randomkey', function (cb) {
		client.randomkey(function (err) {
			assert(!err);
			cb(null);
		});
	});

	beforeEach('redis stop', function (cb) {
		redis.stop(cb);
	});

	beforeEach('return error while not connected', function (cb) {
		client.randomkey(function (err) {
			assert(err);
			cb(null);
		});
	});

	beforeEach('restart redis', function (cb) {
		client.once('ready', function () {
			cb(null);
		});

		redis.start();
	});

	it('reconnected', function (cb) {
		client.randomkey(function (err) {
			assert(!err);
			cb(null);
		});
	});

	afterEach('stop redis', function (cb) {
		redis.stop(cb);
	});
});
