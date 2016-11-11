const async = require('async');
const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const redis = require('./lib/redis');
const SubHashPool = require('../lib/SubHashPool');

describe('subhashpool multiple', function () {
	var pool;
	var channel;
	var cancels;

	before('start redis', function (cb) {
		this.timeout(3 * 60 * 1000);
		redis.start(cb);
	});

	before('init', function (cb) {
		pool = new SubHashPool({
			tag: 'test',
			masters: [
				{
					host: '127.0.0.1',
					port: redis.PORT,
				},
			],
		});

		pool.init(cb);
	});

	beforeEach('select random channel', function () {
		channel = 'chan' + Math.random();
	});

	beforeEach('subscribe multiple', function (cb) {
		async.times(
			Math.floor(Math.random() * 5) + 1,
			function (i, cb) {
				pool.subscribe(
					channel,
					function (json) {},
					function (err, cancel) {
						assert.equal(err, null);
						cb(null, cancel);
					});
			},
			function (err, _cancels) {
				cancels = _cancels;
				cb(err);
			});
	});

	it('subscribe 2nd, cancel', function (cb) {
		var onready2 = false;

		pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// ready callback only once
				assert.equal(onready2, false);
				onready2 = true;

				assert.equal(err, null);
				assert.equal(typeof cancel, 'function');

				cancel(function (err) {
					cb(err);
				});
			});
	});

	it('subscribe 2nd, cancel instantly', function (cb) {
		var onready2 = false;

		var cancel2 = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// assert only called once
				assert(!onready2);
				onready2 = true;

				assert.equal(err, 'subscribe cancelled');
				assert.equal(cancel, undefined);
			});

		cancel2(function (err) {
			assert.equal(err, null);
			assert(onready2);
			cb(null);
		});

		assert(!onready2);
	});

	afterEach('cancel multiple', function (cb) {
		async.map(cancels, (cancel, cb) => {
			cancel(cb);
		}, cb);
	});

	after('stop', function (cb) {
		redis.stop(cb);
	});
});
