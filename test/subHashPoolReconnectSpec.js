const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const redis = require('./lib/redis');
const SubHashPool = require('../lib/SubHashPool');
const PubHashPool = require('../lib/PubHashPool');

/*
 * verifies that after connection loss, clients re-subscribe automatically
 */

describe('subhashpool reconnect', function () {
	var options = {
		host: '127.0.0.1',
		port: redis.PORT,
	};

	var iv;
	var sub;
	var pub;
	var channel = 'testchannel' + Math.random();
	var json = { rand: Math.random() };

	beforeEach('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

	beforeEach('connect sub', function (cb) {
		sub = new SubHashPool({
			tag: 'test',
			masters: [
				options,
			],
		});

		sub.init(cb);
	});

	beforeEach('connect pub', function (cb) {
		pub = new PubHashPool({
			masters: [
				options,
			],
		});

		pub.init(cb);
	});

	beforeEach('pub iv', function () {
		iv = setInterval(function () {
			pub.publish(channel, json, function (err) {
				console.log('pub result', err && err.message);
			});
		}, 500);
	});

	beforeEach('subscribe', function (cb) {
		var done = false;

		sub.once('message', function (_channel, _json) {
			assert.deepEqual(channel, _channel);
			assert.deepEqual(json, _json);
			done = true;
			cb(null);
		});

		var cancel = sub.subscribe(
			channel,
			function (_channel, _json) {},
			function (err, cancel) {
				assert.equal(err, null);
			});
	});

	beforeEach('redis stop', function (cb) {
		redis.stop(cb);
	});

	beforeEach('try pub', function (cb) {
		pub.publish(channel, json, function (err) {
			assert(err);
			cb(null);
		});
	});

	beforeEach('change json', function () {
		json = { rand: Math.random(), after: 'reconnect' };
	});

	beforeEach('redis start', function (cb) {
		redis.start(cb);
	});

	it('message after reconnected', function (cb) {
		this.timeout(5000);

		sub.once('message', function (_channel, _json) {
			assert.deepEqual(channel, _channel);
			assert.deepEqual(json, _json);
			cb(null);
		});
	});

	afterEach('stop redis', function (cb) {
		redis.stop(cb);
	});

	afterEach('stop iv', function () {
		clearInterval(iv);
	});
});
