const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const SubHashPool = require('../lib/SubHashPool');

describe('subhashpool', function () {
	var pool;
	var channel;

	before('init pool', function (cb) {
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

	it.skip('subscribe and receive json', function () {
		// TODO
	});

	it('cancel after ready', function (cb) {
		var readyCallback = false;

		pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				assert.equal(err, null);
				assert.equal(typeof cancel, 'function');

				cancel(function () {
					assert(!err);

					// TODO assert client no longer subscribed to channel

					cb(null);
				});
			});
	});

	it('cancel must err ready cb', function (cb) {
		var readyCallback = false;

		var cancel = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				assert.equal(err, 'subscribe cancelled');
				assert.equal(cancel, undefined);

				// must only run once
				assert(!readyCallback);
				readyCallback = true;
			});

		// instantly cancel
		cancel(function (err) {
			assert.equal(err, null);

			// readyCallback must run before this cancel() cb
			assert(readyCallback);
			cb(null);
		});

		// must be invoked in nextTick
		assert(!readyCallback);
	});

	it('cancel1 must err ready cb, cancel2 not', function (cb) {
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
				readyCb1 = true;
			});

		var cancel2 = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				assert.equal(err, null);
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

	describe('after first subscribe cb', function () {
		var cancel1;

		beforeEach('1st subscribe', function (cb) {
			cancel1 = pool.subscribe(
				channel,
				function (json) {},
				function (err, cancel) {
					assert.equal(err, null);
					cb(null);
				});
		});

		it('2nd subscribe', function (cb) {
			pool.subscribe(
				channel,
				function (json) {},
				function (err, cancel) {
					assert.equal(err, null);
					assert.equal(typeof cancel, 'function');
					cb(null);
				});
		});

		it('2nd subscribe, cancel instantly', function (cb) {
			var readyCb2 = false;

			var cancel2 = pool.subscribe(
				channel,
				function (json) {},
				function (err, cancel) {
					assert.equal(err, 'subscribe cancelled');
					assert.equal(cancel, undefined);

					// assert only called once
					assert(!readyCb2);
					readyCb2 = true;
				});

			cancel2(function (err) {
				assert.equal(err, null);
				assert(readyCb2);
			});

			assert(!readyCb2);
		});

		afterEach('cancel1', function (cb) {
			cancel1(cb);
		});
	});

	it.skip('call cancel multiple times', function () {
		// TODO behaviour for second call?
		// - exec 2nd cancel callback after 1st cancel callback (queue)
		// - never exec callback
	});

	afterEach('stop pub json', function () {

	});
});
