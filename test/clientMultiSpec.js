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

	it('run multi, emit took before cb', function (cb) {
		var multi = client.multi();
		var ontook = false;

		client.once('took', function () {
			ontook = true;
		});

		multi.randomkey();

		multi.exec(function (err) {
			assert(ontook);
			cb(err);
		});
	});

	it('run multi, must emit took without cb', function (cb) {
		var multi = client.multi();

		client.once('took', function () {
			cb(null);
		});

		multi.randomkey();
		multi.exec();
	});

	after('stop redis', function (cb) {
		redis.stop(cb);
	});
});
