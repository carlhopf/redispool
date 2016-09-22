const HashPool = require('./HashPool');
const waterfall = require('async/waterfall');

class SubHashPool {
	/**
	 * Ok.
	 *
	 * @param {string} options.tag
	 * @param {array} options.masters
	 */
	constructor (options) {
		this.options = options;

		this.pool = new HashPool({
			masters: options.masters,
		});

		this.ready = false;
		this.queue = [];

		this.onjson = {}; // channel > fn[]
		this.onready = {}; // channel > fn[]/true

		this.onmessage = (channel, string) => {
			var onjson = this.onjson[channel];
			if (!onjson) return;

			onjson = onjson.slice(0);

			// parse once for performance
			var json = JSON.parse(string);

			for (var i = 0, len = onjson.length; i < len; i++) {
				onjson[i](json);
			}
		};
	}

	init (cb) {
		if (!cb) throw new Error('cb missing');

		// TODO unsubscribe existing channels from all old clients
		// TODO and remove message listeners

		// TODO subscribe existing channels on all new clients

		// create set of clients, and add message listener


		waterfall([
			(cb) => this.pool.init(cb),
			(clients, cb) => {
				clients.forEach((client) => {
					client.on('message', this.onmessage);
				});

				cb(null);
			},
		], cb);
	}

	/**
	 *
	 *
	 * @param {function} cb - Ready callback.
	 */
	subscribe (channel, fnjson, fnready) {
		var client = this.pool.getSync(channel);
		var onjson = this.onjson[channel];
		var onready = this.onready[channel];

		if (!fnjson) fnjson = function () {};
		if (!fnready) fnready = function () {};

		var cancelled = false;

		// cancel subscription
		var cancel = (cb) => {
			if (cancelled) return;
			cancelled = true;

			cb = cb || function () {};

			onjson.splice(onjson.indexOf(fnjson), 1);

			if (fnready) {
				process.nextTick(() => fnready('subscribe cancelled'));
			}

			// last listener removed, unsubscribe
			if (onjson.length === 0) {
				delete this.onjson[channel];
				delete this.onready[channel];

				client.unsubscribe(channel, (err) => {
					cb(err);
				});
			} else {
				process.nextTick(() => cb(null));
			}
		};

		// first subscribe to channel, create listeners
		if (!onjson) {
			onjson = this.onjson[channel] = [];
			onready = this.onready[channel] = [];

			client.subscribe(channel, (err) => {
				if (err) {
					delete this.onjson[channel];
					delete this.onready[channel];
				} else {
					this.onready[channel] = true;
				}

				onready.slice(0).forEach((fn) => fn(err, cancel));
			});
		}

		// subscription is ready
		if (onready === true) {
			process.nextTick(function () {
				if (cancelled) return;
				var _fnready = fnready;
				fnready = undefined;
				_fnready(null, cancel);
			});
		}
		// waiting for ready, add to queue
		else {
			onready.push(function () {
				if (cancelled) return;
				var _fnready = fnready;
				fnready = undefined;
				_fnready(null, cancel);
			});
		}

		onjson.push(fnjson);

		return cancel;
	}

	channels () {
		return Object.keys(this.onjson);
	}
}

module.exports = SubHashPool;
