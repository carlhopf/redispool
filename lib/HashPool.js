const crypto = require('crypto');
const map = require('async/map');
const Client = require('./Client');
const hashindex = require('./hashindex');

/**
 * Different from Pool: one client created per master in init(),
 * so getSync() possible.
 */
class HashPool {
	constructor (options) {
		this.options = options;
		this.ready = false;
		this.clients = [];
		this.length = 0;
	}

	/**
	 * Create a new set of clients, one for each master.
	 */
	init (cb) {
		map(this.options.masters, (json, cb) => {
			Client.retryCreate({
				host: json.host,
				port: json.port,
				pass: json.pass,
				tag: this.options.tag,
			}, cb);
		}, (err, _clients) => {
			if (err) return cb(err);

			this.ready = true;
			this.clients = _clients;
			this.length = this.clients.length;
			cb(null, this.clients);
		});
	}

	get (key, cb) {
		throw new Error('not implemented');
	}

	getSync (key) {
		if (!this.ready) throw new Error('HashPool getSync() not ready');
		return this.clients[hashindex(key, this.length)];
	}
}

module.exports = HashPool;
