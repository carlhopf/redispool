const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const SubHashPool = require('../lib/SubHashPool');

describe('subhashpool', function () {
	var pool;
	var channel;

	before('init', function (cb) {
		pool = new SubHashPool({
			tag: 'test',
			masters: [
				{
					host: config.redisHost,
					port: config.redisPort,
				},
			],
		});

		pool.init(cb);
	});

	beforeEach('select random channel', function () {
		channel = 'chan' + Math.random();
	});

	it('subscribe, cancel', function (cb) {
		var onready = false;

		pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// must only run once
				assert(!onready);
				onready = true;

				assert.equal(err, null);
				assert.equal(typeof cancel, 'function');

				cancel(function (err) {
					assert(!err);

					// TODO assert client no longer subscribed to channel
					cb(null);
				});
			});
	});

	it('subscribe, instant cancel, err ready cb', function (cb) {
		var onready = false;

		var cancel = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// must only run once
				assert(!onready);
				onready = true;

				assert.equal(err, 'subscribe cancelled');
				assert.equal(cancel, undefined);
			});

		// instantly cancel
		cancel(function (err) {
			assert.equal(err, null);

			// onready must run before this cancel() cb
			assert(onready);

			cb(null);
		});

		// must be invoked in nextTick
		assert(!onready);
	});

	it('subscribe twice, cancel1 must err ready cb, cancel2 not', function (cb) {
		var readyCb1 = false;
		var readyCb2 = false;

		var deferredCancel1 = q.defer();
		var deferredCancel2 = q.defer();

		q.all([
			deferredCancel1.promise,
			deferredCancel2.promise,
		]).then(() => cb(null));

		var cancel1 = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				assert.equal(err, 'subscribe cancelled');
				assert(!readyCb1);
				readyCb1 = true;
			});

		var cancel2 = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				assert.equal(err, null);
				assert(!readyCb2);
				readyCb2 = true;

				cancel2(function (err) {
					deferredCancel2.resolve(true);
				});
			});

		// instantly cancel1,
		// (readyCallback must run before cancel callback)
		cancel1(function (err) {
			assert.equal(err, null);
			assert(readyCb1);
			deferredCancel1.resolve(true);
		});

		assert(!readyCb1);
		assert(!readyCb2);
	});

	it('cancel multiple times', function () {
		// TODO behaviour for second call?
		// - exec 2nd cancel callback after 1st cancel callback (queue)
		// - never exec callback

		var onready = false;

		pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// must only run once
				assert(!onready);
				onready = true;

				cancel(function (err) {
					assert(!err);
					cb(null);
				});

				cancel(function (err) {
					assert(false);
				});
			});
	});

	it.skip('subscribe and receive json', function () {
		// TODO
	});
});
