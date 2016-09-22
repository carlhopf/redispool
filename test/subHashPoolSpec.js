const assert = require('assert');
const q = require('q');
const config = require('./lib/config');
const SubHashPool = require('../lib/SubHashPool');
const PubHashPool = require('../lib/PubHashPool');

const all = function (deferreds, cb) {
	q.all(Object.keys(deferreds).map((key) => deferreds[key].promise))
		.then(() => cb(null), (err) => cb(err));
};

describe('subhashpool', function () {
	var pool;
	var channel;
	var message;
	var iv;

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

	before('init pub', function (cb) {
		poolpub = new PubHashPool({
			masters: [
				{
					host: config.redisHost,
					port: config.redisPort,
				},
			],
		});

		poolpub.init(cb);
	});

	beforeEach('select random channel', function () {
		channel = 'chan' + Math.random();
		message = 'msg' + Math.random();
	});

	it('subscribe, publish, onjson, cancel', function (cb) {
		var onready = false;
		var json = { foo: 'bar' + Math.random() };

		var def = {
			cancel: q.defer(),
			json: q.defer(),
		};

		all(def, cb);

		var cancel = pool.subscribe(
			channel,
			function (_channel, _json) {
				assert.equal(typeof _json, 'object');
				assert.equal(_channel, channel);
				assert.notEqual(json, _json);
				assert.equal(JSON.stringify(json), JSON.stringify(_json));

				def.json.resolve(true);

				cancel(function (err) {
					assert(!err);

					// TODO assert client no longer subscribed to channel
					def.cancel.resolve(true);
				});
			},
			function (err, cancel) {
				// must only run once
				assert(!onready);
				onready = true;

				assert.equal(err, null);
				assert.equal(typeof cancel, 'function');

				poolpub.publish(channel, json);
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

	it('subscribe, instant cancel, subscribe', function (cb) {
		var onready1 = false;
		var onready2 = false;

		var def = {
			cancel1: q.defer(),
			cancel2: q.defer(),
		};

		all(def, cb);

		var cancel1 = pool.subscribe(
			channel,
			function (json) {},
			function (err, cancel) {
				// must only run once
				assert(!onready1);
				onready1 = true;

				assert.equal(err, 'subscribe cancelled');
				assert.equal(cancel, undefined);
			});

		// instantly cancel
		cancel1(function (err) {
			assert.equal(err, null);

			// onready1 must run before this cancel() cb
			assert(onready1);

			def.cancel1.resolve(true);
		});

		// must be invoked in nextTick
		assert(!onready1);

		var cancel2 = pool.subscribe(
			channel,
			function (json) {

			},
			function (err, cancel) {
				// must only run once
				assert(!onready2);
				onready2 = true;

				assert(!err);

				def.cancel2.resolve(true);
			});
	});

	it('subscribe twice, cancel1 must err ready cb, cancel2 not', function (cb) {
		var readyCb1 = false;
		var readyCb2 = false;

		var def = {
			cancel1: q.defer(),
			cancel2: q.defer(),
		};

		all(def, cb);

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
					def.cancel2.resolve(true);
				});
			});

		// instantly cancel1,
		// (readyCallback must run before cancel callback)
		cancel1(function (err) {
			assert.equal(err, null);
			assert(readyCb1);
			def.cancel1.resolve(true);
		});

		assert(!readyCb1);
		assert(!readyCb2);
	});

	it('cancel multiple times', function (cb) {
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
