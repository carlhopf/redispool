const crypto = require('crypto');
const map = require('async/map');
const Client = require('./Client');

function index(string, count) {
	// use native nodejs hash, this is way faster den jslib/hash/MD5
	var hash = crypto.createHash('md5').update(string).digest('hex');

	// 65535 is hex 'ffff' + 1, num max value is 'ffff' 65535,
	// ~~ is faster way of Math.floor(), md5 is 10 times faster then sha512
	return ~~(parseInt(hash.substr(0, 4), 16) / 65536 * count);
};

class SubHashPool {
	/**
	 * Ok.
	 *
	 * @param {string} options.tag
	 * @param {array} options.masters
	 */
	constructor (options) {
		this.options = options;
		this.clients = [];

		this.ready = false;
		this.queue = [];

		this.onjson = {}; // channel > fn[]
		this.onready = {}; // channel > fn[]/true

		this.onmessage = (channel, string) => {
			var sub = this.sub[channel];
			if (!sub) return;

			var listeners = sub.listeners.slice(0);
			var json = JSON.parse(string);

			for (var i = 0, len = listeners.length; i < len; i++) {
				listeners[i](json);
			}
		};
	}

	init (cb) {
		if (!cb) throw new Error('cb missing');

		// TODO unsubscribe existing channels from all old clients
		// TODO and remove message listeners

		// TODO subscribe existing channels on all new clients

		// create set of clients, and add message listener
		map(this.options.masters, (json, cb) => {
			Client.create({
				host: json.host,
				port: json.port,
				pass: json.pass,
			}, cb);
		}, (err, _clients) => {
			if (err) return cb(err);

			this.ready = true;
			this.clients = _clients;
			cb(null);
		});
	}

	getClient (key) {
		if (!this.ready) throw new Error('not ready');
		return this.clients[index(key, this.clients.length)];
	}

	/**
	 *
	 *
	 * @param {function} cb - Ready callback.
	 */
	subscribe (channel, fnjson, fnready) {
		var client = this.getClient(channel);
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
}

module.exports = SubHashPool;
