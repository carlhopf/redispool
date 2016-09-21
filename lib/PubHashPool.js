const map = require('async/map');
const Client = require('./Client');
const hashring = require('./hashring');

class PubHashPool {
	/**
	 * Ok.
	 *
	 * @param {string} options.tag
	 * @param {array} options.masters
	 */
	constructor (options) {
		this.options = options;
		this.ready = false;
	}

	init (cb) {
		if (!cb) throw new Error('cb missing');

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
		return this.clients[hashring.index(key, this.clients.length)];
	}

	/**
	 *
	 *
	 * @param {function} cb - Ready callback.
	 */
	publish (channel, json) {
		if (!this.ready) throw new Error('not ready');

		var client = this.getClient(channel);

		client.publish(channel, json);
	}
}

module.exports = PubHashPool;
